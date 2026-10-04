/** Shared contract for the per-panel canvas scenes. */

export interface SceneState {
  /** CSS pixel size of the canvas. */
  width: number;
  height: number;
  /** Pointer position relative to the canvas, in CSS pixels. */
  pointerX: number;
  pointerY: number;
  /** True while the pointer is over the panel. */
  inside: boolean;
  /** False when the panel is scrolled out of view, so drawing can be skipped. */
  visible: boolean;
  /** True when this panel is the centred slide. */
  open: boolean;
  downX: number;
  downY: number;
}

export interface PanelScene {
  /** Called when the canvas is resized. */
  resize(state: SceneState): void;
  /** Called every frame while the panel is visible. */
  draw(ctx: CanvasRenderingContext2D, state: SceneState, t: number): void;
  down?(state: SceneState): void;
  up?(state: SceneState): void;
  tap?(state: SceneState, t: number): void;
  dispose?(): void;
}