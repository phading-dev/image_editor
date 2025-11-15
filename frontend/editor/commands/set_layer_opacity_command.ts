import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { LayersPanel } from "../layers_panel";
import { Layer } from "../project_metadata";

export class SetLayerOpacityCommand implements Command {
  public constructor(
    private layer: Layer,
    private oldOpacity: number,
    private newOpacity: number,
    private layersPanel: LayersPanel,
    private mainCanvasPanel: MainCanvasPanel,
  ) {}

  public do(): void {
    this.layer.opacity = this.newOpacity;
    this.layersPanel.rerenderLayerRow(this.layer.id);
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    this.layer.opacity = this.oldOpacity;
    this.layersPanel.rerenderLayerRow(this.layer.id);
    this.mainCanvasPanel.rerender();
  }
}
