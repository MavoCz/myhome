// Tableau 10 palette — colorblind-friendly, works on light and dark backgrounds.
// Used as fallback when members don't have a custom color assigned.
export const MEMBER_COLORS = [
  '#4E79A7', // blue
  '#F28E2B', // orange
  '#E15759', // red
  '#76B7B2', // teal
  '#59A14F', // green
  '#EDC948', // yellow
  '#B07AA1', // purple
  '#FF9DA7', // pink
  '#9C755F', // brown
  '#BAB0AC', // gray
];

export function getMemberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}

/**
 * Build a userId → color map. Uses the member's custom DB color if set,
 * otherwise falls back to the palette by index.
 */
export function buildMemberColorMap(
  members: { userId?: number; memberColor?: string | null }[],
): Map<number, string> {
  const sorted = [...members]
    .filter((m): m is typeof m & { userId: number } => m.userId != null)
    .sort((a, b) => a.userId - b.userId);
  const map = new Map<number, string>();
  sorted.forEach((m, i) => map.set(m.userId, m.memberColor || getMemberColor(i)));
  return map;
}
