import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { Transform } from "../project_metadata";

export class DeleteMaskedAreaCommand implements Command {
  private oldImageData: ImageData;
  private newImageData: ImageData;

  public constructor(
    private context: CanvasRenderingContext2D,
    private layerWidth: number,
    private layerHeight: number,
    private transform: Transform,
    private mask: ImageData,
    private mainCanvasPanel: MainCanvasPanel,
  ) {
    // Store the old image data for undo
    this.oldImageData = this.context.getImageData(
      0,
      0,
      this.layerWidth,
      this.layerHeight,
    );

    // Create new image data with selected pixels deleted
    this.newImageData = new ImageData(
      new Uint8ClampedArray(this.oldImageData.data),
      this.layerWidth,
      this.layerHeight,
    );

    // Build the transform matrix to convert layer coordinates to canvas coordinates
    const matrix = new DOMMatrix()
      .translate(this.transform.translateX, this.transform.translateY)
      .rotate(this.transform.rotation)
      .scale(this.transform.scaleX, this.transform.scaleY);

    // Delete pixels based on the mask
    // The mask RGB values indicate selection intensity (0-255)
    for (let y = 0; y < this.layerHeight; y++) {
      for (let x = 0; x < this.layerWidth; x++) {
        // Transform layer pixel to canvas space
        const canvasPoint = matrix.transformPoint(new DOMPoint(x, y));
        const canvasX = Math.round(canvasPoint.x);
        const canvasY = Math.round(canvasPoint.y);

        // Check if the canvas point is within mask bounds
        if (
          canvasX >= 0 &&
          canvasX < this.mask.width &&
          canvasY >= 0 &&
          canvasY < this.mask.height
        ) {
          const pixelIndex = (y * this.layerWidth + x) * 4;
          const maskIndex = (canvasY * this.mask.width + canvasX) * 4;

          // Use the red channel of the mask as selection intensity (0-255)
          const maskValue = this.mask.data[maskIndex];
          if (maskValue > 0) {
            // Subtract mask value from alpha, capped at 0
            const currentAlpha = this.newImageData.data[pixelIndex + 3];
            const newAlpha = Math.max(0, currentAlpha - maskValue);
            this.newImageData.data[pixelIndex + 3] = newAlpha;
          }
        }
      }
    }
  }

  public do(): void {
    this.context.putImageData(this.newImageData, 0, 0);
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    this.context.putImageData(this.oldImageData, 0, 0);
    this.mainCanvasPanel.rerender();
  }
}
