import { COLOR_THEME } from "../../color_theme";
import { ProjectSettings } from "../project_metadata";
import { SelectionMode } from "../selection_mask_utils";
import { E } from "@selfage/element/factory";

export class FuzzyMaskSelectionTool {
  private mode: SelectionMode = SelectionMode.REPLACE;
  private cursorIndicator: HTMLDivElement;

  public constructor(
    private readonly parentContainer: HTMLDivElement,
    private readonly canvasScrollContainer: HTMLDivElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly getScaleFactor: () => number,
    private readonly settings: ProjectSettings,
    private readonly getRasterizedImageData: () => ImageData,
    private readonly getActiveLayerImageData: () => ImageData | undefined,
    private readonly onCommit: (mask: ImageData, mode: SelectionMode) => void,
    private readonly document: Document = globalThis.document,
  ) {
    this.createCursorIndicator();
    this.canvasScrollContainer.style.cursor = "crosshair";
    this.canvasScrollContainer.addEventListener(
      "pointerdown",
      this.handlePointerDown,
    );
    this.canvasScrollContainer.addEventListener(
      "pointermove",
      this.handlePointerMove,
    );
    this.document.addEventListener("keydown", this.handleKeyDown);
    this.document.addEventListener("keyup", this.handleKeyUp);
  }

  private createCursorIndicator(): void {
    this.cursorIndicator = E.div({
      style: [
        "position: absolute",
        "pointer-events: none",
        "width: 1rem",
        "height: 1rem",
        "border-radius: 50%",
        `border: 0.125rem solid ${COLOR_THEME.accent3}`,
        "transform: translate(-50%, -50%)",
        "display: none",
      ].join("; "),
    });
    this.parentContainer.appendChild(this.cursorIndicator);
  }

  private get tolerance(): number {
    return this.settings.fuzzyMaskSelectionToolSettings.tolerance;
  }

  private get contiguous(): boolean {
    return this.settings.fuzzyMaskSelectionToolSettings.contiguous;
  }

  private get sampleAllLayers(): boolean {
    return this.settings.fuzzyMaskSelectionToolSettings.sampleAllLayers;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.updateMode(e);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.updateMode(e);
  };

  private updateMode(e: KeyboardEvent): void {
    if (e.shiftKey && e.ctrlKey) {
      this.mode = SelectionMode.INTERSECT;
    } else if (e.shiftKey) {
      this.mode = SelectionMode.ADD;
    } else if (e.ctrlKey) {
      this.mode = SelectionMode.SUBTRACT;
    } else {
      this.mode = SelectionMode.REPLACE;
    }
    this.updateCursorIndicator();
  }

  private handlePointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;

    e.preventDefault();
    const point = this.eventToCanvasPoint(e);

    // Get the image data based on sampleAllLayers setting
    const imageData = this.sampleAllLayers
      ? this.getRasterizedImageData()
      : this.getActiveLayerImageData();

    if (!imageData) {
      // No active layer or no image data available
      return;
    }

    // Sample the color at the clicked point
    const seedColor = this.getColorAt(imageData, point.x, point.y);

    // Create the mask using flood fill or global selection
    const mask = this.contiguous
      ? this.floodFillSelect(imageData, point.x, point.y, seedColor)
      : this.globalColorSelect(imageData, seedColor);

