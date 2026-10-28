// s-, z-, vz- v předponách (3.–4. ročník).
export default {
  title: 's, z, vz v předponách',
  sub: 'sbalit, zmenšit, vzlétnout',
  groups: {
    s: {
      chips: ['<b>s</b>balit', '<b>s</b>jet'], name: 's-', opts: ['s', 'z', 'vz'], desc: 'spolu, dolů, pryč',
      rule: 'Předpona s- znamená spolu, dolů nebo pryč: sbalit, svázat, sjet dolů. Zkus slovo říct s „spolu“ nebo „dolů“.',
    },
    z: {
      chips: ['<b>z</b>menšit', '<b>z</b>kusit'], name: 'z-', opts: ['s', 'z', 'vz'], desc: 'něco se stane větší, menší, lepší',
      rule: 'Předpona z- často znamená, že se něco změní: zmenšit (menší), zlepšit (lepší), zrychlit (rychlejší). Nebo že se věc podaří: zkusit.',
    },
    vz: {
      chips: ['<b>vz</b>létnout', '<b>vz</b>ejít'], name: 'vz-', opts: ['s', 'z', 'vz'], desc: 'nahoru, vzhůru',
      rule: 'Předpona vz- znamená nahoru nebo vzhůru: vzlétnout, vzhlédnout, vzejít. Najdi slovo, které jde říct s „nahoru“.',
    },
  },
  words: [
    ['s', 's', '_balit|spolu~do~kufru _vázat|spolu _jet|dolů _hodit|dolů _klopit|dolů _pojit|spolu'],
    ['z', 'z', '_menšit|menší _lepšit|lepší _rychlit|rychlejší _dražit|dražší _horšit|horší _krátit|kratší _hubnout|hubenější _kusit|zkouška'],
    ['vz', 'vz', '_létnout|nahoru _hlédnout|nahoru _ejít|nahoru _křísit|znovu~k~životu _přímit|nahoru _budit|probudit'],
  ],
};
