# Exercise research: what other Czech practice sites do

Researched 2026-10-28 by loading the sites' public pages (Playwright, because most render with JavaScript). Only the
**ideas** are recorded here. Do not copy their word lists, sentences or rule texts; write our own.
Use this before `create-exercise` when picking a new exercise type or topic.

## Sites checked

| Site | What it is | Useful for us |
|---|---|---|
| gramar.in / matika.in | Same family. Task catalogue per grade (1–9), 12-item sets, game modes, collectible animals and badges | Closest to our idea; grade structure and task names |
| umimecesky.cz / umimematiku.cz (Umíme to) | Largest platform. Matika page loads, **umimecesky.cz is behind a Cloudflare challenge** (not bypassed) | Catalogue of exercise types, pedagogy page |
| mojecestina.cz | Explanation articles plus themed tests (animals, poems, a letter from Hogwarts) with explanations after scoring | Topic "Měkké a tvrdé souhlásky" is covered by ~13 themed tests and articles about exceptions |
| cestina.diktaty.cz | 358 fill-in dictations in 12 themes, ranked lists, random dictation | Topic list (see below) |
| pravopisne.cz | 900+ exercises, 1400 "common mistakes" pairs (x vs ×), rule articles, student profile | Rule articles, "common mistakes" idea |
| skolasnadhledem.cz | Fraus publisher; free exercises by grade and textbook, paid Premium for teachers/parents | Little visible without login; not studied further |

**The list the owner pasted was partly wrong.** `online-cviceni.cz` is a product-review site (coffee makers,
chainsaws), not an exercise site. Claims such as "most used" or "more gamification" were not verified.

## Exercise types seen (Umíme to catalogue)

- Basic: **Rozhodovačka** (choose one of a few), **Pexeso**, **Krok po kroku** (step by step), **Psaná odpověď**
  (typed answer), **Slovní úlohy**, **Porozumění** (reading comprehension), **Označování** (mark the mistake or part in a text),
  **Doplňování textu** (fill into text), Grafař.
- Interactive: **Přesouvání** (drag items into places), **Mřížkovaná**, **Rozdělovačka** (sort into groups),
  **Rozbitá kalkulačka**.
- Speed games: Roboti, Střílečka, Příšerky. Multiplayer: Závody, Územíčka, Tipovačka, Týmovka.
- Dictation: audio, sentence by sentence, automatic check and hints for fixing mistakes.
- Their stated principles: immediate feedback with an explanation, **temporary support** (hints that fade),
  practice not testing, many items so a weak start still works, speed games only as an extra because a time
  limit can stress children. Matches our "no punishment" rule.

## Topics and structure worth borrowing

- **gramar.in grade 2**: Doplň I Í, U Ú Ů, I Í Y Ý; be/bě, me/mě, pe/pě, ve/vě; párové souhlásky (B–P, D–T, Ď–Ť,
  V–F, H–CH, Z–S, Ž–Š); sort words alphabetically; split into syllables or sounds; find nouns, verbs,
  prepositions, conjunctions.
- **grade 3**: vyjmenovaná slova per letter and a summary, i/í/y/ý summary, parts of speech, word root.
- **grade 4**: shoda podmětu s přísudkem, všichni/všechny/všechna, si/jsi, bě/bje, vě/vje, pě/pje, sebou/s sebou, sentence
  parts (podmět, přísudek…), noun patterns (vzory), case determination.
- **diktaty.cz themes**: vyjmenovaná slova (97), summary fill-ins (48), entrance exams, ů/ú, bě/bje/mě/mně,
  **i/y in endings (nouns, adjectives, past participle)**, paired consonants, s/z in prefixes, capital letters, i/y after C.
- **mojecestina.cz**: i/y after hard/soft consonants as a themed story test with an explanation of each answer;
  separate articles on words with soft i after hard consonants (rizoto, princ) and hard y after soft ones.
- **pravopisne.cz**: "common mistakes" as word pairs (zapoměl × zapomněl, byste × by jste, samy × sami).
- gramar.in also has **games over the same tasks** (ladder, maze, race, hexagon, map) against the computer or a friend, and
  collectible animals as the reward, which is the same idea as our zoo.

## Ideas for us, ranked

1. ✅ done (`parove`). **Paired-consonant exercise** (B–P, D–T, Ď–Ť, V–F, H–CH, Z–S, Ž–Š): "which letter at the end of the word?" with the
   test word (hrad → hrady). Grade 2, a rule that fits our rule-card style. New exercise.
2. ✅ done (`bje`: bě/bje, vě/vje, mě/mně; pě not). **bě/bje, vě/vje, pě, mě/mně** (grades 2 and 4): small, one rule per group like `souhlasky`. New exercise.
3. ✅ done (`koncovky`: nouns, adjectives, past participle). **i/y in endings** beyond adjectives: nouns (vzory) and past participle (hráli × hrály). Extend `souhlasky` group
   `end`, or a new exercise when it grows.
4. ✅ done (`uu`, `predpony`). **Ů/Ú** and **s/z in prefixes**: short, rule-based.
5. **Exceptions article idea** (rizoto, princ, ski): a "výjimky" group in `souhlasky` for hard consonant + soft i.
6. ✅ multiplication table done (`nasobilka`); the rest is open. **Maths**: matika.in grade 2 lists multiplication tables (Malá násobilka), pyramids, triangles, "hadi" (snake sums),
   neighbours, clock reading ("Kolik je hodin?"), word problems. Column addition and subtraction exist today. Multiplication
   table is the obvious next one.
7. **Mix modes**: a summary mode across groups and a "choose the length yourself" mode are done in `souhlasky`.
8. **Story-themed rounds** (mojecestina): text with several gaps instead of single words; not done yet.
9. **Mistake pairs** (pravopisne.cz): a "which spelling is right" two-button exercise.

## Column subtraction methods (checked 2026-10-31)

Czech sources differ in how they handle a too-small top digit: matika.in counts up from the bottom digit and adds the
1 to the next bottom digit (used in `odcitani`), umimematiku.cz describes borrowing a ten and subtracting 1 more in the
next column, diktatyapriklady.cz adds 10 to the top digit. Ask which one the children's school uses before changing it.

## Not worth doing now

- Speed games and multiplayer (our rule: no pressure; two children on one tablet).
- Login/profile features: the zoo already tracks progress.

## Caveats

- umimecesky.cz could not be read (Cloudflare challenge). The Umíme to material above comes from the matika and
  "typy cvičení" pages of the same platform.
- Sites change; the numbers (exercises per theme) are from 2026-10-28.