    this.onCommit(mask, this.mode);
  };

  private handlePointerMove = (e: PointerEvent): void => {
    const point = this.eventToCanvasPoint(e);
    this.updateCursorIndicatorPosition(point.x, point.y);
  };

  private getColorAt(
    imageData: ImageData,
    x: number,
    y: number,
  ): { r: number; g: number; b: number; a: number } {
    const index = (y * imageData.width + x) * 4;
    return {
      r: imageData.data[index],
      g: imageData.data[index + 1],
      b: imageData.data[index + 2],
      a: imageData.data[index + 3],
    };
  }

  private colorDistance(
    c1: { r: number; g: number; b: number; a: number },
    c2: { r: number; g: number; b: number; a: number },
  ): number {
    // Use weighted Euclidean distance in RGB space, normalized by alpha
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    const da = c1.a - c2.a;

    // Weight alpha difference more heavily since it's often important for selection
    return Math.sqrt(dr * dr + dg * dg + db * db + da * da * 2);
  }

  private floodFillSelect(
    imageData: ImageData,
    startX: number,
    startY: number,
    seedColor: { r: number; g: number; b: number; a: number },
  ): ImageData {
    const width = imageData.width;
    const height = imageData.height;
    const mask = new ImageData(width, height);

    // Track visited pixels
    const visited = new Uint8Array(width * height);

    // Use a queue for flood fill (BFS)
    const queue: Array<{ x: number; y: number }> = [];
    queue.push({ x: startX, y: startY });

    // Extended tolerance for anti-aliasing edge
    const extendedTolerance = this.tolerance + 32;

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;

      if (x < 0 || x >= width || y < 0 || y >= height) {
        continue;
      }

      const pixelIndex = y * width + x;
      if (visited[pixelIndex]) {
        continue;
      }
      visited[pixelIndex] = 1;

      const color = this.getColorAt(imageData, x, y);
      const distance = this.colorDistance(color, seedColor);

      if (distance <= extendedTolerance) {
        // Calculate alpha based on distance for anti-aliasing
        let alpha: number;
        if (distance <= this.tolerance) {
          alpha = 255;
        } else {
          // Smooth falloff for anti-aliasing
          alpha = Math.round(255 * (1 - (distance - this.tolerance) / 32));
        }

        if (alpha > 0) {
          const maskIndex = pixelIndex * 4;
          mask.data[maskIndex] = alpha;
          mask.data[maskIndex + 1] = alpha;
          mask.data[maskIndex + 2] = alpha;
          mask.data[maskIndex + 3] = 255;
        }

        // Only continue flood fill if within main tolerance
        if (distance <= this.tolerance) {
          // Add 4-connected neighbors
          queue.push({ x: x + 1, y });
          queue.push({ x: x - 1, y });
          queue.push({ x, y: y + 1 });
          queue.push({ x, y: y - 1 });
        }
      }
    }

    return mask;
  }

  private globalColorSelect(
    imageData: ImageData,
    seedColor: { r: number; g: number; b: number; a: number },
  ): ImageData {
    const width = imageData.width;
    const height = imageData.height;
    const mask = new ImageData(width, height);

    const extendedTolerance = this.tolerance + 32;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = this.getColorAt(imageData, x, y);
        const distance = this.colorDistance(color, seedColor);

        if (distance <= extendedTolerance) {
          let alpha: number;
          if (distance <= this.tolerance) {
            alpha = 255;
          } else {
            alpha = Math.round(255 * (1 - (distance - this.tolerance) / 32));
          }

          if (alpha > 0) {
            const maskIndex = (y * width + x) * 4;
            mask.data[maskIndex] = alpha;
            mask.data[maskIndex + 1] = alpha;
            mask.data[maskIndex + 2] = alpha;
            mask.data[maskIndex + 3] = 255;
          }
        }
      }
    }

    return mask;
  }

  private updateCursorIndicator(): void {
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
    this.cursorIndicator.style.borderColor = borderColor;
  }

  private updateCursorIndicatorPosition(
    canvasX: number,
    canvasY: number,
  ): void {
    const canvasRect = this.canvas.getBoundingClientRect();
    const containerRect = this.canvasScrollContainer.getBoundingClientRect();
    const canvasLeft = canvasRect.left - containerRect.left;
    const canvasTop = canvasRect.top - containerRect.top;

    const scaleFactor = this.getScaleFactor();
    this.cursorIndicator.style.display = "block";
    this.cursorIndicator.style.left = `${canvasLeft + canvasX * scaleFactor}px`;
    this.cursorIndicator.style.top = `${canvasTop + canvasY * scaleFactor}px`;
  }

  private eventToCanvasPoint(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleFactor = this.getScaleFactor();
    const x = Math.round((e.clientX - rect.left) / scaleFactor);
    const y = Math.round((e.clientY - rect.top) / scaleFactor);
    return {
      x: Math.max(0, Math.min(x, this.canvas.width - 1)),
      y: Math.max(0, Math.min(y, this.canvas.height - 1)),
    };
  }

  public remove(): void {
    this.cursorIndicator.remove();
    this.canvasScrollContainer.style.cursor = "";
    this.canvasScrollContainer.removeEventListener(
      "pointerdown",
      this.handlePointerDown,
    );
    this.canvasScrollContainer.removeEventListener(
      "pointermove",
      this.handlePointerMove,
    );
    this.document.removeEventListener("keydown", this.handleKeyDown);
    this.document.removeEventListener("keyup", this.handleKeyUp);
  }
}
