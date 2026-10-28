// Builds exercises/<id>/index.html for every "choose the right option" exercise from tools/choice/template.html
// and the config tools/choice/<id>.mjs. Run from web-learning/:  node tools/build-choice.mjs [id ...]
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'tools/choice');
const template = readFileSync(join(dir, 'template.html'), 'utf8');
const ids = process.argv.slice(2).length ? process.argv.slice(2)
  : readdirSync(dir).filter(f => f.endsWith('.mjs')).map(f => f.replace('.mjs', ''));

for (const id of ids) {
  const { default: c } = await import(pathToFileURL(join(dir, `${id}.mjs`)).href);
  const items = [];
  // c.words: [group, answer, 'word_|hint another_word|hint ...'], "~" is a space inside a word
  for (const [g, a, list] of c.words) {
    if (!c.groups[g]) throw new Error(`${id}: unknown group ${g}`);
    if (!c.groups[g].opts.includes(a)) throw new Error(`${id}: answer ${a} is not an option of ${g}`);
    for (const w of list.split(/\s+/).filter(Boolean)) {
      const [t, h] = w.split('|').map(x => x.replaceAll('~', ' '));
      if (t.split('_').length !== 2) throw new Error(`${id}: need exactly one "_" in ${w}`);
      items.push(h ? { t, a, g, h } : { t, a, g });
    }
  }
  const cfg = { id, key: c.key || id, groups: c.groups, items };
  const html = template
    .replaceAll('{{TITLE}}', c.title).replaceAll('{{SUB}}', c.sub)
    .replace('/*CFG*/null', () => JSON.stringify(cfg));
  mkdirSync(join(root, 'exercises', id), { recursive: true });
  writeFileSync(join(root, 'exercises', id, 'index.html'), html);
  console.log(`${id}: ${items.length} items`);
}
