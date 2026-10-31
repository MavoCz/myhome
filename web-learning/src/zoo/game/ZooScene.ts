import Phaser from 'phaser';
import { getProfile, useZoo } from '../../state/store';
import { FEED_COOLDOWN_MS, REFUND_RATE, WATER_COOLDOWN_MS, coinsWord } from '../../state/economy';
import type { PlacedObject, Profile, Species } from '../../state/types';
import { FOUNTAIN_SPOUT, PLANT_ART, PROP_ART, SPECIES_FOOD, type PropName } from '../art/pictures';
import { BIOME_NAME, SPECIES_NAME, item, type CatalogItem } from '../catalog';
import type { ZooController } from '../controller';
import { findPath } from '../pathfind';
import { PICTURE_FRAME, plantOf, type CanvasMap } from '../textures';
import { COLS, GATE, ROWS, SPAWN, TILE, ZooGrid, footprintAt, tileAt, tileCenter, type Tile } from '../world';
import { AnimalView, type Rect } from './animal';
import { PlayerView } from './player';
import { blob, disc, layer, makePaperTexture, pill, sheet } from './paper';
import { hearts, picture, pop } from './rig';

type Kind = PlacedObject['kind'];
type Image = Phaser.GameObjects.Image;

interface ObjectView {
  parts: Phaser.GameObjects.GameObject[];
  /** what pops when the object appears */
  main?: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject;
  /** a flowerbed's plant and the texture it shows */
  plant?: Image;
  plantKey?: string;
}

interface Bubble {
  img: Image;
  follow?: AnimalView;
  x: number;
  y: number;
}

const PROPS: Partial<Record<Kind, PropName>> = { tree: 'tree', bush: 'bush', bench: 'bench', fountain: 'fountain' };

const FED_WORD: Record<Species, string> = { giraffe: 'najedená', penguin: 'najedený', rabbit: 'najedený' };
const BUBBLE_DEPTH = 1e6 - 2;
/** need bubbles, in world pixels */
const BUBBLE_SIZE = 44;
const GRASS = 0x97cb6b;

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export interface ZooSceneData {
  ctl: ZooController;
  canvases: CanvasMap;
  dpr: number;
}

export class ZooScene extends Phaser.Scene {
  private ctl!: ZooController;
  private canvases!: CanvasMap;
  private dpr = 1;
  private grid!: ZooGrid;
  private player!: PlayerView;
  private pathGfx!: Phaser.GameObjects.Graphics;
  private gridGfx!: Phaser.GameObjects.Graphics;
  private hoverGfx!: Phaser.GameObjects.Graphics;
  private objects = new Map<string, ObjectView>();
  private animals = new Map<string, AnimalView>();
  private bubbles = new Map<string, Bubble>();
  private synced = false;
  private stopped = false;
  private cleanups: (() => void)[] = [];

  private dragging = false;
  private pinchStart: number | null = null;
  private zoomStart = 1;
  private pinched = false;
  private lastPaint = '';
  private dragToasted = false;
  /** right or middle mouse button: always pans, even while painting paths */
  private panButton = false;
  private pinchMid: Phaser.Math.Vector2 | null = null;
  private keys: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key> | null = null;

  constructor() {
    super('zoo');
  }

  init(data: ZooSceneData) {
    this.ctl = data.ctl;
    this.canvases = data.canvases;
    this.dpr = data.dpr;
  }

  preload() {
    for (const [key, canvas] of this.canvases) {
      if (this.textures.exists(key)) continue;
      const tex = this.textures.addCanvas(key, canvas);
      const { frameW, frameH } = canvas.dataset;
      if (tex && frameW && frameH) tex.add(PICTURE_FRAME, 0, 0, 0, Number(frameW), Number(frameH));
    }
  }

  private host(): Profile {
    const p = getProfile(this.ctl.hostId);
    if (!p) throw new Error('Zoo profile is missing');
    return p;
  }

