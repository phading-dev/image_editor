import { COLOR_THEME } from "../color_theme";
import { MainCanvasPanel } from "./canvas/main_canvas_panel";
import { ChatPanel } from "./chat_panel";
import { CommandHistoryManager } from "./command_history_manager";
import { AddLayerCommand } from "./commands/add_layer_command";
import { DeleteLayerCommand } from "./commands/delete_layer_command";
import { HideLayersCommand } from "./commands/hide_layers_command";
import { LockLayersCommand } from "./commands/lock_layers_command";
import { MoveCommand } from "./commands/move_command";
import { PaintCommand } from "./commands/paint_command";
import { RenameLayerCommand } from "./commands/rename_layer_command";
import { ReorderLayerCommand } from "./commands/reorder_layer_command";
import { SetLayerOpacityCommand } from "./commands/set_layer_opacity_command";
import { ShowLayersCommand } from "./commands/show_layers_command";
import { UnlockLayersCommand } from "./commands/unlock_layers_command";
import { LayersPanel } from "./layers_panel";
import { SetLayerOpacitySliderPopup } from "./popup/set_layer_opacity_slider_popup";
import { Project } from "./project";
import { Layer } from "./project_metadata";
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
  public static create(
    newProject: () => void,
    loadProject: () => void,
    project: Project,
  ): Editor {
    return new Editor(
      ChatPanel.create,
      MainCanvasPanel.create,
      LayersPanel.create,
      CommandHistoryManager.create,
      SetLayerOpacitySliderPopup.create,
      project,
      newProject,
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
    private readonly createSetLayerOpacitySliderPopup: typeof SetLayerOpacitySliderPopup.create,
    private readonly project: Project,
    private readonly newProject: () => void,
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

    this.layersPanel
      .on("reorder", (oldIndex, newIndex) => {
        this.commandHistoryManager.pushCommand(
          new ReorderLayerCommand(
            this.project,
            oldIndex,
            newIndex,
            this.layersPanel,
            this.mainCanvasPanel,
          ),
        );
      })
      .on("layerSelectionChanged", () => {
        this.mainCanvasPanel.rerender();
      })
      .on("toggleLayerVisibility", (layerId: string) => {
        const layer = this.project.metadata.layers.find(
          (layer) => layer.id === layerId,
        );
        if (layer.visible) {
          this.commandHistoryManager.pushCommand(
            new HideLayersCommand(
              [layer],
              this.layersPanel,
              this.mainCanvasPanel,
            ),
          );
        } else {
          this.commandHistoryManager.pushCommand(
            new ShowLayersCommand(
              [layer],
              this.layersPanel,
              this.mainCanvasPanel,
            ),
          );
        }
      })
      .on("toggleLayerLock", (layerId: string) => {
        const layer = this.project.metadata.layers.find(
          (layer) => layer.id === layerId,
        );
        if (layer.locked) {
          this.commandHistoryManager.pushCommand(
            new UnlockLayersCommand([layer], this.layersPanel),
          );
        } else {
          this.commandHistoryManager.pushCommand(
            new LockLayersCommand([layer], this.layersPanel),
          );
        }
      })
      .on("updateLayerOpacity", (layerId: string) => {
        this.popupSetLayerOpacity(layerId);
      });
    this.mainCanvasPanel
      .setGetActiveLayerId(() => this.layersPanel.activeLayerId)
      .setGetSelectedLayerIds(() => this.layersPanel.selectedLayerIds)
      .on("warning", (message: string) => {
        this.chatPanel.appendMessage({
          role: "warning",
          parts: [{ text: message }],
        });
      })
      .on("paint", (context, oldImageData, newImageData) => {
        this.commandHistoryManager.pushCommand(
          new PaintCommand(
            context,
            oldImageData,
            newImageData,
            this.mainCanvasPanel,
          ),
        );
      })
      .on("move", (layers, deltaX, deltaY) => {
        this.commandHistoryManager.pushCommand(
          new MoveCommand(layers, deltaX, deltaY, this.mainCanvasPanel),
        );
      });
    this.chatPanel
      .setSaveProjectHandler(async () => {
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
      })
      .setLoadProjectHandler(() => {
        this.loadProject();
      })
      .setNewProjectHandler(() => {
        this.newProject();
      })
      .setDescribeProjectHandler(() => {
        return JSON.stringify(this.project.metadata);
      })
      .setRenameProjectHandler((name: string) => {
        this.project.metadata.name = name;
      })
      .setExportImageHandler(
        async (filename: string, imageType: string, quality?: number) => {
          await this.mainCanvasPanel.exportAsImage(
            filename,
            imageType,
            quality,
          );
        },
      )
      .setUndoHandler(() => {
        this.commandHistoryManager.undo();
      })
      .setRedoHandler(() => {
        this.commandHistoryManager.redo();
      })
      .setAddNewLayerHandler(() => {
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
      })
      .setDeleteActiveLayerHandler(() => {
        if (!this.layersPanel.activeLayerId) {
          throw new Error("No active layer to delete.");
        }
        const layer = this.project.metadata.layers.find(
          (layer) => layer.id === this.layersPanel.activeLayerId,
        );
        if (layer.locked) {
          throw new Error("Cannot delete a locked layer.");
        }
        this.commandHistoryManager.pushCommand(
          new DeleteLayerCommand(
            this.project,
            layer,
            this.layersPanel,
            this.mainCanvasPanel,
          ),
        );
      })
      .setLockSelectedLayersHandler(() => {
        const selectedLayers = this.layersPanel.selectedLayerIds;
        if (selectedLayers.size === 0) {
          throw new Error("No layers selected to lock.");
        }
        const layers = this.project.metadata.layers
          .filter((layer) => this.layersPanel.selectedLayerIds.has(layer.id))
          .filter((layer) => !layer.locked);
        if (layers.length === 0) {
          throw new Error("All selected layers are already locked.");
        }
        let warning: string;
        if (layers.length < selectedLayers.size) {
          warning = "Some selected layers are already locked and were skipped.";
        }
        this.commandHistoryManager.pushCommand(
          new LockLayersCommand(layers, this.layersPanel),
        );
        return {
          warning: warning,
        };
      })
      .setUnlockSelectedLayersHandler(() => {
        const selectedLayers = this.layersPanel.selectedLayerIds;
        if (selectedLayers.size === 0) {
          throw new Error("No layers selected to unlock.");
        }
        const layers = this.project.metadata.layers
          .filter((layer) => selectedLayers.has(layer.id))
          .filter((layer) => layer.locked);
        if (layers.length === 0) {
          throw new Error("All selected layers are already unlocked.");
        }
        let warning: string;
        if (layers.length < selectedLayers.size) {
          warning =
            "Some selected layers are already unlocked and were skipped.";
        }
        this.commandHistoryManager.pushCommand(
          new UnlockLayersCommand(layers, this.layersPanel),
        );
        return {
          warning: warning,
        };
      })
      .setShowSelectedLayersHandler(() => {
        const selectedLayers = this.layersPanel.selectedLayerIds;
        if (selectedLayers.size === 0) {
          throw new Error("No layers selected to show.");
        }
        const layers = this.project.metadata.layers
          .filter((layer) => selectedLayers.has(layer.id))
          .filter((layer) => !layer.visible);
        this.commandHistoryManager.pushCommand(
          new ShowLayersCommand(layers, this.layersPanel, this.mainCanvasPanel),
        );
      })
      .setHideSelectedLayersHandler(() => {
        const selectedLayers = this.layersPanel.selectedLayerIds;
        if (selectedLayers.size === 0) {
          throw new Error("No layers selected to hide.");
        }
        const layers = this.project.metadata.layers
          .filter((layer) => selectedLayers.has(layer.id))
          .filter((layer) => layer.visible);
        this.commandHistoryManager.pushCommand(
          new HideLayersCommand(layers, this.layersPanel, this.mainCanvasPanel),
        );
      })
      .setRenameActiveLayerHandler((newName: string) => {
        if (!this.layersPanel.activeLayerId) {
          throw new Error("No active layer to rename.");
        }
        const layer = this.project.metadata.layers.find(
          (layer) => layer.id === this.layersPanel.activeLayerId,
        );
        this.commandHistoryManager.pushCommand(
          new RenameLayerCommand(layer, newName, this.layersPanel),
        );
      })
      .setSetActiveLayerOpacityHandler((newOpacity: number) => {
        if (!this.layersPanel.activeLayerId) {
          throw new Error("No active layer to set opacity.");
        }
        const layer = this.project.metadata.layers.find(
          (layer) => layer.id === this.layersPanel.activeLayerId,
        );
        this.commandHistoryManager.pushCommand(
          new SetLayerOpacityCommand(
            layer,
            layer.opacity,
            newOpacity,
            this.layersPanel,
            this.mainCanvasPanel,
          ),
        );
      })
      .setOpenPopupToSetActiveLayerOpacityHandler(() => {
        if (!this.layersPanel.activeLayerId) {
          throw new Error("No active layer to set opacity.");
        }
        this.popupSetLayerOpacity(this.layersPanel.activeLayerId);
      })
      .setZoomInHandler(() => {
        this.mainCanvasPanel.zoomIn();
      })
      .setZoomOutHandler(() => {
        this.mainCanvasPanel.zoomOut();
      })
      .setSetZoomHandler((scale: number) => {
        this.mainCanvasPanel.setZoom(scale);
      })
      .setSelectMoveToolHandler(() => {
        this.mainCanvasPanel.selectMoveTool();
      })
      .setSelectPaintToolHandler(() => {
        this.mainCanvasPanel.selectPaintTool();
      });
    this.mainCanvasPanel.rerender();
    this.chatPanel.initialGreet();
  }

  private popupSetLayerOpacity(layerId: string): void {
    const layer = this.project.metadata.layers.find(
      (layer) => layer.id === layerId,
    );
    const popup = this.createSetLayerOpacitySliderPopup(
      layer,
      this.layersPanel,
      this.mainCanvasPanel,
    ).on("commit", (layer: Layer, oldOpacity: number, newOpacity: number) => {
      this.commandHistoryManager.pushCommand(
        new SetLayerOpacityCommand(
          layer,
          oldOpacity,
          newOpacity,
          this.layersPanel,
          this.mainCanvasPanel,
        ),
      );
    });
    this.element.append(popup.element);
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
