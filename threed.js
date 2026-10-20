/* ══════════════════════════════════════════════════════════════
   FOR YOU — 3D layer
   Two WebGL scenes:
     1. HERO    — the opening photos, floating in space
     2. GALLERY — a ring of memories you scroll through
   ══════════════════════════════════════════════════════════════ */

import * as THREE from '../vendor/three.module.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp  = (a, b, t) => a + (b - a) * t;
const ease  = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;

const BG      = 0xF4EBE0;   /* page beige, for fog */
const ROSE    = 0xC08093;
const CREAM   = 0xFFFBF7;

/* ─────────────────────────────────────────────
   canvas + texture helpers
   ───────────────────────────────────────────── */
function roundedRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('image failed: ' + src));
    im.src = src;
  });
}

function drawCover(ctx, img, x, y, w, h, r) {
  const ir = img.width / img.height, cr = w / h;
  let sw, sh, sx, sy;
  if (ir > cr) { sh = img.height; sw = sh * cr; sx = (img.width - sw) / 2; sy = 0; }
  else         { sw = img.width;  sh = sw / cr; sx = 0; sy = (img.height - sh) / 2; }
  ctx.save();
  roundedRect(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

/* A card face: white polaroid frame + photo  |  or  bare rounded photo */
function cardTexture(img, opts) {
  const { w, h, radius, pad, caption, bare, text } = opts;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');

  if (bare) {
    ctx.clearRect(0, 0, w, h);
    drawCover(ctx, img, 1.5, 1.5, w - 3, h - 3, radius);
    ctx.strokeStyle = 'rgba(255,251,247,.95)';
    ctx.lineWidth = 3;
    roundedRect(ctx, 1.5, 1.5, w - 3, h - 3, radius);
    ctx.stroke();
  } else {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fffdfb';
    roundedRect(ctx, 0, 0, w, h, radius);
    ctx.fill();
    /* faint paper grain / inner edge */
    ctx.strokeStyle = 'rgba(120,90,75,.10)';
    ctx.lineWidth = 2;
    roundedRect(ctx, 1, 1, w - 2, h - 2, radius);
    ctx.stroke();
    const pw = w - pad * 2;
    const ph = h - pad * 2 - caption;
    drawCover(ctx, img, pad, pad, pw, ph, 6);

    /* the caption, written straight onto the card */
    if (text) {
      let fs = Math.round(caption * 0.36);
      const cy = h - pad - caption / 2;
      const maxW = w - pad * 2;
      ctx.font = `italic ${fs}px Georgia, "Times New Roman", serif`;
      while (fs > 10 && ctx.measureText(text).width > maxW) {
        fs -= 1;
        ctx.font = `italic ${fs}px Georgia, "Times New Roman", serif`;
      }
      ctx.fillStyle = 'rgba(78,56,46,.80)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, cy);
    }
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/* Soft blurred shadow, drawn as its own quad behind the card */
function shadowTexture(w, h, r, blur, alpha) {
  const pad = Math.ceil(blur * 2.2);
  const c = document.createElement('canvas');
  c.width = w + pad * 2; c.height = h + pad * 2;
  const ctx = c.getContext('2d');
  const col = `rgba(118,86,70,${alpha})`;
  ctx.shadowColor = col;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = blur * 0.30;
  ctx.fillStyle = col;
  roundedRect(ctx, pad, pad, w, h, r); ctx.fill();
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* A single photo card: face mesh + shadow mesh, grouped */
function makeCard({ img, w, h, radius = 14, pad = 26, caption = 54, bare = false, text = '' }) {
  const group = new THREE.Group();

  const tex = cardTexture(img, { w, h, radius, pad, caption, bare, text });
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: true })
  );
  group.add(face);

  const blur = Math.round(Math.max(w, h) * 0.055);
  const st = shadowTexture(w, h, radius * 0.9, blur, 0.34);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(w + blur * 4.4, h + blur * 4.4),
    new THREE.MeshBasicMaterial({ map: st, transparent: true, depthWrite: false, opacity: 0.85 })
  );
  shadow.position.z = -0.06;
  shadow.renderOrder = -1;
  group.add(shadow);

  group.userData = { face, shadow, tex, w, h };
  return group;
}

/* ─────────────────────────────────────────────
   shared runner
   ───────────────────────────────────────────── */
function makeRunner(renderer, scene, camera, onResize) {
  let visible = true;
  let raf = null;
  let last = performance.now();

  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) {
      resize();                            // make sure the buffer matches the element
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    }
  }, { threshold: 0 });

  function resize() {
    const p = renderer.domElement.parentElement;
    const w = p.clientWidth, h = p.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (onResize) onResize(w, h);
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!visible || document.hidden) return;
    scene.userData.update(dt, now / 1000);
    renderer.render(scene, camera);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();                       // size it before the first frame
  return {
    resize,
    observe(el) { io.observe(el); },
    start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  };
}

