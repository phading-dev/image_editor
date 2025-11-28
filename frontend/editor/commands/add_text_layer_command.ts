import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { LayersPanel } from "../layers_panel";
import { Project } from "../project";
import { Layer } from "../project_metadata";

export class AddTextLayerCommand implements Command {
  public constructor(
    private project: Project,
    private newLayer: Layer,
    private layersPanel: LayersPanel,
    private mainCanvasPanel: MainCanvasPanel,
  ) { }

  public do(): void {
    this.project.metadata.layers.unshift(this.newLayer);
    this.mainCanvasPanel.rerender();
    this.layersPanel.addLayerRow(this.newLayer);
  }

  public undo(): void {
    this.project.metadata.layers.shift();
    this.mainCanvasPanel.rerender();
    this.layersPanel.deleteLayerRow(this.newLayer.id);
  }
}
