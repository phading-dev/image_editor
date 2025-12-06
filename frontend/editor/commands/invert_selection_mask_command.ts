import { Command } from "../command_history_manager";
import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { SelectionMask } from "../selection_mask";
import { copyImageData } from "../selection_mask_utils";

export class InvertSelectionMaskCommand implements Command {
  private readonly oldMask: ImageData;
  private readonly newMask: ImageData;

  constructor(
    private readonly selectionMask: SelectionMask,
    private readonly mainCanvasPanel: MainCanvasPanel,
  ) {
    this.oldMask = copyImageData(this.selectionMask.mask);
    const width = this.selectionMask.mask.width;
    const height = this.selectionMask.mask.height;
    this.newMask = new ImageData(width, height);

    // Invert the mask
    // Mask logic: R channel indicates selection (0-255)
    for (let i = 0; i < this.oldMask.data.length; i += 4) {
      const oldVal = this.oldMask.data[i]; // R
      const newVal = 255 - oldVal;

      this.newMask.data[i] = newVal;     // R
      this.newMask.data[i + 1] = newVal; // G
      this.newMask.data[i + 2] = newVal; // B
      this.newMask.data[i + 3] = 255;    // A
    }
  }

  public do(): void {
    this.selectionMask.setMask(this.newMask);
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    this.selectionMask.setMask(this.oldMask);
    this.mainCanvasPanel.rerender();
  }
}
