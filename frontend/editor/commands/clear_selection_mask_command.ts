import { Command } from "../command_history_manager";
import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { SelectionMask } from "../selection_mask";
import { copyImageData } from "../selection_mask_utils";

export class ClearSelectionMaskCommand implements Command {
  private readonly oldMask: ImageData;
  private readonly newMask: ImageData;

  constructor(
    private readonly selectionMask: SelectionMask,
    private readonly mainCanvasPanel: MainCanvasPanel,
  ) {
    this.oldMask = copyImageData(this.selectionMask.mask);
    this.newMask = new ImageData(
      this.selectionMask.mask.width,
      this.selectionMask.mask.height,
    );
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
