// bě/bje, vě/vje, mě/mně (2. a 4. ročník). Mezera zastupuje celou slabiku.
export default {
  title: 'bě, bje, vě, vje, mě, mně',
  sub: 'slabiky se ě a je',
  groups: {
    b: {
      name: 'bě / bje', opts: ['bě', 'bje'], desc: 'bje jen po předponě ob- nebo sub-',
      rule: 'Napiš bje jen tehdy, když slovo začíná předponou ob- nebo sub- a pak následuje je (objekt, objem). Jinak píšeš bě (běžet, běda).',
    },
    v: {
      name: 'vě / vje', opts: ['vě', 'vje'], desc: 'vje jen v několika slovech',
      rule: 'Napiš vje jen u slov, která začínají předponou v- a pak je (vjezd, vjel). Jinak píšeš vě (věc, věta, věk).',
    },
    m: {
      name: 'mě / mně', opts: ['mě', 'mně'], desc: 'koho, co? → mě; komu, čemu? → mně',
      rule: 'Zeptej se: koho, co? Pak píšeš mě (vidíš mě). Zeptej se: komu, čemu? Pak píšeš mně (dej to mně). Ve slově zapomněl píšeš mně.',
    },
  },
  words: [
    ['b', 'bě', '_žet|běh _da|běda ná_h|náběh z_silý|zběsilý pří_h|příběh'],
    ['b', 'bje', 'o_ekt|předpona~ob- o_em|předpona~ob- o_evit|předpona~ob- o_ednat|předpona~ob- su_ekt|předpona~sub- o_ezd|předpona~ob-'],
    ['v', 'vě', '_c|věci _ta|věty _k|věk _ž|věže _zení|vězeň _řit|věra'],
    ['v', 'vje', '_zd|předpona~v- Auto~_lo~do~garáže.|předpona~v-'],
    ['m', 'mě', '_sto|města _síc|měsíce _řit|měřit z_na|změny s_r|směry ob_nit|obměna'],
    ['m', 'mně', 'zapo_l|zapomněl vzpo_l|vzpomněl upo_l|upomněl Dej~to~_.|komu?~čemu? Pomoz~_~s~úkolem.|komu?~čemu? Řekni~to~_.|komu?~čemu?'],
    ['m', 'mě', 'Vidíš~_?|koho?~co? Ptal~se~_.|koho?~co? Slyšíš~_?|koho?~co? Zavolali~_~domů.|koho?~co?'],
  ],
};
