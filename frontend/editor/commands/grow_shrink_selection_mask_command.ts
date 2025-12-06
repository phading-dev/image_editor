import { Command } from "../command_history_manager";
import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { SelectionMask } from "../selection_mask";
import { copyImageData } from "../selection_mask_utils";

export class GrowShrinkSelectionMaskCommand implements Command {
  private readonly oldMask: ImageData;
  private readonly newMask: ImageData;

  constructor(
    private readonly selectionMask: SelectionMask,
    private readonly radius: number,
    private readonly mainCanvasPanel: MainCanvasPanel,
  ) {
    this.oldMask = copyImageData(this.selectionMask.mask);
    this.newMask = copyImageData(this.oldMask);
    this.applyGrowShrink(this.newMask, this.radius);
  }

  public do(): void {
    this.selectionMask.setMask(this.newMask);
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    this.selectionMask.setMask(this.oldMask);
    this.mainCanvasPanel.rerender();
  }

  private applyGrowShrink(imageData: ImageData, radius: number): void {
    if (radius === 0) return;

    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    // Create source buffer (R channel)
    const source = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      source[i] = data[i * 4];
    }

    const target = new Uint8Array(width * height);
    const absRadius = Math.abs(radius);

    // Precompute circular kernel offsets
    const offsets: Array<{ dx: number, dy: number }> = [];
    for (let dy = -absRadius; dy <= absRadius; dy++) {
      for (let dx = -absRadius; dx <= absRadius; dx++) {
        if (dx * dx + dy * dy <= absRadius * absRadius) {
          offsets.push({ dx, dy });
        }
      }
    }

    if (radius > 0) {
      // Dilation (Grow)
      this.dilate(source, target, width, height, offsets);
    } else {
      // Erosion (Shrink)
      // Erode(I) = 255 - Dilate(255 - I)
      // Invert source
      for (let i = 0; i < source.length; i++) {
        source[i] = 255 - source[i];
      }

      this.dilate(source, target, width, height, offsets);

      // Invert target back
      for (let i = 0; i < target.length; i++) {
        target[i] = 255 - target[i];
      }
    }

    // Write back
    for (let i = 0; i < width * height; i++) {
      const val = target[i];
      const index = i * 4;
      data[index] = val;
      data[index + 1] = val;
      data[index + 2] = val;
      data[index + 3] = 255;
    }
  }

  private dilate(
    source: Uint8Array,
    target: Uint8Array,
    width: number,
    height: number,
    offsets: Array<{ dx: number, dy: number }>
  ): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let maxVal = 0;
        // Optimization: If we find 255, we can stop (max possible)
        // But we have to check neighbors.

        // To speed up: iterate only if necessary? 
        // No simple optimization for arbitrary kernel without more complex algo.
        // Just do the brute force.

        const centerIdx = y * width + x;
        // Optimization: if source pixel is 255, it stays 255 (since dilation is extensive)
        // We could init maxVal with source[centerIdx], but offsets include 0,0 so it's covered.

        for (const { dx, dy } of offsets) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const val = source[ny * width + nx];
            if (val > maxVal) {
              maxVal = val;
              if (maxVal === 255) break;
            }
          }
        }
        target[centerIdx] = maxVal;
      }
    }
  }
}
