import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { LayersPanel } from "../layers_panel";
import { Project } from "../project";

export class ReorderLayerCommand implements Command {
  public constructor(
    private project: Project,
    private oldIndex: number,
    private newIndex: number,
    private layersPanel: LayersPanel,
    private mainCanvasPanel: MainCanvasPanel,
  ) {}

  public do(): void {
    let layer = this.project.metadata.layers.splice(this.oldIndex, 1)[0];
    let beforeLayer = this.project.metadata.layers[this.newIndex];
    this.project.metadata.layers.splice(this.newIndex, 0, layer);
    this.mainCanvasPanel.rerender();
    this.layersPanel.moveLayerRowBefore(layer.id, beforeLayer?.id);
  }

  public undo(): void {
    let layer = this.project.metadata.layers.splice(this.newIndex, 1)[0];
    let beforeLayer = this.project.metadata.layers[this.oldIndex];
    this.project.metadata.layers.splice(this.oldIndex, 0, layer);
    this.mainCanvasPanel.rerender();
    this.layersPanel.moveLayerRowBefore(layer.id, beforeLayer?.id);
  }
}
