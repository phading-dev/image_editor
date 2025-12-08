import EventEmitter = require("events");
import { ENV_VARS } from "../../env_vars";
import { newGenerateContentRequest } from "../../service_interface/client";
import { COLOR_THEME } from "../color_theme";
import { SERVICE_CLIENT } from "../service_client";
import { FONT_M } from "../sizes";
import { E } from "@selfage/element/factory";
import { Ref } from "@selfage/ref";
import { WebServiceClient } from "@selfage/web_service_client/client";

// The roles whose messages are included in the chat context sent to the model
const CHAT_CONTEXT_ROLES = [
  "user",
  "assistant",
  "system",
  "modelResponse",
  "functionCall",
  "functionResponse",
];
// The roles whose messages are displayed in the chat panel
const DISPLAY_ROLES = ["user", "error", "warning", "modelResponse"];

interface ChatMessage {
  role:
  | "user"
  | "error"
  | "warning"
  | "assistant"
  | "system"
  | "modelResponse"
  | "functionCall"
  | "functionResponse";
  parts: any[];
}

export interface ChatPanel {
  on(event: "messageSent", listener: () => void): this;
}

export class ChatPanel extends EventEmitter {
  public static create(projectMetadataContent: string): ChatPanel {
    return new ChatPanel(
      SERVICE_CLIENT,
      ENV_VARS.geminiModel,
      document,
      projectMetadataContent,
    );
  }

  private static readonly MAX_HISTORY_LENGTH = 100;

  public readonly element: HTMLElement;
  public readonly historyContainer: HTMLDivElement;
  public readonly input: HTMLTextAreaElement;
  public readonly sendButton: HTMLButtonElement;
  private sending = false;
  private readonly chatHistory: Array<any> = [];
  private readonly registeredFunctionHandlers: {
    [functionName: string]: (...args: any) => any;
  } = {};

