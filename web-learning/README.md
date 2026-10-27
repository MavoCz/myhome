# Školní zoo

Cvičení pro děti (sčítání pod sebou, vyjmenovaná slova). Za vyřešená cvičení děti dostávají bodíky a za ně si staví vlastní zoo, kterou procházejí s postavičkou: krmí zvířátka, zalévají kytičky a navštěvují zoo sourozenců.

## Spuštění

```bash
# z kořene repozitáře myhome
pnpm install
pnpm dev:learning                      # http://localhost:5175/learning/, na tabletu přes IP adresu počítače
pnpm --filter web-learning build       # hotový web do backend/src/main/resources/learning-static/
pnpm --filter web-learning typecheck
```

Hotový web servíruje backend myhome na adrese `/learning/`.

## Jak je to poskládané

- `src/` – aplikace v Reactu + TypeScriptu: profily, domovská obrazovka, peněženka, obchod.
- `src/state/` – data (Zustand, ukládá se do `localStorage` pod klíčem `skolni-zoo`) a `economy.ts`, kde jsou všechny ceny, odměny a časy krmení/zalévání.
- `src/zoo/` – zoo v Phaseru 3: `game/ZooScene.ts` (mapa, stavění, procházka), `game/animal.ts`, `game/player.ts`, grafika v `art/` (zvířata, rekvizity, kytičky a ikonky jako obrázky v `art/img/`, postavička jako SVG; zem, cesty a výběhy kreslí scéna), katalog obchodu v `catalog.ts`.
- `exercises/` – samostatné stránky cvičení. Aplikace je zobrazuje v rámu; po vyřešení příkladu nebo kola pošlou rodiči `postMessage` (`source: 'skolni-zoo-exercise'`) a bodíky spočítá `rewardFor` v `economy.ts`.

## Přidání cvičení

1. Nová stránka v `exercises/<id>/index.html`, která po dokončení práce pošle `window.parent.postMessage({ source: 'skolni-zoo-exercise', type: 'reward', exercise: '<id>', event: {...} }, '*')`.
2. Přidat vstup do `vite.config.ts`, záznam do `src/exercises.ts` (včetně kontroly zprávy v `parseExerciseMessage`) a pravidlo do `rewardFor`.

## Grafika zvířat

Zvířata jsou obrázky ve stylu papírových vystřihovánek, vygenerované v lokálním ComfyUI (Qwen Image 2.1) na zeleném pozadí a vyříznuté skriptem:

```bash
python3 tools/comfy_gen.py "Cute fox made of layered colored paper cutouts, ... flat solid bright green background ..." --seed 1 --out tmp/fox.png
~/Documents/personal/dev/ComfyUI/.venv/bin/python tools/cutout.py tmp/fox.png src/zoo/art/img/fox.png
```

Celý prompt, seznam vygenerovaných obrázků a zjištění jsou v `docs/art-pipeline.md`. Rozpracované úkoly jsou v `docs/tasks/`.

## Data

Všechno je uložené jen v prohlížeči daného zařízení. Na obrazovce výběru profilu je stažení a obnovení zálohy (JSON).
