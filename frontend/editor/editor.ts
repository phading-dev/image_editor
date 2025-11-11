import { COLOR_THEME } from "../color_theme";
import { MoveCommand } from "./actions/move_command";
import { PaintCommand } from "./actions/paint_command";
import { ReorderLayerCommand } from "./actions/reorder_layer_command";
import { MainCanvasPanel } from "./canvas/main_canvas_panel";
import { ChatPanel } from "./chat_panel";
import { CommandHistoryManager } from "./command_history_manager";
import { LayersPanel } from "./layers_panel";
import { Project } from "./project";
import { E } from "@selfage/element/factory";

class ResizeHandle {
  public element: HTMLDivElement;
  private isDragging = false;
  private startX = 0;
  private startWidth = 0;

  constructor(
    private targetElement: HTMLElement,
    private minWidth: number,
    private maxWidth: number,
    private direction: number, // 1 for left resize, -1 for right resize
  ) {
    this.element = E.div({
      style: [
        "width: 0.25rem",
        "cursor: col-resize",
        `background-color: ${COLOR_THEME.neutral3}`,
        "flex-shrink: 0",
        "user-select: none",
      ].join("; "),
    });

    this.element.addEventListener("mousedown", this.handleMouseDown);
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);
  }

  private handleMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    this.isDragging = true;
    this.startX = e.clientX;
    this.startWidth = this.targetElement.offsetWidth;
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;

    e.preventDefault();
    const delta = (e.clientX - this.startX) * this.direction;
    const newWidth = Math.max(
      this.minWidth,
      Math.min(this.maxWidth, this.startWidth + delta),
    );

    this.targetElement.style.flex = "0 0 auto";
    this.targetElement.style.width = `${newWidth}px`;
  };

  private handleMouseUp = (): void => {
    this.isDragging = false;
  };

  public remove(): void {
    this.element.removeEventListener("mousedown", this.handleMouseDown);
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);
    this.element.remove();
  }
}

export class Editor {
  public static create(project: Project): Editor {
    return new Editor(
      project,
      ChatPanel.create,
      MainCanvasPanel.create,
      LayersPanel.create,
      CommandHistoryManager.create,
    );
  }

  public readonly element: HTMLElement;
  public readonly chatPanel: ChatPanel;
  public readonly mainCanvasPanel: MainCanvasPanel;
  public readonly layersPanel: LayersPanel;
  public readonly commandHistoryManager: CommandHistoryManager;
  private readonly chatResizeHandle: ResizeHandle;
  private readonly layersResizeHandle: ResizeHandle;

  public constructor(
    private readonly project: Project,
    private readonly createChatPanel: typeof ChatPanel.create,
    private readonly createMainCanvasPanel: typeof MainCanvasPanel.create,
    private readonly createLayersPanel: typeof LayersPanel.create,
    private readonly createCommandHistoryManager: typeof CommandHistoryManager.create,
  ) {
    this.chatPanel = this.createChatPanel();
    this.layersPanel = this.createLayersPanel(this.project);
    this.mainCanvasPanel = this.createMainCanvasPanel(this.project);
    this.commandHistoryManager = this.createCommandHistoryManager();
    this.chatResizeHandle = new ResizeHandle(
      this.chatPanel.element,
      200,
      800,
      1,
    );
    this.layersResizeHandle = new ResizeHandle(
      this.layersPanel.element,
      200,
      600,
      -1,
    );

    this.element = E.div(
      {
        style: [
          "width: 100vw",
          "height: 100vh",
          "display: flex",
          "flex-direction: row",
        ].join("; "),
      },
      this.chatPanel.element,
      this.chatResizeHandle.element,
      this.mainCanvasPanel.element,
      this.layersResizeHandle.element,
      this.layersPanel.element,
    );

    this.layersPanel.on("reorder", (oldIndex, newIndex) => {
      this.commandHistoryManager.pushCommand(
        new ReorderLayerCommand(
          this.project,
          oldIndex,
          newIndex,
          this.layersPanel,
          this.mainCanvasPanel,
        ),
      );
    });
    this.mainCanvasPanel.setGetActiveLayerId(() => this.layersPanel.activeLayerId);
    this.mainCanvasPanel.on("paint", (canvas, oldImageData, newImageData) => {
      this.commandHistoryManager.pushCommand(
        new PaintCommand(
          canvas,
          oldImageData,
          newImageData,
          this.mainCanvasPanel,
        ),
      );
    });
    this.mainCanvasPanel.on("move", (layer, deltaX, deltaY) => {
      this.commandHistoryManager.pushCommand(
        new MoveCommand(layer, deltaX, deltaY, this.mainCanvasPanel),
      );
    });
    this.mainCanvasPanel.selectPaintTool();
  }

  public remove(): void {
    this.element.remove();
    this.chatPanel.remove();
    this.mainCanvasPanel.remove();
    this.layersPanel.remove();
    this.chatResizeHandle.remove();
    this.layersResizeHandle.remove();
  }
}
