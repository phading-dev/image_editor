import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { LayersPanel } from "../layers_panel";
import { Project } from "../project";
import { Layer } from "../project_metadata";

export class AddLayerCommand implements Command {
  public constructor(
    private project: Project,
    private newLayer: Layer,
    private newCanvas: HTMLCanvasElement,
    private layersPanel: LayersPanel,
    private mainCanvasPanel: MainCanvasPanel,
  ) {}

  public do(): void {
    this.project.metadata.layers.unshift(this.newLayer);
    this.project.layersToCanvas.set(this.newLayer.id, this.newCanvas);
    this.mainCanvasPanel.rerender();
    this.layersPanel.addLayerRow(this.newLayer);
  }

  public undo(): void {
    this.project.metadata.layers.shift();
    this.project.layersToCanvas.delete(this.newLayer.id);
    this.mainCanvasPanel.rerender();
    this.layersPanel.deleteLayerRow(this.newLayer.id);
  }
}