  create() {
    this.makeGrassTexture();
    makePaperTexture(this, 'tex:paper');
    this.cameras.main.setBackgroundColor('#5e9a48');
    this.add.tileSprite(0, 0, COLS * TILE, ROWS * TILE, 'tex:grass').setOrigin(0).setDepth(-10);
    this.add.tileSprite(-TILE * 2, -TILE * 2, (COLS + 4) * TILE, (ROWS + 4) * TILE, 'tex:paper')
      .setOrigin(0).setDepth(-2).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.drawHedge();
    this.pathGfx = this.add.graphics().setDepth(-5);
    this.gridGfx = this.add.graphics().setDepth(-4).setVisible(false);
    this.hoverGfx = this.add.graphics().setDepth(1e6 - 1);
    this.drawGridLines();
    this.placeProp('gate', GATE, GATE.w, 1);

    const visitor = getProfile(this.ctl.visitorId) ?? this.host();
    const spawn = tileCenter(SPAWN);
    this.player = new PlayerView(this, visitor.avatar, spawn.x, spawn.y);

    this.sync();
    this.cleanups.push(useZoo.subscribe(() => this.sync()));
    this.cleanups.push(this.ctl.on('change', () => this.onModeChange()));
    this.setupCamera();
    this.setupInput();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.updateNeeds() });

    const stop = () => {
      this.stopped = true;
      this.cleanups.forEach(fn => fn());
      this.cleanups = [];
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, stop);
    this.events.once(Phaser.Scenes.Events.DESTROY, stop);
  }

  // ---------- drawing the ground ----------

  /** Grass as layered paper: lighter and darker cut patches, small blade tufts and daisies. */
  private makeGrassTexture() {
    if (this.textures.exists('tex:grass')) return;
    const rnd = new Phaser.Math.RandomDataGenerator(['zoo-grass']);
    const S = 512;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(GRASS).fillRect(0, 0, S, S);
    for (let i = 0; i < 26; i++) {
      const x = rnd.between(40, S - 40), y = rnd.between(24, S - 24);
      layer(g, blob(rnd, x, y, rnd.between(18, 38), rnd.between(8, 15), 0.12), rnd.pick([0x9ed072, 0x8fc565, 0xa2d277]), 2);
    }
    for (let i = 0; i < 22; i++) {
      const x = rnd.between(14, S - 14), y = rnd.between(16, S - 6);
      const color = rnd.pick([0x7db657, 0x86bf5e]);
      for (const [dx, h, lean] of [[-4, 9, -3], [0, 12, 0], [4, 8, 3]]) {
        layer(g, [new Phaser.Math.Vector2(x + dx - 2.5, y), new Phaser.Math.Vector2(x + dx + lean, y - h), new Phaser.Math.Vector2(x + dx + 2.5, y)], color, 1.5);
      }
    }
    for (let i = 0; i < 6; i++) {
      const x = rnd.between(14, S - 14), y = rnd.between(14, S - 14);
      layer(g, blob(rnd, x, y, 4.5, 4, 0.15), 0xfffbef, 1.5);
      g.fillStyle(0xffcf3f).fillCircle(x, y, 1.8);
    }
    g.generateTexture('tex:grass', S, S);
    g.destroy();
  }

  /** Round paper bushes all around the zoo, leaving a gap for the gate. */
  private drawHedge() {
    const g = this.add.graphics().setDepth(-6);
    const rnd = new Phaser.Math.RandomDataGenerator(['zoo-hedge']);
    const W = COLS * TILE, H = ROWS * TILE;
    const spots: [number, number][] = [];
    const gateL = GATE.x * TILE - 10, gateR = (GATE.x + GATE.w) * TILE + 10;
    for (let x = 0; x <= W; x += 34) {
      spots.push([x, -16]);
      if (x < gateL || x > gateR) spots.push([x, H + 16]);
    }
    for (let y = 0; y <= H; y += 34) spots.push([-16, y], [W + 16, y]);
    // back rows first so every bush overlaps the one behind it
    spots.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of spots) {
      layer(g, blob(rnd, x, y, 25, 23, 0.1), rnd.pick([0x4b8a39, 0x53933f]), 4);
      layer(g, blob(rnd, x - 4, y - 6, 17, 15, 0.12), rnd.pick([0x63a74a, 0x6aac4e]), 2);
      g.fillStyle(0x7dbc5c).fillPoints(blob(rnd, x - 8, y - 11, 7, 5, 0.15), true);
    }
  }

  private drawGridLines() {
    const g = this.gridGfx;
    g.lineStyle(2, 0xffffff, 0.28);
    for (let x = 0; x <= COLS; x++) g.lineBetween(x * TILE, 0, x * TILE, ROWS * TILE);
    for (let y = 0; y <= ROWS; y++) g.lineBetween(0, y * TILE, COLS * TILE, y * TILE);
  }

  private drawPaths() {
    const g = this.pathGfx;
    g.clear();
    const way = { x: GATE.x + 1, y: GATE.y };
    const isP = (x: number, y: number) => this.grid.isPath(x, y) || (x === way.x && y === way.y);
    const tiles: Tile[] = [way];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (this.grid.isPath(x, y)) tiles.push({ x, y });

    // a path is a strip of paper with a ragged edge: round stamps along the line between tile
    // centres, each a little bigger or smaller depending on where it lands
    const centre = (x: number, y: number) => new Phaser.Math.Vector2((x + 0.5) * TILE, (y + 0.5) * TILE);
    const segments: [Phaser.Math.Vector2, Phaser.Math.Vector2][] = [[centre(way.x, way.y), centre(way.x, ROWS + 1)]];
    for (const t of tiles) {
      const c = centre(t.x, t.y);
      segments.push([c, c]);
      if (isP(t.x + 1, t.y)) segments.push([c, centre(t.x + 1, t.y)]);
      if (isP(t.x, t.y + 1)) segments.push([c, centre(t.x, t.y + 1)]);
    }
    const stamp = (color: number, r: number, dy: number) => {
      g.fillStyle(color);
      for (const [a, b] of segments) {
        const n = Math.max(1, Math.ceil(a.distance(b) / 8));
        for (let i = 0; i <= n; i++) {
          const x = a.x + ((b.x - a.x) * i) / n, y = a.y + ((b.y - a.y) * i) / n;
          disc(g, x, y + dy, r + (hash(`${Math.round(x)},${Math.round(y)},${r}`) % 7) / 2);
        }
      }
    };
    stamp(0x80b55a, 24, 4);
    stamp(0xcaa66c, 24, 0);
    stamp(0xecd8a6, 19, -1);
    for (const t of tiles) {
      const h = hash(`${t.x},${t.y}`);
      const x = t.x * TILE + 18 + (h % 28), y = t.y * TILE + 18 + ((h >> 5) % 28);
      g.fillStyle(0xcfb27c).fillEllipse(x, y + 1.5, 7, 5).fillStyle(0xf6ead0).fillEllipse(x, y, 6, 4);
    }
  }

  // ---------- objects ----------

  /** A prop picture standing with its bottom edge `lift` pixels above (x, y). */
  private propImage(name: PropName, x: number, y: number): Image {
    const art = PROP_ART[name];
    const img = this.add.image(x, y - art.lift, `obj:${name}`, PICTURE_FRAME).setOrigin(0.5, 1);
    return img.setScale(art.width / img.width);
  }

  /** Places a prop on the bottom-middle of its footprint, with its shadow on the ground. */
  private placeProp(name: PropName, at: Tile, w: number, h: number) {
    const ax = (at.x + w / 2) * TILE, ay = (at.y + h) * TILE;
    const img = this.propImage(name, ax, ay).setDepth(ay);
    const parts: Phaser.GameObjects.GameObject[] = [img];
    const shadow = PROP_ART[name].shadow;
    if (shadow) parts.push(this.add.ellipse(ax, ay - PROP_ART[name].lift, shadow, shadow * 0.2, 0x1e3c14, 0.22).setDepth(-1));
    return { img, parts };
  }

  private createObject(o: PlacedObject): ObjectView {
    const it = item(o.kind);
    if (it.biome) return this.createPen(o, it);
    if (o.kind === 'flowerbed') return this.createFlowerbed(o);
    const { img, parts } = this.placeProp(PROPS[o.kind]!, o, it.w, it.h);
    if (o.kind === 'tree') {
      this.tweens.add({ targets: img, angle: 1.4, duration: 2400 + (hash(o.id) % 900), yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: hash(o.id) % 1500 });
    }
    if (o.kind === 'fountain') {
      const drop = this.textures.getFrame('fx:drop', PICTURE_FRAME);
      const s = 7 / Math.max(drop.width, drop.height);
      const spray = this.add.particles(img.x, img.y - FOUNTAIN_SPOUT, 'fx:drop', {
        frame: PICTURE_FRAME,
        speedX: { min: -45, max: 45 },
        speedY: { min: -150, max: -100 },
        gravityY: 340,
        lifespan: 620,
        frequency: 70,
        scale: { start: s, end: s / 2 },
        alpha: { start: 0.9, end: 0.2 },
      });
      spray.setDepth(img.depth + 1);
      parts.push(spray);
    }
    return { parts, main: img };
  }

  /** The bed stays the same picture; the plant on it changes as it grows. */
  private createFlowerbed(o: PlacedObject): ObjectView {
    const y = (o.y + 1) * TILE;
    const root = this.add.container((o.x + 0.5) * TILE, y).setDepth(y);
    const bed = this.propImage('bed', 0, 0);
    const plant = this.add.image(0, bed.y - bed.displayHeight * 0.45, 'plant:seeds', PICTURE_FRAME).setOrigin(0.5, 1);
    root.add([bed, plant]);
    const v: ObjectView = { parts: [root], main: root, plant };
    this.updateFlower(v, o, false);
    return v;
  }

  private updateFlower(v: ObjectView, o: PlacedObject, celebrate = true) {
    const stage = o.stage ?? 0;
    const bloom = hash(o.id) % PLANT_ART.blooms.length;
    const { key, height } = plantOf(stage, bloom);
    if (key === v.plantKey || !v.plant || !v.main) return;
    v.plantKey = key;
    v.plant.setTexture(key, PICTURE_FRAME);
    v.plant.setScale(height / v.plant.height);
    if (!celebrate) return;
    pop(this, v.plant);
    hearts(this, v.main.x, v.main.y - 40, 3);
  }

  private createPen(o: PlacedObject, it: CatalogItem): ObjectView {
    const px = o.x * TILE, py = o.y * TILE, w = it.w * TILE, h = it.h * TILE;
    const ice = it.biome === 'ice', farm = it.biome === 'farm';
    const rnd = new Phaser.Math.RandomDataGenerator([o.id]);

    const floor = this.add.graphics().setDepth(-3);
    const [shade, rim, top] = ice ? [0x2f5f7a, 0xc3e0ef, 0xeaf6fc] : farm ? [0x2f5a1e, 0x72ad4e, 0xb9dd7f] : [0x5a3c14, 0xd9ad5e, 0xedc97c];
    layer(floor, sheet(rnd, px + 4, py + 4, w - 8, h - 8, 22, 4), rim, 5);
    layer(floor, sheet(rnd, px + 11, py + 10, w - 22, h - 20, 18, 4), top, 0);
    const pond = (cx: number, cy: number, rx: number, ry: number) => {
      layer(floor, blob(rnd, cx, cy, rx, ry), ice ? 0x3f97cc : 0x4d9fcf, 3, shade);
      floor.fillStyle(ice ? 0x63b7e6 : 0x6fc2ea).fillPoints(blob(rnd, cx - 2, cy + 2, rx - 6, ry - 5), true);
      floor.fillStyle(0xaee0f6).fillPoints(blob(rnd, cx - rx * 0.35, cy - ry * 0.3, rx * 0.28, ry * 0.16, 0.15), true);
    };
    if (ice) {
      pond(px + w * 0.7, py + h * 0.38, w * 0.2, h * 0.17);
      for (let i = 0; i < 5; i++) {
        layer(floor, blob(rnd, px + rnd.between(40, w * 0.45), py + rnd.between(h * 0.5, h - 40), rnd.between(14, 28), rnd.between(5, 8), 0.15), 0xffffff, 3, shade);
      }
    } else if (farm) {
      // a hay pile in the back corner, a wooden trough of water and daisies in the grass
      const hx = px + w * 0.2, hy = py + h * 0.36;
      layer(floor, blob(rnd, hx, hy, 40, 22, 0.12), 0xc9962f, 4, shade);
      layer(floor, blob(rnd, hx - 3, hy - 6, 32, 16, 0.14), 0xe2b64a, 2, shade);
      layer(floor, blob(rnd, hx - 6, hy - 11, 20, 9, 0.15), 0xf2d478, 1, shade);
      floor.lineStyle(2, 0xb3842a);
      for (let i = 0; i < 7; i++) {
        const sx = hx + rnd.between(-30, 26), sy = hy + rnd.between(-10, 12), lean = rnd.between(-8, 8);
        floor.lineBetween(sx, sy, sx + lean, sy - 7);
      }
      const tx = px + w * 0.72, ty = py + h * 0.4;
      layer(floor, sheet(rnd, tx - 44, ty - 14, 88, 28, 10, 2), 0x8a5528, 4, shade);
      layer(floor, sheet(rnd, tx - 38, ty - 9, 76, 17, 7, 1.5), 0x4d9fcf, 0, shade);
      floor.fillStyle(0x6fc2ea).fillPoints(blob(rnd, tx - 12, ty - 2, 20, 4, 0.15), true);
      for (let i = 0; i < 12; i++) {
        const x = px + rnd.between(30, w - 30), y = py + rnd.between(h * 0.55, h - 30);
        layer(floor, blob(rnd, x, y, 4.5, 4, 0.15), 0xfffbef, 1.5, shade);
        disc(floor.fillStyle(0xffcf3f), x, y, 1.8);
      }
    } else {
      pond(px + w * 0.76, py + h * 0.7, 42, 18);
      layer(floor, blob(rnd, px + w * 0.22, py + h * 0.34, 21, 13), 0xa99b84, 4, shade);
      floor.fillStyle(0xc6baa4).fillPoints(blob(rnd, px + w * 0.22 - 4, py + h * 0.34 - 4, 12, 7), true);
      for (let i = 0; i < 9; i++) {
        const x = px + rnd.between(30, w - 30), y = py + rnd.between(40, h - 30), color = rnd.pick([0xcfa343, 0xc19538]);
        for (const [dx, tall, lean] of [[-5, 10, -3], [0, 14, 0], [5, 9, 3]]) {
          layer(floor, [new Phaser.Math.Vector2(x + dx - 3, y), new Phaser.Math.Vector2(x + dx + lean, y - tall), new Phaser.Math.Vector2(x + dx + 3, y)], color, 2, shade);
        }
      }
    }

    // posts and rails are two paper strips each, a darker one peeking out below a lighter one
    const [postDark, postLight, railDark, railLight] = ice ? [0x5f7891, 0x8aa3ba, 0x8fa8be, 0xc2d6e6] : [0x6e4420, 0x9a6634, 0xa66a33, 0xcf9254];
    const rail = (g: Phaser.GameObjects.Graphics, x: number, y: number, len: number, vertical = false) => {
      const [rw, rh] = vertical ? [6, len] : [len, 6];
      pill(g.fillStyle(0x1e3c14, 0.16), x, y + 3, rw, rh, 3);
      pill(g.fillStyle(railDark), x, y, rw, rh, 3);
      pill(g.fillStyle(railLight), x, y - 1, rw - (vertical ? 2 : 0), rh - (vertical ? 0 : 2), 3);
    };
    const post = (g: Phaser.GameObjects.Graphics, x: number, y: number, height: number) => {
      pill(g.fillStyle(0x1e3c14, 0.16), x - 5, y + 3, 10, height, 5);
      pill(g.fillStyle(postDark), x - 5, y, 10, height, 5);
      pill(g.fillStyle(postLight), x - 5, y, 7, height - 2, [5, 3, 3, 5]);
    };
    const posts = (g: Phaser.GameObjects.Graphics, y: number, height: number) => {
      for (let i = 0; i <= it.w; i++) post(g, Phaser.Math.Clamp(px + i * TILE, px + 6, px + w - 6), y, height);
    };
    // back fence and both sides sit behind the animals, the front fence in front of them
    const back = this.add.graphics().setDepth(py + 10);
    rail(back, px + 4, py + 2, w - 8);
    rail(back, px + 4, py + 16, w - 8);
    rail(back, px + 2, py + 4, h - 10, true);
    rail(back, px + w - 8, py + 4, h - 10, true);
    posts(back, py - 8, 34);
    for (let j = 1; j < it.h; j++) {
      post(back, px + 5, py + j * TILE - 22, 30);
      post(back, px + w - 5, py + j * TILE - 22, 30);
    }
    const front = this.add.graphics().setDepth(py + h);
    rail(front, px + 4, py + h - 26, w - 8);
    rail(front, px + 4, py + h - 13, w - 8);
    posts(front, py + h - 36, 36);

    for (const g of [floor, back, front]) {
      g.setAlpha(0);
      this.tweens.add({ targets: g, alpha: 1, duration: 350 });
    }
    return { parts: [floor, back, front] };
  }

  /** Where an animal's feet may wander inside its enclosure. */
  private penArea(pen: PlacedObject, species: Species): Rect {
    const it = item(pen.kind);
    const px = pen.x * TILE, py = pen.y * TILE, w = it.w * TILE, h = it.h * TILE;
    const mx = species === 'giraffe' ? 80 : 44;
    return { x: px + mx, y: py + h * 0.45, w: w - mx * 2, h: h * 0.55 - 30 };
  }

  private penOf(animalId: string) {
    const p = this.host();
    const a = p.animals.find(x => x.id === animalId);
    return a ? p.objects.find(o => o.id === a.penId) ?? null : null;
  }

  /** Rebuild what changed after any store update. */
  private sync() {
    const p = getProfile(this.ctl.hostId);
    if (!p || this.stopped) return;
    this.grid = new ZooGrid(p);
    this.drawPaths();

    const seen = new Set<string>();
    for (const o of p.objects) {
      if (o.kind === 'path') continue;
      seen.add(o.id);
      const v = this.objects.get(o.id);
      if (!v) {
        const created = this.createObject(o);
        this.objects.set(o.id, created);
        if (this.synced && created.main) pop(this, created.main);
      } else if (o.kind === 'flowerbed') {
        this.updateFlower(v, o);
      }
    }
    for (const [id, v] of this.objects) {
      if (seen.has(id)) continue;
      v.parts.forEach(x => x.destroy());
      this.objects.delete(id);
    }

    const alive = new Set<string>();
    for (const a of p.animals) {
      const pen = p.objects.find(o => o.id === a.penId);
      if (!pen) continue;
      alive.add(a.id);
      if (this.animals.has(a.id)) continue;
      const view = new AnimalView(this, a.id, a.species, this.penArea(pen, a.species));
      this.animals.set(a.id, view);
      if (this.synced) {
        pop(this, view.root);
        hearts(this, view.x, view.y - view.headHeight);
      }
    }
    for (const [id, view] of this.animals) {
      if (alive.has(id)) continue;
      view.destroy();
      this.animals.delete(id);
    }
    this.synced = true;
    this.updateNeeds();
  }

  // ---------- needs: who is hungry, which flower is thirsty ----------

  private updateNeeds() {
    const p = getProfile(this.ctl.hostId);
    if (!p || this.stopped) return;
    const now = Date.now();
    const want = new Map<string, { key: string; follow?: AnimalView; x: number; y: number }>();
    for (const a of p.animals) {
      const view = this.animals.get(a.id);
      if (view && (!a.lastFed || now - a.lastFed >= FEED_COOLDOWN_MS)) want.set(`a:${a.id}`, { key: `fx:bubble-${a.species}`, follow: view, x: 0, y: 0 });
    }
    for (const o of p.objects) {
      if (o.kind !== 'flowerbed' || (o.stage ?? 0) >= 3) continue;
      if (!o.lastWatered || now - o.lastWatered >= WATER_COOLDOWN_MS) want.set(`f:${o.id}`, { key: 'fx:bubble-water', x: (o.x + 0.5) * TILE, y: o.y * TILE - 6 });
    }
    for (const [id, b] of this.bubbles) {
      if (want.has(id)) continue;
      b.img.destroy();
      this.bubbles.delete(id);
    }
    for (const [id, w] of want) {
      if (this.bubbles.has(id)) continue;
      const img = picture(this, w.x, w.y, w.key, BUBBLE_SIZE).setOrigin(0.5, 1).setDepth(BUBBLE_DEPTH);
      img.setVisible(this.ctl.mode === 'walk');
      this.bubbles.set(id, { img, follow: w.follow, x: w.x, y: w.y });
    }
  }

  // ---------- camera and input ----------

  private zoomLimits() {
    const cam = this.cameras.main;
    const fit = Math.min(cam.width / ((COLS + 4) * TILE), cam.height / ((ROWS + 4) * TILE));
    return { min: Math.max(0.3 * this.dpr, fit), max: 1.8 * this.dpr };
  }

  private setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(-TILE * 2, -TILE * 2, (COLS + 4) * TILE, (ROWS + 4) * TILE);
    const { min, max } = this.zoomLimits();
    cam.setZoom(Phaser.Math.Clamp(cam.height / (TILE * 9), min, Math.min(max, 1.25 * this.dpr)));
    cam.centerOn(this.player.x, this.player.y - TILE * 3);
    cam.startFollow(this.player.root, true, 0.08, 0.08);
    this.scale.on('resize', (size: Phaser.Structs.Size) => {
      this.cameras.resize(size.width, size.height);
      const lim = this.zoomLimits();
      cam.setZoom(Phaser.Math.Clamp(cam.zoom, lim.min, lim.max));
    });
  }

  /** Zoom while keeping the world point under (sx, sy) in place; defaults to the screen centre. */
  private zoomBy(f: number, sx?: number, sy?: number) {
    const cam = this.cameras.main, lim = this.zoomLimits();
    const z0 = cam.zoom, z1 = Phaser.Math.Clamp(z0 * f, lim.min, lim.max);
    if (z1 === z0) return;
    const cx = cam.width / 2, cy = cam.height / 2;
    const px = sx ?? cx, py = sy ?? cy;
    // a camera with origin 0.5 maps screen to world as scroll + c + (s - c) / zoom
    const wx = cam.scrollX + cx + (px - cx) / z0, wy = cam.scrollY + cy + (py - cy) / z0;
    cam.setZoom(z1);
    if (sx === undefined) return;
    cam.stopFollow();
    cam.setScroll(wx - cx - (px - cx) / z1, wy - cy - (py - cy) / z1);
  }

  private pan(dx: number, dy: number) {
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.scrollX -= dx / cam.zoom;
    cam.scrollY -= dy / cam.zoom;
  }

  private twoFingers() {
    const p2 = this.input.pointer2;
    return this.input.pointer1.isDown && !!p2 && p2.isDown;
  }

  private worldOf(p: Phaser.Input.Pointer) {
    return this.cameras.main.getWorldPoint(p.x, p.y);
  }

  private setupInput() {
    this.input.mouse?.disableContextMenu();
    const kb = this.input.keyboard;
    if (kb) {
      const K = Phaser.Input.Keyboard.KeyCodes;
      this.keys = kb.addKeys({ up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT, w: K.W, a: K.A, s: K.S, d: K.D }) as NonNullable<typeof this.keys>;
      kb.on('keydown', (e: KeyboardEvent) => {
        if (e.key === '+' || e.key === '=') this.zoomBy(1.15);
        if (e.key === '-' || e.key === '_') this.zoomBy(1 / 1.15);
      });
    }
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragging = false;
      this.lastPaint = '';
      this.dragToasted = false;
      this.panButton = p.rightButtonDown() || p.middleButtonDown();
      if (this.panButton) return;
      if (this.ctl.mode === 'build' && this.ctl.tool === 'path' && !this.twoFingers()) this.paintAt(p);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.twoFingers()) return;
      if (!p.isDown) {
        this.drawHover(p);
        return;
      }
      if (!this.dragging && p.getDistance() > 10) this.dragging = true;
      if (!this.dragging || this.pinched) return;
      if (!this.panButton && this.ctl.mode === 'build' && this.ctl.tool === 'path') {
        this.paintAt(p);
        return;
      }
      this.pan(p.x - p.prevPosition.x, p.y - p.prevPosition.y);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.pinched) {
        if (!this.input.pointer1.isDown && !this.input.pointer2?.isDown) this.pinched = false;
        return;
      }
      if (this.dragging || this.panButton) {
        this.dragging = false;
        this.panButton = false;
        return;
      }
      if (this.ctl.mode === 'build' && this.ctl.tool === 'path') return;
      const w = this.worldOf(p);
      this.tap(w.x, w.y);
    });
    this.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, dx: number, dy: number) => {
      const e = p.event as WheelEvent;
      // a trackpad pinch arrives as ctrl + wheel; a mouse wheel moves in big steps or whole lines;
      // anything else is two fingers sliding on a trackpad, which should move the map
      const pinch = e.ctrlKey;
      const mouseWheel = e.deltaMode !== 0 || (dx === 0 && Math.abs(dy) >= 50);
      if (pinch || mouseWheel) {
        if (dy) this.zoomBy(Math.exp(-Phaser.Math.Clamp(dy, -120, 120) * (pinch ? 0.01 : 0.002)), p.x, p.y);
        return;
      }
      this.pan(-dx * this.dpr, -dy * this.dpr);
    });
  }

  private onModeChange() {
    const build = this.ctl.mode === 'build';
    this.gridGfx.setVisible(build);
    this.hoverGfx.clear();
    this.bubbles.forEach(b => b.img.setVisible(!build));
    if (build) this.cameras.main.stopFollow();
    else this.cameras.main.startFollow(this.player.root, true, 0.08, 0.08);
  }

  // ---------- walking ----------

  private tap(wx: number, wy: number) {
    const t = tileAt(wx, wy);
    if (this.ctl.mode === 'build') {
      this.buildTap(t, wx, wy);
      return;
    }
    const animal = this.animalAt(wx, wy);
    if (animal) {
      this.goFeed(animal);
      return;
    }
    const o = this.grid.object(t.x, t.y);
    if (o?.kind === 'flowerbed') {
      this.goWater(o);
      return;
    }
    if (o && item(o.kind).biome) {
      const inside = [...this.animals.values()].filter(a => this.penOf(a.id)?.id === o.id);
      if (!inside.length) {
        this.ctl.toast(this.ctl.visiting ? 'Tady zatím nikdo nebydlí.' : 'Výběh je prázdný. Zvířátko koupíš ve stavění.');
        return;
      }
      const p = this.host();
      const lastFed = (id: string) => p.animals.find(a => a.id === id)?.lastFed ?? 0;
      this.goFeed(inside.sort((a, b) => lastFed(a.id) - lastFed(b.id))[0]);
      return;
    }
    if (o) {
      this.walkWhere(this.besides(o));
      return;
    }
    this.walkWhere((x, y) => x === t.x && y === t.y);
  }

  private besides(o: PlacedObject) {
    const it = item(o.kind);
    return (x: number, y: number) =>
      x >= o.x - 1 && x <= o.x + it.w && y >= o.y - 1 && y <= o.y + it.h && !(x >= o.x && x < o.x + it.w && y >= o.y && y < o.y + it.h);
  }

  private walkWhere(isGoal: (x: number, y: number) => boolean, then?: () => void) {
    if (this.player.isBusy) return;
    const start = tileAt(this.player.x, this.player.y);
    const path = findPath((x, y) => this.grid.walkable(x, y), start, isGoal);
    if (!path) {
      this.ctl.toast('Tam se nedá dojít.');
      return;
    }
    const points = path.map(t => {
      const c = tileCenter(t);
      return new Phaser.Math.Vector2(c.x, c.y);
    });
    const first = points[0];
    if (first && Math.hypot(first.x - this.player.x, first.y - this.player.y) < 4) points.shift();
    this.player.walk(points, then);
    this.cameras.main.startFollow(this.player.root, true, 0.08, 0.08);
  }

  private animalAt(wx: number, wy: number) {
    let best: AnimalView | null = null;
    for (const a of this.animals.values()) if (a.contains(wx, wy) && (!best || a.y > best.y)) best = a;
    return best;
  }

  private goFeed(animal: AnimalView) {
    const pen = this.penOf(animal.id);
    if (!pen) return;
    this.walkWhere(this.besides(pen), () => {
      const name = SPECIES_NAME[animal.species];
      // visits are read-only: only the owner's own actions change a zoo
      if (this.ctl.visiting) {
        this.ctl.toast(`Zvířátka tu krmí ${this.host().name}. Na návštěvě se můžeš dívat.`);
        animal.trick();
        return;
      }
      if (useZoo.getState().feed(this.ctl.hostId, animal.id) === 'full') {
        this.ctl.toast(`${name} už je ${FED_WORD[animal.species]}. Zkus to zase později.`);
        animal.trick();
        return;
      }
      const area = animal.pen;
      const tx = Phaser.Math.Clamp(this.player.x, area.x, area.x + area.w);
      const ty = Phaser.Math.Clamp(this.player.y, area.y, area.y + area.h);
      this.player.throwFood(SPECIES_FOOD[animal.species], tx, ty, food => {
        animal.eat(food);
        this.ctl.toast(`${name} si pochutnává.`);
      });
    });
  }

  private goWater(o: PlacedObject) {
    this.walkWhere(this.besides(o), () => {
      if (this.ctl.visiting) {
        this.ctl.toast(`Kytičky tu zalévá ${this.host().name}. Na návštěvě se můžeš dívat.`);
        return;
      }
      this.player.water((o.x + 0.5) * TILE, (o.y + 1) * TILE - 14, () => {
        const result = useZoo.getState().water(this.ctl.hostId, o.id);
        const stage = getProfile(this.ctl.hostId)?.objects.find(x => x.id === o.id)?.stage ?? 0;
        if (result === 'grew') {
          this.ctl.toast(['', 'Vyklíčila! Zalij ji zase za chvíli.', 'Roste poupě.', 'Kytička rozkvetla!'][stage] ?? 'Roste.');
        } else if (result === 'wait') {
          this.ctl.toast('Kytička ještě pije. Zalij ji zase později.');
        } else {
          this.ctl.toast('Kytička krásně kvete.');
          hearts(this, (o.x + 0.5) * TILE, o.y * TILE, 3);
        }
      });
    });
  }

  // ---------- building ----------

  private buildTap(t: Tile, wx: number, wy: number) {
    const tool = this.ctl.tool;
    if (!tool) {
      this.ctl.toast('Vyber si dole, co chceš postavit.');
      return;
    }
    if (tool === 'remove') {
      this.removeAt(t, wx, wy);
      return;
    }
    const it = item(tool);
    if (it.species) this.placeAnimal(it, t);
    else this.placeObject(tool as Kind, t, true);
  }

  private placeObject(kind: Kind, t: Tile, loud: boolean): boolean {
    const f = kind === 'path' ? t : footprintAt(kind, t);
    const reason = this.grid.blockedReason(kind, f.x, f.y, tileAt(this.player.x, this.player.y));
    this.flash(kind, f, !reason);
    if (reason) {
      if (loud) this.ctl.toast(reason);
      return false;
    }
    const price = item(kind).price;
    if (this.host().coins < price) {
      if (loud || !this.dragToasted) this.ctl.toast(`Na to nemáš dost bodíků. Potřebuješ ${price}.`);
      this.dragToasted = true;
      return false;
    }
    useZoo.getState().build(this.ctl.hostId, kind, f.x, f.y);
    if (item(kind).biome) this.ctl.setTool(null);
    return true;
  }

  private paintAt(p: Phaser.Input.Pointer) {
    const w = this.worldOf(p);
    const t = tileAt(w.x, w.y);
    const key = `${t.x},${t.y}`;
    if (key === this.lastPaint) return;
    this.lastPaint = key;
    this.placeObject('path', t, false);
  }

  private placeAnimal(it: CatalogItem, t: Tile) {
    const species = it.species!, needs = it.needs!;
    const name = SPECIES_NAME[species];
    const o = this.grid.object(t.x, t.y);
    const penItem = o ? item(o.kind) : null;
    if (!o || !penItem?.biome) {
      this.ctl.toast(`${name} potřebuje ${BIOME_NAME[needs]}. Klepni na výběh.`);
      return;
    }
    if (penItem.biome !== needs) {
      this.ctl.toast(`Tady ${name.toLowerCase()} bydlet nemůže. Potřebuje ${BIOME_NAME[needs]}.`);
      return;
    }
    const p = this.host();
    if (p.animals.filter(a => a.penId === o.id).length >= (penItem.capacity ?? 1)) {
      this.ctl.toast('Tenhle výběh je už plný. Postav další.');
      return;
    }
    if (p.coins < it.price) {
      this.ctl.toast(`Na to nemáš dost bodíků. Potřebuješ ${it.price}.`);
      return;
    }
    useZoo.getState().addAnimal(this.ctl.hostId, species, o.id);
    this.ctl.toast(`Vítej v zoo! ${name} má nový domov.`);
    this.ctl.setTool(null);
  }

  private refundToast(price: number) {
    const n = Math.floor(price * REFUND_RATE);
    this.ctl.toast(n > 0 ? `Odstraněno. Vrátilo se ti ${n} ${coinsWord(n)}.` : 'Odstraněno.');
  }

  private removeAt(t: Tile, wx: number, wy: number) {
    const state = useZoo.getState(), p = this.host();
    const animal = this.animalAt(wx, wy);
    if (animal) {
      state.removeAnimal(p.id, animal.id);
      this.refundToast(item(`animal-${animal.species}`).price);
      return;
    }
    const o = this.grid.object(t.x, t.y);
    if (o) {
      if (p.animals.some(a => a.penId === o.id)) {
        this.ctl.toast('Ve výběhu bydlí zvířata. Nejdřív odstraň je.');
        return;
      }
      state.removeObject(p.id, o.id);
      this.refundToast(item(o.kind).price);
      return;
    }
    const path = p.objects.find(x => x.kind === 'path' && x.x === t.x && x.y === t.y);
    if (path) {
      state.removeObject(p.id, path.id);
      this.refundToast(item('path').price);
    }
  }

  private footprintRect(g: Phaser.GameObjects.Graphics, kind: Kind | null, f: Tile, ok: boolean) {
    const it = kind ? item(kind) : { w: 1, h: 1 };
    g.fillStyle(ok ? 0x2fb37b : 0xe5484d, 0.35).fillRoundedRect(f.x * TILE + 2, f.y * TILE + 2, it.w * TILE - 4, it.h * TILE - 4, 10);
    g.lineStyle(3, ok ? 0x1f8a5b : 0xc0392b, 0.9).strokeRoundedRect(f.x * TILE + 2, f.y * TILE + 2, it.w * TILE - 4, it.h * TILE - 4, 10);
  }

  private flash(kind: Kind, f: Tile, ok: boolean) {
    const g = this.add.graphics().setDepth(1e6 - 1);
    this.footprintRect(g, kind, f, ok);
    this.tweens.add({ targets: g, alpha: 0, delay: 150, duration: 450, onComplete: () => g.destroy() });
  }

  /** Footprint preview under the mouse; touch screens see the flash after a tap instead. */
  private drawHover(p: Phaser.Input.Pointer) {
    this.hoverGfx.clear();
    const tool = this.ctl.tool;
    if (this.ctl.mode !== 'build' || !tool || tool === 'remove' || p.wasTouch) return;
    const w = this.worldOf(p);
    const t = tileAt(w.x, w.y);
    const it = item(tool);
    if (it.species) {
      this.footprintRect(this.hoverGfx, null, t, !!this.grid.object(t.x, t.y) && item(this.grid.object(t.x, t.y)!.kind).biome === it.needs);
      return;
    }
    const kind = tool as Kind;
    const f = kind === 'path' ? t : footprintAt(kind, t);
    this.footprintRect(this.hoverGfx, kind, f, !this.grid.blockedReason(kind, f.x, f.y, tileAt(this.player.x, this.player.y)));
  }

  // ---------- per frame ----------

  update(time: number, delta: number) {
    const dt = Math.min(delta, 50) / 1000;
    this.player.update(dt);
    this.animals.forEach(a => a.update(time, dt));

    if (this.keys) {
      const k = this.keys;
      const kx = (k.left.isDown || k.a.isDown ? 1 : 0) - (k.right.isDown || k.d.isDown ? 1 : 0);
      const ky = (k.up.isDown || k.w.isDown ? 1 : 0) - (k.down.isDown || k.s.isDown ? 1 : 0);
      if (kx || ky) this.pan(kx * 900 * this.dpr * dt, ky * 900 * this.dpr * dt);
    }

    // two fingers: spread to zoom, move together to pan
    const p1 = this.input.pointer1, p2 = this.input.pointer2;
    if (p1.isDown && p2?.isDown) {
      const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
      const mid = new Phaser.Math.Vector2((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
      if (this.pinchStart === null) {
        this.pinchStart = d;
        this.zoomStart = this.cameras.main.zoom;
        this.cameras.main.stopFollow();
      } else {
        this.zoomBy((this.zoomStart * d) / this.pinchStart / this.cameras.main.zoom, mid.x, mid.y);
        if (this.pinchMid) this.pan(mid.x - this.pinchMid.x, mid.y - this.pinchMid.y);
      }
      this.pinchMid = mid;
      this.pinched = true;
    } else {
      this.pinchStart = null;
      this.pinchMid = null;
    }

    const bobY = Math.sin(time / 320) * 5;
    for (const b of this.bubbles.values()) {
      if (b.follow) b.img.setPosition(b.follow.x, b.follow.y - b.follow.headHeight - 8 + bobY);
      else b.img.setPosition(b.x, b.y + bobY);
    }
  }
}
