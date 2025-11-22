import { COLOR_THEME } from "../../color_theme";
import { Layer } from "../project_metadata";
import { E } from "@selfage/element/factory";
import { Ref } from "@selfage/ref";

type HandleType =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left"
  | "move";

export class CropTool {
  private isDragging = false;
  private dragType: HandleType | null = null;
  private initialPointerPos?: { x: number; y: number };
  private handles: Map<HandleType, HTMLDivElement> = new Map();
  private cropRect: { x: number; y: number; width: number; height: number } = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };
  private initialCropRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  private overlay: HTMLDivElement;
  private absoluteContainer: HTMLDivElement;

  public constructor(
    private readonly parentContainer: HTMLDivElement,
    private readonly canvasScrollContainer: HTMLDivElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly getScaleFactor: () => number,
    private readonly getActiveLayer: () => Layer | undefined,
    private readonly onCrop: (
      layer: Layer,
      cropRect: {
        x: number;
        y: number;
        width: number;
        height: number;
      },
    ) => void,
    private readonly warning: (message: string) => void,
  ) {
    this.createOverlayAndHandles();
    this.canvasScrollContainer.style.cursor = "move";
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
    this.canvasScrollContainer.addEventListener(
      "dblclick",
      this.handleDblClick,
    );

    // Initialize crop rect to canvas size
    this.cropRect = {
      x: 0,
      y: 0,
      width: this.canvas.width,
      height: this.canvas.height,
    };
    this.updateOverlayAndHandles();
  }

  private commit(): void {
    const layer = this.getActiveLayer();
    if (!layer) {
      this.warning("No active layer.");
      return;
    }
    if (layer.locked) {
      this.warning("Layer is locked.");
      return;
    }

    // cropRect is already in canvas coordinates
    this.onCrop(layer, {
      x: this.cropRect.x,
      y: this.cropRect.y,
      width: this.cropRect.width,
      height: this.cropRect.height,
    });
  }

  private createOverlayAndHandles(): void {
    let overlayRef = new Ref<HTMLDivElement>();
    this.absoluteContainer = E.div(
      {
        style: [
          "position: absolute",
          "pointer-events: none",
          "cursor: move",
        ].join("; "),
      },
      E.div({
        ref: overlayRef,
        style: [
          "position: absolute",
          `border: 2px solid ${COLOR_THEME.accent3}`,
          "box-sizing: border-box",
          "pointer-events: none", // Let events pass through to handles/container
        ].join("; "),
      }),
    );
    this.parentContainer.appendChild(this.absoluteContainer);
    this.overlay = overlayRef.val;

    const handleTypes: HandleType[] = [
      "top-left",
      "top",
      "top-right",
      "right",
      "bottom-right",
      "bottom",
      "bottom-left",
      "left",
    ];

    handleTypes.forEach((type) => {
      const handle = E.div({
        style: [
          "position: absolute",
          "width: 0.5rem",
          "height: 0.5rem",
          `background-color: ${COLOR_THEME.neutral0}`,
          `border: 0.125rem solid ${COLOR_THEME.neutral4}`,
          "pointer-events: auto",
          `cursor: ${this.getCursorForHandle(type)}`,
          "transform: translate(-50%, -50%)",
        ].join("; "),
      });
      handle.dataset.handleType = type;

      handle.addEventListener("pointerdown", (e) => {
        this.handleHandlePointerDown(e, type);
      });

      this.handles.set(type, handle);
      this.absoluteContainer.appendChild(handle);
    });
  }

  private getCursorForHandle(type: HandleType): string {
    switch (type) {
      case "top-left":
      case "bottom-right":
        return "nwse-resize";
      case "top-right":
      case "bottom-left":
        return "nesw-resize";
      case "top":
      case "bottom":
        return "ns-resize";
      case "left":
      case "right":
        return "ew-resize";
      default:
        return "move";
    }
  }

  private handleHandlePointerDown = (
    event: PointerEvent,
    handleType: HandleType,
  ): void => {
    if (event.button !== 0) return;

    event.preventDefault();
    this.dragType = handleType;
    this.isDragging = true;
    this.canvasScrollContainer.setPointerCapture(event.pointerId);
    this.initialPointerPos = this.eventToCanvasPoint(event);
    this.initialCropRect = { ...this.cropRect };
  };

  private handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;

    event.preventDefault();

    // Check if we clicked inside the crop rect to move it
    const point = this.eventToCanvasPoint(event);
    this.dragType = "move";
    this.isDragging = true;
    this.canvasScrollContainer.setPointerCapture(event.pointerId);
    this.initialPointerPos = point;
    this.initialCropRect = { ...this.cropRect };
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.isDragging || !this.initialPointerPos || !this.initialCropRect) {
      return;
    }

    event.preventDefault();
    const currentPoint = this.eventToCanvasPoint(event);
    const deltaX = currentPoint.x - this.initialPointerPos.x;
    const deltaY = currentPoint.y - this.initialPointerPos.y;

    if (this.dragType === "move") {
      this.cropRect.x = this.initialCropRect.x + deltaX;
      this.cropRect.y = this.initialCropRect.y + deltaY;
    } else {
      this.handleResize(this.dragType!, deltaX, deltaY, event.shiftKey);
    }

    this.updateOverlayAndHandles();
  };

  private handleResize(
    handleType: HandleType,
    deltaX: number,
    deltaY: number,
    preserveAspectRatio: boolean,
  ): void {
    const initial = this.initialCropRect!;
    let newX = initial.x;
    let newY = initial.y;
    let newW = initial.width;
    let newH = initial.height;

    if (preserveAspectRatio) {
      // Calculate aspect ratio from initial crop rect
      const aspectRatio = initial.width / initial.height;

      // For corner handles, determine which delta is larger to drive the resize
      const isCorner = (handleType.includes("top") || handleType.includes("bottom")) &&
        (handleType.includes("left") || handleType.includes("right"));

      if (isCorner) {
        // Use the larger absolute delta to determine the resize magnitude
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        let scale: number;
        if (absDeltaX > absDeltaY) {
          // Width is driving, calculate scale from width change
          const targetWidth = initial.width + (handleType.includes("left") ? -deltaX : deltaX);
          scale = targetWidth / initial.width;
        } else {
          // Height is driving, calculate scale from height change
          const targetHeight = initial.height + (handleType.includes("top") ? -deltaY : deltaY);
          scale = targetHeight / initial.height;
        }

        newW = initial.width * scale;
        newH = initial.height * scale;

        // Adjust position based on which corner is being dragged
        if (handleType.includes("left")) {
          newX = initial.x + initial.width - newW;
        }
        if (handleType.includes("top")) {
          newY = initial.y + initial.height - newH;
        }
      } else {
        // Edge handles: adjust one dimension and calculate the other
        if (handleType.includes("left") || handleType.includes("right")) {
          // Horizontal resize: adjust width, then calculate height
          if (handleType.includes("left")) {
            newX += deltaX;
            newW -= deltaX;
          } else {
            newW += deltaX;
          }
          newH = newW / aspectRatio;
          // Center the height change
          newY += (initial.height - newH) / 2;
        } else {
          // Vertical resize: adjust height, then calculate width
          if (handleType.includes("top")) {
            newY += deltaY;
            newH -= deltaY;
          } else {
            newH += deltaY;
          }
          newW = newH * aspectRatio;
          // Center the width change
          newX += (initial.width - newW) / 2;
        }
      }
    } else {
      // Free resize without aspect ratio constraint
      if (handleType.includes("left")) {
        newX += deltaX;
        newW -= deltaX;
      }
      if (handleType.includes("right")) {
        newW += deltaX;
      }
      if (handleType.includes("top")) {
        newY += deltaY;
        newH -= deltaY;
      }
      if (handleType.includes("bottom")) {
        newH += deltaY;
      }
    }

    newW = Math.max(1, newW);
    newH = Math.max(1, newH);

    this.cropRect = { x: newX, y: newY, width: newW, height: newH };
  }

  public updateOverlayAndHandles(): void {
    const scale = this.getScaleFactor();

    // Position absoluteContainer at canvas position (accounting for scroll)
    const canvasRect = this.canvas.getBoundingClientRect();
    const containerRect = this.canvasScrollContainer.getBoundingClientRect();
    const left = canvasRect.left - containerRect.left;
    const top = canvasRect.top - containerRect.top;

    this.absoluteContainer.style.left = `${left}px`;
    this.absoluteContainer.style.top = `${top}px`;

    // Update Overlay (positioned relative to absoluteContainer, which is at canvas position)
    this.overlay.style.left = `${this.cropRect.x * scale}px`;
    this.overlay.style.top = `${this.cropRect.y * scale}px`;
    this.overlay.style.width = `${this.cropRect.width * scale}px`;
    this.overlay.style.height = `${this.cropRect.height * scale}px`;

    // Update Handles
    const handlePositions: Record<string, { x: number; y: number }> = {
      "top-left": { x: 0, y: 0 },
      top: { x: this.cropRect.width / 2, y: 0 },
      "top-right": { x: this.cropRect.width, y: 0 },
      right: { x: this.cropRect.width, y: this.cropRect.height / 2 },
      "bottom-right": { x: this.cropRect.width, y: this.cropRect.height },
      bottom: { x: this.cropRect.width / 2, y: this.cropRect.height },
      "bottom-left": { x: 0, y: this.cropRect.height },
      left: { x: 0, y: this.cropRect.height / 2 },
    };

    Object.entries(handlePositions).forEach(([type, { x, y }]) => {
      const handle = this.handles.get(type as HandleType);
      if (handle) {
        handle.style.left = `${(this.cropRect.x + x) * scale}px`;
        handle.style.top = `${(this.cropRect.y + y) * scale}px`;
      }
    });
  }

  private handlePointerUpOrCancel = (event: PointerEvent): void => {
    if (!this.isDragging) return;

    event.preventDefault();
    this.isDragging = false;
    if (this.canvasScrollContainer.hasPointerCapture(event.pointerId)) {
      this.canvasScrollContainer.releasePointerCapture(event.pointerId);
    }

    this.dragType = null;
    this.initialPointerPos = undefined;
    this.initialCropRect = undefined;
  };

  private handleDblClick = (event: MouseEvent): void => {
    // Double-click to commit the crop
    this.commit();
  };

  private eventToCanvasPoint(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  public remove(): void {
    this.absoluteContainer.remove();
    this.canvasScrollContainer.style.cursor = "default";
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
    this.canvasScrollContainer.removeEventListener(
      "dblclick",
      this.handleDblClick,
    );
  }
}
