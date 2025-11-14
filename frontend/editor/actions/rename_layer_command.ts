import { Command } from "../command_history_manager";
import { LayersPanel } from "../layers_panel";
import { Layer } from "../project_metadata";

export class RenameLayerCommand implements Command {
  private previousName: string;

  public constructor(
    private layer: Layer,
    private newName: string,
    private layersPanel: LayersPanel,
  ) {
    this.previousName = layer.name;
  }

  public do(): void {
    this.layer.name = this.newName;
    this.layersPanel.rerenderLayerRow(this.layer.id);
  }

  public undo(): void {
    this.layer.name = this.previousName;
    this.layersPanel.rerenderLayerRow(this.layer.id);
  }
}
