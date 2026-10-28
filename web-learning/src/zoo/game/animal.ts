import Phaser from 'phaser';
import type { Species } from '../../state/types';
import { ANIMAL_ART } from '../art/animals';
import { PICTURE_FRAME } from '../textures';
import { hearts } from './rig';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * One animal walking around inside its enclosure. The picture is a single cut-out, so all motion
 * is procedural: a hopping bob and lean while walking, breathing while standing, and
 * squash-and-stretch for jumps and landings.
 */
export class AnimalView {
  readonly root: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Image;
  private mode: 'idle' | 'walk' | 'busy' = 'idle';
  private target = new Phaser.Math.Vector2();
  private until = 0;
  private onArrive: (() => void) | null = null;
  private phase = 0;
  private dead = false;
  private readonly speed: number;
  private readonly scale: number;
  private readonly halfWidth: number;
  readonly headHeight: number;

  constructor(
    private scene: Phaser.Scene,
    readonly id: string,
    readonly species: Species,
    public pen: Rect,
  ) {
    const art = ANIMAL_ART[species];
    const frame = scene.textures.getFrame(`animal:${species}`, PICTURE_FRAME);
    this.scale = art.height / frame.height;
    this.halfWidth = (frame.width * this.scale) / 2;
    this.headHeight = art.height;
    this.speed = art.speed;

    const start = this.randomSpot();
    this.root = scene.add.container(start.x, start.y);
    const shadow = scene.add.ellipse(0, 0, this.halfWidth * 1.5, 14, 0x1e3c14, 0.22);
    this.body = scene.add.image(0, 0, `animal:${species}`, PICTURE_FRAME).setOrigin(0.5, 1).setScale(this.scale);
    this.root.add([shadow, this.body]);
    this.phase = Math.random() * 10;
    this.until = scene.time.now + Phaser.Math.Between(400, 2000);
  }

  private randomSpot() {
    const p = this.pen;
    return new Phaser.Math.Vector2(Phaser.Math.Between(p.x, p.x + p.w), Phaser.Math.Between(p.y, p.y + p.h));
  }

  get x() { return this.root.x; }
  get y() { return this.root.y; }

  /** Rough hit box in world pixels. */
  contains(wx: number, wy: number) {
    return Math.abs(wx - this.x) < this.halfWidth && wy < this.y + 8 && wy > this.y - this.headHeight;
  }

  private face(dx: number) {
    if (Math.abs(dx) < 1) return;
    this.root.scaleX = dx < 0 ? -1 : 1;
  }

  walkTo(x: number, y: number, then?: () => void) {
    const p = this.pen;
    this.target.set(Phaser.Math.Clamp(x, p.x, p.x + p.w), Phaser.Math.Clamp(y, p.y, p.y + p.h));
    this.onArrive = then ?? null;
    this.face(this.target.x - this.x);
    this.mode = 'walk';
  }

  /** Crouch, jump, land with a squash; a single jump ends with a wiggle. */
  trick() {
    if (this.mode === 'busy') return;
    this.mode = 'busy';
    const s = this.scale, b = this.body;
    b.setPosition(0, 0).setAngle(0).setScale(s);
    hearts(this.scene, this.x, this.y - this.headHeight);
    const { jump: hop, jumps } = ANIMAL_ART[this.species];
    const once = [
      { scaleX: s * 1.12, scaleY: s * 0.86, duration: 120, ease: 'Quad.easeOut' },
      { y: -hop, scaleX: s * 0.92, scaleY: s * 1.1, duration: 230, ease: 'Quad.easeOut' },
      { y: 0, scaleX: s, scaleY: s, duration: 200, ease: 'Quad.easeIn' },
      { scaleX: s * 1.1, scaleY: s * 0.9, duration: 90, ease: 'Quad.easeOut' },
      { scaleX: s, scaleY: s, duration: 140, ease: 'Back.easeOut' },
    ];
    const wiggle = [
      { angle: -7, duration: 110 }, { angle: 7, duration: 160 }, { angle: -5, duration: 140 }, { angle: 0, duration: 120 },
    ];
    const tweens = jumps > 1 ? Array.from({ length: jumps }, () => once).flat() : [...once, ...wiggle];
    this.scene.tweens.chain({
      targets: b,
      tweens,
      onComplete: () => {
        if (this.dead) return;
        this.mode = 'idle';
        this.until = this.scene.time.now + Phaser.Math.Between(1200, 3000);
      },
    });
  }

  /** Walk over to food that landed in the enclosure, bow down to eat it, then show off. */
  eat(food: Phaser.GameObjects.Image) {
    this.walkTo(food.x - this.root.scaleX * this.halfWidth * 0.6, food.y + 4, () => {
      this.face(food.x - this.x);
      this.mode = 'busy';
      this.scene.tweens.chain({
        targets: this.body,
        tweens: [
          { angle: 9, duration: 260, ease: 'Sine.easeInOut' },
          { angle: 5, duration: 160, yoyo: true, repeat: 2 },
          { angle: 0, duration: 220, ease: 'Sine.easeInOut' },
        ],
        onComplete: () => {
          if (this.dead) return;
          this.mode = 'idle';
          this.trick();
        },
      });
      this.scene.tweens.add({ targets: food, scale: 0, alpha: 0, delay: 300, duration: 500, onComplete: () => food.destroy() });
    });
  }

  update(time: number, dt: number) {
    const art = ANIMAL_ART[this.species];
    if (this.mode === 'walk') {
      const dx = this.target.x - this.x, dy = this.target.y - this.y;
      const d = Math.hypot(dx, dy), step = this.speed * dt;
      this.phase += dt * art.stride;
      if (d <= step) {
        this.root.setPosition(this.target.x, this.target.y);
        this.mode = 'idle';
        this.until = time + Phaser.Math.Between(1500, 4500);
        const cb = this.onArrive;
        this.onArrive = null;
        cb?.();
      } else {
        this.root.x += (dx / d) * step;
        this.root.y += (dy / d) * step;
        // hop between steps, lean into each one, squash a little at the bottom of the hop
        const hop = Math.abs(Math.sin(this.phase));
        this.body.y = -hop * art.bob;
        this.body.angle = Math.sin(this.phase) * art.tilt;
        const squash = 1 - (1 - hop) * 0.05;
        this.body.setScale(this.scale * (2 - squash), this.scale * squash);
      }
    } else if (this.mode === 'idle') {
      const breath = Math.sin(time / 420 + this.phase) * 0.018;
      this.body.y = 0;
      this.body.angle *= 0.85;
      this.body.setScale(this.scale * (1 - breath * 0.5), this.scale * (1 + breath));
      if (time > this.until) {
        if (Math.random() < 0.15) this.trick();
        else {
          const spot = this.randomSpot();
          this.walkTo(spot.x, spot.y);
        }
      }
    }
    this.root.setDepth(this.y);
  }

  destroy() {
    this.dead = true;
    this.scene.tweens.killTweensOf(this.body);
    this.root.destroy();
  }
}
