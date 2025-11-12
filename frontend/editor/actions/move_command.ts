import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { Layer } from "../project_metadata";

export class MoveCommand implements Command {
  public constructor(
    private layer: Layer,
    private oldX: number,
    private oldY: number,
    private newX: number,
    private newY: number,
    private mainCanvasPanel: MainCanvasPanel,
  ) {}

  public do(): void {
    this.layer.transform.translateX = this.newX;
    this.layer.transform.translateY = this.newY;
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    this.layer.transform.translateX = this.oldX;
    this.layer.transform.translateY = this.oldY;
    this.mainCanvasPanel.rerender();
  }
}
