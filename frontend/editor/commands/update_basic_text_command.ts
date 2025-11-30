import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { LayersPanel } from "../layers_panel";
import { BasicText, Layer } from "../project_metadata";

export class UpdateBasicTextCommand implements Command {
  public constructor(
    private layer: Layer,
    private oldBasicText: BasicText,
    private newBasicText: BasicText,
    private layersPanel: LayersPanel,
    private mainCanvasPanel: MainCanvasPanel,
  ) { }

  public do(): void {
    this.layer.basicText = this.newBasicText;
    this.layer.name = this.newBasicText.content;
    this.layersPanel.rerenderLayerRow(this.layer.id);
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    this.layer.basicText = this.oldBasicText;
    this.layer.name = this.oldBasicText.content;
    this.layersPanel.rerenderLayerRow(this.layer.id);
    this.mainCanvasPanel.rerender();
  }
}
