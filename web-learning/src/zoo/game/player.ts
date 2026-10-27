import Phaser from 'phaser';
import type { Avatar } from '../../state/types';
import { HAND, avatarRig } from '../art/avatar';
import { FX_ART, type FxName } from '../art/pictures';
import { picture, rigJoint, rigPart, swing } from './rig';

type Stop = () => void;

/** The child's own character: walks along a path of world points and can water or feed. */
export class PlayerView {
  readonly root: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Container;
  private armFront: Phaser.GameObjects.Container;
  private parts: Record<string, Phaser.GameObjects.Image> = {};
  private held: Phaser.GameObjects.Image | null = null;
  private route: Phaser.Math.Vector2[] = [];
  private onArrive: (() => void) | null = null;
  private stopWalk: Stop[] = [];
  private busy = false;
  private armPivot: [number, number];
  private readonly speed = 175;
  readonly height: number;

  constructor(private scene: Phaser.Scene, avatar: Avatar, x: number, y: number) {
    const rig = avatarRig(avatar);
    const A = rig.anchor;
    this.armPivot = rig.parts.armFront.pivot;
    this.height = A[1] * rig.scale;
    this.root = scene.add.container(x, y).setScale(rig.scale);
    const part = (name: string, pivot = A) => (this.parts[name] = rigPart(scene, 'avatar', rig, name, pivot));

    this.body = scene.add.container(0, 0);
    this.armFront = rigJoint(scene, rig, 'armFront', A);
    this.armFront.add(part('armFront', rig.parts.armFront.pivot));
    this.body.add([part('hairBack'), part('armBack'), part('torso'), part('head'), this.armFront]);
    this.root.add([part('legBack'), part('legFront'), this.body]);

    // gentle breathing while standing
    scene.tweens.add({ targets: this.parts.head, angle: 2, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: this.parts.hairBack, angle: 5, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.root.setDepth(y);
  }

  get x() { return this.root.x; }
  get y() { return this.root.y; }
  get isBusy() { return this.busy; }

  face(dx: number) {
    if (Math.abs(dx) < 1) return;
    const s = Math.abs(this.root.scaleX);
    this.root.scaleX = dx < 0 ? -s : s;
  }

  private setWalking(on: boolean) {
    this.stopWalk.forEach(stop => stop());
    if (!on) {
      this.stopWalk = [];
      return;
    }
    const s = this.scene, p = this.parts;
    const bob = s.tweens.add({ targets: this.body, y: -3, duration: 150, yoyo: true, repeat: -1 });
    this.stopWalk = [
      swing(s, p.legFront, 22, -22, 300), swing(s, p.legBack, -22, 22, 300),
      swing(s, this.armFront, -24, 24, 300), swing(s, p.armBack, 24, -24, 300),
      () => { bob.remove(); this.body.y = 0; },
    ];
  }

  walk(points: Phaser.Math.Vector2[], then?: () => void) {
    if (this.busy) return;
    this.route = points;
    this.onArrive = then ?? null;
    if (!points.length) {
      this.arrive();
      return;
    }
    if (!this.stopWalk.length) this.setWalking(true);
  }

  stop() {
    this.route = [];
    this.onArrive = null;
    this.setWalking(false);
  }

  private arrive() {
    this.setWalking(false);
    const cb = this.onArrive;
    this.onArrive = null;
    cb?.();
  }

  private hold(key: FxName | null, angle = 0) {
    this.held?.destroy();
    this.held = null;
    if (!key) return;
    // held things are smaller than thrown ones; the arm is scaled by the rig, so size in rig units
    const size = (FX_ART[key].size * 0.6) / this.root.scaleY;
    this.held = picture(this.scene, HAND[0] - this.armPivot[0], HAND[1] - this.armPivot[1] + 4, `fx:${key}`, size).setOrigin(0.3, 0.2).setAngle(angle);
    this.armFront.add(this.held);
  }

  /** Raise the watering can over a spot and let three drops fall on it. */
  water(tx: number, ty: number, done: () => void) {
    this.busy = true;
    this.face(tx - this.x);
    this.hold('can');
    this.scene.tweens.add({
      targets: this.armFront, angle: -70, duration: 300, ease: 'Sine.easeOut',
      onComplete: () => {
        for (let i = 0; i < 4; i++) {
          const d = picture(this.scene, tx + Phaser.Math.Between(-10, 10), ty - 50, 'fx:drop', FX_ART.drop.size).setDepth(1e6);
          this.scene.tweens.add({ targets: d, y: ty - 6, alpha: { from: 1, to: 0.2 }, delay: i * 140, duration: 420, ease: 'Quad.easeIn', onComplete: () => d.destroy() });
        }
        this.scene.time.delayedCall(900, () => this.lower(done));
      },
    });
  }

  /** Throw food in an arc to (tx, ty); calls landed with the food sprite left lying there. */
  throwFood(key: FxName, tx: number, ty: number, landed: (food: Phaser.GameObjects.Image) => void) {
    this.busy = true;
    this.face(tx - this.x);
    this.hold(key);
    this.scene.tweens.add({
      targets: this.armFront, angle: -120, duration: 260, ease: 'Sine.easeOut',
      onComplete: () => {
        this.hold(null);
        const sx = this.x + (this.root.scaleX > 0 ? 18 : -18), sy = this.y - this.height * 0.75;
        const food = picture(this.scene, sx, sy, `fx:${key}`, FX_ART[key].size).setDepth(1e6);
        const peak = Math.min(sy, ty) - 70;
        this.scene.tweens.addCounter({
          from: 0, to: 1, duration: 650,
          onUpdate: t => {
            const k = t.getValue() ?? 0;
            food.x = sx + (tx - sx) * k;
            food.y = (1 - k) * (1 - k) * sy + 2 * (1 - k) * k * peak + k * k * ty;
            food.angle = k * 360;
          },
          onComplete: () => {
            food.setAngle(0).setDepth(ty - 1);
            landed(food);
          },
        });
        this.lower(() => undefined);
      },
    });
  }

  private lower(done: () => void) {
    this.scene.tweens.add({
      targets: this.armFront, angle: 0, duration: 260, ease: 'Sine.easeIn',
      onComplete: () => {
        this.hold(null);
        this.busy = false;
        done();
      },
    });
  }

  update(dt: number) {
    if (this.route.length) {
      const next = this.route[0];
      const dx = next.x - this.x, dy = next.y - this.y;
      const d = Math.hypot(dx, dy), step = this.speed * dt;
      this.face(dx);
      if (d <= step) {
        this.root.setPosition(next.x, next.y);
        this.route.shift();
        if (!this.route.length) this.arrive();
      } else {
        this.root.x += (dx / d) * step;
        this.root.y += (dy / d) * step;
      }
    }
    this.root.setDepth(this.y);
  }
}
