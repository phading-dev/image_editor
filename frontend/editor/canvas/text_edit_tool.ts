import { COLOR_THEME } from "../../color_theme";
import { Layer } from "../project_metadata";
import { E } from "@selfage/element/factory";

type HandleType =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left";

export class TextEditTool {
  private isDragging = false;
  private dragType: HandleType | null = null;
  private initialDimensions?: {
    width: number;
    height: number;
    translateX: number;
    translateY: number;
  };
  private initialPointerPos?: { x: number; y: number };
  private handles: Map<HandleType, HTMLDivElement> = new Map();
  private oldTextContent: string = "";

  public constructor(
    private readonly canvasScrollContainer: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly outlineContainer: HTMLDivElement,
    private readonly getScaleFactor: () => number,
    private readonly layer: Layer,
    private readonly textarea: HTMLTextAreaElement,
    public readonly rerender: () => void,
    private readonly onResize: (
      layer: Layer,
      oldWidth: number,
      oldHeight: number,
      oldX: number,
      oldY: number,
      newWidth: number,
      newHeight: number,
      newX: number,
      newY: number,
    ) => void,
    private readonly onTextEdit: (
      layer: Layer,
      oldText: string,
      newText: string,
    ) => void,
    private readonly onExit: () => void,
    private readonly warning: (message: string) => void,
    private readonly document: Document = globalThis.document,
  ) {
    this.canvasScrollContainer.style.cursor = "text";
    this.oldTextContent = this.textarea.value;
    this.textarea.readOnly = false;
    this.textarea.style.pointerEvents = "auto";
    this.textarea.focus();
    this.createHandles();
    this.document.addEventListener("pointerdown", this.handlePointerDown);
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

      // Add pointer down listener to handle for resize
      handle.addEventListener("pointerdown", (e) => {
        this.handleHandlePointerDown(e, type);
      });

      this.handles.set(type, handle);
      this.outlineContainer.appendChild(handle);
    });
  }

  public updateHandlePositions(): void {
    const scaleFactor = this.getScaleFactor();
    const layerWidth = this.layer.width * scaleFactor;
    const layerHeight = this.layer.height * scaleFactor;

    // Position corner and edge handles
    const handlePositions: Record<string, { x: number; y: number }> = {
      "top-left": { x: 0, y: 0 },
      top: { x: layerWidth / 2, y: 0 },
      "top-right": { x: layerWidth, y: 0 },
      right: { x: layerWidth, y: layerHeight / 2 },
      "bottom-right": { x: layerWidth, y: layerHeight },
      bottom: { x: layerWidth / 2, y: layerHeight },
      "bottom-left": { x: 0, y: layerHeight },
      left: { x: 0, y: layerHeight / 2 },
    };

    Object.entries(handlePositions).forEach(([type, { x, y }]) => {
      const handle = this.handles.get(type as HandleType);
      if (handle) {
        handle.style.left = `${x}px`;
        handle.style.top = `${y}px`;
      }
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
        return "default";
    }
  }

  private handlePointerDown = (event: PointerEvent): void => {
    // Check if clicking outside textarea - if so, exit edit mode
    const target = event.target as HTMLElement;
    if (target !== this.textarea) {
      this.onExit();
    }
  };

  private handleHandlePointerDown = (
    event: PointerEvent,
    handleType: HandleType,
  ): void => {
    if (event.button !== 0) {
      return;
    }
    if (this.layer.locked) {
      this.warning("Active layer is locked and cannot be resized.");
      return;
    }
    // Commit text changes before resizing
    this.commitText();

    event.preventDefault();
    event.stopPropagation();
    this.dragType = handleType;
    this.isDragging = true;
    this.canvasScrollContainer.setPointerCapture(event.pointerId);
    this.initialPointerPos = this.eventToCanvasPoint(event);
    this.initialDimensions = {
      width: this.layer.width,
      height: this.layer.height,
      translateX: this.layer.transform.translateX,
      translateY: this.layer.transform.translateY,
    };
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (
      !this.isDragging ||
      !this.layer ||
      !this.initialPointerPos ||
      !this.initialDimensions
    ) {
      return;
    }

    event.preventDefault();
    const currentPoint = this.eventToCanvasPoint(event);
    const deltaX = currentPoint.x - this.initialPointerPos.x;
    const deltaY = currentPoint.y - this.initialPointerPos.y;

    this.handleResize(this.dragType!, deltaX, deltaY);
    this.rerender();
  };

  private handleResize(
    handleType: HandleType,
    deltaX: number,
    deltaY: number,
  ): void {
    const initial = this.initialDimensions!;

    // Calculate new dimensions and position based on handle type
    let newWidth = initial.width;
    let newHeight = initial.height;
    let newTranslateX = initial.translateX;
    let newTranslateY = initial.translateY;

    if (handleType.includes("left")) {
      newWidth = Math.max(50, initial.width - deltaX);
      // When resizing from left, move the layer right by the amount we shrunk
      newTranslateX = initial.translateX + (initial.width - newWidth);
    } else if (handleType.includes("right")) {
      newWidth = Math.max(50, initial.width + deltaX);
    }

    if (handleType.includes("top")) {
      newHeight = Math.max(20, initial.height - deltaY);
      // When resizing from top, move the layer down by the amount we shrunk
      newTranslateY = initial.translateY + (initial.height - newHeight);
    } else if (handleType.includes("bottom")) {
      newHeight = Math.max(20, initial.height + deltaY);
    }

    // Update layer dimensions and position
    this.layer.width = newWidth;
    this.layer.height = newHeight;
    this.layer.transform.translateX = newTranslateX;
    this.layer.transform.translateY = newTranslateY;
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

    // Commit the resize
    if (this.initialDimensions) {
      this.onResize(
        this.layer,
        this.initialDimensions.width,
        this.initialDimensions.height,
        this.initialDimensions.translateX,
        this.initialDimensions.translateY,
        this.layer.width,
        this.layer.height,
        this.layer.transform.translateX,
        this.layer.transform.translateY,
      );
    }

    this.dragType = null;
    this.initialDimensions = undefined;
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

  private commitText(): void {
    const newText = this.textarea.value;
    if (newText !== this.oldTextContent) {
      this.onTextEdit(this.layer, this.oldTextContent, newText);
      this.oldTextContent = newText;
    }
  }

  public remove(): void {
    this.commitText();
    this.canvasScrollContainer.style.cursor = "";
    this.textarea.readOnly = true;
    this.textarea.style.pointerEvents = "none";
    this.handles.forEach((handle) => {
      handle.remove();
    });
    this.document.removeEventListener("pointerdown", this.handlePointerDown);
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
