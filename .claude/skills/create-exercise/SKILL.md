---
name: create-exercise
description: Add a new learning exercise (cvičení) to Školní zoo in web-learning/. Use when the owner asks for a new exercise, a new practice mode, or more practice of a school topic (Czech, maths) for the children.
---

# Create an exercise for Školní zoo

Exercises are standalone vanilla-JS HTML pages in `web-learning/exercises/<id>/index.html`, shown in an iframe. They
report finished work with `postMessage`; the app turns that into coins. Read `web-learning/CLAUDE.md` first
(economy, "no punishment" rule, voice rules, UI copy rules).

## 0. Research first

Read `web-learning/docs/exercise-research.md`: exercise types, topics by grade and a ranked idea list drawn from other
Czech practice sites. If the topic is not covered there, look at 2–3 sites (Playwright, they render with JavaScript;
`umimecesky.cz` is behind a Cloudflare challenge, do not bypass it) and add what you learn to that file. Take ideas
only, never copy their words, sentences or rule texts.

## 1. Decide: which kind of page?

- **"Choose the right option" exercise** (i/y, ú/ů, bě/bje, s/z, párové souhlásky...): do not write HTML. Add
  `web-learning/tools/choice/<id>.mjs` (see `parove.mjs`, `uu.mjs`: title, sub, groups with `opts`/`rule`/`desc`,
  `words` as `[group, answer, 'word_|hint ...']`, `~` = space) and run `node tools/build-choice.mjs <id>` from
  `web-learning/`. It writes `exercises/<id>/index.html` from `tools/choice/template.html`. Change the engine only in
  the template, then rebuild all (`node tools/build-choice.mjs`). The generated pages are committed.
- **Typed answers** (numbers): copy `exercises/nasobilka/index.html` (keypad, rounds of 10, dots as the explanation).
- **A different mechanic** (column addition style): copy the closest page by hand.
- More words of an existing topic: extend that config or data list instead of adding a page.

- More words/problems of the same kind: extend the data of the existing page (`ITEMS` in `vyjmenovana`, `souhlasky`).
- A different mechanic or rule set: new exercise `<id>` (short, lowercase, Czech without diacritics, e.g. `souhlasky`).
- Hand-written pages (`souhlasky`, `vyjmenovana`, `scitani`, `nasobilka`) are standalone by design: copy the CSS and
  the voice block (`voiceScore`, `speak`) verbatim.

## 2. The page

- Two script blocks: `<script id="data">` (word lists / generators, no logic) and the app script.
- Words as `'h_ena'` strings with `_` for the gap; `~` stands for a space inside a word; long/short letter as the answer.
- Each item belongs to a group with a one-line rule (`GROUPS`), shown in a rule card; a wrong answer highlights it
  and explains why. Explanations are for an 8–9-year-old: short Czech sentences, no jargon.
- A round is 10 items, balanced between answers; a group filter and a "Procvičit chyby" retry of the mistakes.
- Keyboard support (letters, digits) because the owner tests on a laptop.
- Voice is **off by default** (`voice: saved.voice === true`); speech must never block (`speak()` times out).
- `localStorage` key unique to the page; wrap reads/writes in try/catch.
- Respect `prefers-reduced-motion` (`T()`/`W()` helpers). No timers that punish; no lost points.
- When finished it posts exactly:
  `window.parent.postMessage({ source: 'skolni-zoo-exercise', type: 'reward', exercise: '<id>', event: {...} }, '*')`.
  Send raw events (`correct`, `total`, `mistakes`, `retry`), never coin amounts.

## 3. Wire it into the app (all of these, or the exercise silently earns nothing)

1. `web-learning/vite.config.ts`: input `<id>: resolve(root, 'exercises/<id>/index.html')`.
2. `web-learning/src/state/types.ts`: a round-type exercise adds its id to `RoundExerciseId`; another event shape is added to `ExerciseEvent`.
3. `web-learning/src/exercises.ts`: add an `EXERCISES` entry (title, subject, desc, src); a round exercise also goes into `ROUND_EXERCISES`, any other shape needs its own branch in `parseExerciseMessage` that validates every field with `count(...)`.
4. `web-learning/src/state/economy.ts`: a rule in `rewardFor` (round-type events are already covered, no change).
5. `web/src/modules/learning/pages/LearningPage.tsx`: a name in `EXERCISE_NAMES` for the parents' progress view.
6. Backend needs no change (the exercise name is a free string, max 50 chars).
7. Docs: one line in `web-learning/README.md` and in `docs/prd/learning-module-prd.md`.

## 4. Verify (no test suite)

```bash
pnpm --filter web-learning build        # typechecks too; run after every change
pnpm --filter web-learning exec vite preview --port 4173 --strictPort   # in background
```

Drive the page with Playwright, not by reading code: open
`http://localhost:4173/learning/exercises/<id>/index.html`, play one full round with the keyboard, check there are no
`pageerror`s, and look at a screenshot of mid-round and the result screen. `playwright-cli` is not installed here;
use a small node script importing `playwright-core` from `node_modules/.pnpm/playwright-core@*/` and keep it in the
scratchpad. Stop the preview server afterwards (`pkill -f "vite preview --port 4173"`).
Check the content too: read every word list for spelling mistakes and wrong answers; they are written by Claude and
no teacher has reviewed them. Tell the owner to skim them.

## 5. Finish

- Do not copy content from third-party sites (e.g. gramar.in); take the exercise idea only.
- Commit and push only when asked; stage files by explicit path.
- In `/Users/mavo/dev/docs/decisions.md` add a numbered entry (date, why, cost) and say in one line which docs you updated.
