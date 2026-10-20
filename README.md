# 🎵 audio/

Name your song file exactly **`our-song.mp3`** and drop it in this folder.
The music player in the bottom-right will find it on its own.

**Or use one of these instead:**

1. **A direct link** — open `script.js`, find the `CONFIG` block at the top, and
   paste a direct `.mp3` URL into `music.url`.
   ```js
   music: {
     title: "Our Song",
     artist: "The Artist",
     url: "https://.../our-song.mp3"
   }
   ```
2. **The gear button** — click ⚙ on the music player, then paste a link or pick
   a file from your device. Handy for a quick test.

**A note about hosting:** if you put this site on Netlify, Vercel, GitHub Pages
or anywhere else, make sure your audio file is actually included in the upload
(it lives in this `audio/` folder, so upload the whole folder, not just the
HTML file).
