import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { LayersPanel } from "../layers_panel";
import { Project } from "../project";
import { Layer } from "../project_metadata";

export class DuplicateLayerCommand implements Command {
  private duplicatedLayer: Layer;
  private duplicatedCanvas?: HTMLCanvasElement;
  private duplicatedTextarea?: HTMLTextAreaElement;

  public constructor(
    private project: Project,
    private sourceLayer: Layer,
    private layersPanel: LayersPanel,
    private mainCanvasPanel: MainCanvasPanel,
  ) {
    // Create a new layer with a new ID and copy all properties
    this.duplicatedLayer = {
      id: crypto.randomUUID(),
      name: `${this.sourceLayer.name} copy`,
      visible: this.sourceLayer.visible,
      opacity: this.sourceLayer.opacity,
      locked: false, // Unlock the duplicated layer by default
      width: this.sourceLayer.width,
      height: this.sourceLayer.height,
      transform: { ...this.sourceLayer.transform },
      shadow: this.sourceLayer.shadow
        ? { ...this.sourceLayer.shadow }
        : undefined,
      basicText: this.sourceLayer.basicText
        ? { ...this.sourceLayer.basicText }
        : undefined,
    };

    if (this.sourceLayer.basicText) {
      this.duplicatedTextarea = document.createElement("textarea");
    } else {
      const sourceCanvas = this.project.layersToCanvas.get(
        this.sourceLayer.id,
      );
      this.duplicatedCanvas = document.createElement("canvas");
      this.duplicatedCanvas.width = sourceCanvas.width;
      this.duplicatedCanvas.height = sourceCanvas.height;
      const context = this.duplicatedCanvas.getContext("2d");
      context.drawImage(sourceCanvas, 0, 0);
    }
  }

  public do(): void {
    this.project.metadata.layers.unshift(this.duplicatedLayer);
    if (this.duplicatedTextarea) {
      this.project.layersToTextareas.set(
        this.duplicatedLayer.id,
        this.duplicatedTextarea,
      );
    } else {
      this.project.layersToCanvas.set(
        this.duplicatedLayer.id,
        this.duplicatedCanvas,
      );
    }
    this.mainCanvasPanel.rerender();
    this.layersPanel.addLayerRow(this.duplicatedLayer);
  }

  public undo(): void {
    this.project.metadata.layers.shift();
    if (this.duplicatedTextarea) {
      this.project.layersToTextareas.delete(this.duplicatedLayer.id);
    } else {
      this.project.layersToCanvas.delete(this.duplicatedLayer.id);
    }
    this.mainCanvasPanel.rerender();
    this.layersPanel.deleteLayerRow(this.duplicatedLayer.id);
  }
}