  public constructor(
    private serviceClient: WebServiceClient,
    private model: string,
    private document: Document,
    private projectMetadataDefinitionContent: string,
  ) {
    super();
    let historyRef = new Ref<HTMLDivElement>();
    let inputRef = new Ref<HTMLTextAreaElement>();
    let sendButtonRef = new Ref<HTMLButtonElement>();

    this.element = E.div(
      {
        class: "chat-panel",
        style: [
          "flex:0 0 auto",
          "height:100%",
          "display:flex",
          "flex-direction:column",
          `background-color:${COLOR_THEME.neutral4}`,
          `color:${COLOR_THEME.neutral0}`,
          "gap:0.75rem",
        ].join(";"),
      },
      E.div({
        ref: historyRef,
        class: "chat-panel__history",
        style: [
          "padding: 1rem 0.75rem 0 0.75rem",
          "box-sizing:border-box",
          "flex:1",
          "overflow-y:auto",
          "display:flex",
          "flex-direction:column",
          "gap:0.75rem",
        ].join(";"),
      }),
      E.div(
        {
          class: "chat-panel__input-row",
          style: [
            "padding: 0 0.75rem 1rem 0.75rem",
            "box-sizing:border-box",
            "position:relative",
          ].join(";"),
        },
        E.textarea({
          ref: inputRef,
          class: "chat-panel__input",
          rows: "1",
          placeholder: "Ask me anything...",
          style: [
            "width:100%",
            `background-color:transparent`,
            `color:${COLOR_THEME.neutral0}`,
            `border:0.0625rem solid ${COLOR_THEME.neutral2}`,
            "border-radius:0.625rem",
            "padding:0.625rem 2.5rem 0.625rem 0.625rem",
            "resize:vertical",
            `font-size:${FONT_M}rem`,
            "line-height:1.4",
            "outline:none",
            "overflow:hidden",
            "box-sizing:border-box",
          ].join(";"),
        }),
        E.button(
          {
            ref: sendButtonRef,
            class: "chat-panel__send",
            type: "button",
            title: "Send",
            style: [
              "position:absolute",
              "right:1.25rem",
              "bottom:1.625rem",
              `background-color:transparent`,
              "border:none",
              "width:2rem",
              "height:2rem",
              "cursor:pointer",
              "transition:opacity 120ms ease",
              "padding:0.5rem",
            ].join(";"),
          },
          E.svg(
            {
              style: [
                "width: 100%;",
                "height: 100%;",
                "fill: none;",
                `stroke: ${COLOR_THEME.neutral0}`,
                "stroke-width: 2;",
                "stroke-linecap: round;",
                "stroke-linejoin: round;",
              ].join(";"),
              viewBox: "2.5 2.5 19 19",
            },
            E.path({
              d: "M11.5003 12H5.41872M5.24634 12.7972L4.24158 15.7986C3.69128 17.4424 3.41613 18.2643 3.61359 18.7704C3.78506 19.21 4.15335 19.5432 4.6078 19.6701C5.13111 19.8161 5.92151 19.4604 7.50231 18.7491L17.6367 14.1886C19.1797 13.4942 19.9512 13.1471 20.1896 12.6648C20.3968 12.2458 20.3968 11.7541 20.1896 11.3351C19.9512 10.8529 19.1797 10.5057 17.6367 9.81135L7.48483 5.24303C5.90879 4.53382 5.12078 4.17921 4.59799 4.32468C4.14397 4.45101 3.77572 4.78336 3.60365 5.22209C3.40551 5.72728 3.67772 6.54741 4.22215 8.18767L5.24829 11.2793C5.34179 11.561 5.38855 11.7019 5.407 11.8459C5.42338 11.9738 5.42321 12.1032 5.40651 12.231C5.38768 12.375 5.34057 12.5157 5.24634 12.7972Z",
            }),
          ),
        ),
      ),
    );
    if (!historyRef.val || !inputRef.val || !sendButtonRef.val) {
      throw new Error("ChatPanel failed to initialize DOM refs.");
    }
    this.historyContainer = historyRef.val;
    this.input = inputRef.val;
    this.sendButton = sendButtonRef.val;

    this.adjustInputHeight();
    this.document.addEventListener("keydown", this.globalKeyDownFocus);
    this.document.addEventListener("keydown", this.globalKeyDownShortcuts);
    this.input.addEventListener("input", () => {
      this.adjustInputHeight();
    });
    this.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        this.handleSend();
      }
    });
    this.sendButton.addEventListener("click", () => {
      this.handleSend();
    });
  }

  private globalKeyDownFocus = (event: KeyboardEvent): void => {
    // Don't capture if already focused on input or other text fields
    if (
      this.document.activeElement === this.input ||
      this.document.activeElement instanceof HTMLInputElement ||
      this.document.activeElement instanceof HTMLTextAreaElement
    ) {
      return;
    }

    // Don't capture if modifier keys are pressed (Ctrl+C, etc.)
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    // Handle printable characters
    if (event.key.length === 1) {
      this.input.focus();
      this.adjustInputHeight();
    }
    // Handle backspace/delete
    else if (event.key === "Backspace" || event.key === "Delete") {
      this.input.focus();
    }
  };

  private globalKeyDownShortcuts = (event: KeyboardEvent): void => {
    // Handle Ctrl+Z (undo)
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "z" &&
      !event.altKey
    ) {
      event.preventDefault();
      this.registeredFunctionHandlers["undo"]();
    }
    // Handle Ctrl+Shift+Z (redo)
    else if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "Z" && // Capital Z due to Shift
      !event.altKey
    ) {
      event.preventDefault();
      this.registeredFunctionHandlers["redo"]();
    }
    // Handle Ctrl+Y (redo - alternative)
    else if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "y" &&
      !event.altKey
    ) {
      event.preventDefault();
      this.registeredFunctionHandlers["redo"]();
    }
    // Handle Ctrl+S (save)
    else if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "s" &&
      !event.altKey
    ) {
      event.preventDefault();
      this.registeredFunctionHandlers["saveProject"]();
    }
    // Handle Ctrl+O (load)
    else if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "o" &&
      !event.altKey
    ) {
      event.preventDefault();
      this.registeredFunctionHandlers["loadProject"]();
    }
    // Handle Ctrl+"+" (zoom in) or with shift
    else if (
      (event.ctrlKey || event.metaKey) &&
      (event.key === "+" || event.key === "=") && // "=" for non-shifted "+"
      !event.altKey
    ) {
      event.preventDefault();
      this.registeredFunctionHandlers["zoomIn"]();
    }
    // Handle Ctrl+"-" (zoom out) or with shift
    else if (
      (event.ctrlKey || event.metaKey) &&
      (event.key === "-" || event.key === "_") && // "_" for shifted "-"
      !event.altKey
    ) {
      event.preventDefault();
      this.registeredFunctionHandlers["zoomOut"]();
    }
  };

  private adjustInputHeight(): void {
    this.input.style.height = "auto";
    // Minimum height: 1.4 line-height + 1.25rem padding + 0.125rem border
    this.input.style.height = `${Math.max(this.input.scrollHeight / 16, FONT_M * 1.4 + 1.25 + 0.125)}rem`;
  }

  public appendChatText(text: string): void {
    this.input.value += text;
    this.adjustInputHeight();
  }

  public appendMessage(message: ChatMessage): void {
    if (CHAT_CONTEXT_ROLES.includes(message.role)) {
      let role: string = message.role;
      if (role === "assistant") {
        role = "user";
      } else if (role === "system") {
        role = "user";
      } else if (role === "modelResponse") {
        role = "model";
      } else if (role === "functionCall") {
        role = "model";
      } else if (role === "functionResponse") {
        role = "function";
      }
      this.chatHistory.push({
        role,
        parts: message.parts,
      });
      if (this.chatHistory.length > ChatPanel.MAX_HISTORY_LENGTH) {
        this.chatHistory.splice(
          0,
          this.chatHistory.length - ChatPanel.MAX_HISTORY_LENGTH,
        );
      }
    }

    if (DISPLAY_ROLES.includes(message.role)) {
      let item = E.div(
        {
          class: `chat-panel__message chat-panel__message--${message.role}`,
          style: [
            "border-radius:0.625rem",
            "white-space:pre-wrap",
            "word-break:break-word",
            `color:${COLOR_THEME.neutral0}`,
            `font-size:${FONT_M}rem`,
            "line-height:1.5",
          ].join(";"),
        },
        E.text(message.parts.map((part: any) => part.text).join("")),
      );
      if (message.role === "user") {
        item.style.alignSelf = "flex-end";
        item.style.padding = "0.5rem 0.75rem";
        item.style.backgroundColor = COLOR_THEME.neutral3;
      } else if (message.role === "error") {
        item.style.padding = "0.5rem 0.75rem";
        item.style.backgroundColor = COLOR_THEME.error3;
      }
      this.historyContainer.append(item);
      this.historyContainer.scrollTop = this.historyContainer.scrollHeight;
    }
  }

  public async sendAssistantMessage(content: string): Promise<void> {
    this.appendMessage({
      role: "assistant",
      parts: [{ text: content }],
    });
    await this.sendMessage();
  }

  private async handleSend(): Promise<void> {
    let content = this.input.value.trim();
    if (!content || this.sending) {
      return;
    }

    this.appendMessage({
      role: "user",
      parts: [{ text: content }],
    });
    this.input.value = "";
    this.adjustInputHeight();
    await this.sendMessage();
  }

  private async sendMessage(): Promise<void> {
    this.setSending(true);
    try {
      await this.generateContent();
    } catch (error) {
      let message = error instanceof Error ? error.message : String(error);
      this.appendMessage({
        role: "error",
        parts: [{ text: `Error: ${message}` }],
      });
    } finally {
      this.setSending(false);
      this.emit("messageSent");
    }
  }

  private setSending(value: boolean): void {
    this.sending = value;
    this.sendButton.disabled = value;
    if (value) {
      this.sendButton.style.opacity = "0.6";
      this.sendButton.style.cursor = "default";
    } else {
      this.sendButton.style.opacity = "1";
      this.sendButton.style.cursor = "pointer";
    }
  }

  public setSaveProjectHandler(handler: () => Promise<void>): this {
    this.registeredFunctionHandlers["saveProject"] = handler;
    return this;
  }

  public setLoadProjectHandler(handler: () => void): this {
    this.registeredFunctionHandlers["loadProject"] = handler;
    return this;
  }

  public setNewProjectHandler(handler: () => void): this {
    this.registeredFunctionHandlers["newProject"] = handler;
    return this;
  }

  public setRenameProjectHandler(handler: (name: string) => void): this {
    this.registeredFunctionHandlers["renameProject"] = handler;
    return this;
  }

  public setGetProjectMetadataHandler(handler: () => string): this {
    this.registeredFunctionHandlers["getProjectMetadata"] = handler;
    return this;
  }

  public setExportImageHandler(
    handler: (filename: string, imageType: string) => Promise<void>,
  ): this {
    this.registeredFunctionHandlers["exportImage"] = handler;
    return this;
  }

  public setUndoHandler(handler: () => void): this {
    this.registeredFunctionHandlers["undo"] = handler;
    return this;
  }

  public setRedoHandler(handler: () => void): this {
    this.registeredFunctionHandlers["redo"] = handler;
    return this;
  }

  public setAddNewLayerHandler(handler: () => void): this {
    this.registeredFunctionHandlers["addNewLayer"] = handler;
    return this;
  }

  public setAddTextLayerHandler(
    handler: (x?: number, y?: number) => void,
  ): this {
    this.registeredFunctionHandlers["addTextLayer"] = handler;
    return this;
  }

  public setLoadImageHandler(handler: () => void): this {
    this.registeredFunctionHandlers["loadImage"] = handler;
    return this;
  }

  public setDeleteActiveLayerHandler(handler: () => void): this {
    this.registeredFunctionHandlers["deleteActiveLayer"] = handler;
    return this;
  }

  public setDuplicateActiveLayerHandler(handler: () => void): this {
    this.registeredFunctionHandlers["duplicateActiveLayer"] = handler;
    return this;
  }

  public setGetActiveLayerInfoHandler(handler: () => string): this {
    this.registeredFunctionHandlers["getActiveLayerInfo"] = handler;
    return this;
  }

  public setGetSelectedLayersInfoHandler(handler: () => string): this {
    this.registeredFunctionHandlers["getSelectedLayersInfo"] = handler;
    return this;
  }

  public setLockSelectedLayersHandler(
    handler: () => { warning: string },
  ): this {
    this.registeredFunctionHandlers["lockSelectedLayers"] = handler;
    return this;
  }

  public setUnlockSelectedLayersHandler(
    handler: () => { warning: string },
  ): this {
    this.registeredFunctionHandlers["unlockSelectedLayers"] = handler;
    return this;
  }

  public setShowSelectedLayersHandler(handler: () => void): this {
    this.registeredFunctionHandlers["showSelectedLayers"] = handler;
    return this;
  }

  public setHideSelectedLayersHandler(handler: () => void): this {
    this.registeredFunctionHandlers["hideSelectedLayers"] = handler;
    return this;
  }

  public setRenameActiveLayerHandler(handler: (newName: string) => void): this {
    this.registeredFunctionHandlers["renameActiveLayer"] = handler;
    return this;
  }

  public setSetActiveLayerOpacityHandler(
    handler: (newOpacity: number) => void,
  ): this {
    this.registeredFunctionHandlers["setActiveLayerOpacity"] = handler;
    return this;
  }

  public setOpenOpacitySliderPopup(handler: () => void): this {
    this.registeredFunctionHandlers["openOpacitySliderPopup"] = handler;
    return this;
  }

  public setZoomInHandler(handler: () => void): this {
    this.registeredFunctionHandlers["zoomIn"] = handler;
    return this;
  }

  public setZoomOutHandler(handler: () => void): this {
    this.registeredFunctionHandlers["zoomOut"] = handler;
    return this;
  }

  public setSetZoomHandler(handler: (scale: number) => void): this {
    this.registeredFunctionHandlers["setZoom"] = handler;
    return this;
  }

  public setColorSettingsHandler(
    handler: (foregroundColor?: string, backgroundColor?: string) => void,
  ): this {
    this.registeredFunctionHandlers["setColorSettings"] = handler;
    return this;
  }

  public setOpenColorPickerPopupHandler(handler: () => void): this {
    this.registeredFunctionHandlers["openColorPickerPopup"] = handler;
    return this;
  }

  public setSelectSelectToolHandler(handler: () => void): this {
    this.registeredFunctionHandlers["selectSelectTool"] = handler;
    return this;
  }

  public setSelectMoveToolHandler(handler: () => void): this {
    this.registeredFunctionHandlers["selectMoveTool"] = handler;
    return this;
  }

  public setSelectTransformToolHandler(handler: () => void): this {
    this.registeredFunctionHandlers["selectTransformTool"] = handler;
    return this;
  }

  public setMoveSelectedLayersHandler(
    handler: (deltaX: number, deltaY: number) => { warning: string },
  ): this {
    this.registeredFunctionHandlers["moveSelectedLayers"] = handler;
    return this;
  }

  public setTransformActiveLayerHandler(
    handler: (transform: {
      translateX?: number;
      translateY?: number;
      scaleX?: number;
      scaleY?: number;
      rotation?: number;
    }) => void,
  ): this {
    this.registeredFunctionHandlers["transformActiveLayer"] = handler;
    return this;
  }

  public setSelectCropToolHandler(handler: () => void): this {
    this.registeredFunctionHandlers["selectCropTool"] = handler;
    return this;
  }

  public setCropActiveLayerHandler(
    handler: (cropRect: {
      x: number;
      y: number;
      width: number;
      height: number;
    }) => void,
  ): this {
    this.registeredFunctionHandlers["cropActiveLayer"] = handler;
    return this;
  }

  public setResizeActiveLayerHandler(
    handler: (dimensions: { width?: number; height?: number }) => void,
  ): this {
    this.registeredFunctionHandlers["resizeActiveLayer"] = handler;
    return this;
  }

  public setSelectRectangleMaskSelectionToolHandler(handler: () => void): this {
    this.registeredFunctionHandlers["selectRectangleMaskSelectionTool"] =
      handler;
    return this;
  }

  public setSelectOvalMaskSelectionToolHandler(handler: () => void): this {
    this.registeredFunctionHandlers["selectOvalMaskSelectionTool"] = handler;
    return this;
  }

  public setSelectLassoMaskSelectionToolHandler(handler: () => void): this {
    this.registeredFunctionHandlers["selectLassoMaskSelectionTool"] = handler;
    return this;
  }

  public setSelectPolygonalMaskSelectionToolHandler(handler: () => void): this {
    this.registeredFunctionHandlers["selectPolygonalMaskSelectionTool"] =
      handler;
    return this;
  }

  public setSelectFuzzyMaskSelectionToolHandler(handler: () => void): this {
    this.registeredFunctionHandlers["selectFuzzyMaskSelectionTool"] = handler;
    return this;
  }

  public setUpdateFuzzyMaskSelectionToolSettingsHandler(
    handler: (settings: {
      tolerance?: number;
      contiguous?: boolean;
      sampleAllLayers?: boolean;
    }) => void,
  ): this {
    this.registeredFunctionHandlers["updateFuzzyMaskSelectionToolSettings"] =
      handler;
    return this;
  }

  public setClearSelectionMaskHandler(handler: () => void): this {
    this.registeredFunctionHandlers["clearSelectionMask"] = handler;
    return this;
  }

  public setInvertSelectionMaskHandler(handler: () => void): this {
    this.registeredFunctionHandlers["invertSelectionMask"] = handler;
    return this;
  }

  public setFeatherSelectionMaskHandler(
    handler: (radius: number) => void,
  ): this {
    this.registeredFunctionHandlers["featherSelectionMask"] = handler;
    return this;
  }

  public setGrowShrinkSelectionMaskHandler(
    handler: (radius: number) => void,
  ): this {
    this.registeredFunctionHandlers["growShrinkSelectionMask"] = handler;
    return this;
  }

  public setAlphaToMaskHandler(handler: (mode?: string) => void): this {
    this.registeredFunctionHandlers["alphaToMask"] = handler;
    return this;
  }

  public setDeleteMaskedAreaHandler(handler: () => void): this {
    this.registeredFunctionHandlers["deleteMaskedArea"] = handler;
    return this;
  }

  public setSelectPaintToolHandler(handler: () => void): this {
    this.registeredFunctionHandlers["selectPaintTool"] = handler;
    return this;
  }

  public setUpdatePaintToolSettingsHandler(
    handler: (settings: { brushSize?: number }) => void,
  ): this {
    this.registeredFunctionHandlers["updatePaintToolSettings"] = handler;
    return this;
  }

  public setSelectResizeCanvasToolHandler(handler: () => void): this {
    this.registeredFunctionHandlers["selectResizeCanvasTool"] = handler;
    return this;
  }

  public setResizeCanvasHandler(
    handler: (
      newWidth?: number,
      newHeight?: number,
      deltaX?: number,
      deltaY?: number,
    ) => void,
  ): this {
    this.registeredFunctionHandlers["resizeCanvas"] = handler;
    return this;
  }

  public setUpdateActiveLayerBasicTextHandler(
    handler: (basicText: {
      content?: string;
      fontFamily?: string;
      fontSize?: number;
      fontWeight?: string;
      fontStyle?: string;
      color?: string;
      textAlign?: string;
      lineHeight?: number;
      letterSpacing?: number;
    }) => void,
  ): this {
    this.registeredFunctionHandlers["updateActiveLayerBasicText"] = handler;
    return this;
  }

  public setRasterizeActiveTextLayerHandler(handler: () => void): this {
    this.registeredFunctionHandlers["rasterizeActiveTextLayer"] = handler;
    return this;
  }

  public setRasterizeActiveLayerHandler(handler: () => void): this {
    this.registeredFunctionHandlers["rasterizeActiveLayer"] = handler;
    return this;
  }

  public setSelectTextEditToolHandler(handler: () => void): this {
    this.registeredFunctionHandlers["selectTextEditTool"] = handler;
    return this;
  }

  public setUpdateActiveLayerShadowHandler(
    handler: (shadow: {
      color?: string;
      blur?: number;
      offsetX?: number;
      offsetY?: number;
    }) => void,
  ): this {
    this.registeredFunctionHandlers["updateActiveLayerShadow"] = handler;
    return this;
  }

  public setDeleteActiveLayerShadowHandler(handler: () => void): this {
    this.registeredFunctionHandlers["deleteActiveLayerShadow"] = handler;
    return this;
  }

  private async generateContent(): Promise<void> {
    while (true) {
      let response = await this.serviceClient.send(
        newGenerateContentRequest({
          model: this.model,
          systemInstructionJson: JSON.stringify({
            role: "system",
            parts: [
              {
                text: [
                  "You are a helpful assistant named Alice for an image editing application.",
                  "Your role is to help users edit images by interpreting their requests and calling the appropriate functions.",
                  "The application has layers (like Photoshop), and users can work on an active (or current) layer and manage layers.",
                  "When users ask to perform actions, use the available functions to execute them.",
                  "Shortcuts are available for: undo (Ctrl+Z), redo (Ctrl+Y or Ctrl+Shift+Z), save (Ctrl+S), open (Ctrl+O), zoom in (Ctrl+Plus), and zoom out (Ctrl+Minus).",
                  "SelectTool is the default tool that can be selected by pressing ESC.",
                  "Multi-selecting layers can be done by holding down Shift while clicking on layers.",
                  "Panning the canvas can be done by holding down the Alt key and dragging the mouse.",
                  "Be concise and friendly in your responses.",
                  "No need to confirm actions, because the user can always undo them.",
                  "Even if it's unclear whether the user wants to directly edit the image or use the tools, always try to select the appropriate tool first.",
                  "DO NOT ignore the request even if the user requests the same tool consecutively, because it may be switched in other ways and you are not aware of it.",
                  "When a tool is selected, inform the user about how to use it, especially when it involes keyboard shortcuts.",
                ].join(" "),
              },
            ],
          }),
          toolsJson: JSON.stringify([
            {
              functionDeclarations: [
                {
                  name: "saveProject",
                  description:
                    "Save the current project to a zip file. A file picker may or may not appear depending on the browser.",
                },
                {
                  name: "loadProject",
                  description:
                    "Launch a file picker to open a project from a zip file. A file may or may not be selected depending on the user.",
                },
                {
                  name: "newProject",
                  description: "Create a new project with default settings.",
                },
                {
                  name: "getProjectMetadata",
                  description: `Get the metadata about the current project as a JSON string, excluding image data. The metadata's structure is as follows:\n${this.projectMetadataDefinitionContent}`,
                },
                {
                  name: "renameProject",
                  description: "Rename the current project.",
                  parameters: {
                    type: "object",
                    properties: {
                      name: {
                        type: "string",
                        description: "The new name for the project.",
                      },
                    },
                    required: ["name"],
                  },
                },
                {
                  name: "exportImage",
                  description: "Export the current project as an image file",
                  parameters: {
                    type: "object",
                    properties: {
                      filename: {
                        type: "string",
                        description:
                          "Optionally the name of the exported image file, including extension (e.g., image.png, image.jpg). Default is export.png.",
                      },
                      imageType: {
                        type: "string",
                        description:
                          "Optionally the format of the exported image (e.g., png, jpeg, webp). Default is png.",
                      },
                    },
                  },
                },
                {
                  name: "undo",
                  description: "Undo the last action.",
                },
                {
                  name: "redo",
                  description: "Redo the last undone action.",
                },
                {
                  name: "addNewLayer",
                  description: "Add a new layer to the project.",
                },
                {
                  name: "addTextLayer",
                  description:
                    "Add a new text layer to the project. The layer will be created with default size (600x100) and positioned based on the provided coordinates or centered if not specified.",
                  parameters: {
                    type: "object",
                    properties: {
                      x: {
                        type: "number",
                        description:
                          "The x-coordinate for the text layer position. If not provided, the layer will be horizontally centered on the canvas.",
                      },
                      y: {
                        type: "number",
                        description:
                          "The y-coordinate for the text layer position. If not provided, the layer will be vertically centered on the canvas.",
                      },
                    },
                  },
                },
                {
                  name: "loadImage",
                  description:
                    "Launch a file picker to load an image file. A file may or may not be selected depending on the user. If an image is selected, it will be added as a new layer. If this is the first layer in the project, the canvas will be resized to match the image dimensions.",
                },
                {
                  name: "deleteActiveLayer",
                  description: "Delete the currently active layer.",
                },
                {
                  name: "duplicateActiveLayer",
                  description:
                    "Duplicate the currently active layer. The duplicated layer will be placed at the top of the layer stack with a copy of all properties and content.",
                },
                {
                  name: "getActiveLayerInfo",
                  description:
                    "Get information about the currently active layer as a JSON string.",
                },
                {
                  name: "getSelectedLayersInfo",
                  description:
                    "Get information about the currently selected layers as a JSON string.",
                },
                {
                  name: "lockSelectedLayers",
                  description: "Lock the currently selected layers.",
                },
                {
                  name: "unlockSelectedLayers",
                  description: "Unlock the currently selected layers.",
                },
                {
                  name: "showSelectedLayers",
                  description: "Make the currently selected layers visible.",
                },
                {
                  name: "hideSelectedLayers",
                  description: "Make the currently selected layers invisible.",
                },
                {
                  name: "renameActiveLayer",
                  description: "Rename the currently active layer.",
                  parameters: {
                    type: "object",
                    properties: {
                      newName: {
                        type: "string",
                        description: "The new name for the active layer.",
                      },
                    },
                    required: ["newName"],
                  },
                },
                {
                  name: "setActiveLayerOpacity",
                  description: "Set the opacity of the currently active layer.",
                  parameters: {
                    type: "object",
                    properties: {
                      newOpacity: {
                        type: "number",
                        description:
                          "The new opacity for the active layer (0 to 100).",
                      },
                    },
                    required: ["newOpacity"],
                  },
                },
                {
                  name: "openOpacitySliderPopup",
                  description:
                    "Open the opacity slider popup, if not already open, to select a new opacity which will be passed to the chat as user input in percentage (0 to 100).",
                },
                {
                  name: "zoomIn",
                  description: "Zoom in the canvas view.",
                },
                {
                  name: "zoomOut",
                  description: "Zoom out the canvas view.",
                },
                {
                  name: "setZoom",
                  description: "Set the canvas zoom level.",
                  parameters: {
                    type: "object",
                    properties: {
                      scale: {
                        type: "number",
                        description: "The zoom level to set in percentage.",
                      },
                    },
                    required: ["scale"],
                  },
                },
                {
                  name: "setColorSettings",
                  description:
                    "Set either the foreground color or background color or both of the project.",
                  parameters: {
                    type: "object",
                    properties: {
                      foregroundColor: {
                        type: "string",
                        description:
                          "The new foreground color in hex format (e.g., #RRGGBB). Optional.",
                      },
                      backgroundColor: {
                        type: "string",
                        description:
                          "The new background color in hex format (e.g., #RRGGBB). Optional.",
                      },
                    },
                  },
                },
                {
                  name: "openColorPickerPopup",
                  description:
                    "Open the color picker popup, if not already open, to select a color which will be passed to the chat as user input in hex format (e.g., #RRGGBB).",
                },
                {
                  name: "selectSelectTool",
                  description:
                    "Switch to the select tool to select layers by clicking on them. Clicking on the same position will cycle through the layers at that position.",
                },
                {
                  name: "selectMoveTool",
                  description:
                    "Switch to the move tool to reposition the images of all selected layers. Holding shift while moving will snap to horizontal and vertical movement.",
                },
                {
                  name: "moveSelectedLayers",
                  description:
                    "Move all selected layers by the specified delta in pixels. This is similar to using the move tool.",
                  parameters: {
                    type: "object",
                    properties: {
                      deltaX: {
                        type: "number",
                        description:
                          "Horizontal movement in pixels. Positive values move right, negative values move left.",
                      },
                      deltaY: {
                        type: "number",
                        description:
                          "Vertical movement in pixels. Positive values move down, negative values move up.",
                      },
                    },
                    required: ["deltaX", "deltaY"],
                  },
                },
                {
                  name: "selectTransformTool",
                  description:
                    "Switch to the transform tool to resize, rotate, or move the images of the active layer. Holding shift while moving will snap to horizontal and vertical movement. Holding shift while resizing will lock the aspect ratio. Holding shift while rotating will snap to 15 degree increments.",
                },
                {
                  name: "transformActiveLayer",
                  description:
                    "Transform the active layer with optional translate, rotate, and scale parameters. Any unspecified parameters will retain their original values.",
                  parameters: {
                    type: "object",
                    properties: {
                      translateX: {
                        type: "number",
                        description:
                          "Horizontal translation in pixels. Optional.",
                      },
                      translateY: {
                        type: "number",
                        description:
                          "Vertical translation in pixels. Optional.",
                      },
                      scaleX: {
                        type: "number",
                        description:
                          "Horizontal scale factor (e.g., 1.5 for 150%, 0.5 for 50%). Optional.",
                      },
                      scaleY: {
                        type: "number",
                        description:
                          "Vertical scale factor (e.g., 1.5 for 150%, 0.5 for 50%). Optional.",
                      },
                      rotation: {
                        type: "number",
                        description: "Rotation in degrees. Optional.",
                      },
                    },
                  },
                },
                {
                  name: "resizeActiveLayer",
                  description:
                    "Resize the active layer to specific dimensions in pixels. This calculates the appropriate scale factors based on the layer's current dimensions.",
                  parameters: {
                    type: "object",
                    properties: {
                      width: {
                        type: "number",
                        description: "New width in pixels. Optional.",
                      },
                      height: {
                        type: "number",
                        description: "New height in pixels. Optional.",
                      },
                    },
                  },
                },
                {
                  name: "selectCropTool",
                  description:
                    "Switch to the crop tool to crop the active layer. This will rasterize any existing rotation and scale. Holding shift while cropping will keep the aspect ratio. Double click to commit the crop.",
                },
                {
                  name: "cropActiveLayer",
                  description:
                    "Crop the active layer to the specified rectangle. This will rasterize any existing rotation and scale.",
                  parameters: {
                    type: "object",
                    properties: {
                      x: {
                        type: "number",
                        description:
                          "The x coordinate of the crop rectangle in canvas pixels.",
                      },
                      y: {
                        type: "number",
                        description:
                          "The y coordinate of the crop rectangle in canvas pixels.",
                      },
                      width: {
                        type: "number",
                        description:
                          "The width of the crop rectangle in pixels.",
                      },
                      height: {
                        type: "number",
                        description:
                          "The height of the crop rectangle in pixels.",
                      },
                    },
                    required: ["x", "y", "width", "height"],
                  },
                },
                {
                  name: "selectRectangleMaskSelectionTool",
                  description:
                    "Switch to the rectangle mask selection tool to create rectangular selections on the canvas. Hold Shift to add to selection, Ctrl to subtract from selection, and Shift+Ctrl to intersect with selection. The selection will be shown with a dark overlay on non-selected areas.",
                },
                {
                  name: "selectOvalMaskSelectionTool",
                  description:
                    "Switch to the oval mask selection tool to create oval selections on the canvas. Hold Shift to add to selection, Ctrl to subtract from selection, and Shift+Ctrl to intersect with selection. The selection will be shown with a dark overlay on non-selected areas.",
                },
                {
                  name: "selectLassoMaskSelectionTool",
                  description:
                    "Switch to the lasso/freehand mask selection tool to create freeform polygon selections on the canvas by drawing. Hold Shift to add to selection, Ctrl to subtract from selection, and Shift+Ctrl to intersect with selection. The selection will be shown with a dark overlay on non-selected areas.",
                },
                {
                  name: "selectPolygonalMaskSelectionTool",
                  description:
                    "Switch to the polygonal mask selection tool to create polygon selections by clicking to place vertices. Click near the start point or double-click to close the polygon. Press Backspace to remove the last vertex. Hold Shift to add to selection, Ctrl to subtract from selection, and Shift+Ctrl to intersect with selection. The selection will be shown with a dark overlay on non-selected areas.",
                },
                {
                  name: "selectFuzzyMaskSelectionTool",
                  description:
                    "Switch to the fuzzy/magic wand mask selection tool. Click on a pixel to select all connected pixels with similar colors within the tolerance threshold. Hold Shift to add to selection, Ctrl to subtract from selection, and Shift+Ctrl to intersect with selection. The selection will be shown with a dark overlay on non-selected areas.",
                },
                {
                  name: "updateFuzzyMaskSelectionToolSettings",
                  description:
                    "Update the fuzzy/magic wand mask selection tool settings. All parameters are optional - if not provided, current values will be kept.",
                  parameters: {
                    type: "object",
                    properties: {
                      tolerance: {
                        type: "number",
                        description:
                          "The color tolerance threshold (0-255). Lower values select more similar colors, higher values select a wider range.",
                      },
                      contiguous: {
                        type: "boolean",
                        description:
                          "If true, only selects connected pixels (flood fill). If false, selects all pixels with similar colors regardless of position.",
                      },
                      sampleAllLayers: {
                        type: "boolean",
                        description:
                          "If true, samples colors from the composite of all visible layers. If false, samples only from the active layer.",
                      },
                    },
                  },
                },
                {
                  name: "clearSelectionMask",
                  description: "Clear the current selection mask.",
                },
                {
                  name: "invertSelectionMask",
                  description: "Invert the current selection mask.",
                },
                {
                  name: "featherSelectionMask",
                  description:
                    "Feather the edges of the current selection mask.",
                  parameters: {
                    type: "object",
                    properties: {
                      radius: {
                        type: "number",
                        description:
                          "The radius of the feather blur in pixels.",
                      },
                    },
                    required: ["radius"],
                  },
                },
                {
                  name: "growShrinkSelectionMask",
                  description:
                    "Grow (expand) or shrink (contract) the current selection mask.",
                  parameters: {
                    type: "object",
                    properties: {
                      radius: {
                        type: "number",
                        description:
                          "The radius to grow (positive) or shrink (negative) in pixels.",
                      },
                    },
                    required: ["radius"],
                  },
                },
                {
                  name: "alphaToMask",
                  description:
                    "Convert the alpha channel (transparency) of the active layer to a selection mask. Fully opaque pixels become fully selected, transparent pixels become unselected, and semi-transparent pixels become partially selected.",
                  parameters: {
                    type: "object",
                    properties: {
                      mode: {
                        type: "string",
                        enum: ["replace", "add", "subtract", "intersect"],
                        description:
                          "How to combine with existing selection: 'replace' (default) replaces the current selection, 'add' adds to it, 'subtract' removes from it, 'intersect' keeps only the overlap.",
                      },
                    },
                  },
                },
                {
                  name: "deleteMaskedArea",
                  description:
                    "Delete (make transparent) the pixels within the current selection mask on the active layer. For best results on layers with transforms (rotation, scaling), suggest rasterizing the layer first.",
                },
                {
                  name: "selectPaintTool",
                  description:
                    "Switch to the paint/brush tool for drawing on the active layer.",
                },
                {
                  name: "updatePaintToolSettings",
                  description:
                    "Update the paint/brush tool settings. All parameters are optional - if not provided, current values will be kept.",
                  parameters: {
                    type: "object",
                    properties: {
                      brushSize: {
                        type: "number",
                        description: "The brush size in pixels.",
                      },
                    },
                  },
                },
                {
                  name: "selectResizeCanvasTool",
                  description:
                    "Switch to the resize canvas tool to change the canvas dimensions. This adjusts the canvas size and repositions all layers accordingly without rasterizing them. Holding shift while resizing will keep the aspect ratio. Double click to commit the resize.",
                },
                {
                  name: "resizeCanvas",
                  description:
                    "Resize the canvas to the specified dimensions and offset. All parameters are optional - if not provided, current canvas dimensions and zero offsets will be used. This will adjust all layer positions by the specified deltas to maintain their visual appearance relative to the canvas edges.",
                  parameters: {
                    type: "object",
                    properties: {
                      newWidth: {
                        type: "number",
                        description:
                          "The new canvas width in pixels. Optional - defaults to current canvas width.",
                      },
                      newHeight: {
                        type: "number",
                        description:
                          "The new canvas height in pixels. Optional - defaults to current canvas height.",
                      },
                      deltaX: {
                        type: "number",
                        description:
                          "Horizontal offset in pixels relative to the original canvas origin. Optional - defaults to 0.",
                      },
                      deltaY: {
                        type: "number",
                        description:
                          "Vertical offset in pixels relative to the original canvas origin. Optional - defaults to 0.",
                      },
                    },
                  },
                },
                {
                  name: "selectTextEditTool",
                  description:
                    "Switch to the text edit tool to edit the text of the currently active text layer as well as resizing the text box by adjusting width and height instead of applying scale. If the active layer is not a text layer, this will do nothing. This tool is committed and exited, when pressing ESC or clicking outside of the text box, meaning selecting another layer will exit the tool.",
                },
                {
                  name: "updateActiveLayerBasicText",
                  description:
                    "Update the BasicText properties of the currently active text layer. Only works on an active text layer. All fields of BasicText can be updated. If a field is not provided, it defaults to the previous value.",
                  parameters: {
                    type: "object",
                    properties: {
                      content: {
                        type: "string",
                        description: "The text content.",
                      },
                      fontFamily: {
                        type: "string",
                        description:
                          "The font family (e.g., Arial, Times New Roman).",
                      },
                      fontSize: {
                        type: "number",
                        description: "The font size in pixels.",
                      },
                      fontWeight: {
                        type: "string",
                        description:
                          "The font weight (e.g., normal, bold, or numeric 100-900).",
                      },
                      fontStyle: {
                        type: "string",
                        description: "The font style (normal or italic).",
                      },
                      color: {
                        type: "string",
                        description:
                          "The text color in hex format (e.g., #000000).",
                      },
                      textAlign: {
                        type: "string",
                        description:
                          "The text alignment (left, center, or right).",
                      },
                      lineHeight: {
                        type: "number",
                        description: "The line height multiplier (e.g., 1.2).",
                      },
                      letterSpacing: {
                        type: "number",
                        description: "The letter spacing in pixels.",
                      },
                    },
                  },
                },
                {
                  name: "rasterizeActiveTextLayer",
                  description:
                    "Rasterize the currently active text layer, converting it into an image layer. This action is irreversible (except via undo) and the text will no longer be editable as text. Note: This does NOT bake in transforms. Use rasterizeActiveLayer if the user wants to bake in transforms as well.",
                },
                {
                  name: "rasterizeActiveLayer",
                  description:
                    "Rasterize the currently active layer (text or image), baking in all transforms (rotation, scaling, translation), opacity, and shadow effects. The layer will be resized to match the project canvas dimensions with identity transform. Use this when the user wants to flatten transforms or prepare a layer for pixel-level operations on transformed content.",
                },
                {
                  name: "updateActiveLayerShadow",
                  description:
                    "Update the shadow of the currently active layer. If the layer has no shadow, a new one will be created with default values (color: project background color, blur: 1, offsetX: 0, offsetY: 0) merged with the provided values. If the layer already has a shadow, the provided values will be merged with the existing shadow values.",
                  parameters: {
                    type: "object",
                    properties: {
                      color: {
                        type: "string",
                        description: "The color of the shadow (e.g., #000000).",
                      },
                      blur: {
                        type: "number",
                        description: "The blur radius of the shadow.",
                      },
                      offsetX: {
                        type: "number",
                        description: "The horizontal offset of the shadow.",
                      },
                      offsetY: {
                        type: "number",
                        description: "The vertical offset of the shadow.",
                      },
                    },
                  },
                },
                {
                  name: "deleteActiveLayerShadow",
                  description:
                    "Remove the shadow from the currently active layer.",
                },
              ],
            },
          ]),
          contentsJson: JSON.stringify(this.chatHistory),
        }),
      );
      if (!response.responseJson) {
        throw new Error("No response from model.");
      }
      let parsed = JSON.parse(response.responseJson);

      // Handle function calls
      if (!(await this.handleFunctionCalls(parsed))) {
        // Extract and display text response
        let text = this.extractAssistantText(parsed);
        if (text) {
          this.appendMessage({
            role: "modelResponse",
            parts: [{ text: text }],
          });
          return;
        } else {
          throw new Error("No text response from model.");
        }
      }
    }
  }

  private async handleFunctionCalls(payload: any): Promise<boolean> {
    if (!payload) {
      return false;
    }
    let candidates = payload.candidates;
    if (!Array.isArray(candidates)) {
      return false;
    }
    for (let candidate of candidates) {
      let content = candidate?.content;
      if (!content) {
        continue;
      }
      let parts = content.parts;
      if (!Array.isArray(parts)) {
        continue;
      }
      for (let part of parts) {
        let functionCall = part?.functionCall;
        if (!functionCall || !functionCall.name) {
          continue;
        }

        // Emit events based on function name
        switch (functionCall.name) {
          case "saveProject":
            await this.toolCall(
              "saveProject",
              {},
              this.registeredFunctionHandlers["saveProject"],
            );
            return true;
          case "loadProject":
            await this.toolCall(
              "loadProject",
              {},
              this.registeredFunctionHandlers["loadProject"],
            );
            return true;
          case "newProject":
            await this.toolCall(
              "newProject",
              {},
              this.registeredFunctionHandlers["newProject"],
            );
            return true;
          case "getProjectMetadata":
            await this.toolCall("getProjectMetadata", {}, () => {
              let metadata =
                this.registeredFunctionHandlers["getProjectMetadata"]();
              return {
                metadata: metadata,
              };
            });
            return true;
          case "renameProject":
            await this.toolCall("renameProject", functionCall.args, () => {
              if (!functionCall.args?.name) {
                throw new Error("name parameter is required.");
              }
              this.registeredFunctionHandlers["renameProject"](
                functionCall.args.name,
              );
            });
            return true;
          case "exportImage":
            await this.toolCall("exportImage", functionCall.args, () => {
              let filename = functionCall.args?.filename ?? "export.png";
              let imageType = functionCall.args?.imageType ?? "png";
              this.registeredFunctionHandlers["exportImage"](
                filename,
                imageType,
              );
            });
            return true;
          case "undo":
            await this.toolCall(
              "undo",
              {},
              this.registeredFunctionHandlers["undo"],
            );
            return true;
          case "redo":
            await this.toolCall(
              "redo",
              {},
              this.registeredFunctionHandlers["redo"],
            );
            return true;
          case "addNewLayer":
            await this.toolCall(
              "addNewLayer",
              {},
              this.registeredFunctionHandlers["addNewLayer"],
            );
            return true;
          case "addTextLayer":
            await this.toolCall("addTextLayer", functionCall.args, () => {
              this.registeredFunctionHandlers["addTextLayer"](
                functionCall.args.x,
                functionCall.args.y,
              );
            });
            return true;
          case "loadImage":
            await this.toolCall(
              "loadImage",
              {},
              this.registeredFunctionHandlers["loadImage"],
            );
            return true;
          case "deleteActiveLayer":
            await this.toolCall(
              "deleteActiveLayer",
              {},
              this.registeredFunctionHandlers["deleteActiveLayer"],
            );
            return true;
          case "duplicateActiveLayer":
            await this.toolCall(
              "duplicateActiveLayer",
              {},
              this.registeredFunctionHandlers["duplicateActiveLayer"],
            );
            return true;
          case "getActiveLayerInfo":
            await this.toolCall("getActiveLayerInfo", {}, () => {
              let info =
                this.registeredFunctionHandlers["getActiveLayerInfo"]();
              return {
                info: info,
              };
            });
            return true;
          case "getSelectedLayersInfo":
            await this.toolCall("getSelectedLayersInfo", {}, () => {
              let info =
                this.registeredFunctionHandlers["getSelectedLayersInfo"]();
              return {
                info: info,
              };
            });
            return true;
          case "lockSelectedLayers":
            await this.toolCall(
              "lockSelectedLayers",
              {},
              this.registeredFunctionHandlers["lockSelectedLayers"],
            );
            return true;
          case "unlockSelectedLayers":
            await this.toolCall(
              "unlockSelectedLayers",
              {},
              this.registeredFunctionHandlers["unlockSelectedLayers"],
            );
            return true;
          case "showSelectedLayers":
            await this.toolCall(
              "showSelectedLayers",
              {},
              this.registeredFunctionHandlers["showSelectedLayers"],
            );
            return true;
          case "hideSelectedLayers":
            await this.toolCall(
              "hideSelectedLayers",
              {},
              this.registeredFunctionHandlers["hideSelectedLayers"],
            );
            return true;
          case "renameActiveLayer":
            await this.toolCall("renameActiveLayer", functionCall.args, () => {
              if (!functionCall.args?.newName) {
                throw new Error("newName parameter is required.");
              }
              this.registeredFunctionHandlers["renameActiveLayer"](
                functionCall.args.newName,
              );
            });
            return true;
          case "setActiveLayerOpacity":
            await this.toolCall(
              "setActiveLayerOpacity",
              functionCall.args,
              () => {
                if (typeof functionCall.args?.newOpacity !== "number") {
                  throw new Error("newOpacity parameter is required.");
                }
                this.registeredFunctionHandlers["setActiveLayerOpacity"](
                  functionCall.args.newOpacity,
                );
              },
            );
            return true;
          case "openOpacitySliderPopup":
            await this.toolCall(
              "openOpacitySliderPopup",
              {},
              this.registeredFunctionHandlers["openOpacitySliderPopup"],
            );
            return true;
          case "zoomIn":
            await this.toolCall(
              "zoomIn",
              {},
              this.registeredFunctionHandlers["zoomIn"],
            );
            return true;
          case "zoomOut":
            await this.toolCall(
              "zoomOut",
              {},
              this.registeredFunctionHandlers["zoomOut"],
            );
            return true;
          case "setZoom":
            await this.toolCall("setZoom", functionCall.args, () => {
              if (typeof functionCall.args?.scale !== "number") {
                throw new Error("scale parameter is required.");
              }
              this.registeredFunctionHandlers["setZoom"](
                functionCall.args.scale,
              );
            });
            return true;
          case "setColorSettings":
            await this.toolCall("setColorSettings", functionCall.args, () => {
              this.registeredFunctionHandlers["setColorSettings"](
                functionCall.args?.foregroundColor,
                functionCall.args?.backgroundColor,
              );
            });
            return true;
          case "openColorPickerPopup":
            await this.toolCall(
              "openColorPickerPopup",
              {},
              this.registeredFunctionHandlers["openColorPickerPopup"],
            );
            return true;
          case "selectSelectTool":
            await this.toolCall(
              "selectSelectTool",
              {},
              this.registeredFunctionHandlers["selectSelectTool"],
            );
            return true;
          case "selectMoveTool":
            await this.toolCall(
              "selectMoveTool",
              {},
              this.registeredFunctionHandlers["selectMoveTool"],
            );
            return true;
          case "moveSelectedLayers":
            await this.toolCall("moveSelectedLayers", functionCall.args, () => {
              if (typeof functionCall.args?.deltaX !== "number") {
                throw new Error("deltaX parameter is required.");
              }
              if (typeof functionCall.args?.deltaY !== "number") {
                throw new Error("deltaY parameter is required.");
              }
              this.registeredFunctionHandlers["moveSelectedLayers"](
                functionCall.args.deltaX,
                functionCall.args.deltaY,
              );
            });
            return true;
          case "selectTransformTool":
            await this.toolCall(
              "selectTransformTool",
              {},
              this.registeredFunctionHandlers["selectTransformTool"],
            );
            return true;
          case "transformActiveLayer":
            await this.toolCall("transformActiveLayer", functionCall.args, () =>
              this.registeredFunctionHandlers["transformActiveLayer"](
                functionCall.args,
              ),
            );
            return true;
          case "resizeActiveLayer":
            await this.toolCall("resizeActiveLayer", functionCall.args, () =>
              this.registeredFunctionHandlers["resizeActiveLayer"](
                functionCall.args,
              ),
            );
            return true;
          case "selectCropTool":
            await this.toolCall(
              "selectCropTool",
              {},
              this.registeredFunctionHandlers["selectCropTool"],
            );
            return true;
          case "selectRectangleMaskSelectionTool":
            await this.toolCall(
              "selectRectangleMaskSelectionTool",
              {},
              this.registeredFunctionHandlers[
              "selectRectangleMaskSelectionTool"
              ],
            );
            return true;
          case "selectOvalMaskSelectionTool":
            await this.toolCall(
              "selectOvalMaskSelectionTool",
              {},
              this.registeredFunctionHandlers["selectOvalMaskSelectionTool"],
            );
            return true;
          case "selectLassoMaskSelectionTool":
            await this.toolCall(
              "selectLassoMaskSelectionTool",
              {},
              this.registeredFunctionHandlers["selectLassoMaskSelectionTool"],
            );
            return true;
          case "selectPolygonalMaskSelectionTool":
            await this.toolCall(
              "selectPolygonalMaskSelectionTool",
              {},
              this.registeredFunctionHandlers[
              "selectPolygonalMaskSelectionTool"
              ],
            );
            return true;
          case "selectFuzzyMaskSelectionTool":
            await this.toolCall(
              "selectFuzzyMaskSelectionTool",
              {},
              this.registeredFunctionHandlers["selectFuzzyMaskSelectionTool"],
            );
            return true;
          case "updateFuzzyMaskSelectionToolSettings":
            await this.toolCall(
              "updateFuzzyMaskSelectionToolSettings",
              functionCall.args,
              () =>
                this.registeredFunctionHandlers[
                  "updateFuzzyMaskSelectionToolSettings"
                ](functionCall.args || {}),
            );
            return true;
          case "clearSelectionMask":
            await this.toolCall(
              "clearSelectionMask",
              {},
              this.registeredFunctionHandlers["clearSelectionMask"],
            );
            return true;
          case "invertSelectionMask":
            await this.toolCall(
              "invertSelectionMask",
              {},
              this.registeredFunctionHandlers["invertSelectionMask"],
            );
            return true;
          case "featherSelectionMask":
            await this.toolCall(
              "featherSelectionMask",
              functionCall.args,
              () => {
                if (typeof functionCall.args?.radius !== "number") {
                  throw new Error("radius parameter is required.");
                }
                this.registeredFunctionHandlers["featherSelectionMask"](
                  functionCall.args.radius,
                );
              },
            );
            return true;
          case "growShrinkSelectionMask":
            await this.toolCall(
              "growShrinkSelectionMask",
              functionCall.args,
              () => {
                if (typeof functionCall.args?.radius !== "number") {
                  throw new Error("radius parameter is required.");
                }
                this.registeredFunctionHandlers["growShrinkSelectionMask"](
                  functionCall.args.radius,
                );
              },
            );
            return true;
          case "alphaToMask":
            await this.toolCall("alphaToMask", functionCall.args, () => {
              this.registeredFunctionHandlers["alphaToMask"](
                functionCall.args?.mode,
              );
            });
            return true;
          case "deleteMaskedArea":
            await this.toolCall(
              "deleteMaskedArea",
              {},
              this.registeredFunctionHandlers["deleteMaskedArea"],
            );
            return true;
          case "cropActiveLayer":
            await this.toolCall("cropActiveLayer", functionCall.args, () =>
              this.registeredFunctionHandlers["cropActiveLayer"](
                functionCall.args,
              ),
            );
            return true;
          case "selectPaintTool":
            await this.toolCall(
              "selectPaintTool",
              {},
              this.registeredFunctionHandlers["selectPaintTool"],
            );
            return true;
          case "updatePaintToolSettings":
            await this.toolCall(
              "updatePaintToolSettings",
              functionCall.args,
              () =>
                this.registeredFunctionHandlers["updatePaintToolSettings"](
                  functionCall.args || {},
                ),
            );
            return true;
          case "selectResizeCanvasTool":
            await this.toolCall(
              "selectResizeCanvasTool",
              {},
              this.registeredFunctionHandlers["selectResizeCanvasTool"],
            );
            return true;
          case "resizeCanvas":
            await this.toolCall("resizeCanvas", functionCall.args, () =>
              this.registeredFunctionHandlers["resizeCanvas"](
                functionCall.args?.newWidth,
                functionCall.args?.newHeight,
                functionCall.args?.deltaX,
                functionCall.args?.deltaY,
              ),
            );
            return true;
          case "selectTextEditTool":
            await this.toolCall(
              "selectTextEditTool",
              {},
              this.registeredFunctionHandlers["selectTextEditTool"],
            );
            return true;
          case "updateActiveLayerBasicText":
            await this.toolCall(
              "updateActiveLayerBasicText",
              functionCall.args,
              () =>
                this.registeredFunctionHandlers["updateActiveLayerBasicText"](
                  functionCall.args,
                ),
            );
            return true;
          case "rasterizeActiveTextLayer":
            await this.toolCall(
              "rasterizeActiveTextLayer",
              {},
              this.registeredFunctionHandlers["rasterizeActiveTextLayer"],
            );
            return true;
          case "rasterizeActiveLayer":
            await this.toolCall(
              "rasterizeActiveLayer",
              {},
              this.registeredFunctionHandlers["rasterizeActiveLayer"],
            );
            return true;
          case "updateActiveLayerShadow":
            await this.toolCall(
              "updateActiveLayerShadow",
              functionCall.args,
              () =>
                this.registeredFunctionHandlers["updateActiveLayerShadow"](
                  functionCall.args,
                ),
            );
            return true;
          case "deleteActiveLayerShadow":
            await this.toolCall("deleteActiveLayerShadow", {}, () =>
              this.registeredFunctionHandlers["deleteActiveLayerShadow"](),
            );
            return true;
          default:
            console.warn(`Unknown function call: ${functionCall.name}`);
            this.appendMessage({
              role: "functionCall",
              parts: [
                {
                  functionCall: {
                    name: functionCall.name,
                    args: functionCall.args || {},
                  },
                },
              ],
            });
            this.appendMessage({
              role: "functionResponse",
              parts: [
                {
                  functionResponse: {
                    name: functionCall.name,
                    response: {
                      success: false,
                      error: `Unknown function: ${functionCall.name}`,
                    },
                  },
                },
              ],
            });
            return true;
        }
      }
    }
    return false;
  }

  private async toolCall(
    functionName: string,
    functionArgs: any,
    functionCall: () => Promise<any> | any,
  ): Promise<void> {
    this.appendMessage({
      role: "functionCall",
      parts: [
        {
          functionCall: {
            name: functionName,
            args: functionArgs,
          },
        },
      ],
    });
    let response: any;
    try {
      response = await functionCall();
    } catch (error) {
      this.appendMessage({
        role: "functionResponse",
        parts: [
          {
            functionResponse: {
              name: functionName,
              response: {
                success: false,
                error: error instanceof Error ? error.message : String(error),
              },
            },
          },
        ],
      });
      return;
    }
    this.appendMessage({
      role: "functionResponse",
      parts: [
        {
          functionResponse: {
            name: functionName,
            response: {
              success: true,
              ...response,
            },
          },
        },
      ],
    });
  }

  private extractAssistantText(payload: any): string | undefined {
    if (!payload) {
      return undefined;
    }
    let candidates = payload.candidates;
    if (!Array.isArray(candidates)) {
      return undefined;
    }
    for (let candidate of candidates) {
      let content = candidate?.content;
      if (!content) {
        continue;
      }
      let parts = content.parts;
      if (!Array.isArray(parts)) {
        continue;
      }
      let textParts = parts
        .map((part: any) => part?.text)
        .filter((value: any): value is string => typeof value === "string");
      if (textParts.length > 0) {
        return textParts.join("\n");
      }
    }
    return undefined;
  }

  public remove(): void {
    this.element.remove();
    this.document.removeEventListener("keydown", this.globalKeyDownFocus);
    this.document.removeEventListener("keydown", this.globalKeyDownShortcuts);
    this.removeAllListeners();
  }
}
