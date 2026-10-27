import { COLS, ROWS, type Tile } from './world';

const DIRS: [number, number, number][] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

/**
 * Shortest walk from start to the nearest tile that satisfies isGoal.
 * Diagonal steps may not cut a blocked corner. The grid is small, so a plain Dijkstra is enough.
 */
export function findPath(walkable: (x: number, y: number) => boolean, start: Tile, isGoal: (x: number, y: number) => boolean): Tile[] | null {
  const H = ROWS;
  const idx = (x: number, y: number) => y * COLS + x;
  const dist = new Float64Array(COLS * H).fill(Infinity);
  const prev = new Int32Array(COLS * H).fill(-1);
  const done = new Uint8Array(COLS * H);
  const open: number[] = [];
  const s = idx(start.x, start.y);
  dist[s] = 0;
  open.push(s);

  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (dist[open[i]] < dist[open[bi]]) bi = i;
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (done[cur]) continue;
    done[cur] = 1;
    const cx = cur % COLS, cy = Math.floor(cur / COLS);
    if (isGoal(cx, cy)) {
      const out: Tile[] = [];
      for (let n = cur; n !== -1; n = prev[n]) out.push({ x: n % COLS, y: Math.floor(n / COLS) });
      return out.reverse();
    }
    for (const [dx, dy, cost] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= H || !walkable(nx, ny)) continue;
      if (dx && dy && (!walkable(cx + dx, cy) || !walkable(cx, cy + dy))) continue;
      const ni = idx(nx, ny);
      const nd = dist[cur] + cost;
      if (nd < dist[ni]) {
        dist[ni] = nd;
        prev[ni] = cur;
        open.push(ni);
      }
    }
  }
  return null;
}
