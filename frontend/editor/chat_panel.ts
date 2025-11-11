import EventEmitter = require("events");
import { ENV_VARS } from "../../env_vars";
import { newGenerateContentRequest } from "../../service_interface/client";
import { GenerateContentResponse } from "../../service_interface/interface";
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
      let response = await this.serviceClient.send(
        newGenerateContentRequest({
          model: this.model,
          contentsJson: JSON.stringify([
            {
              role: "user",
              parts: [{ text: content }],
            },
          ]),
        }),
      );
      this.handleResponse(response);
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

  private handleResponse(response: GenerateContentResponse): void {
    if (!response.responseJson) {
      this.appendMessage({
        role: "assistant",
        text: "[No response]",
      });
      return;
    }
    try {
      let parsed = JSON.parse(response.responseJson);
      let text = this.extractAssistantText(parsed);
      this.appendMessage({
        role: "assistant",
        text: text ?? response.responseJson,
      });
    } catch (error) {
      let message = error instanceof Error ? error.message : String(error);
      this.appendMessage({
        role: "error",
        text: `Failed to parse response: ${message}`,
      });
    }
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

  public remove(): void {
    this.element.remove();
    this.removeAllListeners();
  }
}
