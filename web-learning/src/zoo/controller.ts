import type { ItemId } from '../state/types';

export type Mode = 'walk' | 'build';
export type Tool = ItemId | 'remove' | null;

type Events = {
  change: void;
  toast: string;
};

/** The link between the React overlay and the Phaser scene. */
export class ZooController {
  mode: Mode = 'walk';
  tool: Tool = null;
  private listeners: { [K in keyof Events]: Set<(v: Events[K]) => void> } = { change: new Set(), toast: new Set() };

  constructor(
    /** whose zoo is shown */
    readonly hostId: string,
    /** who is walking around in it */
    readonly visitorId: string,
  ) {}

  get visiting() {
    return this.hostId !== this.visitorId;
  }

  on<K extends keyof Events>(event: K, fn: (v: Events[K]) => void): () => void {
    this.listeners[event].add(fn);
    return () => this.listeners[event].delete(fn);
  }

  private emit<K extends keyof Events>(event: K, value: Events[K]) {
    this.listeners[event].forEach(fn => fn(value));
  }

  setMode(mode: Mode) {
    this.mode = this.visiting ? 'walk' : mode;
    if (this.mode === 'walk') this.tool = null;
    this.emit('change', undefined);
  }

  setTool(tool: Tool) {
    this.tool = tool;
    this.emit('change', undefined);
  }

  toast(text: string) {
    this.emit('toast', text);
  }
}
