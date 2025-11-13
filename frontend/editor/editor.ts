import { COLOR_THEME } from "../color_theme";
import { AddLayerCommand } from "./actions/add_layer_command";
import { DeleteLayerCommand } from "./actions/delete_layer_command";
import { MoveCommand } from "./actions/move_command";
import { PaintCommand } from "./actions/paint_command";
import { ReorderLayerCommand } from "./actions/reorder_layer_command";
import { MainCanvasPanel } from "./canvas/main_canvas_panel";
import { ChatPanel } from "./chat_panel";
import { CommandHistoryManager } from "./command_history_manager";
import { LayersPanel } from "./layers_panel";
import { Project } from "./project";
import { saveToZip } from "./project_serializer";
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
    private initialWidth: number,
    private direction: number, // 1 for left resize, -1 for right resize
  ) {
    this.element = E.div({
      style: [
        "width: 0.25rem",
        "cursor: col-resize",
        `background-color: ${COLOR_THEME.neutral3}`,
        "flex-shrink: 0",
        "user-select: none",
        "touch-action: none",
      ].join("; "),
    });
    this.targetElement.style.width = `${this.initialWidth}px`;
    this.element.addEventListener("pointerdown", this.handlePointerDown);
  }

  private handlePointerDown = (e: PointerEvent): void => {
    e.preventDefault();
    this.isDragging = true;
    this.startX = e.clientX;
    this.startWidth = this.targetElement.offsetWidth;
    this.element.setPointerCapture(e.pointerId);

    this.element.addEventListener("pointermove", this.handlePointerMove);
    this.element.addEventListener("pointerup", this.handlePointerUp);
    this.element.addEventListener("pointercancel", this.handlePointerUp);
  };

  private handlePointerMove = (e: PointerEvent): void => {
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

  private handlePointerUp = (e: PointerEvent): void => {
    if (!this.isDragging) return;

    this.isDragging = false;
    if (this.element.hasPointerCapture(e.pointerId)) {
      this.element.releasePointerCapture(e.pointerId);
    }

    this.element.removeEventListener("pointermove", this.handlePointerMove);
    this.element.removeEventListener("pointerup", this.handlePointerUp);
    this.element.removeEventListener("pointercancel", this.handlePointerUp);
  };

  public remove(): void {
    this.element.remove();
  }
}

export class Editor {
  public static create(loadProject: () => void, project: Project): Editor {
    return new Editor(
      ChatPanel.create,
      MainCanvasPanel.create,
      LayersPanel.create,
      CommandHistoryManager.create,
      project,
      loadProject,
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
    private readonly createChatPanel: typeof ChatPanel.create,
    private readonly createMainCanvasPanel: typeof MainCanvasPanel.create,
    private readonly createLayersPanel: typeof LayersPanel.create,
    private readonly createCommandHistoryManager: typeof CommandHistoryManager.create,
    private readonly project: Project,
    private readonly loadProject: () => void,
  ) {
    this.chatPanel = this.createChatPanel();
    this.mainCanvasPanel = this.createMainCanvasPanel(this.project);
    this.layersPanel = this.createLayersPanel(this.project);
    this.commandHistoryManager = this.createCommandHistoryManager();
    this.chatResizeHandle = new ResizeHandle(
      this.chatPanel.element,
      200,
      800,
      400,
      1,
    );
    this.layersResizeHandle = new ResizeHandle(
      this.layersPanel.element,
      200,
      600,
      400,
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
    this.mainCanvasPanel.setGetActiveLayerId(
      () => this.layersPanel.activeLayerId,
    );
    this.mainCanvasPanel.on("paint", (context, oldImageData, newImageData) => {
      this.commandHistoryManager.pushCommand(
        new PaintCommand(
          context,
          oldImageData,
          newImageData,
          this.mainCanvasPanel,
        ),
      );
    });
    this.mainCanvasPanel.on("move", (layer, oldX, oldY, newX, newY) => {
      this.commandHistoryManager.pushCommand(
        new MoveCommand(layer, oldX, oldY, newX, newY, this.mainCanvasPanel),
      );
    });
    this.chatPanel.setSaveProjectHandler(async () => {
      try {
        const zipBlob = await saveToZip(this.project);

        // Trigger download - browser will show save dialog based on user's settings
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${this.project.metadata.name}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Failed to save project:", error);
        throw error;
      }
    });
    this.chatPanel.setLoadProjectHandler(() => {
      this.loadProject();
    });
    this.chatPanel.setRenameProjectHandler((name: string) => {
      this.project.metadata.name = name;
    });
    this.chatPanel.setExportImageHandler(
      async (filename: string, imageType: string, quality?: number) => {
        await this.mainCanvasPanel.exportAsImage(filename, imageType, quality);
      },
    );
    this.chatPanel.setUndoHandler(() => {
      this.commandHistoryManager.undo();
    });
    this.chatPanel.setRedoHandler(() => {
      this.commandHistoryManager.redo();
    });
    this.chatPanel.setDeleteSelectedLayerHandler(() => {
      this.commandHistoryManager.pushCommand(
        new DeleteLayerCommand(
          this.project,
          this.layersPanel.activeLayerId,
          this.layersPanel,
          this.mainCanvasPanel,
        ),
      );
    });
    this.chatPanel.setAddNewLayerHandler(() => {
      let canvas = document.createElement("canvas");
      canvas.width = this.project.metadata.width;
      canvas.height = this.project.metadata.height;
      this.commandHistoryManager.pushCommand(
        new AddLayerCommand(
          this.project,
          {
            id: crypto.randomUUID(),
            name: "Untitled Layer",
            width: this.project.metadata.width,
            height: this.project.metadata.height,
            visible: true,
            opacity: 100,
            locked: false,
            transform: {
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              translateX: 0,
              translateY: 0,
            },
          },
          canvas,
          this.layersPanel,
          this.mainCanvasPanel,
        ),
      );
    });
    this.chatPanel.setSelectMoveToolHandler(() => {
      this.mainCanvasPanel.selectMoveTool();
    });
    this.chatPanel.setSelectPaintToolHandler(() => {
      this.mainCanvasPanel.selectPaintTool();
    });
    this.chatPanel.initialGreet();
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
