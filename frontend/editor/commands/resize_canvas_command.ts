import { Command } from "../command_history_manager";
import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Project } from "../project";
import { SelectionMask } from "../selection_mask";
import { copyImageData } from "../selection_mask_utils";

export class ResizeCanvasCommand implements Command {
  private readonly oldWidth: number;
  private readonly oldHeight: number;
  private readonly oldMask: ImageData;
  private readonly newMask: ImageData;

  public constructor(
    private readonly project: Project,
    private readonly selectionMask: SelectionMask,
    private readonly newWidth: number,
    private readonly newHeight: number,
    private readonly deltaX: number,
    private readonly deltaY: number,
    private readonly mainCanvasPanel: MainCanvasPanel,
  ) {
    this.oldWidth = project.metadata.width;
    this.oldHeight = project.metadata.height;
    this.oldMask = copyImageData(this.selectionMask.mask);
    this.newWidth = Math.round(newWidth);
    this.newHeight = Math.round(newHeight);
    this.deltaX = Math.round(deltaX * 100) / 100;
    this.deltaY = Math.round(deltaY * 100) / 100;
    this.newMask = this.createResizedMask(
      this.selectionMask.mask,
      this.newWidth,
      this.newHeight,
      -this.deltaX,
      -this.deltaY,
    );
  }

  public do(): void {
    this.project.metadata.width = this.newWidth;
    this.project.metadata.height = this.newHeight;
    this.project.metadata.layers.forEach((layer) => {
      layer.transform.translateX -= this.deltaX;
      layer.transform.translateY -= this.deltaY;
    });
    this.selectionMask.setMask(this.newMask);
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    this.project.metadata.width = this.oldWidth;
    this.project.metadata.height = this.oldHeight;
    this.project.metadata.layers.forEach((layer) => {
      layer.transform.translateX += this.deltaX;
      layer.transform.translateY += this.deltaY;
    });
    this.selectionMask.setMask(this.oldMask);
    this.mainCanvasPanel.rerender();
  }

  private createResizedMask(
    oldMask: ImageData,
    newWidth: number,
    newHeight: number,
    offsetX: number,
    offsetY: number,
  ): ImageData {
    const newMask = new ImageData(newWidth, newHeight);

    // Copy old mask data to new mask with offset
    for (let y = 0; y < oldMask.height; y++) {
      for (let x = 0; x < oldMask.width; x++) {
        const newX = x + offsetX;
        const newY = y + offsetY;

        // Only copy if within new bounds
        if (newX >= 0 && newX < newWidth && newY >= 0 && newY < newHeight) {
          const oldIndex = (y * oldMask.width + x) * 4;
          const newIndex = (newY * newWidth + newX) * 4;

          newMask.data[newIndex] = oldMask.data[oldIndex]; // R
          newMask.data[newIndex + 1] = oldMask.data[oldIndex + 1]; // G
          newMask.data[newIndex + 2] = oldMask.data[oldIndex + 2]; // B
          newMask.data[newIndex + 3] = oldMask.data[oldIndex + 3]; // A
        }
      }
    }

    return newMask;
  }
}
