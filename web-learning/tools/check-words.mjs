// Spell-checks the words of the exercises with the Czech Hunspell dictionary of LibreOffice
// (https://github.com/LibreOffice/dictionaries/tree/master/cs_CZ, GPL; downloaded into the git-ignored tmp/ on first use,
// never committed or shipped) through nspell (MIT). Run from web-learning/:
//   node tools/check-words.mjs [exercise-id ...]
// For every item it fills the gap with the correct answer and with each wrong option and reports:
//   ERROR      the correct word is not in the dictionary (typo, wrong answer, or a rare word: look it up)
//   AMBIGUOUS  a wrong option makes a valid word too (bít/být, pil/pyl): the sentence or hint must decide
// It cannot tell whether an answer fits the rule of the group (d/t pairs, endings: both forms are words), so read the
// lists too. The rules themselves are in the Internetová jazyková příručka, https://prirucka.ujc.cas.cz/.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import nspell from 'nspell';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../exercises');
const cache = join(here, '../tmp/dict');

async function dictionary() {
  mkdirSync(cache, { recursive: true });
  for (const f of ['cs_CZ.aff', 'cs_CZ.dic']) {
    const p = join(cache, f);
    if (existsSync(p)) continue;
    const r = await fetch(`https://raw.githubusercontent.com/LibreOffice/dictionaries/master/cs_CZ/${f}`);
    if (!r.ok) throw new Error(`cannot download ${f}: ${r.status}`);
    writeFileSync(p, Buffer.from(await r.arrayBuffer()));
  }
  return nspell(readFileSync(join(cache, 'cs_CZ.aff')), readFileSync(join(cache, 'cs_CZ.dic')));
}

// items: { src, t (with one "_"), a (correct), opts (all options), hint? }
function collect(only) {
  const out = [];
  for (const id of readdirSync(root)) {
    if (only.length && !only.includes(id)) continue;
    const html = readFileSync(join(root, id, 'index.html'), 'utf8');
    const m = html.match(/const CFG = (\{.*\});\n/);
    if (m) {
      const cfg = JSON.parse(m[1]);
      // sentence pages: every word of the sentence must be a word; there is no gap to fill
      for (const it of cfg.items.filter(i => !i.t.includes('_'))) out.push({ src: id, sentence: it.t.replace(/[\[\]]/g, '') });
      for (const it of cfg.items.filter(i => i.t.includes('_'))) out.push({ src: id, t: it.t, a: it.a, opts: cfg.groups[it.g].opts, hint: it.h });
    } else if (/<script id="data">/.test(html) && id !== 'scitani' && id !== 'odcitani' && id !== 'nasobilka') {
      const items = new Function(`${html.match(/<script id="data">([\s\S]*?)<\/script>/)[1]}\n;return ITEMS;`)();
      // i/y pages: the alternative is the same length with the other letter
      const flip = { i: 'y', y: 'i', í: 'ý', ý: 'í' };
      for (const it of items) out.push({ src: id, t: it.t, a: it.a, opts: [it.a, flip[it.a]] });
    }
  }
  return out;
}

const token = (t, o) => t.split(' ').find(x => x.includes('_')).replace('_', o).replace(/[.,?!]/g, '');
const sp = await dictionary();
const items = collect(process.argv.slice(2));
const errors = [], ambiguous = [], hintErrors = new Set();
for (const it of items) {
  if (it.sentence) {
    for (const w of it.sentence.split(/\s+/).map(x => x.replace(/[.,?!]/g, '')).filter(Boolean)) {
      if (!sp.correct(w) && !sp.correct(w.toLowerCase())) errors.push(`${w}  (${it.src}: ${it.sentence})`);
    }
    continue;
  }
  const right = token(it.t, it.a);
  if (!sp.correct(right) && !sp.correct(right.toLowerCase())) errors.push(`${right}  (${it.src})`);
  for (const o of it.opts.filter(x => x !== it.a)) {
    const w = token(it.t, o);
    if (sp.correct(w) || sp.correct(w.toLowerCase())) ambiguous.push(`${right} × ${w}  (${it.src}${it.hint ? `, hint: ${it.hint}` : ''})`);
  }
  for (const h of (it.hint || '').split(' ').map(x => x.replace(/[.,?!()+-]/g, '')).filter(x => /^[\p{L}]+$/u.test(x))) {
    if (!sp.correct(h) && !sp.correct(h.toLowerCase())) hintErrors.add(`${h}  (${it.src})`);
  }
}
console.log(`${items.length} items checked`);
console.log(`ERROR, correct word not in the dictionary: ${errors.length}`); errors.forEach(x => console.log('  ' + x));
console.log(`ERROR, hint word not in the dictionary: ${hintErrors.size}`); [...hintErrors].forEach(x => console.log('  ' + x));
console.log(`AMBIGUOUS, a wrong option is a word too: ${ambiguous.length}`); ambiguous.forEach(x => console.log('  ' + x));
