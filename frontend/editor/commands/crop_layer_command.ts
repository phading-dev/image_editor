import { Command } from "../command_history_manager";
import { Layer, Transform } from "../project_metadata";
import { MainCanvasPanel } from "../canvas/main_canvas_panel";

export class CropLayerCommand implements Command {
  private readonly oldLayerCanvas: HTMLCanvasElement;
  private readonly oldTransform: Transform;
  private readonly oldWidth: number;
  private readonly oldHeight: number;
  private newLayerCanvas: HTMLCanvasElement;

  constructor(
    private readonly layer: Layer,
    private readonly cropRect: {
      x: number;
      y: number;
      width: number;
      height: number;
    },
    private readonly mainCanvasPanel: MainCanvasPanel,
    private readonly projectLayersToCanvas: Map<string, HTMLCanvasElement>,
  ) {
    this.oldLayerCanvas = this.projectLayersToCanvas.get(layer.id);
    this.oldTransform = { ...layer.transform };
    this.oldWidth = layer.width;
    this.oldHeight = layer.height;

    // 1. Create new canvas
    this.newLayerCanvas = document.createElement("canvas");
    this.newLayerCanvas.width = this.cropRect.width;
    this.newLayerCanvas.height = this.cropRect.height;
    const ctx = this.newLayerCanvas.getContext("2d");

    // 2. Draw source image onto new canvas
    // We need to transform the context such that the cropRect in the original canvas space
    // maps to (0, 0) in the new canvas space.
    // The original layer is drawn at (translateX, translateY) with rotation and scale.
    // We want to capture the pixels at (cropRect.x, cropRect.y) to (cropRect.x + w, cropRect.y + h).

    // Translate so that cropRect top-left is at 0,0
    ctx.translate(-this.cropRect.x, -this.cropRect.y);

    // Apply the original layer's transform
    ctx.translate(this.oldTransform.translateX, this.oldTransform.translateY);
    ctx.rotate((this.oldTransform.rotation * Math.PI) / 180);
    ctx.scale(this.oldTransform.scaleX, this.oldTransform.scaleY);

    // Draw the original image
    ctx.drawImage(this.oldLayerCanvas, 0, 0);
  }

  public do(): void {
    this.layer.width = this.cropRect.width;
    this.layer.height = this.cropRect.height;
    this.layer.transform.translateX = this.cropRect.x;
    this.layer.transform.translateY = this.cropRect.y;
    this.layer.transform.rotation = 0;
    this.layer.transform.scaleX = 1;
    this.layer.transform.scaleY = 1;
    this.projectLayersToCanvas.set(this.layer.id, this.newLayerCanvas);
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    this.layer.width = this.oldWidth;
    this.layer.height = this.oldHeight;
    this.layer.transform = { ...this.oldTransform };
    this.projectLayersToCanvas.set(this.layer.id, this.oldLayerCanvas);
    this.mainCanvasPanel.rerender();
  }
}
