import { COLOR_THEME } from "../../color_theme";
import { Layer, Transform } from "../project_metadata";
import { E } from "@selfage/element/factory";

type HandleType =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left"
  | "move"
  | "rotator-top"
  | "rotator-bottom"
  | "rotator-left"
  | "rotator-right"
  | "pivot";

export class FreeTransformTool {
  private isDragging = false;
  private dragType: HandleType | null = null;
  private layer: Layer | null = null;
  private initialTransform?: Transform;
  private initialPointerPos?: { x: number; y: number };
  private handles: Map<HandleType, HTMLDivElement> = new Map();
  // Pivot position relative to the layer (0-1 range)
  private pivotRelativePos = { x: 0.5, y: 0.5 };
  private initialPivotRelativePos?: { x: number; y: number };

  public constructor(
    private readonly canvasScrollContainer: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly outlineContainer: HTMLDivElement,
    private readonly getScaleFactor: () => number,
    private readonly getActiveLayer: () => Layer | undefined,
    private readonly rerender: () => void,
    private readonly commit: (
      layer: Layer,
      oldTransform: Transform,
      newTransform: Transform,
    ) => void,
    private readonly warning: (message: string) => void,
  ) {
    this.canvasScrollContainer.style.cursor = "move";
    this.createHandles();
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
  }

  private createHandles(): void {
    const handleTypes: HandleType[] = [
      "top-left",
      "top",
      "top-right",
      "right",
      "bottom-right",
      "bottom",
      "bottom-left",
      "left",
      "rotator-top",
      "rotator-bottom",
      "rotator-left",
      "rotator-right",
      "pivot",
    ];

    handleTypes.forEach((type) => {
      const isRotator = type.startsWith("rotator");
      const isPivot = type === "pivot";
      const handle = E.div({
        style: [
          "position: absolute",
          "width: 0.5rem",
          "height: 0.5rem",
          `background-color: ${isPivot ? COLOR_THEME.accent0 : COLOR_THEME.neutral0}`,
          `border: 0.125rem solid ${COLOR_THEME.neutral4}`,
          isRotator || isPivot ? "border-radius: 50%" : "",
          "pointer-events: auto",
          `cursor: ${this.getCursorForHandle(type)}`,
          "transform: translate(-50%, -50%)",
        ].join("; "),
      });
      handle.dataset.handleType = type;

      // Add pointer down listener to handle for resize
      handle.addEventListener("pointerdown", (e) => {
        this.handleHandlePointerDown(e, type);
      });

      this.handles.set(type, handle);
      this.outlineContainer.appendChild(handle);
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
      case "rotator-top":
      case "rotator-bottom":
      case "rotator-left":
      case "rotator-right":
        return "grab";
      case "pivot":
        return "move";
      default:
        return "move";
    }
  }

  private handleHandlePointerDown = (
    event: PointerEvent,
    handleType: HandleType,
  ): void => {
    if (event.button !== 0) {
      return;
    }
    const activeLayer = this.getActiveLayer();
    if (!activeLayer) {
      this.warning("No active layer to transform.");
      return;
    }
    if (activeLayer.locked) {
      this.warning("Active layer is locked and cannot be transformed.");
      return;
    }
    event.preventDefault();

    this.dragType = handleType;
    this.layer = activeLayer;
    this.isDragging = true;
    this.canvasScrollContainer.setPointerCapture(event.pointerId);
    this.initialPointerPos = this.eventToCanvasPoint(event);
    this.initialTransform = { ...activeLayer.transform };
    this.initialPivotRelativePos = { ...this.pivotRelativePos };
  };

  private handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) {
      return;
    }
    const activeLayer = this.getActiveLayer();
    if (!activeLayer) {
      this.warning("No active layer to transform.");
      return;
    }
    if (activeLayer.locked) {
      this.warning("Active layer is locked and cannot be transformed.");
      return;
    }
    event.preventDefault();

