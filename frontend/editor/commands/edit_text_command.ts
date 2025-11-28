import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { Layer } from "../project_metadata";

export class EditTextCommand implements Command {
  public constructor(
    private layer: Layer,
    private oldText: string,
    private newText: string,
    private mainCanvasPanel: MainCanvasPanel,
  ) { }

  public do(): void {
    this.layer.basicText.content = this.newText;
    this.mainCanvasPanel.rerender();
  }

  public undo(): void {
    this.layer.basicText.content = this.oldText;
    this.mainCanvasPanel.rerender();
  }
}
