import { Command } from "../command_history_manager";
import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { SelectionMask } from "../selection_mask";
import { copyImageData } from "../selection_mask_utils";

export class FeatherSelectionMaskCommand implements Command {
  private readonly oldMask: ImageData;
  private readonly newMask: ImageData;

  constructor(
    private readonly selectionMask: SelectionMask,
    private readonly radius: number,
    private readonly mainCanvasPanel: MainCanvasPanel,
  ) {
    this.oldMask = copyImageData(this.selectionMask.mask);
    this.newMask = copyImageData(this.oldMask);
    this.applyBlur(this.newMask, this.radius);
  }

  public do(): void {
    this.selectionMask.setMask(this.newMask);
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    this.selectionMask.setMask(this.oldMask);
    this.mainCanvasPanel.rerender();
  }

  private applyBlur(imageData: ImageData, radius: number): void {
    if (radius < 1) return;

    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    // Use Float32Array for precision during calculation
    let source = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      source[i] = data[i * 4];
    }

    let target = new Float32Array(width * height);

    // 3 passes of box blur approximates Gaussian blur
    this.boxBlur(source, target, width, height, radius);
    this.boxBlur(target, source, width, height, radius);
    this.boxBlur(source, target, width, height, radius);

    // Write back
    for (let i = 0; i < width * height; i++) {
      const val = Math.max(0, Math.min(255, Math.round(target[i])));
      const index = i * 4;
      data[index] = val;
      data[index + 1] = val;
      data[index + 2] = val;
      data[index + 3] = 255;
    }
  }

  private boxBlur(source: Float32Array, target: Float32Array, width: number, height: number, radius: number): void {
    const temp = new Float32Array(width * height);

    // Horizontal
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;
        for (let k = -radius; k <= radius; k++) {
          const px = Math.min(width - 1, Math.max(0, x + k));
          sum += source[y * width + px];
          count++;
        }
        temp[y * width + x] = sum / count;
      }
    }

    // Vertical
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;
        for (let k = -radius; k <= radius; k++) {
          const py = Math.min(height - 1, Math.max(0, y + k));
          sum += temp[py * width + x];
          count++;
        }
        target[y * width + x] = sum / count;
      }
    }
  }
}
