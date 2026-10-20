# For You 💗

A little museum of us. One page, beige and blush pink, smooth as silk.

**Your photos are already in. Three things left:**

| # | Do this | Where |
|---|---|---|
| 1 | **Put her name in** | `script.js` → `CONFIG.herName` |
| 2 | **Put your start date in** | `script.js` → `CONFIG.startDate` |
| 3 | **Drop in your song** | `audio/our-song.mp3` |

That's it. Then send her the link.

---

## 1. Her name & your anniversary

Open **`script.js`** — the `CONFIG` block is at the very top:

```js
const CONFIG = {
  // ⚠️  CHANGE THESE TWO LINES  ⚠️
  herName: "you",                 // ← HER NAME. Big on the opening screen.
  startDate: "",                  // ← e.g. "2023-02-14" → lights up the days counter

  memoryCount: 8,                 // ← how many chapters you wrote

  music: {
    title: "Our Song",            // ← track title
    artist: "add a track",        // ← artist name
    url: ""                       // ← paste a direct .mp3 link here (optional)
  },

  petals: 26                      // ← floating petals; set to 0 to turn them off
};
```

Her name shows on the opening screen ("For ███"), in the top-left corner, and
in the first line of the hero. The start date turns the `∞` in the stats row
into a live count of days together.

## 2. The chapters

The text is already written around your actual photos. To change it, open
**`index.html`** and look for the block marked:

```
<!-- ─────── EDIT BELOW: copy a whole <article class="tl-item tl-item--right"> block ─────── -->
```

Each chapter is one `<article class="tl-item">`. Three things to change:

| What | Where |
|---|---|
| The small label | `<p class="tl-date">Chapter One</p>` |
| The title | `<h3 class="tl-title">…</h3>` |
| The story | `<p class="tl-body">…</p>` |

**Left or right side?** Add `tl-item--right` to the class for the right side,
leave it off for the left.

**Add a chapter?** Copy a whole `<article>` block, paste it after the last one,
and add `photos/09.jpg`.

## 3. The photos

✅ Done. See `photos/README.md` for what's where and how to swap one out.

## 4. The song

Drop your track into **`audio/`** as **`our-song.mp3`** — the player in the
bottom-right corner finds it on its own. Or paste a direct MP3 link into
`CONFIG.music.url`. More detail in `audio/README.md`.

## 5. Send it to her

The whole folder is the website — it works offline, on a USB stick, or hosted free.

- **Free hosting:** drag the folder onto [Netlify Drop](https://app.netlify.com/drop),
  or push it to GitHub and turn on Pages.
- **Quick local preview:** double-click `index.html`, or run
  `python3 -m http.server 8000` in this folder and visit `localhost:8000`.
- **As a file:** send her the folder zipped, or put it on a USB stick.

---

## What's inside

```
index.html         the page + all the chapter text
styles.css         colours, layout, every animation
script.js          animations, photo slots, music player  ← edit CONFIG here
photos/            your pictures (already in)
audio/             your song (drop it here)
threed/threed.js   the 3D source (opening screen + gallery)
threed/bundle.js   the 3D build the browser loads  ← don't hand-edit
vendor/            three.js r160 (build-time dependency only)
```

## The 3D parts

Two live 3D scenes, both built from your real photos with three.js:

1. **The opening screen** — the three polaroids float in space above the hero,
   tilting, drifting and catching the light as you move the mouse.
2. **The gallery** — a pinned section where all eight photos orbit in a slow
   ring. Scroll to spin it, hover a card to read its chapter name, click it to
   jump straight to that chapter.

If your browser can't do WebGL, the page quietly falls back to the flat
version — the gallery hides itself and the polaroids come back as normal
photos. Nothing breaks.

**Changing the 3D?** Edit `threed/threed.js`, then rebuild:

```bash
npx --yes esbuild@0.21.5 threed/threed.js \
  --bundle --minify --format=iife --global-name=ForYou3D --target=es2019 \
  --outfile=threed/bundle.js
```

`index.html` loads `threed/bundle.js` — the file the browser actually reads.

**The polaroid captions** (the handwriting on the 3D cards) are still written
in `index.html`, inside each `<figure class="polaroid">`. The 3D picks them up
automatically, so you can retype them there as normal.

**The palette** lives at the top of `styles.css` as `--beige-1`, `--pink-2`,
`--rose` etc. Change a couple of those and the whole site shifts with them.

**Extras you can turn on:** set `petals: 26` to `0` in the config to stop the
drifting petals, or hide the opening seal by deleting the `<button class="seal">`
in `index.html`.

**If the 3D looks wrong on your screen:** the card sizes are derived from the
window size, so try a full-screen browser window (not a narrow split screen)
and make sure browser zoom is at 100%.

---

Made with care. Now go get her. 💗
