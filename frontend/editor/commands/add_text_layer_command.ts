import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { LayersPanel } from "../layers_panel";
import { Project } from "../project";
import { Layer } from "../project_metadata";

export class AddTextLayerCommand implements Command {
  private textarea: HTMLTextAreaElement;

  public constructor(
    private project: Project,
    private newLayer: Layer,
    private layersPanel: LayersPanel,
    private mainCanvasPanel: MainCanvasPanel,
  ) {
    this.textarea = document.createElement("textarea");
  }

  public do(): void {
    this.project.metadata.layers.unshift(this.newLayer);
    this.project.layersToTextareas.set(this.newLayer.id, this.textarea);
    this.mainCanvasPanel.rerender();
    this.layersPanel.addLayerRow(this.newLayer);
  }

  public undo(): void {
    this.project.metadata.layers.shift();
    this.project.layersToTextareas.delete(this.newLayer.id);
    this.mainCanvasPanel.rerender();
    this.layersPanel.deleteLayerRow(this.newLayer.id);
  }
}
