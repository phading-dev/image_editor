import { Command } from "../command_history_manager";
import { LayersPanel } from "../layers_panel";
import { Layer } from "../project_metadata";

export class UnlockLayersCommand implements Command {
  public constructor(
    private layers: Layer[],
    private layersPanel: LayersPanel,
  ) {}

  public do(): void {
    this.layers.forEach(layer => {
      layer.locked = false;
      this.layersPanel.rerenderLayerRow(layer.id);
    });
  }

  public undo(): void {
    this.layers.forEach(layer => {
      layer.locked = true;
      this.layersPanel.rerenderLayerRow(layer.id);
    });
  }
}
