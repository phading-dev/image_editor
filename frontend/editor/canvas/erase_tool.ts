import { Layer, ProjectSettings } from "../project_metadata";

export class EraseTool {
  private isErasing = false;
  private layer: Layer;
  private context: CanvasRenderingContext2D;
  private lastErasePoint?: { x: number; y: number };
  private oldImageData?: ImageData;

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly projectSettings: ProjectSettings,
    private readonly getActiveLayer: () => Layer,
    private readonly getActiveLayerContext: () => CanvasRenderingContext2D,
    private readonly commit: (
      context: CanvasRenderingContext2D,
      oldImageData: ImageData,
      newImageData: ImageData,
    ) => void,
    private readonly warning: (message: string) => void,
  ) {
    this.canvas.style.cursor = "crosshair";
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerup", this.handlePointerUpOrCancel);
    this.canvas.addEventListener("pointerleave", this.handlePointerUpOrCancel);
    this.canvas.addEventListener("pointercancel", this.handlePointerUpOrCancel);
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) {
      return;
    }
    this.layer = this.getActiveLayer();
    if (!this.layer) {
      this.warning("No active layer to erase on.");
      return;
    }
    if (this.layer.locked) {
      this.warning("Cannot erase on a locked layer.");
      return;
    }
    if (this.layer.basicText) {
      this.warning(
        "Cannot erase on a text layer. Please rasterize it first.",
      );
      return;
    }

    event.preventDefault();
    this.isErasing = true;
    this.canvas.setPointerCapture(event.pointerId);
    this.context = this.getActiveLayerContext();
    this.oldImageData = this.context.getImageData(
      0,
      0,
      this.layer.width,
      this.layer.height,
    );
    this.eraseAtPoint({ x: event.clientX, y: event.clientY });
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.isErasing) {
      return;
    }
    event.preventDefault();
    this.eraseAtPoint({ x: event.clientX, y: event.clientY });
  };

  private handlePointerUpOrCancel = (event: PointerEvent): void => {
    if (!this.isErasing) {
      return;
    }
    event.preventDefault();
    this.isErasing = false;
    this.lastErasePoint = undefined;
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    let newImageData = this.context.getImageData(
      0,
      0,
      this.layer.width,
      this.layer.height,
    );
    this.commit(this.context, this.oldImageData, newImageData);
  };

  private eraseAtPoint(point: { x: number; y: number }): void {
    let layerPoint = this.eventToLayerPoint(point, this.layer);
    this.drawEraseSegment(layerPoint, this.lastErasePoint);
    this.lastErasePoint = layerPoint;
  }

  private eventToLayerPoint(
    point: { x: number; y: number },
    layer: Layer,
  ): { x: number; y: number } {
    let rect = this.canvas.getBoundingClientRect();
    let scaleX = this.canvas.width / rect.width;
    let scaleY = this.canvas.height / rect.height;
    let mainCanvasX = (point.x - rect.left) * scaleX;
    let mainCanvasY = (point.y - rect.top) * scaleY;

    let transform = layer.transform;
    let matrix = new DOMMatrix()
      .translate(transform.translateX, transform.translateY)
      .rotate(transform.rotation)
      .scale(transform.scaleX, transform.scaleY);
    let layerPoint = matrix
      .inverse()
      .transformPoint(new DOMPoint(mainCanvasX, mainCanvasY));
    return { x: layerPoint.x, y: layerPoint.y };
  }

  private drawEraseSegment(
    to: { x: number; y: number },
    from?: { x: number; y: number },
  ): void {
    from ??= to;
    // Use destination-out to erase pixels
    this.context.globalCompositeOperation = "destination-out";
    let scaleX = Math.abs(this.layer.transform.scaleX);
    let scaleY = Math.abs(this.layer.transform.scaleY);
    let averageScale = (scaleX + scaleY) / 2;
    this.context.lineWidth =
      this.projectSettings.eraseToolSettings.brushSize / averageScale;
    this.context.lineCap = "round";
    this.context.lineJoin = "round";
    this.context.beginPath();
    this.context.moveTo(from.x, from.y);
    this.context.lineTo(to.x, to.y);
    this.context.stroke();
    // Reset composite operation
    this.context.globalCompositeOperation = "source-over";
  }

  public remove(): void {
    this.canvas.style.cursor = "";
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerup", this.handlePointerUpOrCancel);
    this.canvas.removeEventListener(
      "pointerleave",
      this.handlePointerUpOrCancel,
    );
    this.canvas.removeEventListener(
      "pointercancel",
      this.handlePointerUpOrCancel,
    );
  }
}
