import { COLOR_THEME } from "../color_theme";
import { MainCanvasPanel } from "./canvas/main_canvas_panel";
import { ChatPanel } from "./chat_panel";
import { CommandHistoryManager } from "./command_history_manager";
import { AddImageLayerCommand } from "./commands/add_image_layer_command";
import { AddLayerCommand } from "./commands/add_layer_command";
import { AddTextLayerCommand } from "./commands/add_text_layer_command";
import { CropLayerCommand } from "./commands/crop_layer_command";
import { DeleteLayerCommand } from "./commands/delete_layer_command";
import { EditTextCommand } from "./commands/edit_text_command";
import { HideLayersCommand } from "./commands/hide_layers_command";
import { LockLayersCommand } from "./commands/lock_layers_command";
import { MoveLayersCommand } from "./commands/move_layers_command";
import { PaintCommand } from "./commands/paint_command";
import { RasterizeTextLayerCommand } from "./commands/rasterize_text_layer_command";
import { RenameLayerCommand } from "./commands/rename_layer_command";
import { ReorderLayerCommand } from "./commands/reorder_layer_command";
import { ResizeCanvasCommand } from "./commands/resize_canvas_command";
import { ResizeTextLayerCommand } from "./commands/resize_text_layer_command";
import { SetLayerOpacityCommand } from "./commands/set_layer_opacity_command";
import { ShowLayersCommand } from "./commands/show_layers_command";
import { TransformLayerCommand } from "./commands/transform_layer_command";
import { UnlockLayersCommand } from "./commands/unlock_layers_command";
import { UpdateBasicTextCommand } from "./commands/update_basic_text_command";
import { UpdateLayerShadowCommand } from "./commands/update_layer_shadow_command";
import { LayersPanel } from "./layers_panel";
import { ColorPickerPopup } from "./popup/color_picker_popup";
import { SliderPopup } from "./popup/slider_popup";
import { Project } from "./project";
import { loadImage, saveToZip } from "./project_serializer";
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
    projectMetadataContent: string,
  ): Editor {
    return new Editor(
      ChatPanel.create,
      MainCanvasPanel.create,
      LayersPanel.create,
      CommandHistoryManager.create,
      SliderPopup.create,
      ColorPickerPopup.create,
      newProject,
      loadProject,
      project,
      projectMetadataContent,
    );
  }

  public readonly element: HTMLElement;
  public readonly chatPanel: ChatPanel;
  public readonly mainCanvasPanel: MainCanvasPanel;
  public readonly layersPanel: LayersPanel;
  public readonly commandHistoryManager: CommandHistoryManager;
  private readonly chatResizeHandle: ResizeHandle;
  private readonly layersResizeHandle: ResizeHandle;
  private opacitySliderPopup?: SliderPopup;
  private colorPickerPopup?: ColorPickerPopup;

  public constructor(
    private readonly createChatPanel: typeof ChatPanel.create,
    private readonly createMainCanvasPanel: typeof MainCanvasPanel.create,
    private readonly createLayersPanel: typeof LayersPanel.create,
    private readonly createCommandHistoryManager: typeof CommandHistoryManager.create,
    private readonly createSliderPopup: typeof SliderPopup.create,
    private readonly createColorPickerPopup: typeof ColorPickerPopup.create,
    private readonly newProject: () => void,
    private readonly loadProject: () => void,
    private readonly project: Project,
    private readonly projectMetadataContent: string,
  ) {
    this.chatPanel = this.createChatPanel(this.projectMetadataContent);
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
        this.mainCanvasPanel.drawActiveLayerOutline();
        this.chatPanel.appendMessage({
          role: "system",
          parts: [{ text: "Layer selection changed" }],
        });
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
      .on("updateLayerOpacity", () => {
        this.openOpacitySliderPopup();
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
      .on("selectLayer", (layerId: string) => {
        this.layersPanel.selectLayer(layerId);
        this.chatPanel.appendMessage({
          role: "system",
          parts: [{ text: "Layer selection changed" }],
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
          new MoveLayersCommand(layers, deltaX, deltaY, this.mainCanvasPanel),
        );
      })
      .on("transform", (layer, oldTransform, newTransform) => {
        this.commandHistoryManager.pushCommand(
          new TransformLayerCommand(
            layer,
            oldTransform,
            newTransform,
            this.mainCanvasPanel,
          ),
        );
      })
      .on("crop", (layer, cropRect) => {
        this.commandHistoryManager.pushCommand(
          new CropLayerCommand(
            layer,
            cropRect,
            this.mainCanvasPanel,
            this.project.layersToCanvas,
          ),
        );
      })
      .on("resizeCanvas", (newWidth, newHeight, deltaX, deltaY) => {
        this.commandHistoryManager.pushCommand(
          new ResizeCanvasCommand(
            this.project,
            newWidth,
            newHeight,
            deltaX,
            deltaY,
            this.mainCanvasPanel,
          ),
        );
      })
      .on(
        "resizeTextLayer",
        (
          layer,
          oldWidth,
          oldHeight,
          oldX,
          oldY,
          newWidth,
          newHeight,
          newX,
          newY,
        ) => {
          this.commandHistoryManager.pushCommand(
            new ResizeTextLayerCommand(
              layer,
              oldWidth,
              oldHeight,
              oldX,
              oldY,
              newWidth,
              newHeight,
              newX,
              newY,
              this.mainCanvasPanel,
            ),
          );
        },
      )
      .on("textEdit", (layer, oldText, newText) => {
        this.commandHistoryManager.pushCommand(
          new EditTextCommand(
            layer,
            oldText,
            newText,
            this.mainCanvasPanel,
            this.layersPanel,
          ),
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
      .setGetProjectMetadataHandler(() => {
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
        this.chatPanel.appendMessage({
          role: "system",
          parts: [{ text: "Command undone." }],
        });
      })
      .setRedoHandler(() => {
        this.commandHistoryManager.redo();
        this.chatPanel.appendMessage({
          role: "system",
          parts: [{ text: "Command redone." }],
        });
      })
      .setAddNewLayerHandler(() => {
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
            this.layersPanel,
            this.mainCanvasPanel,
          ),
        );
      })
      .setAddTextLayerHandler((x?: number, y?: number) => {
        // Default dimensions
        const width = 600;
        const height = 100;
        // Default position to center if not provided
        const finalX = x ?? (this.project.metadata.width - width) / 2;
        const finalY = y ?? (this.project.metadata.height - height) / 2;
        this.commandHistoryManager.pushCommand(
          new AddTextLayerCommand(
            this.project,
            {
              id: crypto.randomUUID(),
              name: "Text Layer",
              width: width,
              height: height,
              visible: true,
              opacity: 100,
              locked: false,
              transform: {
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                translateX: finalX,
                translateY: finalY,
              },
              basicText: {
                content: "",
                fontFamily: "Arial",
                fontSize: 24,
                fontWeight: "normal",
                fontStyle: "normal",
                color: this.project.metadata.settings.foregroundColor,
                textAlign: "left",
                lineHeight: 1.2,
                letterSpacing: 0,
              },
            },
            this.layersPanel,
            this.mainCanvasPanel,
          ),
        );
      })
      .setLoadImageHandler(() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".png,.jpg,.jpeg,.webp,.gif,image/*";
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) {
            return;
          }
          try {
            const image = await loadImage(file);
            // Create canvas with image dimensions
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext("2d");
            context.drawImage(image, 0, 0);

            this.commandHistoryManager.pushCommand(
              new AddImageLayerCommand(
                this.project,
                {
                  id: crypto.randomUUID(),
                  name: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
                  width: image.naturalWidth,
                  height: image.naturalHeight,
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
          } catch (error) {
            this.chatPanel.appendMessage({
              role: "warning",
              parts: [
                {
                  text:
                    "Failed to load image: " +
                    (error instanceof Error ? error.message : String(error)),
                },
              ],
            });
          }
        };
        input.click();
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
      .setGetActiveLayerInfoHandler(() => {
        if (!this.layersPanel.activeLayerId) {
          throw new Error("No active layer.");
        }
        const layer = this.project.metadata.layers.find(
          (layer) => layer.id === this.layersPanel.activeLayerId,
        );
        return JSON.stringify(layer);
      })
      .setGetSelectedLayersInfoHandler(() => {
        const selectedLayerIds = this.layersPanel.selectedLayerIds;
        if (selectedLayerIds.size === 0) {
          throw new Error("No selected layers.");
        }
        const layers = this.project.metadata.layers.filter((layer) =>
          selectedLayerIds.has(layer.id),
        );
        return JSON.stringify(layers);
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
      .setOpenOpacitySliderPopup(() => {
        this.openOpacitySliderPopup();
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
      .setColorSettingsHandler(
        (foregroundColor?: string, backgroundColor?: string) => {
          if (foregroundColor) {
            this.project.metadata.settings.foregroundColor = foregroundColor;
          }
          if (backgroundColor) {
            this.project.metadata.settings.backgroundColor = backgroundColor;
          }
        },
      )
      .setOpenColorPickerPopupHandler(() => {
        this.openColorPickerPopup();
      })
      .setSelectMoveToolHandler(() => {
        this.mainCanvasPanel.selectMoveTool();
      })
      .setSelectSelectToolHandler(() => {
        this.mainCanvasPanel.selectSelectTool();
      })
      .setMoveSelectedLayersHandler((deltaX: number, deltaY: number) => {
        const selectedLayers = this.layersPanel.selectedLayerIds;
        if (selectedLayers.size === 0) {
          throw new Error("No layers selected to move.");
        }
        const layers = this.project.metadata.layers
          .filter((layer) => selectedLayers.has(layer.id))
          .filter((layer) => !layer.locked);
        if (layers.length === 0) {
          throw new Error(
            "All selected layers are locked and cannot be moved.",
          );
        }
        let warning: string;
        if (layers.length < selectedLayers.size) {
          warning = "Some selected layers are locked and cannot be moved.";
        }
        this.commandHistoryManager.pushCommand(
          new MoveLayersCommand(layers, deltaX, deltaY, this.mainCanvasPanel),
        );
        return {
          warning,
        };
      })
      .setSelectTransformToolHandler(() => {
        this.mainCanvasPanel.selectFreeTransformTool();
      })
      .setTransformActiveLayerHandler(
        (transform: {
          translateX?: number;
          translateY?: number;
          scaleX?: number;
          scaleY?: number;
          rotation?: number;
        }) => {
          if (!this.layersPanel.activeLayerId) {
            throw new Error("No active layer to transform.");
          }
          const layer = this.project.metadata.layers.find(
            (layer) => layer.id === this.layersPanel.activeLayerId,
          );
          if (layer.locked) {
            throw new Error(
              "Active layer is locked and cannot be transformed.",
            );
          }
          const oldTransform = { ...layer.transform };
          const newTransform = {
            translateX: transform.translateX ?? oldTransform.translateX,
            translateY: transform.translateY ?? oldTransform.translateY,
            scaleX: transform.scaleX ?? oldTransform.scaleX,
            scaleY: transform.scaleY ?? oldTransform.scaleY,
            rotation: transform.rotation ?? oldTransform.rotation,
          };
          this.commandHistoryManager.pushCommand(
            new TransformLayerCommand(
              layer,
              oldTransform,
              newTransform,
              this.mainCanvasPanel,
            ),
          );
        },
      )
      .setResizeActiveLayerHandler(
        (dimensions: { width?: number; height?: number }) => {
          if (!this.layersPanel.activeLayerId) {
            throw new Error("No active layer to resize.");
          }
          const layer = this.project.metadata.layers.find(
            (layer) => layer.id === this.layersPanel.activeLayerId,
          );
          if (layer.locked) {
            throw new Error("Active layer is locked and cannot be resized.");
          }
          const oldTransform = { ...layer.transform };
          const newScaleX =
            dimensions.width !== undefined
              ? dimensions.width / layer.width
              : oldTransform.scaleX;
          const newScaleY =
            dimensions.height !== undefined
              ? dimensions.height / layer.height
              : oldTransform.scaleY;
          const newTransform = {
            translateX: oldTransform.translateX,
            translateY: oldTransform.translateY,
            scaleX: newScaleX,
            scaleY: newScaleY,
            rotation: oldTransform.rotation,
          };
          this.commandHistoryManager.pushCommand(
            new TransformLayerCommand(
              layer,
              oldTransform,
              newTransform,
              this.mainCanvasPanel,
            ),
          );
        },
      )
      .setSelectCropToolHandler(() => {
        this.mainCanvasPanel.selectCropTool();
      })
      .setCropActiveLayerHandler(
        (cropRect: { x: number; y: number; width: number; height: number }) => {
          if (!this.layersPanel.activeLayerId) {
            throw new Error("No active layer to crop.");
          }
          const layer = this.project.metadata.layers.find(
            (layer) => layer.id === this.layersPanel.activeLayerId,
          );
          if (layer.locked) {
            throw new Error("Active layer is locked and cannot be cropped.");
          }
          this.commandHistoryManager.pushCommand(
            new CropLayerCommand(
              layer,
              cropRect,
              this.mainCanvasPanel,
              this.project.layersToCanvas,
            ),
          );
        },
      )
      .setSelectPaintToolHandler(() => {
        this.mainCanvasPanel.selectPaintTool();
      })
      .setSelectResizeCanvasToolHandler(() => {
        this.mainCanvasPanel.selectResizeCanvasTool();
      })
      .setResizeCanvasHandler(
        (
          newWidth?: number,
          newHeight?: number,
          deltaX?: number,
          deltaY?: number,
        ) => {
          const finalWidth = newWidth ?? this.project.metadata.width;
          const finalHeight = newHeight ?? this.project.metadata.height;
          const finalDeltaX = deltaX ?? 0;
          const finalDeltaY = deltaY ?? 0;
          if (finalWidth < 1) {
            throw new Error("Canvas width must be at least 1 pixel");
          }
          if (finalHeight < 1) {
            throw new Error("Canvas height must be at least 1 pixel");
          }
          this.commandHistoryManager.pushCommand(
            new ResizeCanvasCommand(
              this.project,
              finalWidth,
              finalHeight,
              finalDeltaX,
              finalDeltaY,
              this.mainCanvasPanel,
            ),
          );
        },
      )
      .setSelectTextEditToolHandler(() => {
        if (!this.layersPanel.activeLayerId) {
          throw new Error("No active layer to edit text.");
        }
        const layer = this.project.metadata.layers.find(
          (layer) => layer.id === this.layersPanel.activeLayerId,
        );
        if (!layer.basicText) {
          throw new Error("Active layer is not a text layer.");
        }
        if (layer.locked) {
          throw new Error("Active layer is locked and cannot be edited.");
        }
        this.mainCanvasPanel.selectTextEditTool();
      })
      .setRasterizeActiveLayerHandler(() => {
        if (!this.layersPanel.activeLayerId) {
          throw new Error("No active layer to rasterize.");
        }
        const layer = this.project.metadata.layers.find(
          (layer) => layer.id === this.layersPanel.activeLayerId,
        );
        if (!layer.basicText) {
          throw new Error("Active layer is not a text layer.");
        }
        if (layer.locked) {
          throw new Error("Active layer is locked and cannot be rasterized.");
        }
        this.commandHistoryManager.pushCommand(
          new RasterizeTextLayerCommand(
            this.project,
            layer,
            this.mainCanvasPanel,
          ),
        );
      })
      .setUpdateActiveLayerShadowHandler(
        (shadow: {
          color?: string;
          blur?: number;
          offsetX?: number;
          offsetY?: number;
        }) => {
          if (!this.layersPanel.activeLayerId) {
            throw new Error("No active layer to update shadow.");
          }
          const layer = this.project.metadata.layers.find(
            (layer) => layer.id === this.layersPanel.activeLayerId,
          );
          if (layer.locked) {
            throw new Error("Active layer is locked and cannot update shadow.");
          }
          const oldShadow = layer.shadow;
          const defaultShadow = {
            color: this.project.metadata.settings.backgroundColor,
            blur: 1,
            offsetX: 0,
            offsetY: 0,
          };
          const baseShadow = oldShadow || defaultShadow;
          const newShadow = {
            color: shadow.color ?? baseShadow.color,
            blur: shadow.blur ?? baseShadow.blur,
            offsetX: shadow.offsetX ?? baseShadow.offsetX,
            offsetY: shadow.offsetY ?? baseShadow.offsetY,
          };
          this.commandHistoryManager.pushCommand(
            new UpdateLayerShadowCommand(
              layer,
              oldShadow,
              newShadow,
              this.layersPanel,
              this.mainCanvasPanel,
            ),
          );
        },
      )
      .setDeleteActiveLayerShadowHandler(() => {
        if (!this.layersPanel.activeLayerId) {
          throw new Error("No active layer to delete shadow.");
        }
        const layer = this.project.metadata.layers.find(
          (layer) => layer.id === this.layersPanel.activeLayerId,
        );
        if (layer.locked) {
          throw new Error("Active layer is locked and cannot delete shadow.");
        }
        if (!layer.shadow) {
          throw new Error("Active layer has no shadow to delete.");
        }
        this.commandHistoryManager.pushCommand(
          new UpdateLayerShadowCommand(
            layer,
            layer.shadow,
            undefined,
            this.layersPanel,
            this.mainCanvasPanel,
          ),
        );
      })
      .setUpdateActiveLayerBasicTextHandler(
        (basicText: {
          content?: string;
          fontFamily?: string;
          fontSize?: number;
          fontWeight?: string;
          fontStyle?: string;
          color?: string;
          textAlign?: string;
          lineHeight?: number;
          letterSpacing?: number;
        }) => {
          if (!this.layersPanel.activeLayerId) {
            throw new Error("No active layer to update text.");
          }
          const layer = this.project.metadata.layers.find(
            (layer) => layer.id === this.layersPanel.activeLayerId,
          );
          if (!layer.basicText) {
            throw new Error("Active layer is not a text layer.");
          }
          if (layer.locked) {
            throw new Error("Active layer is locked and cannot update text.");
          }
          const oldBasicText = { ...layer.basicText };
          const newBasicText = {
            content: basicText.content ?? oldBasicText.content,
            fontFamily: basicText.fontFamily ?? oldBasicText.fontFamily,
            fontSize: basicText.fontSize ?? oldBasicText.fontSize,
            fontWeight: basicText.fontWeight ?? oldBasicText.fontWeight,
            fontStyle: basicText.fontStyle ?? oldBasicText.fontStyle,
            color: basicText.color ?? oldBasicText.color,
            textAlign: basicText.textAlign ?? oldBasicText.textAlign,
            lineHeight: basicText.lineHeight ?? oldBasicText.lineHeight,
            letterSpacing:
              basicText.letterSpacing ?? oldBasicText.letterSpacing,
          };
          this.commandHistoryManager.pushCommand(
            new UpdateBasicTextCommand(
              layer,
              oldBasicText,
              newBasicText,
              this.layersPanel,
              this.mainCanvasPanel,
            ),
          );
        },
      );
    this.mainCanvasPanel.rerender();
    this.chatPanel.sendAssistantMessage("Hi, can you introduce yourself?");
  }

  private openOpacitySliderPopup(): void {
    if (this.opacitySliderPopup) {
      return;
    }
    this.opacitySliderPopup = this.createSliderPopup(
      "Set Opacity",
      100,
      0,
      100,
      "%",
    )
      .on("change", (newOpacity: number) => {
        this.chatPanel.appendChatText(`Set opacity to ${newOpacity}%`);
      })
      .on("remove", () => {
        this.opacitySliderPopup = undefined;
      });
    this.element.append(this.opacitySliderPopup.element);
  }

  private openColorPickerPopup(): void {
    if (this.colorPickerPopup) {
      return;
    }
    this.colorPickerPopup = this.createColorPickerPopup("#ffffff")
      .on("change", (newColor: string) => {
        this.chatPanel.appendChatText(newColor);
      })
      .on("remove", () => {
        this.colorPickerPopup = undefined;
      });
    this.element.append(this.colorPickerPopup.element);
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
