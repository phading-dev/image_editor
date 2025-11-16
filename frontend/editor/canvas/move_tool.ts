import { Layer } from "../project_metadata";

export class MoveTool {
  private isDragging = false;
  private layers: Layer[];
  private initialTransforms?: Array<{ x: number; y: number }>;
  private lastCanvasPoint?: { x: number; y: number };

  public constructor(
    private readonly canvasContainer: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly getSelectedLayers: () => Layer[],
    private readonly rerender: () => void,
    private readonly commit: (
      layers: Layer[],
      deltaX: number,
      deltaY: number,
    ) => void,
    private readonly warning: (message: string) => void,
  ) {
    this.canvas.style.cursor = "move";
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
    const selectedLayers = this.getSelectedLayers();
    if (selectedLayers.length === 0) {
      this.warning("No layers selected to move.");
      return;
    }
    this.layers = selectedLayers.filter((layer) => !layer.locked);
    if (this.layers.length === 0) {
      this.warning("All selected layers are locked.");
      return;
    }
    if (this.layers.length < selectedLayers.length) {
      this.warning("Some selected layers are locked and cannot be moved.");
      // Continue with the unlocked layers
    }

    event.preventDefault();
    this.isDragging = true;
    this.canvasContainer.setPointerCapture(event.pointerId);
    this.lastCanvasPoint = this.eventToCanvasPoint(event);
    this.initialTransforms = this.layers.map((layer) => ({
      x: layer.transform.translateX,
      y: layer.transform.translateY,
    }));
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
    this.layers.forEach((layer) => {
      layer.transform.translateX = layer.transform.translateX + delta.x;
      layer.transform.translateY = layer.transform.translateY + delta.y;
    });
    this.lastCanvasPoint = currentPoint;
    this.rerender();
  };

  private handlePointerUpOrCancel = (event: PointerEvent): void => {
    if (!this.isDragging) {
      return;
    }
    event.preventDefault();
    this.isDragging = false;
    if (this.canvasContainer.hasPointerCapture(event.pointerId)) {
      this.canvasContainer.releasePointerCapture(event.pointerId);
    }
    let deltaX = 0;
    let deltaY = 0;
    this.layers.forEach((layer, index) => {
      let initialTransform = this.initialTransforms[index];
      deltaX = layer.transform.translateX - initialTransform.x;
      deltaY = layer.transform.translateY - initialTransform.y;
      layer.transform.translateX = initialTransform.x;
      layer.transform.translateY = initialTransform.y;
    });
    this.commit(this.layers, deltaX, deltaY);
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
    this.canvas.style.cursor = "";
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
