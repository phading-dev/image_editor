import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { LayersPanel } from "../layers_panel";
import { Project } from "../project";
import { Layer } from "../project_metadata";

export class DeleteLayerCommand implements Command {
  private layerIndex: number;
  private canvasToDelete: HTMLCanvasElement;
  private textareaToDelete: HTMLTextAreaElement;

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
    this.textareaToDelete = this.project.layersToTextareas.get(
      this.layerToDelete.id,
    );
  }

  public do(): void {
    this.project.metadata.layers.splice(this.layerIndex, 1);
    if (this.canvasToDelete) {
      this.project.layersToCanvas.delete(this.layerToDelete.id);
    }
    if (this.textareaToDelete) {
      this.project.layersToTextareas.delete(this.layerToDelete.id);
    }
    this.mainCanvasPanel.rerender();
    this.layersPanel.deleteLayerRow(this.layerToDelete.id);
  }

  public undo(): void {
    this.project.metadata.layers.splice(this.layerIndex, 0, this.layerToDelete);
    if (this.canvasToDelete) {
      this.project.layersToCanvas.set(this.layerToDelete.id, this.canvasToDelete);
    }
    if (this.textareaToDelete) {
      this.project.layersToTextareas.set(this.layerToDelete.id, this.textareaToDelete);
    }
    this.mainCanvasPanel.rerender();
    this.layersPanel.addLayerRow(this.layerToDelete);
    this.layersPanel.moveLayerRowBefore(
      this.layerToDelete.id,
      this.project.metadata.layers[this.layerIndex + 1]?.id,
    );
  }
}
