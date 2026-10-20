/* ══════════════════════════════════════════════════════════════
   FOR YOU — behaviour layer
   ══════════════════════════════════════════════════════════════ */

/* Chapter titles — shown when you hover a card in the 3D gallery */
window.CHAPTER_LABELS = [
  "The caf\u00e9 that became our table",
  "Your mirror selfie, sent first",
  "The way you always take the picture",
  "The night I made you something",
  "The kiss on the forehead",
  "The watches we matched",
  "Your bag with the gold chain",
  "The flowers, and the food, and you"
];

/* ─────────────────────────────────────────────
   ✏️  EDIT ME  ✏️   (everything you need to change)
   ───────────────────────────────────────────── */
const CONFIG = {
  // ⚠️  CHANGE THESE TWO LINES  ⚠️
  herName: "you",                 // ← HER NAME. Big on the opening screen.
  startDate: "",                  // ← e.g. "2023-02-14" → lights up the days-together counter

  memoryCount: 8,                 // ← how many chapters you wrote

  music: {
    title: "Our Song",            // ← track title
    artist: "add a track",        // ← artist name
    url: ""                       // ← paste a direct .mp3 link here (optional)
  },

  petals: 26                      // ← floating petals (set 0 to turn off)
};
/* ─────────────────────────────────────────────
   ✏️  END EDIT  ✏️
   ───────────────────────────────────────────── */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

/* ─────────────── 1. fill in the config ─────────────── */
function applyConfig() {
  $$('[data-bind="herName"]').forEach(el => { el.textContent = CONFIG.herName; });
  $$('[data-bind="memoryCount"]').forEach(el => { el.textContent = CONFIG.memoryCount; });

  const since = $('#sinceDate');
  const days = $('#daysCount');
  if (CONFIG.startDate) {
    const start = new Date(CONFIG.startDate + 'T00:00:00');
    if (!isNaN(start)) {
      const diff = Math.max(0, Math.floor((Date.now() - start) / 864e5));
      if (days) days.textContent = diff.toLocaleString();
      if (since) since.textContent = start.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    }
  } else {
    if (days) days.textContent = '∞';
    if (since) since.textContent = 'forever';
  }
}

/* ─────────────── 2. split text into words ─────────────── */
function splitWords(el) {
  const walk = node => {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
          const w = document.createElement('span');
          w.className = 'w';
          w.textContent = part;
          frag.appendChild(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && !child.classList.contains('w')) {
        walk(child);
      }
    });
  };
  walk(el);

  if (!el.classList.contains('reveal')) el.classList.add('reveal');
  Array.from(el.querySelectorAll('.w')).forEach((w, i) => {
    w.style.setProperty('--wd', Math.min(i, 40));
  });
}

/* ─────────────── 3. reveal on scroll ─────────────── */
let io;
function setUpReveals() {
  if (io) io.disconnect();

  $$('[data-delay]').forEach(el => {
    const d = parseFloat(el.dataset.delay || '0');
    el.style.setProperty('--d', Math.round(d * 700));
  });

  io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('is-in');
      if (el.classList.contains('tl-item')) {
        el.querySelectorAll('.reveal').forEach(r => r.classList.add('is-in'));
      }
      obs.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  $$('.reveal, .tl-item').forEach(el => io.observe(el));
}

/* ─────────────── 4. intro curtain ─────────────── */
const curtain = $('#curtain');
const openBtn = $('#openBtn');
let unlocked = false;

function openCurtain() {
  if (unlocked) return;
  unlocked = true;
  curtain.classList.add('is-open');
  document.body.style.overflow = '';
  setTimeout(() => { curtain.style.display = 'none'; }, 1200);
  setTimeout(() => { $('#dock').classList.add('is-visible'); }, 700);
  window.scrollTo({ top: 0, behavior: 'auto' });
}
if (openBtn) openBtn.addEventListener('click', openCurtain);

/* ─────────────── 5. topbar shadow ─────────────── */
const topbar = $('#topbar');
let lastY = 0;
function onScroll() {
  const y = window.scrollY;
  topbar.classList.toggle('is-stuck', y > 40);
  lastY = y;
  updateSpine();
}
window.addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });

