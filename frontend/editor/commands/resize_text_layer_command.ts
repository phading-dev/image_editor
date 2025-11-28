import { Command } from "../command_history_manager";
import { Layer } from "../project_metadata";
import { MainCanvasPanel } from "../canvas/main_canvas_panel";

export class ResizeTextLayerCommand implements Command {
  public constructor(
    private readonly layer: Layer,
    private readonly oldWidth: number,
    private readonly oldHeight: number,
    private readonly oldX: number,
    private readonly oldY: number,
    private readonly newWidth: number,
    private readonly newHeight: number,
    private readonly newX: number,
    private readonly newY: number,
    private readonly mainCanvasPanel: MainCanvasPanel,
  ) { }

  public do(): void {
    this.layer.width = this.newWidth;
    this.layer.height = this.newHeight;
    this.layer.transform.translateX = this.newX;
    this.layer.transform.translateY = this.newY;
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    this.layer.width = this.oldWidth;
    this.layer.height = this.oldHeight;
    this.layer.transform.translateX = this.oldX;
    this.layer.transform.translateY = this.oldY;
    this.mainCanvasPanel.rerender();
  }
}
