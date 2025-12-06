import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import {
  SelectionMode,
  combineMasks,
  copyImageData,
} from "../selection_mask_utils";
import { Command } from "../command_history_manager";
import { SelectionMask } from "../selection_mask";

export class CombineSelectionMaskCommand implements Command {
  private readonly oldMask: ImageData;
  private readonly combinedMask: ImageData;

  constructor(
    private readonly selectionMask: SelectionMask,
    private readonly newMask: ImageData,
    private readonly mode: SelectionMode,
    private readonly mainCanvasPanel: MainCanvasPanel,
  ) {
    this.oldMask = copyImageData(this.selectionMask.mask);
    this.combinedMask = combineMasks(
      this.selectionMask.mask,
      this.newMask,
      this.mode,
    );
  }

  public do(): void {
    this.selectionMask.setMask(this.combinedMask);
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    this.selectionMask.setMask(this.oldMask);
    this.mainCanvasPanel.rerender();
  }
}
