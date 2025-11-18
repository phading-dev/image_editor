import { COLOR_THEME } from "../../color_theme";
import { E } from "@selfage/element/factory";
import { Ref } from "@selfage/ref";

export function createCloseButton(
  ref?: Ref<HTMLButtonElement>,
  customStyle: string = "",
): HTMLButtonElement {
  return E.button(
    {
      ref: ref,
      style: [
        "background: none",
        "border: none",
        `color: ${COLOR_THEME.neutral1}`,
        "cursor: pointer",
        "padding: 0.125rem",
        "width: 1.5rem",
        "height: 1.5rem",
        customStyle,
      ].join("; "),
    },
    E.svg(
      {
        viewBox: "0 0 24 24",
        style: [
          "fill: none",
          "stroke: currentColor",
          "stroke-width: 2",
          "stroke-linecap: round",
          "width: 100%",
          "height: 100%",
        ].join("; "),
      },
      E.line({ x1: "18", y1: "6", x2: "6", y2: "18" }),
      E.line({ x1: "6", y1: "6", x2: "18", y2: "18" }),
    ),
  );
}

export class Popup {
  public element: HTMLElement;
  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private nonDraggableElements = new Set<HTMLElement>();

  public constructor(customStyle: string, ...children: Array<HTMLElement>) {
    this.element = E.div(
      {
        style: [
          "position: fixed",
          "top: 50%",
          "left: 50%",
          "transform: translate(-50%, -50%)",
          "z-index: 1",
          `background: ${COLOR_THEME.neutral4}`,
          "border-radius: 0.5rem",
          `border: 1px solid ${COLOR_THEME.neutral3}`,
          "box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3)",
          "padding: 1.5rem",
          "cursor: move",
          "display: flex",
          "flex-direction: column",
          "gap: 1rem",
          "align-items: center",
          customStyle,
        ].join("; "),
      },
      ...children,
    );

    this.element.addEventListener("pointerdown", this.handlePointerDown);
    this.element.addEventListener("pointermove", this.handlePointerMove);
    this.element.addEventListener("pointerup", this.handlePointerUpAndCancel);
    this.element.addEventListener(
      "pointercancel",
      this.handlePointerUpAndCancel,
    );
  }

  private handlePointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) {
      return;
    }

    // Check if the target is within any non-draggable element
    const target = e.target as HTMLElement;
    for (const element of this.nonDraggableElements) {
      if (element.contains(target)) {
        return;
      }
    }

    this.isDragging = true;
    e.preventDefault();
    this.element.setPointerCapture(e.pointerId);

    const rect = this.element.getBoundingClientRect();
    this.dragOffsetX = e.clientX - rect.left;
    this.dragOffsetY = e.clientY - rect.top;

    // Remove the transform and set absolute positioning at the same time
    this.element.style.left = `${rect.left}px`;
    this.element.style.top = `${rect.top}px`;
    this.element.style.transform = "none";
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.isDragging) {
      return;
    }
    e.preventDefault();

    const x = e.clientX - this.dragOffsetX;
    const y = e.clientY - this.dragOffsetY;

    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
  };

  private handlePointerUpAndCancel = (e: PointerEvent): void => {
    if (!this.isDragging) {
      return;
    }

    this.isDragging = false;
    if (this.element.hasPointerCapture(e.pointerId)) {
      this.element.releasePointerCapture(e.pointerId);
    }
  };

  public addNonDraggableElement(element: HTMLElement): void {
    this.nonDraggableElements.add(element);
  }

  public remove(): void {
    this.element.remove();
  }
}
