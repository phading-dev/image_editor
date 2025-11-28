import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { Project } from "../project";
import { BasicText, Layer } from "../project_metadata";
import { rasterizeTextLayer } from "../text_rasterizer";

export class RasterizeTextLayerCommand implements Command {
  private basicText: BasicText;
  private canvas: HTMLCanvasElement;

  public constructor(
    private project: Project,
    private layer: Layer,
    private mainCanvasPanel: MainCanvasPanel,
  ) {
    this.basicText = this.layer.basicText;
    this.canvas = rasterizeTextLayer(this.layer);
  }

  public do(): void {
    delete this.layer.basicText;
    this.project.layersToCanvas.set(this.layer.id, this.canvas);
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    this.layer.basicText = this.basicText;
    this.project.layersToCanvas.delete(this.layer.id);
    this.mainCanvasPanel.rerender();
  }
}
