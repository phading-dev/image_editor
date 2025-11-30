import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { LayersPanel } from "../layers_panel";
import { Layer } from "../project_metadata";

export class EditTextCommand implements Command {
  public constructor(
    private layer: Layer,
    private oldText: string,
    private newText: string,
    private mainCanvasPanel: MainCanvasPanel,
    private layersPanel: LayersPanel,
  ) {}

  public do(): void {
    this.layer.basicText.content = this.newText;
    this.layer.name = this.newText;
    this.mainCanvasPanel.rerender();
    this.layersPanel.rerenderLayerRow(this.layer.id);
  }

  public undo(): void {
    this.layer.basicText.content = this.oldText;
    this.layer.name = this.oldText;
    this.mainCanvasPanel.rerender();
    this.layersPanel.rerenderLayerRow(this.layer.id);
  }
}