/* pointer, shared by both scenes */
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener('mousemove', e => {
  pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
}, { passive: true });

function updatePointer(dt) {
  pointer.x = lerp(pointer.x, pointer.tx, Math.min(1, dt * 3.2));
  pointer.y = lerp(pointer.y, pointer.ty, Math.min(1, dt * 3.2));
}

/* ─────────────────────────────────────────────
   SCENE 1 — HERO
   ───────────────────────────────────────────── */
async function buildHero(canvas, band, assets) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const rig = new THREE.Group();
  scene.add(rig);

  const W = 520, H = 650;                       // card pixel size (portrait, 4:5)
  const cards = [];
  const layout = [
    { img: assets[0], x: -1.16, y: -0.10, z: -0.32, rz: -0.20, rx: 0.05, ry:  0.17, s: 1.00 },
    { img: assets[1], x:  0.02, y:  0.16, z:  0.34, rz:  0.035, rx: -0.02, ry: 0.00, s: 1.03 },
    { img: assets[2], x:  1.20, y: -0.06, z: -0.48, rz:  0.21, rx: 0.04, ry: -0.19, s: 0.96 }
  ];

  /* the captions live in the HTML so she can still edit them there */
  const caps = Array.prototype.map.call(
    band.querySelectorAll('figcaption'), el => (el.textContent || '').trim()
  );

  for (const L of layout) {
    const c = makeCard({
      img: L.img, w: W, h: H, radius: 16, pad: 30, caption: 62,
      text: caps[cards.length] || ''
    });
    c.userData.home = { x: L.x, y: L.y, z: L.z, rz: L.rz, rx: L.rx, ry: L.ry, s: L.s };
    c.userData.phase = Math.random() * Math.PI * 2;
    c.userData.drift = 0.6 + Math.random() * 0.7;
    c.userData.t0 = performance.now() / 1000 + cards.length * 0.13;
    rig.add(c);
    cards.push(c);
  }

  /* place the cards into the band reserved by the (now hidden) polaroid stack */
  function layoutToBand() {
    const parent = canvas.parentElement;
    const pr = parent.getBoundingClientRect();
    const br = band.getBoundingClientRect();
    if (!pr.width || !pr.height || !br.height) return;

    const vh = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
    const unit = vh / pr.height;
    const cx = (br.left + br.width / 2) - (pr.left + pr.width / 2);
    const cy = (br.top + br.height / 2) - (pr.top + pr.height / 2);

    /* card size: fit three across the band, never taller than the band */
    const gap = br.width * 0.030;
    let cardW = (br.width - gap * 2) / 3;
    let cardH = cardW * (H / W);
    const capH = br.height * 0.94;
    if (cardH > capH) { cardH = capH; cardW = cardH * (W / H); }

    const scale = (cardH * unit) / H;          // world units per texture pixel
    const spacing = (cardW + gap) * unit;       // world distance between cards

    cards.forEach((c) => {
      const h = c.userData.home;
      c.userData.px = cx * unit + h.x * spacing;
      c.userData.py = -cy * unit + h.y * spacing + br.height * 0.02 * unit;
      c.userData.scale = scale * h.s;
      c.scale.setScalar(scale * h.s * 0.90);
    });
  }

  scene.userData.update = (dt, t) => {
    updatePointer(dt);
    const g = rig.rotation;
    g.y = lerp(g.y, pointer.x * 0.13, Math.min(1, dt * 2.4));
    g.x = lerp(g.x, -pointer.y * 0.09, Math.min(1, dt * 2.4));
    rig.position.z = lerp(rig.position.z, pointer.y * -0.35, Math.min(1, dt * 2));

    cards.forEach((c) => {
      const h = c.userData.home;
      const p = c.userData.phase;
      const bob = Math.sin(t * 0.55 * c.userData.drift + p) * 0.075;
      const sway = Math.cos(t * 0.42 * c.userData.drift + p) * 0.045;

      /* entrance is driven by the clock, not by frame count */
      const ep = clamp((t - c.userData.t0) / 1.15, 0, 1);
      const e = ease(ep);

      c.position.x = c.userData.px + sway;
      c.position.y = c.userData.py + bob + (1 - e) * 0.85;
      c.position.z = h.z + (1 - e) * 2.4;
      c.rotation.z = h.rz + sway * 0.14;
      c.rotation.x = h.rx + pointer.y * 0.05;
      c.rotation.y = h.ry + pointer.x * 0.06;
      c.scale.setScalar(c.userData.scale * (0.90 + 0.10 * e));
    });
  };

  const runner = makeRunner(renderer, scene, camera, () => layoutToBand());
  runner.observe(canvas);
  layoutToBand();
  runner.start();
  return runner;
}

