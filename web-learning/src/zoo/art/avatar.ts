import type { Avatar } from '../../state/types';
import type { Rig } from './svg';

export const HAIR_COLORS = ['#3b2a20', '#6b4423', '#a0522d', '#d9a14a', '#f0d27a', '#1f1f2e', '#c2410c'];
export const OUTFIT_COLORS = ['#e5484d', '#ff8fb1', '#a97cff', '#4aa3df', '#2fb37b', '#ffb020', '#2d3557'];
export const SKIN_COLORS = ['#ffe0c7', '#f6c9a0', '#e0a777', '#b97a4f', '#8a5536'];

export const DEFAULT_AVATAR: Avatar = { hair: HAIR_COLORS[1], outfit: OUTFIT_COLORS[1], skin: SKIN_COLORS[0] };

const SHADE = (d: string) => `<path d="${d}" fill="#000" opacity=".12"/>`;

// Side-view girl facing right, big head, ponytail. Colours are filled in per profile.
const TEMPLATE: Rig = {
  vb: [120, 170],
  anchor: [60, 162],
  scale: 0.56,
  order: ['hairBack', 'armBack', 'legBack', 'legFront', 'torso', 'head', 'armFront'],
  parts: {
    hairBack: {
      pivot: [37, 44],
      svg: '<path d="M38 38 Q16 48 20 76 Q24 94 36 98 Q31 78 41 60 Z" fill="{HAIR}"/><circle cx="37" cy="44" r="5.5" fill="#ff6b8a"/>',
    },
    armBack: {
      pivot: [58.5, 86],
      svg:
        '<rect x="54" y="84" width="9" height="30" rx="4.5" fill="{SKIN}"/>' +
        '<rect x="53" y="82" width="11" height="12" rx="4" fill="{OUTFIT}"/>' +
        SHADE('M53 82 h11 v32 h-11z'),
    },
    legBack: {
      pivot: [56.5, 124],
      svg:
        '<rect x="52" y="122" width="9" height="34" rx="4.5" fill="{SKIN}"/>' +
        SHADE('M52 122 h9 v34 h-9z') +
        '<path d="M50 153 h13 q6 0 6 6 v2 h-19z" fill="#2d3557"/>',
    },
    legFront: {
      pivot: [67.5, 124],
      svg:
        '<rect x="63" y="122" width="9" height="34" rx="4.5" fill="{SKIN}"/>' +
        '<path d="M61 153 h13 q6 0 6 6 v2 h-19z" fill="#3a4470"/>',
    },
    torso: {
      pivot: [62, 128],
      svg:
        '<rect x="57" y="72" width="10" height="13" fill="{SKIN}"/>' +
        '<path d="M50 84 Q62 78 74 84 L86 128 Q62 135 38 128 Z" fill="{OUTFIT}"/>' +
        SHADE('M44 108 Q62 112 80 108 L82 114 Q62 118 42 114Z') +
        '<path d="M54 83 Q62 91 70 83" stroke="#fff" stroke-width="3" fill="none" opacity=".75" stroke-linecap="round"/>',
    },
    head: {
      pivot: [62, 80],
      svg:
        '<circle cx="62" cy="50" r="30" fill="{SKIN}"/>' +
        '<circle cx="42" cy="56" r="6" fill="{SKIN}"/><circle cx="42" cy="56" r="3" fill="#000" opacity=".08"/>' +
        '<ellipse cx="70" cy="54" rx="3.6" ry="4.6" fill="#2b2233"/><ellipse cx="86" cy="54" rx="3.3" ry="4.4" fill="#2b2233"/>' +
        '<circle cx="71.2" cy="52.4" r="1.4" fill="#fff"/><circle cx="87.1" cy="52.4" r="1.3" fill="#fff"/>' +
        '<ellipse cx="65" cy="63" rx="5" ry="3" fill="#ff8fa3" opacity=".55"/><ellipse cx="88" cy="63" rx="4" ry="3" fill="#ff8fa3" opacity=".55"/>' +
        '<path d="M76 66 Q80 70 84 66" stroke="#7a3b3b" stroke-width="2" fill="none" stroke-linecap="round"/>' +
        '<path d="M31 54 Q28 18 62 18 Q94 18 93 46 Q86 34 74 36 Q70 28 60 36 Q48 30 40 42 Q36 46 36 58 Z" fill="{HAIR}"/>',
    },
    armFront: {
      pivot: [64.5, 86],
      svg: '<rect x="60" y="84" width="9" height="30" rx="4.5" fill="{SKIN}"/><rect x="59" y="82" width="11" height="12" rx="4" fill="{OUTFIT}"/>',
    },
  },
};

export function avatarRig(a: Avatar): Rig {
  const fill = (s: string) => s.replaceAll('{HAIR}', a.hair).replaceAll('{OUTFIT}', a.outfit).replaceAll('{SKIN}', a.skin);
  const parts: Rig['parts'] = {};
  for (const [k, p] of Object.entries(TEMPLATE.parts)) parts[k] = { pivot: p.pivot, svg: fill(p.svg) };
  return { ...TEMPLATE, parts };
}

/** Hand position of the front arm, where a held item goes. */
export const HAND: [number, number] = [64.5, 112];
