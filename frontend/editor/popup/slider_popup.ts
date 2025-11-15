import EventEmitter = require("events");
import { COLOR_THEME } from "../../color_theme";
import { FONT_M } from "../../sizes";
import { E } from "@selfage/element/factory";
import { Ref } from "@selfage/ref";

export interface SliderPopup {
  on(event: "change", listener: (value: number) => void): this;
  on(
    event: "commit",
    listener: (oldValue: number, newValue: number) => void,
  ): this;
}

export class SliderPopup extends EventEmitter {
  public static create(
    title: string,
    initialValue: number,
    min: number,
    max: number,
    unit: string = "",
  ): SliderPopup {
    return new SliderPopup(document, title, initialValue, min, max, unit);
  }

  public readonly element: HTMLElement;
  private readonly slider: HTMLInputElement;
  private readonly valueDisplay: HTMLSpanElement;
  private readonly initialValue: number;
  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  public constructor(
    private document: Document,
    private title: string,
    private value: number,
    private min: number,
    private max: number,
    private unit: string,
  ) {
    super();
    this.initialValue = value;
    let sliderRef = new Ref<HTMLInputElement>();
    let valueDisplayRef = new Ref<HTMLSpanElement>();

    this.element = E.div(
      {
        style: [
          "position: fixed",
          "top: 50%",
          "left: 50%",
          "transform: translate(-50%, -50%)",
          `background-color: ${COLOR_THEME.neutral4}`,
          "border-radius: 0.5rem",
          `border: 1px solid ${COLOR_THEME.neutral3}`,
          "box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3)",
          "padding: 1.5rem",
          "min-width: 20rem",
          "z-index: 1000",
          "cursor: move",
        ].join("; "),
      },
      E.div(
        {
          style: [
            "display: flex",
            "align-items: center",
            "justify-content: space-between",
            "margin-bottom: 1rem",
            "user-select: none",
          ].join("; "),
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

    this.updateValueDisplay();

    // Setup drag handlers on the entire element
    this.element.addEventListener("pointerdown", this.handlePointerDown);
    this.element.addEventListener("pointermove", this.handlePointerMove);
    this.element.addEventListener("pointerup", this.handlePointerUp);
    this.element.addEventListener("pointercancel", this.handlePointerCancel);

    // Setup close handlers. This assumes that any other operations will close the popup first.
    this.document.addEventListener("keydown", this.handleGlobalKeyDown);
    this.document.addEventListener("pointerdown", this.handleGlobalPointerDown);

    // Prevent keyboard shortcuts from leaking through the slider
    this.slider.addEventListener("keydown", (e) => {
      // Allow Escape to close the popup
      if (e.key === "Escape") {
        return;
      }
      // Block other shortcuts (Ctrl+Z, etc.) from reaching ChatPanel
      e.stopPropagation();
      // Also prevent browser default behavior (like undo/redo on text inputs)
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    });

    // Live preview on input
    this.slider.addEventListener("input", () => {
      this.value = parseInt(this.slider.value, 10);
      this.updateValueDisplay();
      this.emit("change", this.value);
    });

    // Commit on change (when user releases the slider)
    this.slider.addEventListener("change", () => {
      const newValue = parseInt(this.slider.value, 10);
      this.emit("commit", this.initialValue, newValue);
    });
  }

  private handlePointerDown = (e: PointerEvent): void => {
    // Don't start dragging if the user is interacting with the slider
    if (e.target === this.slider) {
      return;
    }

    this.isDragging = true;

    // Calculate offset from pointer to element's current position
    const rect = this.element.getBoundingClientRect();
    this.dragOffsetX = e.clientX - rect.left;
    this.dragOffsetY = e.clientY - rect.top;

    // Remove the transform and set absolute positioning at the same time
    this.element.style.left = `${rect.left}px`;
    this.element.style.top = `${rect.top}px`;
    this.element.style.transform = "none";

    this.element.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.isDragging) return;

    const newX = e.clientX - this.dragOffsetX;
    const newY = e.clientY - this.dragOffsetY;

    this.element.style.left = `${newX}px`;
    this.element.style.top = `${newY}px`;

    e.preventDefault();
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (!this.isDragging) return;

    this.isDragging = false;
    if (this.element.hasPointerCapture(e.pointerId)) {
      this.element.releasePointerCapture(e.pointerId);
    }
  };

  private handlePointerCancel = (e: PointerEvent): void => {
    if (!this.isDragging) return;

    this.isDragging = false;
    if (this.element.hasPointerCapture(e.pointerId)) {
      this.element.releasePointerCapture(e.pointerId);
    }
  };

  private handleGlobalKeyDown = (e: KeyboardEvent): void => {
    // Close on ESC from anywhere, or any key press when focus is outside the slider
    this.remove();
  };

  private handleGlobalPointerDown = (e: PointerEvent): void => {
    // Close if click is outside the popup
    if (!this.element.contains(e.target as Node)) {
      this.remove();
    }
  };

  private updateValueDisplay(): void {
    this.valueDisplay.textContent = `${Math.round(this.value)}${this.unit}`;
  }

  public remove(): void {
    this.document.removeEventListener("keydown", this.handleGlobalKeyDown);
    this.document.removeEventListener(
      "pointerdown",
      this.handleGlobalPointerDown,
    );
    this.element.remove();
    this.removeAllListeners();
  }
}
