# Cat Scroll Demo

A Vite + Anime.js cat animation using the original artwork and all 31 poses recovered from `main catanimations.fig`.

## Run

```sh
npm install
npm run dev
npm test
npm run build
```

Open the normal page for the automatic sequence. Open `/?inspect=1` to select, scrub, pause, or replay individual behaviors. The previous `?edit` URL now opens this animation inspector; old saved layer offsets are no longer applied to the replacement artwork.

## Source and motion

- `public/cat-v2/`: nine original embedded PNGs, including their transparent alignment space. Previous locally edited assets remain in `public/cat/` but are not rendered.
- `src/cat-poses.json`: original image sizes and affine transforms for all 31 poses, expressed in the source's 272 × 231 coordinate system.
- `docs/cat-source-review.html`: self-contained static reference reconstructed from the export.
- `src/cat-motion.js`: hierarchy conversion, angular unwrapping, staggered tracks, and shape-preserving cubic interpolation.
- `src/main.js`: one Anime.js clock and behavior scheduler, SVG layer rendering, optional inspector, and separate smoothed scroll wrapper.

The source drawings are raster layers inside an SVG coordinate system. Feet sit behind the body; all facial details inherit the head transform. Rolling uses a shared rotation parent and local layer offsets. Matrix decomposition preserves rotation instead of stretching layers to their axis-aligned bounds. Tail mirroring passes through the hidden position behind the torso. Kneading uses the recovered poses 03–04 with subtle alternating paw pressure.

Idle repeats for roughly 4.8 seconds. Curious and Angry are occasional one-shots; Kneading plays a short repeated burst; Rolling is infrequent and lasts roughly 2.9 seconds. Each behavior enters and returns through Idle 01. Reduced-motion preference renders a resting cat and disables automatic movement. Hidden tabs pause their animation clock.

Tests cover source placement, head/face parenting, continuous transitions, neutral returns, and forward rotation through inversion.

## Deploy

Import this repository in Vercel. `vercel.json` builds with `npm run build` and publishes `dist`.
