import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { LayersPanel } from "../layers_panel";
import { Layer } from "../project_metadata";

export class HideLayersCommand implements Command {
  public constructor(
    private layers: Layer[],
    private layersPanel: LayersPanel,
    private mainCanvasPanel: MainCanvasPanel,
  ) {}

  public do(): void {
    this.layers.forEach(layer => {
      layer.visible = false;
      this.layersPanel.rerenderLayerRow(layer.id);
    });
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    this.layers.forEach(layer => {
      layer.visible = true;
      this.layersPanel.rerenderLayerRow(layer.id);
    });
    this.mainCanvasPanel.rerender();
  }
}
