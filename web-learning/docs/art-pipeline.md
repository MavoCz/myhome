# Art pipeline

How the zoo's pictures are made, what was tried, and what to keep consistent.

## Style

Chosen by the parent on 2026-10-26: **layered paper cutouts** (variant "C" from a comparison of
pastel / Toca-Boca-like candy / paper cutout). Rounded simple shapes, tiny dot eyes, rosy cheeks,
visible paper texture, soft layering. Every new picture must match it, so always start from the
prompt template below and change only the subject and its details.

Task 001 brought props, flowers and icons into this style. Still drawn: the ground, paths, pens,
fences and hedge (procedural paper layers in `src/zoo/game/paper.ts` and `ZooScene.ts`), the
bubble frame and the shop icons for pens and paths (SVG in `src/zoo/art/objects.ts`, same
palette), and the avatar (SVG rig, task 002).

## Tools

- **Image generator on the LAN**, `http://192.168.2.225:8290` (docs at `/api/docs`): Qwen Image 2.1
  at 25 steps, about 20 s per 1024² image plus about 50 s after idle. Text-to-image only. Use model
  `qwen` only; the server's other checkpoints are not suitable for a children's app.
- `tools/imagegen.py`: queues jobs, saves the PNGs and removes the jobs from the server. Python
  stdlib plus `curl`: macOS Local Network privacy blocks Python's own sockets in `herdr-core`
  sessions ("No route to host"), while `curl` gets through.
- **Local ComfyUI** on the parent's other Mac, `~/Documents/personal/dev/ComfyUI`, used for the art
  made before 2026-10-31 and still the only way to edit from a reference image. The parent starts
  it themselves (do not start it for them):
  `cd ~/Documents/personal/dev/ComfyUI && .venv/bin/python main.py --listen 127.0.0.1 --port 8188`.
  Port 9300 on that machine is an unrelated work service, not ComfyUI.
  Models: `qwen_image_2.1_turbo_Q6_K.gguf` (4 steps, ~1–1.5 min per 1024² image there) and
  `qwen_image_2.1_Q8_0.gguf` (25 steps, slower).
- `tools/comfy_gen.py`: talks to that ComfyUI, not to the LAN generator. Queues a text-to-image (or
  edit) job and saves the PNG. Python stdlib only. Source/reference images keep their alpha
  (LoadImage + JoinImageWithAlpha).
  The parent's own `user/qwen_gen.py` in the ComfyUI folder does the same without alpha; leave it alone.
- `tools/cutout.py`: removes the background, crops to the figure, scales to at most `--max-size`
  (default 640) px. A picture with real transparency keeps it and is only cropped and scaled. The
  chroma key works for keys with one strong channel (green, blue) or two (magenta).
  Needs Pillow, numpy and scipy. On the hosting Mac use a venv in the git-ignored `tmp/`:
  `python3 -m venv tmp/venv && tmp/venv/bin/pip install pillow numpy scipy`, then
  `tmp/venv/bin/python tools/cutout.py in.png out.png`.

## Prompt template

```
Cute <subject> made of layered colored paper cutouts, children's game art, standing in side view
facing right, full body, rounded simple shapes, tiny dot eyes, rosy cheeks, <details>, visible
paper texture, centered on a flat solid bright green background (#00ff00 chroma key green),
no ground, no text
```

- Animals face **right**; the game flips them.
- With `tools/imagegen.py --transparent`, replace the background part with "centered on a transparent
  background". No key is needed, so the notes on key colours below apply only without it.
- **Background green**, not white. `cutout.py` sees a saturated border colour and switches to chroma
  keying: transparency follows how much of the background hue a pixel carries, so the background's
  own shadows go too, edges stay soft, and green spill is removed. On a white background the
  white/light mode removes every light area touching the border, which ate the penguin's belly.
