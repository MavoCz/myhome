import Phaser from 'phaser';
import type { ZooController } from '../controller';
import type { CanvasMap } from '../textures';
import { ZooScene, type ZooSceneData } from './ZooScene';

/**
 * Phaser 3 draws at CSS pixel size, which looks blurry on a retina tablet. The canvas is
 * therefore made devicePixelRatio times bigger and shown scaled down.
 */
export function createZooGame(parent: HTMLElement, ctl: ZooController, canvases: CanvasMap) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = () => ({ w: Math.max(1, Math.round(parent.clientWidth * dpr)), h: Math.max(1, Math.round(parent.clientHeight * dpr)) });
  const { w, h } = size();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#5d9b47',
    scale: { mode: Phaser.Scale.NONE, width: w, height: h, zoom: 1 / dpr },
    // mipmaps keep shrunken pictures smooth; they need power-of-two textures (see loadPicture)
    render: { antialias: true, mipmapFilter: 'LINEAR_MIPMAP_LINEAR' },
    input: { activePointers: 3 },
    banner: false,
  });
  const data: ZooSceneData = { ctl, canvases, dpr };
  game.scene.add('zoo', ZooScene, true, data);

  // keep trackpad pinches and scrolls inside the game instead of zooming or scrolling the page
  const stopWheel = (e: WheelEvent) => e.preventDefault();
  parent.addEventListener('wheel', stopWheel, { passive: false });

  const ro = new ResizeObserver(() => {
    const s = size();
    game.scale.resize(s.w, s.h);
    game.scale.setZoom(1 / dpr);
  });
  ro.observe(parent);

  return {
    destroy() {
      ro.disconnect();
      parent.removeEventListener('wheel', stopWheel);
      game.destroy(true);
    },
  };
}
