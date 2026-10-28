// Párové souhlásky: která souhláska patří na konec slova nebo před jinou souhlásku (2. ročník).
const pair = (a, b, rule) => ({
  name: `${a} – ${b}`, opts: [a, b], desc: `${a} nebo ${b}?`,
  rule: `Slovo si změň, aby souhláska stála před samohláskou: ${rule}`,
});
export default {
  title: 'Párové souhlásky',
  sub: 'b–p, d–t, ď–ť, v–f, h–ch, z–s, ž–š',
  groups: {
    bp: pair('b', 'p', 'chleba, chlapi. Slyšíš b, nebo p?'),
    dt: pair('d', 't', 'hrady, květy. Slyšíš d, nebo t?'),
    dtm: pair('ď', 'ť', 'hodit, síť – sítě. Slyšíš ď, nebo ť?'),
    vf: pair('v', 'f', 'ovce, kufry. Slyšíš v, nebo f?'),
    hch: pair('h', 'ch', 'sněhy, mouchy. Slyšíš h, nebo ch?'),
    zs: pair('z', 's', 'mrazy, lesy. Slyšíš z, nebo s?'),
    zss: pair('ž', 'š', 'nože, koše. Slyšíš ž, nebo š?'),
  },
  words: [
    ['bp', 'b', 'chle_a|chlebový zu_|zuby klu_|kluby holu_|holubi hři_|hřiby sli_|sliby'],
    ['bp', 'p', 'chla_|chlapi stro_|stropy siru_|sirupy skle_|sklepy ku_ka|kupky'],
    ['dt', 'd', 'hra_|hrady sa_|sady zahra_a|zahrady vi_ět|vidět mla_ý|mladá'],
    ['dt', 't', 'kvě_|květy svě_|světy ví_ěz|vítězové lé_o|léta'],
    ['dtm', 'ď', 'ho_|hodit se_|sedět je_|jedu cho_|chodit ve_|vedu'],
    ['dtm', 'ť', 'sí_|sítě obě_|oběti pamě_|paměti chu_|chutě pla_|platit vra_|vrátit'],
    ['vf', 'v', 'tra_ka|travička kro_|krovy o_ce|ovce ka_ka|kavky pra_da|pravdivý'],
    ['vf', 'f', 'ku_r|kufry šé_|šéfové har_a|harfy'],
    ['hch', 'h', 'sní_|sněhy bře_|břehy ro_|rohy prá_|prahy kru_|kruhy'],
    ['hch', 'ch', 'mu_|mouchy stře_a|střechy stra_|strachy smí_|smíchy'],
    ['zs', 'z', 'mra_|mrazy lá_ně|lázně ná_ev|názvy ře_|řezy mo_ek|mozky'],
    ['zs', 's', 'hla_|hlasy vla_|vlasy ča_|časy'],
    ['zss', 'ž', 'nů_|nože kří_|kříže mu_|muži'],
    ['zss', 'š', 'ko_|koše my_|myši dé_ť|deště plá_ť|pláště'],
  ],
};
