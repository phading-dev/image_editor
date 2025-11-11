import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";

export class PaintCommand implements Command {
  public constructor(
    private canvas: HTMLCanvasElement,
    private oldImageData: ImageData,
    private newImageData: ImageData,
    private mainCanvasPanel: MainCanvasPanel,
  ) {}

  public do(): void {
    const context = this.canvas.getContext("2d");
    context.putImageData(this.newImageData, 0, 0);
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    const context = this.canvas.getContext("2d");
    context.putImageData(this.oldImageData, 0, 0);
    this.mainCanvasPanel.rerender();
  }
}