/* ─────────────── 6. timeline spine fill ─────────────── */
const spineFill = $('#spineFill');
const timeline = $('#timeline');
function updateSpine() {
  if (!spineFill || !timeline) return;
  const r = timeline.getBoundingClientRect();
  const vh = window.innerHeight;
  const progress = Math.min(1, Math.max(0, (vh * 0.72 - r.top) / r.height));
  spineFill.style.height = (progress * 100).toFixed(2) + '%';
}

/* ─────────────── 7. photo slots ─────────────── */
const LS_KEY = 'foryou.photos';

function readPhotoStore() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}
function writePhotoStore(store) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(store)); }
  catch { console.warn('Photo too big to save locally — it will still show this session.'); }
}

let pendingSlot = null;
const phInput = $('#phInput');

function slotFor(el) {
  if (el.dataset.ph) return el.dataset.ph;
  const img = el.querySelector('[data-ph]');
  if (img) return img.dataset.ph;
  const lbl = el.querySelector('[data-ph-label]');
  if (lbl) return lbl.dataset.phLabel;
  return null;
}

function initPhotoSlots() {
  const store = readPhotoStore();

  $$('.tl-ph, .polaroid__frame').forEach(slot => {
    const key = slotFor(slot);
    const img = $('.ph-img', slot);
    if (!img || !key) return;

    const mark = () => {
      img.classList.add('is-loaded');
      slot.classList.add('has-photo');
      const lbl = $('[data-ph-label]', slot);
      if (lbl) lbl.style.opacity = '0';
    };

    // restored from a previous visit on this device
    if (store[key]) img.src = store[key];

    img.addEventListener('load', mark);
    img.addEventListener('error', () => {
      img.classList.remove('is-loaded');
      slot.classList.remove('has-photo');
      const lbl = $('[data-ph-label]', slot);
      if (lbl) lbl.style.opacity = '';
    });

    // the image may already have finished loading before we got here
    if (img.complete && img.naturalWidth > 0) mark();

    // click / keyboard → choose a photo
    const choose = () => { pendingSlot = slot; phInput.click(); };
    slot.addEventListener('click', choose);
    slot.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); }
    });
    slot.setAttribute('title', 'Click to choose a photo');
  });

  phInput.addEventListener('change', () => {
    const file = phInput.files && phInput.files[0];
    if (!file || !pendingSlot) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result;
      const key = slotFor(pendingSlot);
      const img = $('.ph-img', pendingSlot);
      if (img) img.src = url;
      pendingSlot.classList.add('has-photo');
      const lbl = $('[data-ph-label]', pendingSlot);
      if (lbl) lbl.style.opacity = '0';
      const store = readPhotoStore();
      store[key] = url;
      writePhotoStore(store);
    };
    reader.readAsDataURL(file);
    phInput.value = '';
    pendingSlot = null;
  });
}

