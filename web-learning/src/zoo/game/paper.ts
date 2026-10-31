import Phaser from 'phaser';

type Rnd = Phaser.Math.RandomDataGenerator;
type Gfx = Phaser.GameObjects.Graphics;
type Points = Phaser.Math.Vector2[];

/** A smooth random wobble around a closed outline, so shapes look cut by hand. */
function wobble(rnd: Rnd, amount: number) {
  const waves = [2, 3, 5].map(k => ({ k, phase: rnd.frac() * Math.PI * 2, amp: amount * rnd.realInRange(0.3, 0.6) }));
  return (t: number) => waves.reduce((s, w) => s + Math.sin(t * w.k * Math.PI * 2 + w.phase) * w.amp, 0);
}

export function blob(rnd: Rnd, cx: number, cy: number, rx: number, ry: number, amount = 0.08): Points {
  const n = Math.max(16, Math.round((rx + ry) / 3));
  const off = wobble(rnd, amount);
  return Array.from({ length: n }, (_, i) => {
    const t = i / n, a = t * Math.PI * 2, k = 1 + off(t);
    return new Phaser.Math.Vector2(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k);
  });
}

/** A rounded rectangle whose edges wander by up to `amount` pixels. */
export function sheet(rnd: Rnd, x: number, y: number, w: number, h: number, r: number, amount = 3): Points {
  const corners = [
    [x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI],
  ] as const;
  const outline: Points = [];
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= 6; i++) {
      const a = start + (i / 6) * (Math.PI / 2);
      outline.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
  }
  // fill the straight edges in so the wobble has points to move
  const dense: Points = [];
  outline.forEach((p, i) => {
    const q = outline[(i + 1) % outline.length];
    const steps = Math.max(1, Math.round(p.distance(q) / 14));
    for (let s = 0; s < steps; s++) dense.push(p.clone().lerp(q, s / steps));
  });
  const off = wobble(rnd, amount);
  const c = new Phaser.Math.Vector2(x + w / 2, y + h / 2);
  return dense.map((p, i) => {
    const out = p.clone().subtract(c).normalize();
    return p.clone().add(out.scale(off(i / dense.length)));
  });
}

const DISC = Array.from({ length: 16 }, (_, i) => (i / 16) * Math.PI * 2);

/**
 * Phaser keeps a Graphics as a list of commands and triangulates it again on every frame, and it
 * draws each arc with 100 points. Shapes that stay on screen therefore use these two instead of
 * fillCircle and fillRoundedRect, otherwise paths and fences stall an older tablet.
 */
export function disc(g: Gfx, x: number, y: number, r: number) {
  g.fillPoints(DISC.map(a => new Phaser.Math.Vector2(x + Math.cos(a) * r, y + Math.sin(a) * r)), true);
}

/** A rounded rectangle; `r` is one radius or [top left, top right, bottom right, bottom left]. */
export function pill(g: Gfx, x: number, y: number, w: number, h: number, r: number | [number, number, number, number]) {
  const max = Math.min(w, h) / 2;
  const [tl, tr, br, bl] = (typeof r === 'number' ? [r, r, r, r] : r).map(v => Math.min(v, max));
  const corners = [
    [x + w - tr, y + tr, tr, -Math.PI / 2], [x + w - br, y + h - br, br, 0], [x + bl, y + h - bl, bl, Math.PI / 2], [x + tl, y + tl, tl, Math.PI],
  ] as const;
  const outline: Points = [];
  for (const [cx, cy, radius, start] of corners) {
    for (let i = 0; i <= 3; i++) {
      const a = start + (i / 3) * (Math.PI / 2);
      outline.push(new Phaser.Math.Vector2(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius));
    }
  }
  g.fillPoints(outline, true);
}

/** Fill a cut-out shape with the soft shadow a paper layer casts on the one below. */
export function layer(g: Gfx, pts: Points, color: number, lift = 3, shadow = 0x1e3c14) {
  if (lift) g.fillStyle(shadow, 0.16).fillPoints(pts.map(p => new Phaser.Math.Vector2(p.x, p.y + lift)), true);
  g.fillStyle(color).fillPoints(pts, true);
}

/** Pale paper fibres, multiplied over the ground so grass, paths and pen floors share one texture. */
export function makePaperTexture(scene: Phaser.Scene, key: string) {
  if (scene.textures.exists(key)) return;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(S, S);
  const rnd = new Phaser.Math.RandomDataGenerator(['zoo-paper']);
  for (let i = 0; i < S * S; i++) {
    const v = 236 + rnd.between(0, 19);
    img.data.set([v, v, v, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  // soft blotches and a few fibres, drawn wrapped so the texture tiles without seams
  ctx.filter = 'blur(1.2px)';
  for (let i = 0; i < 70; i++) {
    const x = rnd.between(0, S), y = rnd.between(0, S), r = rnd.between(6, 22);
    ctx.fillStyle = `rgba(${rnd.pick(['255,255,255', '170,160,140'])},${rnd.realInRange(0.03, 0.06)})`;
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
      ctx.beginPath();
      ctx.ellipse(x + dx, y + dy, r, r * rnd.realInRange(0.5, 1), rnd.frac() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.filter = 'none';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 50; i++) {
    const x = rnd.between(0, S), y = rnd.between(0, S), a = rnd.frac() * Math.PI, l = rnd.between(4, 12);
    ctx.strokeStyle = `rgba(130,120,100,${rnd.realInRange(0.12, 0.25)})`;
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y + dy);
      ctx.quadraticCurveTo(x + dx + Math.cos(a) * l * 0.5 + 2, y + dy + Math.sin(a) * l * 0.5, x + dx + Math.cos(a) * l, y + dy + Math.sin(a) * l);
      ctx.stroke();
    }
  }
  scene.textures.addCanvas(key, c);
}
