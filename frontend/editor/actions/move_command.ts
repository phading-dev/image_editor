import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { Layer } from "../project_metadata";

export class MoveCommand implements Command {
  public constructor(
    private layer: Layer,
    private deltaX: number,
    private deltaY: number,
    private mainCanvasPanel: MainCanvasPanel,
  ) {}

  public do(): void {
    this.layer.transform.translateX += this.deltaX;
    this.layer.transform.translateY += this.deltaY;
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    this.layer.transform.translateX -= this.deltaX;
    this.layer.transform.translateY -= this.deltaY;
    this.mainCanvasPanel.rerender();
  }
}
