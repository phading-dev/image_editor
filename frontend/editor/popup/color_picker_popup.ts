import EventEmitter = require("events");
import { COLOR_THEME } from "../../color_theme";
import { FONT_M } from "../../sizes";
import { createCloseButton, Popup } from "./popup";
import { E } from "@selfage/element/factory";
import { Ref } from "@selfage/ref";

export interface ColorPickerPopup {
  on(event: "change", listener: (color: string) => void): this;
  on(event: "remove", listener: () => void): this;
}

export class ColorPickerPopup extends EventEmitter {
  public static create(initialColor: string): ColorPickerPopup {
    return new ColorPickerPopup(initialColor);
  }

  private popup: Popup;
  public get element(): HTMLElement {
    return this.popup.element;
  }
  private colorInput: HTMLInputElement;
  private closeButton: HTMLButtonElement;

  public constructor(initialColor: string) {
    super();
    let colorInputRef = new Ref<HTMLInputElement>();
    let closeButtonRef = new Ref<HTMLButtonElement>();

    this.popup = new Popup(
      "width: 8rem",
      E.div(
        {
          style: [
            "width: 100%",
            "display: flex",
            "align-items: center",
            "justify-content: space-between",
            "user-select: none",
          ].join("; "),
        },
        E.div(
          {
            style: [
              `color: ${COLOR_THEME.neutral0}`,
              `font-size: ${FONT_M}rem`,
              "font-weight: 500",
            ].join("; "),
          },
          E.text("Color picker"),
        ),
        createCloseButton(closeButtonRef),
      ),
      E.input({
        ref: colorInputRef,
        type: "color",
        value: initialColor,
        style: [
          "height: 2rem",
          "width: 8rem",
          "border: none",
          "cursor: pointer",
        ].join("; "),
      }),
    );
    this.colorInput = colorInputRef.val;
    this.closeButton = closeButtonRef.val;

    // Mark elements that shouldn't trigger dragging
    this.popup.addNonDraggableElement(this.colorInput);
    this.popup.addNonDraggableElement(this.closeButton);

    this.colorInput.addEventListener("change", () => {
      this.emit("change", this.colorInput.value);
    });
    this.closeButton.addEventListener("click", () => {
      this.remove();
    });
  }

  public remove(): void {
    this.emit("remove");
    this.popup.remove();
    this.removeAllListeners();
  }
}
