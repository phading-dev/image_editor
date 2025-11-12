import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";

export class PaintCommand implements Command {
  public constructor(
    private context: CanvasRenderingContext2D,
    private oldImageData: ImageData,
    private newImageData: ImageData,
    private mainCanvasPanel: MainCanvasPanel,
  ) {}

  public do(): void {
    console.log("Doing PaintCommand");
    this.context.putImageData(this.newImageData, 0, 0);
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    console.log("Undoing PaintCommand");
    this.context.putImageData(this.oldImageData, 0, 0);
    this.mainCanvasPanel.rerender();
  }
}
