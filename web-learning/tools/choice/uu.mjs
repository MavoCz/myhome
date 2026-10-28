// ú nebo ů (3. ročník).
export default {
  title: 'Ú nebo Ů',
  sub: 'na začátku slova, po předponě, uprostřed',
  groups: {
    u: {
      chips: ['<b>ú</b>kol', 'ne<b>ú</b>spěch'], name: 'ú', opts: ['ú', 'ů'], desc: 'ú na začátku slova nebo po předponě',
      rule: 'Na začátku slova a po předponě píšeme ú (úkol, neúspěch). Uprostřed a na konci slova píšeme ů.',
    },
    uu: {
      chips: ['d<b>ů</b>m', 'k<b>ů</b>ň'], name: 'ů', opts: ['ú', 'ů'], desc: 'ů uprostřed a na konci slova',
      rule: 'Uprostřed a na konci slova píšeme ů (dům, kůň). Zkus slovo změnit: dům – domy, kůň – koně. Ů se změní na o.',
    },
  },
  words: [
    ['u', 'ú', '_kol|úkoly _směv|úsměvy _těk|útěk _terý _řad|úřady _roda|úrody _zký|úzce _hel|úhly ne_spěch|úspěch'],
    ['uu', 'ů', 'd_m|domy k_ň|koně st_l|stoly v_z|vozy n_ž|nože l_žko|lože v_ně|voňavý m_j|moje'],
  ],
};
