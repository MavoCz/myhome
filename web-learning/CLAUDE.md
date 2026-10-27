# CLAUDE.md

Školní zoo: learning exercises for two girls (3rd grade) on a tablet. Solving exercises earns coins ("bodíky"); coins buy enclosures, animals and decorations in a walkable zoo. See README.md for the overview and file map.

## Docs and tasks

- Documentation that should outlive a conversation goes to `docs/` (e.g. `docs/art-pipeline.md`).
- Work to pick up in a new context goes to `docs/tasks/NNN-short-name.md`: status line, goal,
  current state, scope in order, "done when", notes. Update the status (`ready`, `in progress`,
  `done`) as work moves on, and add a follow-up task file rather than growing a finished one.
- `tmp/` is git-ignored scratch space (raw generations, contact sheets for the parent).

## Commands

This app is the `web-learning` package of the myhome pnpm workspace. From the repo root:

```bash
pnpm dev:learning                       # Vite dev server on :5175 with --host (tablet on the same Wi-Fi), /api proxied to :8080
pnpm --filter web-learning typecheck    # tsc --noEmit; run after every change
pnpm --filter web-learning build        # typecheck + build into backend/src/main/resources/learning-static/
pnpm --filter web-learning preview      # serve the build (used for browser testing)
```

The backend serves the build at `/learning/` (`LearningResourceConfig`, `SpaForwardingController`), so the
Vite `base` is `/learning/`. It builds outside `static/` because the main web build empties that folder.
Exercises run in same-origin iframes; `SecurityConfig` sends `X-Frame-Options: SAMEORIGIN` for that.

There is no test suite. Verify changes by building and driving the app in a browser (see Testing).

## Architecture in one paragraph

React + TypeScript + Vite app (`src/`) with Zustand state persisted to `localStorage` (`skolni-zoo` key). The zoo is a Phaser 3 scene (`src/zoo/game/ZooScene.ts`) mounted inside the React `ZooScreen` and lazily loaded because Phaser is ~1.2 MB. Exercises are standalone HTML pages in `exercises/` (vanilla JS, inline scripts), shown in an iframe; they report finished work via `postMessage` and the app turns that into coins.

## Rules that are easy to break

- **Phaser is pinned to 3.90.0 on purpose.** Do not upgrade to Phaser 4 without a reason; the scene uses Phaser 3 APIs (`tweens.chain`, `add.particles(x, y, key, config)`, `textures.addCanvas`).
- **All dependency versions are exact pins.** Keep them exact when adding packages.
- **Economy numbers live only in `src/state/economy.ts`** (prices are in `src/zoo/catalog.ts`). Exercises send raw events (`mistakes`, `correct`, `total`…), never coin amounts; `rewardFor` computes coins.
- **Exercise messages are validated** in `parseExerciseMessage` (`src/exercises.ts`). A new exercise needs: a page in `exercises/<id>/`, an input in `vite.config.ts`, an entry and parser branch in `src/exercises.ts`, and a rule in `rewardFor`.
- **No punishment mechanics.** Animals never starve, flowers never wilt, nothing is lost for skipping days. Feeding and watering only have cooldowns. Coins reward effort, not speed. Keep it that way when adding features.
- **Voice is off by default** in exercises (`voice: saved.voice === true`). The parent asked for this; only an explicit toggle turns it on.
- **Speech must never block the exercise.** `speak()` skips when no voices exist and has a short length-based timeout, because some devices never fire `onend`.
- **The scene's source of truth is the Zustand store.** The scene subscribes and rebuilds the changed parts in `sync()`; scene code changes data only through store actions (`build`, `addAnimal`, `feed`, `water`…), never by mutating views.
- **`sync()` runs during `create()`**, before Phaser marks the scene active, so guard with the `stopped` flag, not `sys.isActive()` (that bug hid all objects once).

## Art and animation

Full pipeline, prompt template, asset log and findings: `docs/art-pipeline.md`. The essentials:

- Animals are paper-cutout pictures generated with Qwen Image 2.1 in the parent's local ComfyUI
  (`tools/comfy_gen.py`), keyed out of a green background (`tools/cutout.py`), listed in
  `ANIMAL_ART` (`src/zoo/art/animals.ts`) and animated procedurally (`game/animal.ts`).
- The parent starts ComfyUI; never start it for them. Qwen Image 2.1 gives no real transparency
  here, so never rely on alpha from the model.
- Pictures are loaded onto power-of-two canvases (frame `pic`) so WebGL 1 can build mipmaps;
  without them the paper texture shimmers when zoomed out.
- Props, flower stages and effect icons are pictures too (`src/zoo/art/pictures.ts`, sizes in world
  pixels). A flowerbed is a bed picture plus a plant picture per stage; need bubbles are a drawn
  frame with a picture composed in `textures.ts`. Place pictures with frame `pic` (`picture()` in
  `game/rig.ts`), never the bare texture.
- Grass, paths, pens, fences and the hedge are drawn procedurally as layered paper
  (`game/paper.ts`: wobbly shapes with a soft shadow, a paper grain multiplied over the ground).
- The avatar is still a hand-written SVG rig of parts rotating around pivots (`game/rig.ts`);
  task 002 replaces it.
- Props are laid out at 64 px per tile, anchored bottom-middle of their footprint; depth = bottom y.
- The canvas is `devicePixelRatio` times larger and scaled down (`createGame.ts`) because Phaser 3
  has no HiDPI support; camera zoom limits are multiplied by `dpr`.

## Camera controls

- One finger or left mouse drag pans; a tap (under 10 px of movement) walks or builds. With the path tool selected, a left drag paints paths instead, so right or middle mouse drag and two fingers always pan.
- Two fingers on a touch screen: spread to zoom around their midpoint, move together to pan.
- Wheel events are split in `setupInput`: ctrl + wheel is a trackpad pinch (zoom), big steps or line mode are a mouse wheel (zoom around the cursor), small deltas or any horizontal delta are two-finger trackpad scrolling (pan). `createGame.ts` cancels the browser's own wheel handling so the page never zooms.
- Arrow keys / WASD pan, `+` / `-` zoom.

## UI copy

- All UI text is Czech, written for an 8–9-year-old: short sentences, concrete instructions ("Klepni na výběh."), no jargon.
- Mind Czech grammar: currency plural via `coinsWord(n)` (bodík / bodíky / bodíků); animal adjectives agree with gender (`FED_WORD` in `ZooScene.ts`: žirafa → najedená, tučňák → najedený).
- Both profiles are girls, but keep generic UI wording gender-neutral where Czech allows it.

## Testing in a browser

`playwright-cli` is installed. Typical loop: `pnpm --filter web-learning build`, start `pnpm --filter web-learning exec vite preview --port 4173 --strictPort` as a background task, `playwright-cli open http://localhost:4173/learning/`, act, `playwright-cli screenshot --filename=…`, then read the image. Gotchas:

- `playwright-cli eval` takes a **function expression** (`"() => …"` or `"async () => …"`), not an IIFE; an IIFE runs its side effects and then reports an error.
- The canvas is driven with `playwright-cli mousemove x y` + `mousedown` + `mouseup` (a tap). Pinch zoom cannot be tested this way.
- Exercises can be solved from the parent page via `document.querySelector('iframe').contentDocument` and dispatched `keydown` events (digits for sčítání, `i`/`y`/`Enter` for vyjmenovaná slova).
- To test shopping, raise coins by editing `localStorage['skolni-zoo']` (`state.profiles[n].coins`) and reloading.
- Stop the preview server with TaskStop when done.
