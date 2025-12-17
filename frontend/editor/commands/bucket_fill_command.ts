import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { Transform } from "../project_metadata";

export class BucketFillCommand implements Command {
  private oldImageData: ImageData;
  private newImageData: ImageData;

  public constructor(
    private context: CanvasRenderingContext2D,
    private layerWidth: number,
    private layerHeight: number,
    private transform: Transform,
    private foregroundColor: string,
    private mask: ImageData | undefined,
    private mainCanvasPanel: MainCanvasPanel,
  ) {
    // Store the old image data for undo
    this.oldImageData = this.context.getImageData(
      0,
      0,
      this.layerWidth,
      this.layerHeight,
    );

    // Parse foreground color
    const fillColor = this.parseColor(this.foregroundColor);

    // Create new image data
    this.newImageData = new ImageData(
      new Uint8ClampedArray(this.oldImageData.data),
      this.layerWidth,
      this.layerHeight,
    );

    if (this.mask) {
      // Fill based on mask
      const matrix = new DOMMatrix()
        .translate(this.transform.translateX, this.transform.translateY)
        .rotate(this.transform.rotation)
        .scale(this.transform.scaleX, this.transform.scaleY);

      for (let y = 0; y < this.layerHeight; y++) {
        for (let x = 0; x < this.layerWidth; x++) {
          const canvasPoint = matrix.transformPoint(new DOMPoint(x, y));
          const canvasX = Math.round(canvasPoint.x);
          const canvasY = Math.round(canvasPoint.y);

          if (
            canvasX >= 0 &&
            canvasX < this.mask.width &&
            canvasY >= 0 &&
            canvasY < this.mask.height
          ) {
            const pixelIndex = (y * this.layerWidth + x) * 4;
            const maskIndex = (canvasY * this.mask.width + canvasX) * 4;
            const maskValue = this.mask.data[maskIndex] / 255;

            if (maskValue > 0) {
              // Blend fill color with existing color based on mask value
              const oldR = this.oldImageData.data[pixelIndex];
              const oldG = this.oldImageData.data[pixelIndex + 1];
              const oldB = this.oldImageData.data[pixelIndex + 2];
              const oldA = this.oldImageData.data[pixelIndex + 3];

              this.newImageData.data[pixelIndex] = Math.round(
                oldR * (1 - maskValue) + fillColor.r * maskValue,
              );
              this.newImageData.data[pixelIndex + 1] = Math.round(
                oldG * (1 - maskValue) + fillColor.g * maskValue,
              );
              this.newImageData.data[pixelIndex + 2] = Math.round(
                oldB * (1 - maskValue) + fillColor.b * maskValue,
              );
              this.newImageData.data[pixelIndex + 3] = Math.round(
                oldA * (1 - maskValue) + fillColor.a * maskValue,
              );
            }
          }
        }
      }
    } else {
      // Fill entire layer
      for (let y = 0; y < this.layerHeight; y++) {
        for (let x = 0; x < this.layerWidth; x++) {
          const pixelIndex = (y * this.layerWidth + x) * 4;
          this.newImageData.data[pixelIndex] = fillColor.r;
          this.newImageData.data[pixelIndex + 1] = fillColor.g;
          this.newImageData.data[pixelIndex + 2] = fillColor.b;
          this.newImageData.data[pixelIndex + 3] = fillColor.a;
        }
      }
    }
  }

  private parseColor(color: string): { r: number; g: number; b: number; a: number } {
    const hex = color.slice(1);
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 255,
      };
    } else if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16),
      };
    }
    return { r: 0, g: 0, b: 0, a: 255 };
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
