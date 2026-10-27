# 001 – Paper-cutout style for the rest of the zoo

Status: **done** · created 2026-10-26 · finished 2026-10-26

## Goal

The giraffe and the penguin are now generated paper-cutout pictures (see `docs/art-pipeline.md`).
Everything around them is still the older flat SVG style, so the zoo looks mixed. Bring the rest
of the visible zoo into the same paper-cutout style.

## Outcome

- Steps 1–3 done: props, flower stages (bed + seeds/sprout/bud/5 bloom colours), food, can, heart,
  drop, coin and bubble icons are generated pictures (`src/zoo/art/pictures.ts`, list with prompts
  and seeds in `docs/art-pipeline.md`); the shop uses them. Ground, paths, pens, fences and hedge
  are procedural paper layers (`src/zoo/game/paper.ts`); pen and path shop icons are SVG in the
  same palette. Generated fence segments were tried and not used (see art-pipeline findings).
- `tools/cutout.py` now keys magenta (two strong channels) as well as green and blue.
- Step 4 (avatar): the parent chose to keep the SVG avatar for now; moved to task 002.

## State before this task

- Animals: pictures in `src/zoo/art/img/`, listed in `ANIMAL_ART` (`src/zoo/art/animals.ts`),
  loaded by `loadPicture` in `src/zoo/textures.ts` onto power-of-two canvases (frame `pic`),
  animated procedurally in `src/zoo/game/animal.ts`.
- Still SVG in `src/zoo/art/objects.ts`: tree, bush, bench, fountain, gate, flowerbed (stages 0–3
  with four petal colours), food icons (leaves, fish), watering can, heart, water drop, the
  need bubbles, shop icons for pens and paths, the coin.
- Still SVG rig in `src/zoo/art/avatar.ts`: the girl the child walks with; hair, outfit and skin
  colours are chosen per profile in `ProfileEditor`.
- Drawn with Phaser graphics in `src/zoo/game/ZooScene.ts`: grass tile, paths, pen floors and
  fences, the hedge around the zoo.

## Scope, in this order

1. **Props as pictures**: tree, bush, bench, fountain, gate, flowerbed in 4 growth stages (seeds,
   sprout, bud, bloom; bloom in 3–4 colours). Generate with the template in
   `docs/art-pipeline.md` (adapt the view to an object; green things on magenta), cut out with
   `tools/cutout.py`, place them like the current SVG sprites: anchored bottom-middle of the
   footprint, depth = bottom y. Keep the tree's gentle sway and the fountain's spray.
2. **Small icons**: leaves, fish, watering can, heart, drop, and the need bubbles (the bubble frame
   can stay drawn; only the icon inside changes). Shop thumbnails in `src/zoo/thumbs.ts` should
   use the new pictures.
3. **Pens, paths, ground, hedge**: restyle so they sit well next to paper cutouts: paper-like
   colours, soft layered edges, maybe a subtle paper texture. Generated tiles risk visible seams;
   procedural drawing with a matching palette is acceptable. Fences could become generated
   fence-segment pictures.
4. **Avatar**: needs a decision from the parent first (ask, do not guess):
   - a) a set of ~6 generated girls (different hair and outfits) to pick from in the profile
     editor instead of colour swatches; best quality, simplest; animated like the animals
     (hop/lean walk, arm raise replaced by a small jump or lean when feeding/watering), or
   - b) keep colour customisation by generating separate layers (hair, outfit, skin) in neutral
     grey and tinting them in Phaser; much more work, fragile.
   Existing profiles store `avatar: { hair, outfit, skin }`; option a) needs a migration that maps
   them to the closest variant.

Remove SVG code that the new pictures replace (no dead branches).

## Done when

- Everything visible in the zoo except the procedural ground matches the paper-cutout style, and
  the shop shows the new pictures.
- Every generated picture is listed in `docs/art-pipeline.md` with prompt, seed and key colour.
- No green/magenta fringe and no shimmering when zoomed out (screenshots at default zoom, fully
  zoomed out and zoomed in).
- `npm run build` passes; walking, feeding, watering (all flower stages), building, removing and
  visiting still work in the browser (see "Testing in a browser" in `CLAUDE.md`).
- Changes committed.

## Notes

- **ComfyUI is started by the parent.** Ask them to run it (command in `docs/art-pipeline.md`)
  before generating; check `curl -s http://127.0.0.1:8188/system_stats`.
- Text-to-image takes ~1–1.5 min per picture on turbo; run batches in the background. Edit mode
  with reference images is very slow (~19 min), avoid it.
- Show the parent a contact sheet of candidates (several seeds) before wiring pictures into the
  game; copy it to `tmp/` (git-ignored) so they can open it.
- Display sizes: props are designed at 64 px per tile; a 2×2 tree is 128 px wide. Pictures should
  be at least ~3× their display size for sharpness when zoomed in (cutout.py caps at 640 px; raise
  `--max-size` for large props like the gate).

## Follow-ups (separate tasks later)

- More animals for existing biomes (savana: lion, zebra, elephant; ice: seal, polar bear) and new
  biomes with their own pens (forest: monkey, bear; pond: flamingo, duck).
- PWA (installable, offline) and deployment to Netlify or GitHub Pages.
- Sync between two tablets (visits currently work only on one device).
