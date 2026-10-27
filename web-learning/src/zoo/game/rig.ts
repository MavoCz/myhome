import Phaser from 'phaser';
import { FX_ART } from '../art/pictures';
import type { Rig, Vec } from '../art/svg';
import { PICTURE_FRAME, RES } from '../textures';

/**
 * Places one rig part inside a container whose origin sits at `parentPivot` (viewBox units),
 * so that rotating the image turns it around the part's own joint.
 */
export function rigPart(scene: Phaser.Scene, prefix: string, rig: Rig, part: string, parentPivot: Vec): Phaser.GameObjects.Image {
  const p = rig.parts[part];
  return scene.add
    .image(p.pivot[0] - parentPivot[0], p.pivot[1] - parentPivot[1], `${prefix}:${part}`)
    .setOrigin(p.pivot[0] / rig.vb[0], p.pivot[1] / rig.vb[1])
    .setScale(1 / RES);
}

/** A sub-container placed at a part's pivot, for limbs that carry other parts. */
export function rigJoint(scene: Phaser.Scene, rig: Rig, part: string, parentPivot: Vec): Phaser.GameObjects.Container {
  const p = rig.parts[part];
  return scene.add.container(p.pivot[0] - parentPivot[0], p.pivot[1] - parentPivot[1]);
}

/** Starts a looping swing between two angles and returns a stopper that eases back to rest. */
export function swing(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform & object, from: number, to: number, duration: number, delayFrac = 0) {
  target.angle = from;
  const t = scene.tweens.add({ targets: target, angle: to, duration, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  if (delayFrac) t.seek(duration * 2 * delayFrac);
  return () => {
    t.remove();
    scene.tweens.add({ targets: target, angle: 0, duration: 160, ease: 'Sine.easeOut' });
  };
}

/** A picture texture shown `size` world pixels along its longer side. */
export function picture(scene: Phaser.Scene, x: number, y: number, key: string, size: number) {
  const img = scene.add.image(x, y, key, PICTURE_FRAME);
  return img.setScale(size / Math.max(img.width, img.height));
}

export function hearts(scene: Phaser.Scene, x: number, y: number, count = 4) {
  for (let i = 0; i < count; i++) {
    const h = picture(scene, x + Phaser.Math.Between(-14, 14), y, 'fx:heart', FX_ART.heart.size).setDepth(1e6).setAlpha(0);
    const full = h.scale;
    h.setScale(full * 0.2);
    scene.tweens.add({
      targets: h,
      delay: i * 150,
      y: y - 70 - Math.random() * 20,
      x: h.x + Phaser.Math.Between(-24, 24),
      scale: full,
      alpha: { from: 1, to: 0 },
      duration: 1300,
      ease: 'Cubic.easeOut',
      onComplete: () => h.destroy(),
    });
  }
}

export function pop(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform & object) {
  const sx = target.scaleX, sy = target.scaleY;
  target.setScale(sx * 0.2, sy * 0.2);
  scene.tweens.add({ targets: target, scaleX: sx, scaleY: sy, duration: 420, ease: 'Back.easeOut' });
}
