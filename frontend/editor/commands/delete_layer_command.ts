import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { LayersPanel } from "../layers_panel";
import { Project } from "../project";
import { Layer } from "../project_metadata";

export class DeleteLayerCommand implements Command {
  private layerIndex: number;
  private canvasToDelete: HTMLCanvasElement;

  public constructor(
    private project: Project,
    private layerToDelete: Layer,
    private layersPanel: LayersPanel,
    private mainCanvasPanel: MainCanvasPanel,
  ) {
    this.layerIndex = this.project.metadata.layers.findIndex(
      (layer) => layer.id === layerToDelete.id,
    );
    this.canvasToDelete = this.project.layersToCanvas.get(
      this.layerToDelete.id,
    );
  }

  public do(): void {
    this.project.metadata.layers.splice(this.layerIndex, 1);
    this.project.layersToCanvas.delete(this.layerToDelete.id);
    this.mainCanvasPanel.rerender();
    this.layersPanel.deleteLayerRow(this.layerToDelete.id);
  }

  public undo(): void {
    this.project.metadata.layers.splice(this.layerIndex, 0, this.layerToDelete);
    this.project.layersToCanvas.set(this.layerToDelete.id, this.canvasToDelete);
    this.mainCanvasPanel.rerender();
    this.layersPanel.addLayerRow(this.layerToDelete);
    if (this.layerIndex >= this.project.metadata.layers.length - 1) {
      return;
    }
    this.layersPanel.moveLayerRowBefore(
      this.layerToDelete.id,
      this.project.metadata.layers[this.layerIndex].id,
    );
  }
}
