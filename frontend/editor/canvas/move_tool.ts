import { Layer } from "../project_metadata";

export class MoveTool {
  private isDragging = false;
  private lastCanvasPoint?: { x: number; y: number };

  public constructor(
    private readonly canvasContainer: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly getActiveLayer: () => Layer,
    private readonly commit: (
      layer: Layer,
      deltaX: number,
      deltaY: number,
    ) => void,
  ) {
    this.canvasContainer.addEventListener(
      "pointerdown",
      this.handlePointerDown,
    );
    this.canvasContainer.addEventListener(
      "pointermove",
      this.handlePointerMove,
    );
    this.canvasContainer.addEventListener(
      "pointerup",
      this.handlePointerUpOrCancel,
    );
    this.canvasContainer.addEventListener(
      "pointerleave",
      this.handlePointerUpOrCancel,
    );
    this.canvasContainer.addEventListener(
      "pointercancel",
      this.handlePointerUpOrCancel,
    );
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    this.isDragging = true;
    this.canvasContainer.setPointerCapture(event.pointerId);
    this.lastCanvasPoint = this.eventToCanvasPoint(event);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.isDragging || !this.lastCanvasPoint) {
      return;
    }
    event.preventDefault();
    let currentPoint = this.eventToCanvasPoint(event);
    let delta = {
      x: currentPoint.x - this.lastCanvasPoint.x,
      y: currentPoint.y - this.lastCanvasPoint.y,
    };
    this.lastCanvasPoint = currentPoint;
    let layer = this.getActiveLayer();
    layer.transform.translateX = layer.transform.translateX + delta.x;
    layer.transform.translateY = layer.transform.translateY + delta.y;
    this.commit(layer, delta.x, delta.y);
  };

  private handlePointerUpOrCancel = (event: PointerEvent): void => {
    if (!this.isDragging) {
      return;
    }
    event.preventDefault();
    this.isDragging = false;
    this.lastCanvasPoint = undefined;
    if (this.canvasContainer.hasPointerCapture(event.pointerId)) {
      this.canvasContainer.releasePointerCapture(event.pointerId);
    }
  };

  private eventToCanvasPoint(event: PointerEvent): { x: number; y: number } {
    let rect = this.canvas.getBoundingClientRect();
    let scaleX = this.canvas.width / rect.width;
    let scaleY = this.canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  public remove(): void {
    this.canvasContainer.removeEventListener(
      "pointerdown",
      this.handlePointerDown,
    );
    this.canvasContainer.removeEventListener(
      "pointermove",
      this.handlePointerMove,
    );
    this.canvasContainer.removeEventListener(
      "pointerup",
      this.handlePointerUpOrCancel,
    );
    this.canvasContainer.removeEventListener(
      "pointerleave",
      this.handlePointerUpOrCancel,
    );
    this.canvasContainer.removeEventListener(
      "pointercancel",
      this.handlePointerUpOrCancel,
    );
  }
}
