# Cat Scroll Demo

A Vite + Anime.js proof-of-concept using the supplied hand-drawn cat layers.

## Run locally

```bash
npm install
npm run dev
```

## Deploy to Vercel

Import this folder/repository in Vercel. The included `vercel.json` uses `npm run build` and publishes `dist`.

## Motion architecture

- The outer `.cat-scroll-rig` belongs to scroll choreography.
- The inner `.cat-idle-rig` belongs to ambient Anime.js motion.
- Individual face/body layers run small independent behaviors.
- The tail is under the body in z-order, so it naturally vanishes behind the body.
- Feet use two clipped copies of the same source layer so left/right kneading can be staggered without changing the supplied artwork.

All supplied asset filenames were normalized to avoid leading/trailing spaces on Linux/Vercel.
