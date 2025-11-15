import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { Layer } from "../project_metadata";

export class MoveCommand implements Command {
  public constructor(
    private layers: Layer[],
    private deltaX: number,
    private deltaY: number,
    private mainCanvasPanel: MainCanvasPanel,
  ) {}

  public do(): void {
    this.layers.forEach((layer) => {
      layer.transform.translateX += this.deltaX;
      layer.transform.translateY += this.deltaY;
    });
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    this.layers.forEach((layer) => {
      layer.transform.translateX -= this.deltaX;
      layer.transform.translateY -= this.deltaY;
    });
    this.mainCanvasPanel.rerender();
  }
}
