import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { LayersPanel } from "../layers_panel";
import { Layer, Shadow } from "../project_metadata";

export class UpdateLayerShadowCommand implements Command {
  public constructor(
    private layer: Layer,
    private oldShadow: Shadow | undefined,
    private newShadow: Shadow | undefined,
    private layersPanel: LayersPanel,
    private mainCanvasPanel: MainCanvasPanel,
  ) { }

  public do(): void {
    this.layer.shadow = this.newShadow;
    this.layersPanel.rerenderLayerRow(this.layer.id);
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    this.layer.shadow = this.oldShadow;
    this.layersPanel.rerenderLayerRow(this.layer.id);
    this.mainCanvasPanel.rerender();
  }
}
