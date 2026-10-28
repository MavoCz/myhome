// i/í/y/ý v koncovkách: podstatná jména, přídavná jména, příčestí minulé (3.–4. ročník).
export default {
  title: 'i/y v koncovkách',
  sub: 'podstatná jména, přídavná jména, slovesa',
  groups: {
    noun: {
      name: 'podstatná jména', opts: ['i', 'y'], names: ['ti', 'ty'], desc: 'ti chlapci → i, ty stromy → y',
      chips: ['ti žáci → <b>i</b>', 'ty stromy → <b>y</b>'],
      rule: 'Zkus před slovo dát „ti“ nebo „ty“. Ti chlapci, ti žáci (mužský rod, živé) mají měkké i. Ty stromy, ty kytky, ty knihy mají tvrdé y.',
    },
    adj: {
      name: 'přídavná jména', opts: ['ý', 'í'], names: ['tvrdé', 'měkké'], desc: 'mladý tvrdě, jarní měkce',
      chips: ['mlad<b>ý</b>', 'jarn<b>í</b>'],
      rule: 'Přídavná jména se skloňují podle vzoru. Vzor mladý má tvrdé ý (dřevěný, horký). Vzor jarní má měkké í (cizí, letní).',
    },
    verb: {
      name: 'slovesa (-li, -ly)', opts: ['i', 'y'], names: ['ti', 'ty'], desc: 'ti hráli, ty hrály',
      chips: ['ti hrál<b>i</b>', 'ty hrál<b>y</b>'],
      rule: 'Podívej se, kdo to dělal. Kluci, žáci, psi (ti) → měkké i: hráli. Holky, stromy, kytky (ty) → tvrdé y: hrály.',
    },
  },
  words: [
    ['noun', 'i', 'Ve~škole~jsou~žác_.|ti~žáci Na~hřišti~hrají~kluc_.|ti~kluci Za~plotem~štěkají~ps_.|ti~psi Pekař_~pečou~chleba.|ti~pekaři Zahradníc_~sázejí~květiny.|ti~zahradníci Na~dvoře~stojí~chlapc_.|ti~chlapci'],
    ['noun', 'y', 'V~lese~rostou~strom_.|ty~stromy Ve~vázách~stojí~kytk_.|ty~kytky Na~polici~leží~knih_.|ty~knihy Na~talíři~jsou~rohlík_.|ty~rohlíky Děti~koupily~dva~sešit_.|ty~sešity'],
    ['adj', 'ý', 'dřevěn_~vláček|ten~vláček hork_~čaj|ten~čaj druh_~den|ten~den mlad_~pes|ten~pes nov_~dům|ten~dům velk_~strom|ten~strom'],
    ['adj', 'í', 'jarn_~den|ten~den ciz_~jazyk|ten~jazyk letn_~den|ten~den zimn_~bunda|ta~bunda rann_~ptáče|to~ptáče domác_~úkol|ten~úkol'],
    ['verb', 'i', 'Kluci~hrál_~fotbal.|ti~kluci Žáci~psal_~diktát.|ti~žáci Psi~štěkal_~celou~noc.|ti~psi Chlapci~vyhrál_~závod.|ti~chlapci Sousedé~odjel_~na~chatu.|ti~sousedé'],
    ['verb', 'y', 'Holky~hrál_~na~hřišti.|ty~holky Stromy~se~nakláněl_~ve~větru.|ty~stromy Květiny~rozkvetl_~brzy.|ty~květiny Dívky~šl_~do~školy.|ty~dívky Kytky~uschl_.|ty~kytky'],
  ],
};