/* ─────────────────────────────────────────────
   SCENE 2 — GALLERY
   ───────────────────────────────────────────── */
async function buildGallery(canvas, section, assets, labels, onPick) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BG, 0.022);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  const CAM_Z = 16.5;
  camera.position.set(0, 0.4, CAM_Z);

  const ring = new THREE.Group();
  ring.rotation.x = -0.10;
  scene.add(ring);

  const W = 640, H = 400;                       // 16:10 card (texture pixels)
  const cards = [];
  const n = assets.length;
  const R = 9.2;
  /* how many world units one screen pixel is worth at the ring's depth */
  const worldPerPx = () => (2 * CAM_Z * Math.tan((camera.fov * Math.PI) / 360)) /
                            renderer.domElement.parentElement.clientHeight;

  assets.forEach((img, i) => {
    const a = (i / n) * Math.PI * 2;
    const c = makeCard({ img, w: W, h: H, radius: 18, bare: true });
    c.userData.a = a;
    c.userData.depth = -1.6 + Math.cos(a * 2) * 2.4;
    c.userData.hover = 0;
    c.userData.hoverT = 0;
    ring.add(c);
    cards.push(c);
  });

  /* soft dust motes for depth */
  const dustGeo = new THREE.BufferGeometry();
  const DUST = 260;
  const dp = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dp[i * 3]     = (Math.random() - .5) * 34;
    dp[i * 3 + 1] = (Math.random() - .5) * 20;
    dp[i * 3 + 2] = (Math.random() - .5) * 16 - 3;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xE8C4CE, size: 0.085, transparent: true, opacity: 0.65, depthWrite: false, sizeAttenuation: true
  }));
  scene.add(dust);

  let spin = 0, hovered = -1;

  function layout() {
    const p = renderer.domElement.parentElement;
    const w = p.clientWidth, h = p.clientHeight;
    if (!w || !h) return;
    const wpp = worldPerPx();
    const narrow = w < 760;
    const R2  = (w * (narrow ? 0.40 : 0.385)) * wpp;   // ring radius, world units
    const cw = (w * (narrow ? 0.36  : 0.225)) * wpp;   // card width, world units
    const sc = cw / W;                    // texture pixels -> world units
    cards.forEach(c => {
      const a = c.userData.a + spin;
      c.userData.R2 = R2;
      c.userData.sc = sc;
      c.userData.depth = R2 * (-0.17 + Math.cos(a * 2) * 0.26);
    });
    place();
  }

  /* put every card where it belongs for the current spin */
  function place() {
    cards.forEach(c => {
      const a = c.userData.a + spin;
      const R2 = c.userData.R2 || 9;
      const sc = c.userData.sc || 0.009;
      c.position.set(Math.sin(a) * R2, Math.cos(a) * R2 * 0.62, c.userData.depth);
      c.rotation.y = -Math.sin(a) * 0.30;
      c.rotation.x = Math.cos(a) * 0.06;
      c.rotation.z = Math.sin(a) * 0.04;
      c.scale.setScalar(sc * (1 + c.userData.hover * 0.12));
    });
  }

  /* pointer picking */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  });
  canvas.addEventListener('pointerleave', () => { ndc.set(99, 99); });
  canvas.addEventListener('click', () => { if (hovered >= 0) onPick(hovered); });

  scene.userData.update = (dt, t) => {
    updatePointer(dt);

    /* scroll progress through the pinned section drives the ring */
    const rect = section.getBoundingClientRect();
    const total = Math.max(1, section.offsetHeight - window.innerHeight);
    const prog = clamp(-rect.top / total, 0, 1);
    const target = prog * Math.PI * 1.35;
    spin = lerp(spin, target, Math.min(1, dt * 6));

    camera.position.x = lerp(camera.position.x, pointer.x * 1.15, Math.min(1, dt * 2.4));
    camera.position.y = lerp(camera.position.y, 0.4 - pointer.y * 0.85, Math.min(1, dt * 2.4));
    camera.lookAt(0, 0, 0);

    /* hover pick */
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(cards.map(c => c.userData.face), false);
    const idx = hit.length ? cards.indexOf(hit[0].object.parent) : -1;
    hovered = idx;
    cards.forEach((c, i) => { c.userData.hoverT = i === idx ? 1 : 0; });

    cards.forEach(c => {
      c.userData.hover = lerp(c.userData.hover, c.userData.hoverT, Math.min(1, dt * 6));
    });
    place();

    dust.rotation.y += dt * 0.02;
    dust.rotation.x = Math.sin(t * 0.08) * 0.06;
    dust.position.y = Math.sin(t * 0.12) * 0.25;

    onHover(hovered, labels);
  };

  let lastHover = -2;
  function onHover(i, lb) {
    if (i === lastHover) return;
    lastHover = i;
    const el = document.getElementById('galleryCaption');
    if (el) {
      if (i >= 0) {
        el.textContent = String(i + 1).padStart(2, '0') + '  ·  ' + (lb[i] || '');
        el.classList.add('is-hot');
      } else {
        el.textContent = 'scroll to wander  ·  tap one to open its chapter';
        el.classList.remove('is-hot');
      }
    }
    canvas.style.cursor = i >= 0 ? 'pointer' : 'default';
  }

  const runner = makeRunner(renderer, scene, camera, layout);
  runner.observe(section);
  layout();
  runner.start();
  return runner;
}

