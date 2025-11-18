import EventEmitter = require("events");
import { COLOR_THEME } from "../../color_theme";
import { FONT_M } from "../../sizes";
import { Popup, createCloseButton } from "./popup";
import { E } from "@selfage/element/factory";
import { Ref } from "@selfage/ref";

export interface SliderPopup {
  on(event: "change", listener: (value: number) => void): this;
  on(event: "remove", listener: () => void): this;
}

export class SliderPopup extends EventEmitter {
  public static create(
    title: string,
    initialValue: number,
    min: number,
    max: number,
    unit: string = "",
  ): SliderPopup {
    return new SliderPopup(title, initialValue, min, max, unit);
  }

  private popup: Popup;
  public get element(): HTMLElement {
    return this.popup.element;
  }
  private readonly slider: HTMLInputElement;
  private readonly valueDisplay: HTMLSpanElement;

  public constructor(
    private title: string,
    private value: number,
    private min: number,
    private max: number,
    private unit: string,
  ) {
    super();
    let sliderRef = new Ref<HTMLInputElement>();
    let valueDisplayRef = new Ref<HTMLSpanElement>();
    let closeButtonRef = new Ref<HTMLButtonElement>();

    this.popup = new Popup(
      "width: 20rem",
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
            style: ["display: flex", "align-items: center", "gap: 1rem"].join(
              "; ",
            ),
          },
          E.span(
            {
              style: [
                `color: ${COLOR_THEME.neutral0}`,
                `font-size: ${FONT_M}rem`,
                "font-weight: 500",
              ].join("; "),
            },
            E.text(this.title),
          ),
          E.span({
            ref: valueDisplayRef,
            style: [
              `color: ${COLOR_THEME.neutral1}`,
              `font-size: ${FONT_M}rem`,
              "font-weight: 600",
            ].join("; "),
          }),
        ),
        createCloseButton(closeButtonRef),
      ),
      E.input({
        ref: sliderRef,
        type: "range",
        min: String(this.min),
        max: String(this.max),
        value: String(Math.round(this.value)),
        style: ["width: 100%", "cursor: pointer"].join("; "),
      }),
    );

    if (!sliderRef.val || !valueDisplayRef.val) {
      throw new Error("SliderPopup failed to initialize DOM refs.");
    }
    this.slider = sliderRef.val;
    this.valueDisplay = valueDisplayRef.val;
    const closeButton = closeButtonRef.val;

    // Register the slider and close button as non-draggable
    this.popup.addNonDraggableElement(this.slider);
    this.popup.addNonDraggableElement(closeButton);

    // Close button handler
    closeButton.addEventListener("click", () => {
      this.remove();
    });

    // Live preview on input
    this.slider.addEventListener("input", () => {
      this.value = parseInt(this.slider.value, 10);
      this.updateValueDisplay();
    });
    this.slider.addEventListener("change", () => {
      const newValue = parseInt(this.slider.value, 10);
      this.updateValueDisplay();
      this.emit("change", newValue);
    });
    this.updateValueDisplay();
  }

  private updateValueDisplay(): void {
    this.valueDisplay.textContent = `${Math.round(this.value)}${this.unit}`;
  }

  public remove(): void {
    this.emit("remove");
    this.element.remove();
    this.removeAllListeners();
  }
}