/* ─────────────── 8. music player ─────────────── */
function initMusic() {
  const audio = $('#audio');
  const dock = $('#dock');
  const playBtn = $('#playBtn');
  const playIcon = $('#playIcon');
  const seekBar = $('#seekBar');
  const seekProgress = $('#seekProgress');
  const timeLabel = $('#timeLabel');
  const volRange = $('#volRange');
  const trackTitle = $('#trackTitle');
  const trackArtist = $('#trackArtist');
  const picker = $('#picker');
  const urlInput = $('#urlInput');
  const fileInput = $('#fileInput');
  const trackBtn = $('#trackBtn');
  const pickerClose = $('#pickerClose');
  if (!audio) return;

  const LS = 'foryou.music';
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(LS) || 'null'); } catch {}

  trackTitle.textContent = (saved && saved.title) || CONFIG.music.title;
  trackArtist.textContent = (saved && saved.artist) || CONFIG.music.artist;

  const fmt = s => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ':' + String(r).padStart(2, '0');
  };

  let source = (saved && saved.url) || CONFIG.music.url;
  let objectUrl = null;

  function load(src, meta) {
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
    if (!src) { trackReady = false; trackArtist.textContent = 'add a track →'; return; }
    trackReady = true;
    audio.src = src;
    audio.load();
    if (meta) {
      trackTitle.textContent = meta.title || CONFIG.music.title;
      trackArtist.textContent = meta.artist || CONFIG.music.artist;
      try { localStorage.setItem(LS, JSON.stringify({ url: meta.url || '', title: trackTitle.textContent, artist: trackArtist.textContent })); } catch {}
    }
  }

  let trackReady = false;

  if (source) {
    load(source, null);
    trackReady = true;
  } else {
    // try a local file the owner may have dropped in /audio
    audio.src = 'audio/our-song.mp3';
    audio.load();                       // force the check even with preload="none"
    audio.addEventListener('canplay', () => { trackReady = true; });
    audio.addEventListener('error', () => {
      if (!source) {
        trackReady = false;
        trackArtist.textContent = 'add a track →';
        audio.removeAttribute('src');
      }
    }, { once: true });
  }

  audio.volume = (volRange ? volRange.value : 70) / 100;

  function toggle() {
    if (!trackReady) { trackBtn.click(); return; }   // no track yet → offer the picker
    if (audio.paused) audio.play().catch(() => {}); else audio.pause();
  }
  playBtn.addEventListener('click', toggle);

  const musicBtn = $('#musicBtn');
  if (musicBtn) musicBtn.addEventListener('click', () => {
    dock.classList.add('is-visible');
    toggle();
    dock.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'nearest' });
  });

  audio.addEventListener('play', () => dock.classList.add('is-playing'));
  audio.addEventListener('pause', () => dock.classList.remove('is-playing'));
  audio.addEventListener('ended', () => {
    dock.classList.remove('is-playing');
    seekProgress.style.width = '0%';
  });

  audio.addEventListener('timeupdate', () => {
    const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    seekProgress.style.width = pct.toFixed(2) + '%';
    if (timeLabel) timeLabel.textContent = fmt(audio.currentTime) + ' / ' + fmt(audio.duration);
  });

  audio.addEventListener('loadedmetadata', () => {
    if (timeLabel) timeLabel.textContent = '0:00 / ' + fmt(audio.duration);
  });

  if (seekBar) {
    const seekTo = e => {
      if (!audio.duration) return;
      const r = seekBar.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      audio.currentTime = Math.min(1, Math.max(0, x / r.width)) * audio.duration;
    };
    seekBar.addEventListener('click', seekTo);
    seekBar.addEventListener('keydown', e => {
      if (!audio.duration) return;
      if (e.key === 'ArrowRight') audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
      if (e.key === 'ArrowLeft')  audio.currentTime = Math.max(0, audio.currentTime - 5);
    });
  }

  if (volRange) volRange.addEventListener('input', () => { audio.volume = volRange.value / 100; });

  const volBtn = $('#volBtn');
  if (volBtn) volBtn.addEventListener('click', () => {
    audio.muted = !audio.muted;
    volBtn.style.opacity = audio.muted ? '.4' : '1';
  });

  /* picker */
  const showPicker = v => { if (picker) picker.hidden = !v; };
  if (trackBtn) trackBtn.addEventListener('click', e => { e.stopPropagation(); showPicker(picker.hidden); });
  if (pickerClose) pickerClose.addEventListener('click', () => showPicker(false));
  document.addEventListener('click', e => {
    // only close when the click lands outside the dock (and isn't the finale button)
    if (picker && !picker.hidden && !dock.contains(e.target) && e.target !== musicBtn) showPicker(false);
  });

  if (urlInput) {
    urlInput.value = CONFIG.music.url || '';
    urlInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const v = urlInput.value.trim();
        if (v) { load(v, { url: v, title: CONFIG.music.title, artist: CONFIG.music.artist }); showPicker(false); }
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(f);
      load(objectUrl, { url: '', title: f.name.replace(/\.[^.]+$/, ''), artist: 'from your device' });
      showPicker(false);
    });
  }
}

/* ─────────────── 9. cursor glow ─────────────── */
function initCursor() {
  if (REDUCED) return;
  const glow = $('.cursor-glow');
  if (!glow) return;
  let tx = innerWidth / 2, ty = innerHeight / 2, x = tx, y = ty;
  window.addEventListener('mousemove', e => {
    tx = e.clientX; ty = e.clientY;
    document.body.classList.add('has-cursor');
  }, { passive: true });
  (function loop() {
    x += (tx - x) * 0.085;
    y += (ty - y) * 0.085;
    glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    requestAnimationFrame(loop);
  })();
}