/* ─────────────────────────────────────────────
   boot
   ───────────────────────────────────────────── */
export async function init() {
  const heroCanvas = document.getElementById('hero3d');
  const galleryCanvas = document.getElementById('gallery3d');
  if (!heroCanvas || !galleryCanvas) return;

  /* WebGL support check */
  try {
    const test = document.createElement('canvas');
    const gl = test.getContext('webgl2') || test.getContext('webgl');
    if (!gl) throw new Error('no webgl');
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
    return;
  }

  const srcs = [
    'photos/hero-1.jpg', 'photos/hero-2.jpg', 'photos/hero-3.jpg',
    'photos/01.jpg', 'photos/02.jpg', 'photos/03.jpg', 'photos/04.jpg',
    'photos/05.jpg', 'photos/06.jpg', 'photos/07.jpg', 'photos/08.jpg'
  ];
  const imgs = [];
  for (const s of srcs) {
    try { imgs.push(await loadImage(s)); }
    catch (e) { imgs.push(await loadImage('')); }
  }

  document.documentElement.classList.add('has-webgl');

  const band = document.getElementById('polaroidBand');
  await buildHero(heroCanvas, band, [imgs[0], imgs[1], imgs[2]]);

  const section = document.getElementById('gallery');
  const labels = (window.CHAPTER_LABELS || []).map(t => t);
  await buildGallery(galleryCanvas, section, imgs.slice(3, 11), labels, i => {
    const el = document.getElementById('ch-' + (i + 1));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}
