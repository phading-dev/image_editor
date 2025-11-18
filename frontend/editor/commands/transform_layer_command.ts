import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { Layer, Transform } from "../project_metadata";

export class TransformLayerCommand implements Command {
  public constructor(
    private layer: Layer,
    private oldTransform: Transform,
    private newTransform: Transform,
    private mainCanvasPanel: MainCanvasPanel,
  ) {}

  public do(): void {
    this.layer.transform = { ...this.newTransform };
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    this.layer.transform = { ...this.oldTransform };
    this.mainCanvasPanel.rerender();
  }
}