/* ─────────────── 10. floating petals ─────────────── */
function initPetals() {
  const cv = $('#petals');
  if (!cv || REDUCED || !CONFIG.petals) return;
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = Math.min(devicePixelRatio || 1, 2);
  const petals = [];
  const TINTS = ['rgba(249,223,229,', 'rgba(243,203,214,', 'rgba(252,238,242,', 'rgba(232,178,194,'];

  function resize() {
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function make(p) {
    return {
      x: Math.random() * W,
      y: p ? Math.random() * H : -30,
      r: 4 + Math.random() * 8,
      vy: 0.18 + Math.random() * 0.5,
      vx: (Math.random() - 0.5) * 0.28,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.02,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.008 + Math.random() * 0.012,
      tint: TINTS[Math.floor(Math.random() * TINTS.length)],
      alpha: 0.25 + Math.random() * 0.45,
      flap: 0.01 + Math.random() * 0.025
    };
  }
  resize();
  for (let i = 0; i < CONFIG.petals; i++) petals.push(make(true));
  addEventListener('resize', resize);

  function petalPath(p) {
    ctx.beginPath();
    ctx.moveTo(0, -p.r);
    ctx.bezierCurveTo(p.r * 0.95, -p.r * 0.5, p.r * 0.8, p.r * 0.6, 0, p.r);
    ctx.bezierCurveTo(-p.r * 0.8, p.r * 0.6, -p.r * 0.95, -p.r * 0.5, 0, -p.r);
    ctx.closePath();
  }

  (function loop() {
    ctx.clearRect(0, 0, W, H);
    petals.forEach(p => {
      p.sway += p.swaySpeed;
      p.x += p.vx + Math.sin(p.sway) * 0.5;
      p.y += p.vy;
      p.rot += p.vr + Math.sin(p.sway * 1.7) * p.flap;
      if (p.y > H + 40) { Object.assign(p, make(false)); p.x = Math.random() * W; }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, 0.45 + Math.abs(Math.cos(p.sway)) * 0.75);
      ctx.fillStyle = p.tint + p.alpha + ')';
      ctx.shadowColor = p.tint + (p.alpha * 0.5) + ')';
      ctx.shadowBlur = 8;
      petalPath(p);
      ctx.fill();
      ctx.restore();
    });
    requestAnimationFrame(loop);
  })();
}

/* ─────────────── 11. polaroid tilt + entrance ─────────────── */
function initPolaroids() {
  const items = $$('.polaroid');
  const bases = [[-7, 12], [1.5, -16], [7, 12]];

  items.forEach((el, i) => {
    const b = bases[i] || [0, 0];
    const rot = b[0], lift = b[1];
    let entered = false, mx = 0, my = 0, cx = 0, cy = 0;

    function apply() {
      const tx = entered ? mx : 0, ty = entered ? my : 0;
      cx += (tx - cx) * 0.09;
      cy += (ty - cy) * 0.09;
      const t = entered ? `rotateX(${(-cy * 7).toFixed(2)}deg) rotateY(${(cx * 8).toFixed(2)}deg)` : '';
      el.style.transform = `translateY(${(lift + (entered ? 0 : 26)).toFixed(2)}px) rotate(${rot}deg) ${t}`;
      el.style.opacity = entered ? '1' : '0';
      requestAnimationFrame(apply);
    }
    apply();

    setTimeout(() => { entered = true; }, REDUCED ? 0 : 700 + i * 180);

    if (!REDUCED) {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        mx = (e.clientX - r.left) / r.width - 0.5;
        my = (e.clientY - r.top) / r.height - 0.5;
      });
      el.addEventListener('mouseleave', () => { mx = 0; my = 0; });
    }
  });
}

/* ─────────────── 12. replay ─────────────── */
const replayBtn = $('#replayBtn');
if (replayBtn) {
  replayBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
    setTimeout(() => {
      $$('.reveal, .tl-item').forEach(el => el.classList.remove('is-in'));
      setUpReveals();
    }, REDUCED ? 0 : 700);
  });
}

/* ─────────────── boot ─────────────── */
function boot() {
  applyConfig();
  if (window.ForYou3D && window.ForYou3D.init) {
    Promise.resolve(window.ForYou3D.init()).catch(e => {
      console.warn('3D unavailable:', e);
      document.documentElement.classList.add('no-webgl');
    });
  }
  $$('[data-split]').forEach(el => { if (!el.dataset.splitDone) { splitWords(el); el.dataset.splitDone = '1'; } });
  setUpReveals();
  initPhotoSlots();
  initMusic();
  initCursor();
  initPetals();
  initPolaroids();
  updateSpine();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
