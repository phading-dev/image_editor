import { Command } from "../command_history_manager";
import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Project } from "../project";

export class ResizeCanvasCommand implements Command {
  private readonly oldWidth: number;
  private readonly oldHeight: number;

  public constructor(
    private readonly project: Project,
    private readonly newWidth: number,
    private readonly newHeight: number,
    private readonly deltaX: number,
    private readonly deltaY: number,
    private readonly mainCanvasPanel: MainCanvasPanel,
  ) {
    this.oldWidth = project.metadata.width;
    this.oldHeight = project.metadata.height;
  }

  public do(): void {
    this.project.metadata.width = this.newWidth;
    this.project.metadata.height = this.newHeight;
    this.project.metadata.layers.forEach((layer) => {
      layer.transform.translateX -= this.deltaX;
      layer.transform.translateY -= this.deltaY;
    });
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    this.project.metadata.width = this.oldWidth;
    this.project.metadata.height = this.oldHeight;
    this.project.metadata.layers.forEach((layer) => {
      layer.transform.translateX += this.deltaX;
      layer.transform.translateY += this.deltaY;
    });
    this.mainCanvasPanel.rerender();
  }
}