- Subjects that are green themselves (frog, parrot, crocodile, trees, bushes) need another key
  colour: ask for `flat solid bright magenta background (#ff00ff)`. The keyer uses whatever the
  border colour is.
- Subjects with green leaves *and* pink, red or purple parts (flowers) use
  `flat solid bright blue background (#0000ff chroma key blue)`; purple petals survived it.
- For props and icons replace "standing in side view facing right, full body" with a view that
  suits the object ("seen slightly from above, front view", "single object, front view", "seen from
  above at an angle"), drop "tiny dot eyes, rosy cheeks" (no faces on objects) and add
  "no shadow". The exact prompts are in the table below.
- If the model drifts into photographic textures (real soil, pebbles, stone) or rainbow collage
  layers, say what the parts are cut from: "every part cut from plain single-colour brown paper",
  "simple flat shapes", "only two colours: dark brown and light grey, no rainbow layers".

## Generated assets

| File | Prompt variant | Seed | Background | Notes |
|---|---|---|---|---|
| `src/zoo/art/img/giraffe.png` | paper cutout, "standing in side view facing right … plain white background" | 202 | white | made before the green-screen switch; the light-mode cut needed the colourless-shadow rule |
| `src/zoo/art/img/penguin.png` | template above, details "small orange beak and feet, white belly" | 303 | green | |
| `src/zoo/art/img/rabbit.png` | template above, details "light grey-brown fur, long upright ears with pink insides, white belly and white fluffy round tail" | 402 | green | `--max-size 256`; seeds 401 and 403 were close seconds |
| `src/zoo/art/img/elephant.png` | template with `--transparent`, details "soft grey body, big round ears with pink insides, short curled trunk, small white tusks, four sturdy legs, small tail" | 702 | real alpha | `--max-size 560` (shown about 176 px wide); seed 703 came out opaque |

Task 001 props and icons all use this prop template (only `<view>`, `<subject>`, `<details>` and
`<key>` change; `<text>` is "no text" except for the gate):

```
Cute <subject> made of layered colored paper cutouts, children's game art, <view>, rounded simple
shapes, <details>, visible paper texture, centered on a flat solid bright <key> background
(<hex> chroma key <key>), no ground, no shadow, <text>
```

| File | View · subject · details | Seed | Key | Size |
|---|---|---|---|---|
| `tree.png` | slightly from above, front · round leafy park tree · short brown trunk, big fluffy crown of layered green leaf shapes | 12 | magenta | 512 |
| `bush.png` | slightly from above, front · small round bush · layered green leaves, a few small red berries | 22 | magenta | 256 |
| `bench.png` | slightly from above, front · wooden park bench · backrest of two plain horizontal brown planks, seat of plain brown planks, dark brown legs, every part cut from plain single-colour brown paper | 36 | green | 400 |
| `fountain.png` | slightly from above, front · round park fountain · simple flat shapes cut from plain light grey paper, basin full of flat blue paper water with a lighter blue paper ripple, small grey column with a little bowl on top, short splash of water | 44 | green | 420 |
| `gate.png` | front · zoo entrance gate · two thick wooden posts joined by a curved wooden arch, cream sign on the arch; text: the sign reads "ZOO" in big friendly letters, no other text | 53 | green | 640 |
| `bed.png` | from above at an angle · small low flowerbed · flat oval of plain dark brown paper soil framed by a ring of round light grey paper pebbles, only two colours: dark brown and light grey, no rainbow layers, no seeds, no plants, simple flat shapes | 67 | green | 256 |
| `seeds.png` | single object, front · three small seeds · plain light beige paper seeds lying side by side, simple flat shapes | 182 | green | 96 |
| `sprout.png` | single object, front · tiny seedling sprout · short green stem with two small round leaves | 71 | blue | 160 |
| `bud.png` | single object, front · young flower plant · green stem and leaves, one closed green flower bud on top | 81 | blue | 192 |
| `bloom-<colour>.png` | single object, front · flower plant · green stem and leaves, three open `<colour>` flowers with round petals and yellow centers (pink, purple, red, orange, yellow) | 91 | blue | 224 |
| `leaves.png` | single object, front · small bunch of fresh leaves on a twig · bright green leaves | 101 | magenta | 160 |
| `fish.png` | single object, front · small fish · orange body, tiny dot eye, simple tail fin, side view facing left | 112 | green | 160 |
| `carrot.png` | single object, front · carrot · one orange carrot with a few short green leaves on top, simple flat shapes | 411 | magenta | 160 |
| `salad.png` | single object, front · head of green lettuce salad · round head of fresh ruffled bright green leaves, simple flat shapes (`--transparent`, which gave no alpha) | 711 | white | 160 |
| `can.png` | side view · small watering can · blue body, long spout pointing right, round handle | 121 | green | 160 |
| `heart.png` | single object, front · heart · pink and red layers | 132 | green | 96 |
| `drop.png` | single object, front · water drop · light blue and blue layers | 141 | green | 160 |
| `coin.png` | single object, front · gold coin · yellow and golden layers, a paw print in the middle | 152 | green | 128 |

Size is the `--max-size` given to `cutout.py`: about three times the largest size the picture is
shown at in world pixels, so it stays sharp at full zoom on a retina tablet.

Raw outputs (style comparison and all task 001 candidates) are kept locally in `tmp/art-raw/`
(git-ignored).

## Findings

- **Real transparency works on the LAN generator** with `transparent: true` (2026-10-31): an
  elephant and two white geese came out with clean edges, and white bodies survive. The local
  ComfyUI workflow gives no alpha: it comes out opaque (min ~224), and asking for a "transparent
  background" there paints a checkerboard. `elephant.png` is the first game picture with real alpha. Alpha is not reliable: 2 of 3 elephants and
  0 of 3 salads kept it, so check `getextrema()` of each candidate. Lettuce under a magenta key drifted
  to photographic leaves; the opaque white candidate was the most paper-like and `cutout.py` cut it cleanly.
- Edit mode with a reference image is very slow on the local ComfyUI (one run took ~19 min); text-to-image
  takes ~1–1.5 min. Prefer text-to-image with the fixed template for consistency.
- For objects the model readily paints photographic materials (soil, pebbles, stone) or
  multicoloured collage and rainbow edge layers ("layered" invites them). Naming plain
  single-colour paper fixed benches, the fountain and the flowerbed on the second try.
- Fence segments and an ice-block wall were generated too (seeds 161/162, 171/172 in
  `tmp/art-raw/t001/`) but not used: tiled segments double their end posts, and the drawn
  two-tone paper fences fit well enough.
- ComfyUI also ships a "Remove Background (BiRefNet)" blueprint; its model is not downloaded.
  Worth trying only if chroma keying fails for some subject.

## In the game

- Animal pictures are loaded onto power-of-two canvases (`loadPicture` in `src/zoo/textures.ts`,
  texture frame `pic`) because WebGL 1 builds mipmaps only for POT textures, and
  `render.mipmapFilter` is on in `createGame.ts`. Without mipmaps the paper texture shimmers when
  the camera zooms out.
- Props, plants and effect icons are listed in `src/zoo/art/pictures.ts` with their size in world
  pixels (`width` and `lift` for props, `height` for plants, `size` for icons). A flowerbed is the
  bed picture plus one plant picture (seeds, sprout, bud, a bloom picked by the bed's id); need
  bubbles are the SVG frame with the food or drop picture drawn in by `textures.ts`.
- Display size and motion per species live in `ANIMAL_ART` (`src/zoo/art/animals.ts`): world
  height, bob and tilt, walking speed and stride, and how high and how often it jumps in a trick. Motion is procedural in `src/zoo/game/animal.ts` (hop/lean/squash walk,
  breathing idle, squash-and-stretch tricks, bow when eating), so a single picture per animal is
  enough.
