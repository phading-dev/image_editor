import { Layer } from "../project_metadata";

export class MoveTool {
  private isDragging = false;
  private layers: Layer[];
  private initialTransforms?: Array<{ x: number; y: number }>;
  private initialPointerPos?: { x: number; y: number };

  public constructor(
    private readonly canvasContainer: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly getSelectedLayers: () => Layer[],
    private readonly getLayerCanvas: (layerId: string) => HTMLCanvasElement | undefined,
    private readonly updateLayerCanvasStyle: (canvas: HTMLCanvasElement, layer: Layer) => void,
    private readonly getLayerTextarea: (layerId: string) => HTMLTextAreaElement | undefined,
    private readonly updateTextareaStyle: (textarea: HTMLTextAreaElement, layer: Layer) => void,
    private readonly drawActiveLayerOutline: () => void,
    private readonly commit: (
      layers: Layer[],
      deltaX: number,
      deltaY: number,
    ) => void,
    private readonly warning: (message: string) => void,
  ) {
    this.canvasContainer.style.cursor = "move";
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
    this.initialPointerPos = this.eventToCanvasPoint(event);
    this.initialTransforms = this.layers.map((layer) => ({
      x: layer.transform.translateX,
      y: layer.transform.translateY,
    }));
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.isDragging || !this.initialPointerPos) {
      return;
    }
    event.preventDefault();
    const currentPoint = this.eventToCanvasPoint(event);
    let deltaX = currentPoint.x - this.initialPointerPos.x;
    let deltaY = currentPoint.y - this.initialPointerPos.y;
    if (event.shiftKey) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        deltaY = 0;
      } else {
        deltaX = 0;
      }
    }
    this.layers.forEach((layer, index) => {
      const initial = this.initialTransforms![index];
      layer.transform.translateX = Math.round((initial.x + deltaX) * 100) / 100;
      layer.transform.translateY = Math.round((initial.y + deltaY) * 100) / 100;
    });

    // Update layer visuals directly without rerendering everything
    this.layers.forEach((layer) => {
      const layerCanvas = this.getLayerCanvas(layer.id);
      if (layerCanvas) {
        this.updateLayerCanvasStyle(layerCanvas, layer);
      }
      const layerTextarea = this.getLayerTextarea(layer.id);
      if (layerTextarea) {
        this.updateTextareaStyle(layerTextarea, layer);
      }
    });
    this.drawActiveLayerOutline();
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
    this.canvasContainer.style.cursor = "";
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
