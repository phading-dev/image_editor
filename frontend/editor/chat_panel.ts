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
    | "modelResponse"
    | "functionCall"
    | "functionResponse";
  parts: any[];
}

export interface ChatPanel {
  on(event: "messageSent", listener: () => void): this;
}

export class ChatPanel extends EventEmitter {
  public static create(): ChatPanel {
    return new ChatPanel(SERVICE_CLIENT, ENV_VARS.geminiModel, document);
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
          placeholder: "Type a prompt…",
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
    // Handle backspace/delete/enter
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
  };

  private adjustInputHeight(): void {
    this.input.style.height = "auto";
    // Minimum height: 1.4 line-height + 1.25rem padding + 0.125rem border
    this.input.style.height = `${Math.max(this.input.scrollHeight / 16, FONT_M * 1.4 + 1.25 + 0.125)}rem`;
  }

  public appendMessage(message: ChatMessage): void {
    if (CHAT_CONTEXT_ROLES.includes(message.role)) {
      let role: string = message.role;
      if (role === "assistant") {
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

  public async initialGreet(): Promise<void> {
    this.appendMessage({
      role: "assistant",
      parts: [{ text: "Hi, can you introduce yourself?" }],
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

  public setRenameProjectHandler(handler: (name: string) => void): this {
    this.registeredFunctionHandlers["renameProject"] = handler;
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

  public setDeleteActiveLayerHandler(handler: () => void): this {
    this.registeredFunctionHandlers["deleteActiveLayer"] = handler;
    return this;
  }

  public setLockSelectedLayersHandler(handler: () => void): this {
    this.registeredFunctionHandlers["lockSelectedLayers"] = handler;
    return this;
  }

  public setUnlockSelectedLayersHandler(handler: () => void): this {
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

  public setSelectMoveToolHandler(handler: () => void): this {
    this.registeredFunctionHandlers["selectMoveTool"] = handler;
    return this;
  }

  public setSelectPaintToolHandler(handler: () => void): this {
    this.registeredFunctionHandlers["selectPaintTool"] = handler;
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
                  "The application has layers (like Photoshop), and users can work on an active layer and manage layers.",
                  "When users ask to perform actions, use the available functions to execute them.",
                  "Be concise and friendly in your responses.",
                  "Shortcuts are available for undo (Ctrl+Z), redo (Ctrl+Y or Ctrl+Shift+Z), and save (Ctrl+S).",
                ].join(" "),
              },
            ],
          }),
          toolsJson: JSON.stringify([
            {
              functionDeclarations: [
                {
                  name: "loadProject",
                  description:
                    "Launch a file picker to open a project from a zip file. A file may or may not be selected depending on the user.",
                },
                {
                  name: "saveProject",
                  description:
                    "Save the current project to a zip file. A file picker may or may not appear depending on the browser.",
                },
                {
                  name: "renameProject",
                  description: "Rename the current project",
                  parameters: {
                    type: "object",
                    properties: {
                      name: {
                        type: "string",
                        description: "The new name for the project",
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
                  description: "Undo the last action",
                },
                {
                  name: "redo",
                  description: "Redo the last undone action",
                },
                {
                  name: "addNewLayer",
                  description: "Add a new layer to the project",
                },
                {
                  name: "deleteActiveLayer",
                  description: "Delete the currently active layer",
                },
                {
                  name: "lockSelectedLayers",
                  description: "Lock the currently selected layers",
                },
                {
                  name: "unlockSelectedLayers",
                  description: "Unlock the currently selected layers",
                },
                {
                  name: "showSelectedLayers",
                  description: "Make the currently selected layers visible",
                },
                {
                  name: "hideSelectedLayers",
                  description: "Make the currently selected layers invisible",
                },
                {
                  name: "renameActiveLayer",
                  description: "Rename the currently active layer",
                  parameters: {
                    type: "object",
                    properties: {
                      newName: {
                        type: "string",
                        description: "The new name for the active layer",
                      },
                    },
                    required: ["newName"],
                  },
                },
                {
                  name: "selectMoveTool",
                  description:
                    "Switch to the move tool to reposition the images of all selected layers",
                },
                {
                  name: "selectPaintTool",
                  description:
                    "Switch to the paint/brush tool for drawing on the active layer",
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
          case "loadProject":
            this.registeredFunctionHandlers["loadProject"]();
            this.appendMessage({
              role: "functionCall",
              parts: [
                {
                  functionCall: {
                    name: "loadProject",
                    args: {},
                  },
                },
              ],
            });
            this.appendMessage({
              role: "functionResponse",
              parts: [
                {
                  functionResponse: {
                    name: "loadProject",
                    response: {
                      success: true,
                    },
                  },
                },
              ],
            });
            return true;
          case "saveProject":
            await this.registeredFunctionHandlers["saveProject"]();
            this.appendMessage({
              role: "functionCall",
              parts: [
                {
                  functionCall: {
                    name: "saveProject",
                    args: {},
                  },
                },
              ],
            });
            this.appendMessage({
              role: "functionResponse",
              parts: [
                {
                  functionResponse: {
                    name: "saveProject",
                    response: {
                      success: true,
                    },
                  },
                },
              ],
            });
            return true;
          case "renameProject":
            let name = functionCall.args?.name;
            this.appendMessage({
              role: "functionCall",
              parts: [
                {
                  functionCall: {
                    name: "renameProject",
                    args: { name: name },
                  },
                },
              ],
            });
            if (name) {
              this.registeredFunctionHandlers["renameProject"](name);
              this.appendMessage({
                role: "functionResponse",
                parts: [
                  {
                    functionResponse: {
                      name: "renameProject",
                      response: {
                        success: true,
                      },
                    },
                  },
                ],
              });
            } else {
              this.appendMessage({
                role: "functionResponse",
                parts: [
                  {
                    functionResponse: {
                      name: "renameProject",
                      response: {
                        success: false,
                        error: "Failed to rename: name parameter is required.",
                      },
                    },
                  },
                ],
              });
            }
            return true;
          case "exportImage":
            let filename = functionCall.args?.filename ?? "export.png";
            let imageType = functionCall.args?.imageType ?? "png";
            this.appendMessage({
              role: "functionCall",
              parts: [
                {
                  functionCall: {
                    name: "exportImage",
                    args: { filename: filename, imageType: imageType },
                  },
                },
              ],
            });
            await this.registeredFunctionHandlers["exportImage"](
              filename,
              imageType,
            );
            this.appendMessage({
              role: "functionResponse",
              parts: [
                {
                  functionResponse: {
                    name: "exportImage",
                    response: {
                      success: true,
                    },
                  },
                },
              ],
            });
            return true;
          case "undo":
            this.registeredFunctionHandlers["undo"]();
            this.appendMessage({
              role: "functionCall",
              parts: [
                {
                  functionCall: {
                    name: "undo",
                    args: {},
                  },
                },
              ],
            });
            this.appendMessage({
              role: "functionResponse",
              parts: [
                {
                  functionResponse: {
                    name: "undo",
                    response: {
                      success: true,
                    },
                  },
                },
              ],
            });
            return true;
          case "redo":
            this.registeredFunctionHandlers["redo"]();
            this.appendMessage({
              role: "functionCall",
              parts: [
                {
                  functionCall: {
                    name: "redo",
                    args: {},
                  },
                },
              ],
            });
            this.appendMessage({
              role: "functionResponse",
              parts: [
                {
                  functionResponse: {
                    name: "redo",
                    response: {
                      success: true,
                    },
                  },
                },
              ],
            });
            return true;
          case "addNewLayer":
            this.registeredFunctionHandlers["addNewLayer"]();
            this.appendMessage({
              role: "functionCall",
              parts: [
                {
                  functionCall: {
                    name: "addNewLayer",
                    args: {},
                  },
                },
              ],
            });
            this.appendMessage({
              role: "functionResponse",
              parts: [
                {
                  functionResponse: {
                    name: "addNewLayer",
                    response: {
                      success: true,
                    },
                  },
                },
              ],
            });
            return true;
          case "deleteActiveLayer":
            this.registeredFunctionHandlers["deleteActiveLayer"]();
            this.appendMessage({
              role: "functionCall",
              parts: [
                {
                  functionCall: {
                    name: "deleteActiveLayer",
                    args: {},
                  },
                },
              ],
            });
            this.appendMessage({
              role: "functionResponse",
              parts: [
                {
                  functionResponse: {
                    name: "deleteActiveLayer",
                    response: {
                      success: true,
                    },
                  },
                },
              ],
            });
            return true;
          case "lockSelectedLayers":
            this.registeredFunctionHandlers["lockSelectedLayers"]();
            this.appendMessage({
              role: "functionCall",
              parts: [
                {
                  functionCall: {
                    name: "lockSelectedLayers",
                    args: {},
                  },
                },
              ],
            });
            this.appendMessage({
              role: "functionResponse",
              parts: [
                {
                  functionResponse: {
                    name: "lockSelectedLayers",
                    response: {
                      success: true,
                    },
                  },
                },
              ],
            });
            return true;
          case "unlockSelectedLayers":
            this.registeredFunctionHandlers["unlockSelectedLayers"]();
            this.appendMessage({
              role: "functionCall",
              parts: [
                {
                  functionCall: {
                    name: "unlockSelectedLayers",
                    args: {},
                  },
                },
              ],
            });
            this.appendMessage({
              role: "functionResponse",
              parts: [
                {
                  functionResponse: {
                    name: "unlockSelectedLayers",
                    response: {
                      success: true,
                    },
                  },
                },
              ],
            });
            return true;
          case "showSelectedLayers":
            this.registeredFunctionHandlers["showSelectedLayers"]();
            this.appendMessage({
              role: "functionCall",
              parts: [
                {
                  functionCall: {
                    name: "showSelectedLayers",
                    args: {},
                  },
                },
              ],
            });
            this.appendMessage({
              role: "functionResponse",
              parts: [
                {
                  functionResponse: {
                    name: "showSelectedLayers",
                    response: {
                      success: true,
                    },
                  },
                },
              ],
            });
            return true;
          case "hideSelectedLayers":
            this.registeredFunctionHandlers["hideSelectedLayers"]();
            this.appendMessage({
              role: "functionCall",
              parts: [
                {
                  functionCall: {
                    name: "hideSelectedLayers",
                    args: {},
                  },
                },
              ],
            });
            this.appendMessage({
              role: "functionResponse",
              parts: [
                {
                  functionResponse: {
                    name: "hideSelectedLayers",
                    response: {
                      success: true,
                    },
                  },
                },
              ],
            });
            return true;
          case "renameActiveLayer":
            let newName = functionCall.args?.newName;
            this.appendMessage({
              role: "functionCall",
              parts: [
                {
                  functionCall: {
                    name: "renameActiveLayer",
                    args: { newName: newName },
                  },
                },
              ],
            });
            if (newName) {
              this.registeredFunctionHandlers["renameActiveLayer"](newName);
              this.appendMessage({
                role: "functionResponse",
                parts: [
                  {
                    functionResponse: {
                      name: "renameActiveLayer",
                      response: {
                        success: true,
                      },
                    },
                  },
                ],
              });
            } else {
              this.appendMessage({
                role: "functionResponse",
                parts: [
                  {
                    functionResponse: {
                      name: "renameActiveLayer",
                      response: {
                        success: false,
                        error:
                          "Failed to rename active layer: newName parameter is required.",
                      },
                    },
                  },
                ],
              });
            }
            return true;
          case "selectMoveTool":
            this.registeredFunctionHandlers["selectMoveTool"]();
            this.appendMessage({
              role: "functionCall",
              parts: [
                {
                  functionCall: {
                    name: "selectMoveTool",
                    args: {},
                  },
                },
              ],
            });
            this.appendMessage({
              role: "functionResponse",
              parts: [
                {
                  functionResponse: {
                    name: "selectMoveTool",
                    response: {
                      success: true,
                    },
                  },
                },
              ],
            });
            return true;
          case "selectPaintTool":
            this.registeredFunctionHandlers["selectPaintTool"]();
            this.appendMessage({
              role: "functionCall",
              parts: [
                {
                  functionCall: {
                    name: "selectPaintTool",
                    args: {},
                  },
                },
              ],
            });
            this.appendMessage({
              role: "functionResponse",
              parts: [
                {
                  functionResponse: {
                    name: "selectPaintTool",
                    response: {
                      success: true,
                    },
                  },
                },
              ],
            });
            return true;
          default:
            this.appendMessage({
              role: "error",
              parts: [
                {
                  text: `[Error: Unknown function call: ${functionCall.name}]`,
                },
              ],
            });
            return true;
        }
      }
    }
    return false;
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
