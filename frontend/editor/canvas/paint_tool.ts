import { Layer } from "../project_metadata";

export class PaintTool {
  private isPainting = false;
  private lastPaintPoint?: { x: number; y: number };
  private oldImageData?: ImageData;

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly getActiveLayer: () => Layer,
    private readonly getActiveLayerContext: () => CanvasRenderingContext2D,
    private readonly rerender: () => void,
    private readonly commit: (
      canvas: HTMLCanvasElement,
      oldImageData: ImageData,
      newImageData: ImageData,
    ) => void,
  ) {
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerup", this.handlePointerUpOrCancel);
    this.canvas.addEventListener("pointerleave", this.handlePointerUpOrCancel);
    this.canvas.addEventListener("pointercancel", this.handlePointerUpOrCancel);
  }

  private handlePointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    this.isPainting = true;
    this.canvas.setPointerCapture(event.pointerId);
    this.oldImageData = this.getActiveLayerContext().getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    this.paintAtPoint({ x: event.clientX, y: event.clientY });
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.isPainting) {
      return;
    }
    event.preventDefault();
    this.paintAtPoint({ x: event.clientX, y: event.clientY });
  };

  private handlePointerUpOrCancel = (event: PointerEvent): void => {
    if (!this.isPainting) {
      return;
    }
    event.preventDefault();
    this.isPainting = false;
    this.lastPaintPoint = undefined;
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    let newImageData = this.getActiveLayerContext().getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    this.commit(this.canvas, this.oldImageData, newImageData);
  };

  private paintAtPoint(point: { x: number; y: number }): void {
    let layer = this.getActiveLayer();
    let layerPoint = this.eventToLayerPoint(point, layer);
    let context = this.getActiveLayerContext();
    this.drawStrokeSegment(context, layerPoint, this.lastPaintPoint);
    this.lastPaintPoint = layerPoint;
    this.rerender();
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

  private drawStrokeSegment(
    context: CanvasRenderingContext2D,
    to: { x: number; y: number },
    from?: { x: number; y: number },
  ): void {
    from ??= to;
    context.strokeStyle = "#000000";
    let layer = this.getActiveLayer();
    let scaleX = Math.abs(layer.transform.scaleX);
    let scaleY = Math.abs(layer.transform.scaleY);
    let averageScale = (scaleX + scaleY) / 2;
    context.lineWidth = 1 / averageScale;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }

  public remove(): void {
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
