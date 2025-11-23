import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { LayersPanel } from "../layers_panel";
import { Project } from "../project";
import { Layer } from "../project_metadata";

export class AddImageLayerCommand implements Command {
  private shouldResizeCanvas: boolean;
  private oldCanvasWidth?: number;
  private oldCanvasHeight?: number;

  public constructor(
    private project: Project,
    private newLayer: Layer,
    private newCanvas: HTMLCanvasElement,
    private layersPanel: LayersPanel,
    private mainCanvasPanel: MainCanvasPanel,
  ) {
    if (this.project.metadata.layers.length === 0) {
      this.shouldResizeCanvas = true;
      this.oldCanvasWidth = this.project.metadata.width;
      this.oldCanvasHeight = this.project.metadata.height;
    }
  }

  public do(): void {
    this.project.metadata.layers.unshift(this.newLayer);
    this.project.layersToCanvas.set(this.newLayer.id, this.newCanvas);
    if (this.shouldResizeCanvas) {
      this.project.metadata.width = this.newLayer.width;
      this.project.metadata.height = this.newLayer.height;
    }
    this.mainCanvasPanel.rerender();
    this.layersPanel.addLayerRow(this.newLayer);
  }

  public undo(): void {
    this.project.metadata.layers.shift();
    this.project.layersToCanvas.delete(this.newLayer.id);
    if (this.shouldResizeCanvas) {
      this.project.metadata.width = this.oldCanvasWidth;
      this.project.metadata.height = this.oldCanvasHeight;
    }
    this.mainCanvasPanel.rerender();
    this.layersPanel.deleteLayerRow(this.newLayer.id);
  }
}
