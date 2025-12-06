import { COLOR_THEME } from "../../color_theme";
import { SelectionMode } from "../selection_mask_utils";
import { E } from "@selfage/element/factory";

export class RectangleMaskSelectionTool {
  private isDragging = false;
  private startPoint?: { x: number; y: number };
  private currentRect?: { x: number; y: number; width: number; height: number };
  private overlay: HTMLDivElement;
  private mode: SelectionMode = SelectionMode.REPLACE;

  public constructor(
    private readonly parentContainer: HTMLDivElement,
    private readonly canvasScrollContainer: HTMLDivElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly getScaleFactor: () => number,
    private readonly onCommit: (mask: ImageData, mode: SelectionMode) => void,
    private readonly document: Document = globalThis.document,
  ) {
    this.createOverlay();
    this.canvasScrollContainer.style.cursor = "crosshair";
    this.canvasScrollContainer.addEventListener(
      "pointerdown",
      this.handlePointerDown,
    );
    this.canvasScrollContainer.addEventListener(
      "pointermove",
      this.handlePointerMove,
    );
    this.canvasScrollContainer.addEventListener(
      "pointerup",
      this.handlePointerUpOrCancel,
    );
    this.canvasScrollContainer.addEventListener(
      "pointerleave",
      this.handlePointerUpOrCancel,
    );
    this.canvasScrollContainer.addEventListener(
      "pointercancel",
      this.handlePointerUpOrCancel,
    );
    this.document.addEventListener("keydown", this.handleKeyDown);
    this.document.addEventListener("keyup", this.handleKeyUp);
  }

  private createOverlay(): void {
    this.overlay = E.div({
      style: [
        "position: absolute",
        "pointer-events: none",
        `border: 0.125rem dashed ${COLOR_THEME.accent3}`,
        "box-sizing: border-box",
        "display: none",
      ].join("; "),
    });
    this.parentContainer.appendChild(this.overlay);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.updateMode(e);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.updateMode(e);
  };

  private updateMode(e: KeyboardEvent): void {
    // Determine selection mode based on modifier keys
    // Shift = Add, Ctrl = Subtract, Shift+Ctrl = Intersect
    // (Alt is reserved for pan tool)
    if (e.shiftKey && e.ctrlKey) {
      this.mode = SelectionMode.INTERSECT;
    } else if (e.shiftKey) {
      this.mode = SelectionMode.ADD;
    } else if (e.ctrlKey) {
      this.mode = SelectionMode.SUBTRACT;
    } else {
      this.mode = SelectionMode.REPLACE;
    }
    this.updateOverlay();
  }

  private handlePointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return; // Only left click

    e.preventDefault();
    this.canvasScrollContainer.setPointerCapture(e.pointerId);

    const point = this.eventToCanvasPoint(e);
    this.startPoint = point;
    this.currentRect = { x: point.x, y: point.y, width: 0, height: 0 };
    this.isDragging = true;
    this.updateOverlay();
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.isDragging || !this.startPoint) return;

    const point = this.eventToCanvasPoint(e);
    const x = Math.min(this.startPoint.x, point.x);
    const y = Math.min(this.startPoint.y, point.y);
    const width = Math.abs(point.x - this.startPoint.x);
    const height = Math.abs(point.y - this.startPoint.y);

    this.currentRect = { x, y, width, height };
    this.updateOverlay();
  };

  private handlePointerUpOrCancel = (e: PointerEvent): void => {
    if (!this.isDragging || !this.currentRect) return;

    this.canvasScrollContainer.releasePointerCapture(e.pointerId);
    this.isDragging = false;

    // Only commit if the rectangle has some size
    if (this.currentRect.width > 1 && this.currentRect.height > 1) {
      // Create mask from rectangle
      const mask = new ImageData(this.canvas.width, this.canvas.height);
      const rect = this.currentRect;
      for (let y = rect.y; y < rect.y + rect.height; y++) {
        for (let x = rect.x; x < rect.x + rect.width; x++) {
          if (x >= 0 && x < mask.width && y >= 0 && y < mask.height) {
            const index = (y * mask.width + x) * 4;
            mask.data[index] = 255; // R
            mask.data[index + 1] = 255; // G
            mask.data[index + 2] = 255; // B
            mask.data[index + 3] = 255; // A
          }
        }
      }
      this.onCommit(mask, this.mode);
    }

    this.startPoint = undefined;
    this.currentRect = undefined;
    this.updateOverlay();
  };

  public updateOverlay(): void {
    if (
      !this.currentRect ||
      this.currentRect.width === 0 ||
      this.currentRect.height === 0
    ) {
      this.overlay.style.display = "none";
      return;
    }

    // Position overlay at canvas position (accounting for scroll)
    const canvasRect = this.canvas.getBoundingClientRect();
    const containerRect = this.canvasScrollContainer.getBoundingClientRect();
    const canvasLeft = canvasRect.left - containerRect.left;
    const canvasTop = canvasRect.top - containerRect.top;

    const scaleFactor = this.getScaleFactor();
    this.overlay.style.display = "block";
    this.overlay.style.left = `${canvasLeft + this.currentRect.x * scaleFactor}px`;
    this.overlay.style.top = `${canvasTop + this.currentRect.y * scaleFactor}px`;
    this.overlay.style.width = `${this.currentRect.width * scaleFactor}px`;
    this.overlay.style.height = `${this.currentRect.height * scaleFactor}px`;

    // Update border color based on mode
    let borderColor = COLOR_THEME.accent3;
    switch (this.mode) {
      case SelectionMode.ADD:
        borderColor = COLOR_THEME.selectionMaskAdd;
        break;
      case SelectionMode.SUBTRACT:
        borderColor = COLOR_THEME.selectionMaskSubtract;
        break;
      case SelectionMode.INTERSECT:
        borderColor = COLOR_THEME.selectionMaskIntersect;
        break;
    }
    this.overlay.style.borderColor = borderColor;
  }

  private eventToCanvasPoint(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleFactor = this.getScaleFactor();
    const x = Math.round((e.clientX - rect.left) / scaleFactor);
    const y = Math.round((e.clientY - rect.top) / scaleFactor);
    return {
      x: Math.max(0, Math.min(x, this.canvas.width)),
      y: Math.max(0, Math.min(y, this.canvas.height)),
    };
  }

  public remove(): void {
    this.overlay.remove();
    this.canvasScrollContainer.style.cursor = "";
    this.canvasScrollContainer.removeEventListener(
      "pointerdown",
      this.handlePointerDown,
    );
    this.canvasScrollContainer.removeEventListener(
      "pointermove",
      this.handlePointerMove,
    );
    this.canvasScrollContainer.removeEventListener(
      "pointerup",
      this.handlePointerUpOrCancel,
    );
    this.canvasScrollContainer.removeEventListener(
      "pointerleave",
      this.handlePointerUpOrCancel,
    );
    this.canvasScrollContainer.removeEventListener(
      "pointercancel",
      this.handlePointerUpOrCancel,
    );
    this.document.removeEventListener("keydown", this.handleKeyDown);
    this.document.removeEventListener("keyup", this.handleKeyUp);
  }
}
