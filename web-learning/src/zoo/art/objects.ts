// What is still drawn as SVG: the frame of the need bubbles and the shop icons for pens and
// paths, which the scene draws itself. Colours follow the ground in ZooScene (paper layers).

/** A speech bubble with room for an icon centred at (28, 22). */
export const BUBBLE_VB: [number, number] = [56, 56];
export const BUBBLE_FRAME =
  '<path d="M10 1 H46 Q53 1 53 8 V36 Q53 43 46 43 H34 L28 53 L22 43 H10 Q3 43 3 36 V8 Q3 1 10 1Z" fill="#ffffff" stroke="#c5d1e4" stroke-width="2"/>';
export const BUBBLE_ICON = { cx: 28, cy: 22, size: 32 };

const PAPER_SHADOW =
  '<filter id="lift" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="2.5" stdDeviation="1.2" flood-color="#1e3c14" flood-opacity=".25"/></filter>';

// a sheet of the floor colour with a darker rim peeking out below a lighter top layer
const penIcon = (rim: string, top: string, extra: string) =>
  `<defs>${PAPER_SHADOW}</defs><g filter="url(#lift)">` +
  `<path d="M12 9 Q44 5 76 10 Q83 11 83 19 Q85 44 82 66 Q81 74 73 74 Q44 77 14 73 Q5 72 5 64 Q3 40 6 17 Q7 9 12 9Z" fill="${rim}"/>` +
  `<path d="M15 14 Q44 11 73 15 Q78 16 78 22 Q80 44 77 62 Q76 68 70 68 Q44 71 17 68 Q11 67 11 61 Q9 40 11 20 Q12 14 15 14Z" fill="${top}"/>` +
  `${extra}</g>`;

export const PEN_SAVANA_ICON = penIcon(
  '#d9ad5e',
  '#edc97c',
  '<path d="M60 48 Q72 44 76 52 Q74 61 62 60 Q54 56 60 48Z" fill="#4d9fcf"/><path d="M62 50 Q70 48 72 53 Q70 58 63 57 Q58 54 62 50Z" fill="#6fc2ea"/>' +
  '<path d="M22 30 Q30 25 36 31 Q34 37 25 36 Q19 34 22 30Z" fill="#a99b84"/>' +
  '<path d="M20 60 l3 -10 l3 10z M25 60 l3 -13 l3 13z M50 32 l3 -10 l3 10z M55 32 l3 -12 l3 12z" fill="#cfa343"/>',
);
export const PEN_ICE_ICON = penIcon(
  '#c3e0ef',
  '#eaf6fc',
  '<path d="M46 24 Q60 17 72 25 Q76 36 64 40 Q50 41 45 33 Q43 27 46 24Z" fill="#3f97cc"/><path d="M49 26 Q60 21 69 27 Q71 35 62 37 Q52 37 48 32 Q47 28 49 26Z" fill="#63b7e6"/>' +
  '<path d="M18 52 Q28 48 38 52 Q30 57 18 52Z M24 61 Q34 57 46 61 Q36 66 24 61Z" fill="#ffffff"/>',
);
export const PATH_ICON =
  `<defs>${PAPER_SHADOW}</defs><path d="M10 4 H78 Q84 4 84 10 V78 Q84 84 78 84 H10 Q4 84 4 78 V10 Q4 4 10 4Z" fill="#97cb6b"/>` +
  '<g filter="url(#lift)"><path d="M44 84 V54 Q44 40 58 40 H84" stroke="#caa66c" stroke-width="30" fill="none"/>' +
  '<path d="M44 84 V54 Q44 40 58 40 H84" stroke="#ecd8a6" stroke-width="21" fill="none"/></g>';
