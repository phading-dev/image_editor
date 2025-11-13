import EventEmitter = require("events");
import { ENV_VARS } from "../../env_vars";
import { newGenerateContentRequest } from "../../service_interface/client";
import { COLOR_THEME } from "../color_theme";
import { SERVICE_CLIENT } from "../service_client";
import { FONT_M } from "../sizes";
import { E } from "@selfage/element/factory";
import { Ref } from "@selfage/ref";
import { WebServiceClient } from "@selfage/web_service_client/client";

interface ChatMessage {
  role: "user" | "assistant" | "error";
  text: string;
}

export interface ChatPanel {
  on(event: "messageSent", listener: () => void): this;
}

export class ChatPanel extends EventEmitter {
  public static create(): ChatPanel {
    return new ChatPanel(SERVICE_CLIENT, ENV_VARS.geminiModel);
  }

  public readonly element: HTMLElement;
  public readonly historyContainer: HTMLDivElement;
  public readonly input: HTMLTextAreaElement;
  public readonly sendButton: HTMLButtonElement;
  private sending = false;
  private readonly messages: Array<ChatMessage> = [];
  private readonly registeredFunctionHandlers: {
    [functionName: string]: (...args: any) => any;
  } = {};

  public constructor(
    private serviceClient: WebServiceClient,
    private model: string,
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
            "display:flex",
            "gap:0.5rem",
            "align-items:flex-end",
            "flex-wrap:wrap",
          ].join(";"),
        },
        E.textarea({
          ref: inputRef,
          class: "chat-panel__input",
          rows: "1",
          placeholder: "Type a prompt…",
          style: [
            "flex:1 0 0",
            "min-width:0",
            `background-color:transparent`,
            `color:${COLOR_THEME.neutral0}`,
            `border:0.0625rem solid ${COLOR_THEME.neutral2}`,
            "border-radius:0.625rem",
            "padding:0.625rem",
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
            style: [
              `background-color:${COLOR_THEME.accent1}`,
              `color:${COLOR_THEME.neutral0}`,
              "border:none",
              "border-radius:0.5rem",
              "padding:0.625rem 1rem",
              `font-size:${FONT_M}rem`,
              "font-weight:600",
              "cursor:pointer",
              "transition:opacity 120ms ease",
              "min-width:5.75rem",
              "align-self:flex-start",
              "margin-top:0.25rem",
            ].join(";"),
          },
          E.text("Send"),
        ),
      ),
    );
    if (!historyRef.val || !inputRef.val || !sendButtonRef.val) {
      throw new Error("ChatPanel failed to initialize DOM refs.");
    }
    this.historyContainer = historyRef.val;
    this.input = inputRef.val;
    this.sendButton = sendButtonRef.val;

    this.input.addEventListener("input", () => {
      this.adjustInputHeight();
    });
    this.adjustInputHeight();

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

  private async handleSend(): Promise<void> {
    let content = this.input.value.trim();
    if (!content || this.sending) {
      return;
    }

    this.appendMessage({
      role: "user",
      text: content,
    });
    this.input.value = "";
    this.adjustInputHeight();
    this.setSending(true);

    try {
      let text = await this.generateContent(content);
      this.appendMessage({
        role: "assistant",
        text: text,
      });
    } catch (error) {
      let message = error instanceof Error ? error.message : String(error);
      this.appendMessage({
        role: "error",
        text: `Error: ${message}`,
      });
    } finally {
      this.setSending(false);
      this.emit("messageSent");
    }
  }

  private appendMessage(message: ChatMessage): void {
    this.messages.push(message);
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
      E.text(message.text),
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

  private adjustInputHeight(): void {
    this.input.style.height = "auto";
    // Minimum height: 1.4 line-height + 1.25rem padding + 0.125rem border
    this.input.style.height = `${Math.max(this.input.scrollHeight / 16, FONT_M * 1.4 + 1.25 + 0.125)}rem`;
  }

  public setSaveProjectHandler(handler: () => Promise<void>): void {
    this.registeredFunctionHandlers["saveProject"] = handler;
  }

  public setLoadProjectHandler(handler: () => void): void {
    this.registeredFunctionHandlers["loadProject"] = handler;
  }

  public setRenameProjectHandler(handler: (name: string) => void): void {
    this.registeredFunctionHandlers["renameProject"] = handler;
  }

  public setExportImageHandler(
    handler: (filename: string, imageType: string) => Promise<void>,
  ): void {
    this.registeredFunctionHandlers["exportImage"] = handler;
  }

  public setUndoHandler(handler: () => void): void {
    this.registeredFunctionHandlers["undo"] = handler;
  }

  public setRedoHandler(handler: () => void): void {
    this.registeredFunctionHandlers["redo"] = handler;
  }

  public setAddNewLayerHandler(handler: () => void): void {
    this.registeredFunctionHandlers["addNewLayer"] = handler;
  }

  public setDeleteSelectedLayerHandler(handler: () => void): void {
    this.registeredFunctionHandlers["deleteSelectedLayer"] = handler;
  }

  public setSelectMoveToolHandler(handler: () => void): void {
    this.registeredFunctionHandlers["selectMoveTool"] = handler;
  }

  public setSelectPaintToolHandler(handler: () => void): void {
    this.registeredFunctionHandlers["selectPaintTool"] = handler;
  }

  private async generateContent(content: string): Promise<string> {
    let contents = [
      {
        role: "user",
        parts: [{ text: content }],
      },
    ];
    while (true) {
      let response = await this.serviceClient.send(
        newGenerateContentRequest({
          model: this.model,
          systemInstructionJson: JSON.stringify({
            role: "system",
            parts: [
              {
                text: "You are a helpful assistant for an image editing application. Your role is to help users edit images by interpreting their requests and calling the appropriate functions. The application has layers (like Photoshop), and users can work on an active layer and manage layers. When users ask to perform actions, use the available functions to execute them. Be concise and friendly in your responses.",
              },
            ],
          }),
          toolsJson: JSON.stringify([
            {
              functionDeclarations: [
                {
                  name: "loadProject",
                  description:
                    "Launch a file picker to load or open a project from a zip file. A file may or may not be selected depending on the user.",
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
                          "The name of the exported image file, including extension (e.g., image.png, image.jpg). Default is export.png.",
                      },
                      imageType: {
                        type: "string",
                        description:
                          "The format of the exported image (e.g., png, jpeg, webp). Default is png.",
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
                  name: "deleteSelectedLayer",
                  description: "Delete the currently selected layer",
                },
                {
                  name: "selectMoveTool",
                  description:
                    "Switch to the move tool to reposition the image of the active layer",
                },
                {
                  name: "selectPaintTool",
                  description: "Switch to the paint/brush tool for drawing",
                },
              ],
            },
          ]),
          contentsJson: JSON.stringify(contents),
        }),
      );
      if (!response.responseJson) {
        return "[No response]";
      }
      let parsed = JSON.parse(response.responseJson);

      // Handle function calls
      if (!(await this.handleFunctionCalls(parsed, contents))) {
        // Extract and display text response
        let text = this.extractAssistantText(parsed);
        if (text) {
          return text;
        } else {
          throw new Error("No text response from model.");
        }
      }
    }
  }

  private async handleFunctionCalls(
    payload: any,
    contents: any,
  ): Promise<boolean> {
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
            contents.push(
              {
                role: "model",
                parts: [
                  {
                    functionCall: {
                      name: "loadProject",
                      args: {},
                    },
                  },
                ],
              },
              {
                role: "function",
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
              },
            );
            return true;
          case "saveProject":
            await this.registeredFunctionHandlers["saveProject"]();
            contents.push(
              {
                role: "model",
                parts: [
                  {
                    functionCall: {
                      name: "saveProject",
                      args: {},
                    },
                  },
                ],
              },
              {
                role: "function",
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
              },
            );
            return true;
          case "renameProject":
            let name = functionCall.args?.name;
            contents.push({
              role: "model",
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
              this.registeredFunctionHandlers["renameProject"]({ name });
              contents.push({
                role: "function",
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
              contents.push({
                role: "function",
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
            contents.push({
              role: "model",
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
            contents.push({
              role: "function",
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
            contents.push(
              {
                role: "model",
                parts: [
                  {
                    functionCall: {
                      name: "undo",
                      args: {},
                    },
                  },
                ],
              },
              {
                role: "function",
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
              },
            );
            return true;
          case "redo":
            this.registeredFunctionHandlers["redo"]();
            contents.push(
              {
                role: "model",
                parts: [
                  {
                    functionCall: {
                      name: "redo",
                      args: {},
                    },
                  },
                ],
              },
              {
                role: "function",
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
              },
            );
            return true;
          case "addNewLayer":
            this.registeredFunctionHandlers["addNewLayer"]();
            contents.push(
              {
                role: "model",
                parts: [
                  {
                    functionCall: {
                      name: "addNewLayer",
                      args: {},
                    },
                  },
                ],
              },
              {
                role: "function",
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
              },
            );
            return true;
          case "deleteSelectedLayer":
            this.registeredFunctionHandlers["deleteSelectedLayer"]();
            contents.push(
              {
                role: "model",
                parts: [
                  {
                    functionCall: {
                      name: "deleteSelectedLayer",
                      args: {},
                    },
                  },
                ],
              },
              {
                role: "function",
                parts: [
                  {
                    functionResponse: {
                      name: "deleteSelectedLayer",
                      response: {
                        success: true,
                      },
                    },
                  },
                ],
              },
            );
            return true;
          case "selectMoveTool":
            this.registeredFunctionHandlers["selectMoveTool"]();
            contents.push(
              {
                role: "model",
                parts: [
                  {
                    functionCall: {
                      name: "selectMoveTool",
                      args: {},
                    },
                  },
                ],
              },
              {
                role: "function",
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
              },
            );
            return true;
          case "selectPaintTool":
            this.registeredFunctionHandlers["selectPaintTool"]();
            contents.push(
              {
                role: "model",
                parts: [
                  {
                    functionCall: {
                      name: "selectPaintTool",
                      args: {},
                    },
                  },
                ],
              },
              {
                role: "function",
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
              },
            );
            return true;
          default:
            contents.push({
              role: "model",
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
    this.removeAllListeners();
  }
}
