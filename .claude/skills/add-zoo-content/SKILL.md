---
name: add-zoo-content
description: Add a new animal, pen (výběh), food or decoration to the Školní zoo game in web-learning/. Use when the owner asks for a new zvířátko, výběh, dekorace or anything new to buy or place in the zoo.
---

# Add content to the Školní zoo game

Read `web-learning/CLAUDE.md` first (no punishment mechanics, old iPad limits, UI copy rules) and
`web-learning/docs/art-pipeline.md` (style, prompt template, asset log). Model the change on commit `94f4305`, which
added the rabbit, carrot and the Statek pen.

## 0. Decide what is needed

- **An animal** in an existing pen: art, food, steps 2 and 4.
- **An animal that needs a new pen**: also step 3. Reuse a pen if the animal plausibly lives there (a goose on Statek).
- **A decoration**: art, an `ItemId`, a `CATALOG` entry, `PROP_ART`, `PROPS` in `ZooScene.ts`, `THUMBS`.

Pick a price near comparable items in `catalog.ts`. A new animal is additive: no `schema` bump and no backend change.

## 1. Art

Style must match the existing art. Use model `qwen` only, which `tools/imagegen.py` enforces: the server's other
checkpoints are NSFW or furry-leaning and must not be used for a children's app.

```bash
cd web-learning
mkdir -p tmp/art-raw/<name>
python3 tools/imagegen.py "<prompt>" --out tmp/art-raw/<name>/<name>.png --seed 701 --count 3 --transparent
tmp/venv/bin/python tools/cutout.py tmp/art-raw/<name>/<name>-701.png src/zoo/art/img/<name>.png --max-size 256
```

- First use: `python3 -m venv tmp/venv && tmp/venv/bin/pip install pillow numpy scipy`.
- A job failing at once with `RemoteDisconnected` is a server hiccup (seen once after idle): run the command again.
- Use the template from `art-pipeline.md`, with "centered on a transparent background" in place of the green one.
- Look at every candidate over a coloured background and pick one. Reject two eyes on a side view, extra legs, text,
  holes or a figure not facing right. Then generate more seeds rather than accepting a flawed picture.
- `--max-size` is about three times the largest size shown in world pixels (`height` in `ANIMAL_ART` × 3).
- If alpha fails for a subject, use the chroma key from `art-pipeline.md` without `--transparent`.
- Log file, prompt details, seed and size in the asset table of `art-pipeline.md`.

## 2. Wire in an animal (the types catch most of this, if you start with `Species`)

1. `src/state/types.ts`: add to `Species` and `'animal-<id>'` to `ItemId`.
2. `src/zoo/art/animals.ts`: import the picture and add an `ANIMAL_ART` entry (height, bob, tilt, speed, stride, jump, jumps).
3. `src/zoo/catalog.ts`: a `CATALOG` entry (`species`, `needs`, Czech `name`, `hint`) and `SPECIES_NAME`.
4. `src/zoo/game/ZooScene.ts`: `FED_WORD` with the right gender (najedená / najedený).
5. `src/zoo/art/pictures.ts`: `SPECIES_FOOD`. New food also needs a picture, `FxName` and `FX_ART`.
6. `src/zoo/thumbs.ts`: the shop picture in `THUMBS`.

## 3. A new pen

1. `src/state/types.ts`: add to `Biome` and `'pen-<id>'` to `ItemId`.
2. `src/zoo/catalog.ts`: a `CATALOG` entry (`biome`, `capacity`, `w`, `h`, `hint` naming who lives there) and `BIOME_NAME`
   in the **accusative**, because it follows "potřebuje".
3. `src/zoo/game/ZooScene.ts`: a branch in `createPen` with floor colours and scenery. Use `layer`, `blob` and `sheet`;
   anything that stays on screen must not use `fillCircle` or `fillRoundedRect`. Keep a zoo near 25 000 triangles.
4. `src/zoo/art/objects.ts` and `src/zoo/thumbs.ts`: a `PEN_<ID>_ICON` SVG in the same palette, and its `THUMBS` entry.

## 4. Verify

```bash
pnpm --filter web-learning typecheck
pnpm --filter web-learning build
```

Then drive the real build as described under "Testing in a browser" in `web-learning/CLAUDE.md`: buy the pen and the
animal with coins from a grant, feed it, and read a screenshot. Check its size next to the other animals, that it
walks and does its trick, that the shop shows it and that Czech wording is right. Finish with `pnpm test:api` and
`pnpm test:web` (see `/Users/mavo/dev/docs/runbook.md`).

## 5. Finish

- Update `web-learning/docs/art-pipeline.md` and one line of `docs/prd/learning-module-prd.md` if use cases changed.
- If tests passed: redeploy, commit and push to `main` (decision 21), staging files by explicit path.
  If a test failed or was skipped: none of those, and say so.