    // Click on container = move
    this.dragType = "move";
    this.layer = activeLayer;
    this.isDragging = true;
    this.canvasScrollContainer.setPointerCapture(event.pointerId);
    this.initialPointerPos = this.eventToCanvasPoint(event);
    this.initialTransform = { ...activeLayer.transform };
    this.initialPivotRelativePos = { ...this.pivotRelativePos };
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.isDragging || !this.layer || !this.initialPointerPos) {
      return;
    }

    event.preventDefault();
    const currentPoint = this.eventToCanvasPoint(event);
    const deltaX = currentPoint.x - this.initialPointerPos.x;
    const deltaY = currentPoint.y - this.initialPointerPos.y;

    if (this.dragType === "move") {
      this.handleMove(deltaX, deltaY, event.shiftKey);
    } else if (this.dragType?.startsWith("rotator")) {
      this.handleRotate(currentPoint, event.shiftKey);
    } else if (this.dragType === "pivot") {
      this.handlePivotMove(deltaX, deltaY);
    } else {
      this.handleResize(this.dragType!, deltaX, deltaY, event.shiftKey);
    }

    this.rerender();
  };

  private handleMove(
    deltaX: number,
    deltaY: number,
    shouldSnap: boolean,
  ): void {
    if (shouldSnap) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        deltaY = 0;
      } else {
        deltaX = 0;
      }
    }
    this.layer!.transform.translateX =
      this.initialTransform!.translateX + deltaX;
    this.layer!.transform.translateY =
      this.initialTransform!.translateY + deltaY;
  }

  private handlePivotMove(deltaX: number, deltaY: number): void {
    const layer = this.layer!;
    const width = layer.width * layer.transform.scaleX;
    const height = layer.height * layer.transform.scaleY;

    // We need to account for rotation to map canvas delta to layer local delta
    const rotationRad = (layer.transform.rotation * Math.PI) / 180;
    const cos = Math.cos(-rotationRad);
    const sin = Math.sin(-rotationRad);

    const localDeltaX = deltaX * cos - deltaY * sin;
    const localDeltaY = deltaX * sin + deltaY * cos;

    const initialPivot = this.initialPivotRelativePos!;

    // Update the pivotRelativePos
    this.pivotRelativePos.x = initialPivot.x + localDeltaX / width;
    this.pivotRelativePos.y = initialPivot.y + localDeltaY / height;
  }

  private handleRotate(
    currentPoint: { x: number; y: number },
    shouldSnap: boolean,
  ): void {
    const layer = this.layer!;
    const initial = this.initialTransform!;

    // Calculate the pivot point in canvas coordinates
    // Pivot is relative to the layer's top-left corner (0,0) in local space
    const pivotLocalX = this.pivotRelativePos.x * layer.width * initial.scaleX;
    const pivotLocalY = this.pivotRelativePos.y * layer.height * initial.scaleY;

    // Rotate pivot offset by initial rotation to get world offset from Top-Left
    const initialRad = (initial.rotation * Math.PI) / 180;
    const cos = Math.cos(initialRad);
    const sin = Math.sin(initialRad);

    const pivotOffsetX = pivotLocalX * cos - pivotLocalY * sin;
    const pivotOffsetY = pivotLocalX * sin + pivotLocalY * cos;

    // Pivot point in world space
    // Round the pivot point to prevent floating-point drift during rotation
    // This is the key to stability - all other calculations derive from this
    const pivotX = Math.round((initial.translateX + pivotOffsetX) * 100) / 100;
    const pivotY = Math.round((initial.translateY + pivotOffsetY) * 100) / 100;

    // Calculate angle from pivot to current point
    const currentAngle = Math.atan2(
      currentPoint.y - pivotY,
      currentPoint.x - pivotX,
    );

    // Calculate angle from pivot to initial point
    const initialAngle = Math.atan2(
      this.initialPointerPos!.y - pivotY,
      this.initialPointerPos!.x - pivotX,
    );

    // Calculate rotation delta in degrees
    let rotationDelta = ((currentAngle - initialAngle) * 180) / Math.PI;
    let newRotation = initial.rotation + rotationDelta;

    if (shouldSnap) {
      const snapAngle = 15;
      newRotation = Math.round(newRotation / snapAngle) * snapAngle;
    }

    // Round rotation to prevent floating-point drift
    // Use 2 decimal places for rotation (0.01 degree precision)
    newRotation = Math.round(newRotation * 100) / 100;

    // Apply rotation
    layer.transform.rotation = newRotation;

    // Adjust translation to keep pivot point fixed
    // T' = P - R(theta') * pivotLocal
    const newRad = (newRotation * Math.PI) / 180;
    const newCos = Math.cos(newRad);
    const newSin = Math.sin(newRad);

    // Round the new pivot offset to prevent floating-point errors from trig functions
    const newPivotOffsetX = Math.round((pivotLocalX * newCos - pivotLocalY * newSin) * 100) / 100;
    const newPivotOffsetY = Math.round((pivotLocalX * newSin + pivotLocalY * newCos) * 100) / 100;

    // Round translation values to prevent sub-pixel drift
    // Use 2 decimal places for translation (0.01 pixel precision)
    layer.transform.translateX = pivotX - newPivotOffsetX;
    layer.transform.translateY = pivotY - newPivotOffsetY;
  }

  private handleResize(
    handleType: HandleType,
    deltaX: number,
    deltaY: number,
    preserveAspectRatio: boolean,
  ): void {
    const layer = this.layer!;
    const initial = this.initialTransform!;
    const initialWidth = layer.width * initial.scaleX;
    const initialHeight = layer.height * initial.scaleY;

    // 1. Rotate delta to local space (unrotated)
    const rad = (initial.rotation * Math.PI) / 180;
    const cos = Math.cos(-rad);
    const sin = Math.sin(-rad);
    const localDeltaX = deltaX * cos - deltaY * sin;
    const localDeltaY = deltaX * sin + deltaY * cos;

    // 2. Apply to local bounds (relative to initial top-left)
    // Initial bounds are 0, 0, W, H in local space
    let newLocalLeft = 0;
    let newLocalTop = 0;
    let newLocalRight = initialWidth;
    let newLocalBottom = initialHeight;

    if (handleType.includes("left")) newLocalLeft += localDeltaX;
    if (handleType.includes("right")) newLocalRight += localDeltaX;
    if (handleType.includes("top")) newLocalTop += localDeltaY;
    if (handleType.includes("bottom")) newLocalBottom += localDeltaY;

    // 3. Calculate new dimensions
    let newWidth = Math.max(1, newLocalRight - newLocalLeft);
    let newHeight = Math.max(1, newLocalBottom - newLocalTop);

    // 4. Aspect Ratio
    if (preserveAspectRatio) {
      const ratio = initialWidth / initialHeight;
      if (handleType.includes("left") || handleType.includes("right")) {
        // Width dominant
        newHeight = newWidth / ratio;
        if (handleType.includes("top")) {
          newLocalTop = newLocalBottom - newHeight;
        } else if (handleType.includes("bottom")) {
          newLocalBottom = newLocalTop + newHeight;
        } else {
          // Center vertically
          const center = (newLocalTop + newLocalBottom) / 2;
          newLocalTop = center - newHeight / 2;
          newLocalBottom = center + newHeight / 2;
        }
      } else {
        // Height dominant
        newWidth = newHeight * ratio;
        const center = (newLocalLeft + newLocalRight) / 2;
        newLocalLeft = center - newWidth / 2;
        newLocalRight = center + newWidth / 2;
      }
    }

    // 5. Calculate new World Top-Left
    // The new local top-left is (newLocalLeft, newLocalTop) relative to the ORIGINAL local origin
    // We need to transform this point back to world space using the ORIGINAL rotation and translation
    const cosRot = Math.cos(rad);
    const sinRot = Math.sin(rad);

    const worldOffsetX = newLocalLeft * cosRot - newLocalTop * sinRot;
    const worldOffsetY = newLocalLeft * sinRot + newLocalTop * cosRot;

    layer.transform.translateX = initial.translateX + worldOffsetX;
    layer.transform.translateY = initial.translateY + worldOffsetY;
    layer.transform.scaleX = newWidth / layer.width;
    layer.transform.scaleY = newHeight / layer.height;
  }

  public updateHandlePositions(): void {
    const layer = this.getActiveLayer();
    if (!layer) {
      return;
    }

    const transform = layer.transform;
    const rad = (transform.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Helper to convert local layer coordinates to rotated positions
    // Since handles are children of outlineContainer (which is positioned at the layer's world position),
    // we just need to rotate the local coordinates
    const localToRotated = (localX: number, localY: number): { x: number; y: number } => {
      const rotatedX = localX * cos - localY * sin;
      const rotatedY = localX * sin + localY * cos;

      // Convert to screen pixels
      return {
        x: rotatedX * this.getScaleFactor(),
        y: rotatedY * this.getScaleFactor(),
      };
    };

    const layerWidth = layer.width * transform.scaleX;
    const layerHeight = layer.height * transform.scaleY;

    // Position corner and edge handles
    const handlePositions: Record<string, { localX: number; localY: number }> = {
      "top-left": { localX: 0, localY: 0 },
      "top": { localX: layerWidth / 2, localY: 0 },
      "top-right": { localX: layerWidth, localY: 0 },
      "right": { localX: layerWidth, localY: layerHeight / 2 },
      "bottom-right": { localX: layerWidth, localY: layerHeight },
      "bottom": { localX: layerWidth / 2, localY: layerHeight },
      "bottom-left": { localX: 0, localY: layerHeight },
      "left": { localX: 0, localY: layerHeight / 2 },
      "rotator-top": { localX: layerWidth / 2, localY: -20 / this.getScaleFactor() },
      "rotator-bottom": { localX: layerWidth / 2, localY: layerHeight + 20 / this.getScaleFactor() },
      "rotator-left": { localX: -20 / this.getScaleFactor(), localY: layerHeight / 2 },
      "rotator-right": { localX: layerWidth + 20 / this.getScaleFactor(), localY: layerHeight / 2 },
      "pivot": {
        localX: this.pivotRelativePos.x * layerWidth,
        localY: this.pivotRelativePos.y * layerHeight
      },
    };

    Object.entries(handlePositions).forEach(([type, { localX, localY }]) => {
      const handle = this.handles.get(type as HandleType);
      if (handle) {
        const pos = localToRotated(localX, localY);
        handle.style.left = `${pos.x}px`;
        handle.style.top = `${pos.y}px`;
      }
    });
  }

  private handlePointerUpOrCancel = (event: PointerEvent): void => {
    if (!this.isDragging) {
      return;
    }

    event.preventDefault();
    this.isDragging = false;

    if (this.canvasScrollContainer.hasPointerCapture(event.pointerId)) {
      this.canvasScrollContainer.releasePointerCapture(event.pointerId);
    }

    // Commit the transformation
    if (this.layer && this.initialTransform) {
      const newTransform = { ...this.layer.transform };
      this.layer.transform = { ...this.initialTransform };
      this.commit(this.layer, this.initialTransform, newTransform);
    }

    this.dragType = null;
    this.layer = null;
    this.initialTransform = undefined;
    this.initialPointerPos = undefined;
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
    this.canvasScrollContainer.style.cursor = "";
    this.handles.forEach((handle) => {
      handle.remove();
    });
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
  }
}
