import { COLOR_THEME } from "../../color_theme";
import { SelectionMode } from "../selection_mask_utils";

export class PolygonalMaskSelectionTool {
  private static readonly CLOSE_THRESHOLD = 10; // pixels to close polygon

  private points: Array<{ x: number; y: number }> = [];
  private currentMousePoint?: { x: number; y: number };
  private overlay: SVGSVGElement;
  private pathElement: SVGPathElement;
  private previewLineElement: SVGLineElement;
  private startPointCircle: SVGCircleElement;
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
    this.canvasScrollContainer.addEventListener("click", this.handleClick);
    this.canvasScrollContainer.addEventListener(
      "dblclick",
      this.handleDoubleClick,
    );
    this.canvasScrollContainer.addEventListener(
      "pointermove",
      this.handlePointerMove,
    );
    this.document.addEventListener("keydown", this.handleKeyDown);
    this.document.addEventListener("keyup", this.handleKeyUp);
  }

  private createOverlay(): void {
    this.overlay = this.document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    this.overlay.style.position = "absolute";
    this.overlay.style.pointerEvents = "none";
    this.overlay.style.overflow = "visible";
    this.overlay.style.display = "none";

    // Main path for committed points
    this.pathElement = this.document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    this.pathElement.setAttribute("fill", "none");
    this.pathElement.setAttribute("stroke", COLOR_THEME.accent3);
    this.pathElement.setAttribute("stroke-width", "2");
    this.pathElement.setAttribute("stroke-dasharray", "4 4");
    this.overlay.appendChild(this.pathElement);

    // Preview line from last point to current mouse
    this.previewLineElement = this.document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line",
    );
    this.previewLineElement.setAttribute("stroke", COLOR_THEME.accent3);
    this.previewLineElement.setAttribute("stroke-width", "1");
    this.previewLineElement.setAttribute("stroke-dasharray", "2 2");
    this.previewLineElement.setAttribute("stroke-opacity", "0.6");
    this.overlay.appendChild(this.previewLineElement);

    // Circle indicator at start point (to show where to click to close)
    this.startPointCircle = this.document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    this.startPointCircle.setAttribute("r", "5");
    this.startPointCircle.setAttribute("fill", "none");
    this.startPointCircle.setAttribute("stroke", COLOR_THEME.accent3);
    this.startPointCircle.setAttribute("stroke-width", "2");
    this.startPointCircle.style.display = "none";
    this.overlay.appendChild(this.startPointCircle);

    this.parentContainer.appendChild(this.overlay);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Backspace" && this.points.length > 0) {
      // Remove last point
      this.points.pop();
      this.updateOverlay();
      e.preventDefault();
      return;
    }
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
    this.updateOverlay();
  }

  private handleClick = (e: MouseEvent): void => {
    if (e.button !== 0) return;

    const point = this.eventToCanvasPoint(e);

    // Check if clicking near start point to close polygon (need at least 3 points)
    if (this.points.length >= 3) {
      const startPoint = this.points[0];
      const scaleFactor = this.getScaleFactor();
      const distance = Math.sqrt(
        Math.pow((point.x - startPoint.x) * scaleFactor, 2) +
        Math.pow((point.y - startPoint.y) * scaleFactor, 2),
      );
      if (distance <= PolygonalMaskSelectionTool.CLOSE_THRESHOLD) {
        this.commitPolygon();
        return;
      }
    }

    // Add new point
    this.points.push(point);
    this.updateOverlay();
  };

  private handleDoubleClick = (e: MouseEvent): void => {
    if (e.button !== 0) return;

    // Close and commit polygon on double-click (need at least 3 points)
    if (this.points.length >= 3) {
      this.commitPolygon();
    }
  };

  private handlePointerMove = (e: PointerEvent): void => {
    this.currentMousePoint = this.eventToCanvasPoint(e);
    this.updateOverlay();
  };

  private commitPolygon(): void {
    if (this.points.length >= 3) {
      const mask = this.createMaskFromPolygon();
      this.onCommit(mask, this.mode);
    }
    this.points = [];
    this.currentMousePoint = undefined;
    this.updateOverlay();
  }

  private createMaskFromPolygon(): ImageData {
    const mask = new ImageData(this.canvas.width, this.canvas.height);

    // Find bounding box with 1px padding for anti-aliasing
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const point of this.points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }

    // Expand by 1 pixel for anti-aliasing and clamp to canvas bounds
    minX = Math.max(0, Math.floor(minX) - 1);
    maxX = Math.min(this.canvas.width - 1, Math.ceil(maxX) + 1);
    minY = Math.max(0, Math.floor(minY) - 1);
    maxY = Math.min(this.canvas.height - 1, Math.ceil(maxY) + 1);

    // For each pixel in the bounding box, compute signed distance
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dist = this.signedDistanceToPolygon(x, y);

        // Apply anti-aliasing: dist > 0 means inside, dist < 0 means outside
        // Use 0.5 pixel range for smooth edge
        const alpha = Math.max(0, Math.min(1, dist + 0.5));

        if (alpha > 0) {
          const index = (y * mask.width + x) * 4;
          const intensity = Math.round(alpha * 255);
          mask.data[index] = intensity; // R
          mask.data[index + 1] = intensity; // G
          mask.data[index + 2] = intensity; // B
          mask.data[index + 3] = 255; // A
        }
      }
    }

    return mask;
  }

  private signedDistanceToPolygon(px: number, py: number): number {
    // Compute minimum distance to any edge
    let minDist = Infinity;
    for (let i = 0; i < this.points.length; i++) {
      const p1 = this.points[i];
      const p2 = this.points[(i + 1) % this.points.length];
      const dist = this.distanceToSegment(px, py, p1.x, p1.y, p2.x, p2.y);
      minDist = Math.min(minDist, dist);
    }

    // Determine if point is inside polygon using ray casting
    const inside = this.isPointInPolygon(px, py);

    return inside ? minDist : -minDist;
  }

  private distanceToSegment(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      // Segment is a point
      return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
    }

    // Project point onto line, clamped to segment
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
  }

  private isPointInPolygon(px: number, py: number): boolean {
    // Ray casting algorithm
    let inside = false;
    for (let i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
      const xi = this.points[i].x;
      const yi = this.points[i].y;
      const xj = this.points[j].x;
      const yj = this.points[j].y;

      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  public updateOverlay(): void {
    if (this.points.length === 0 && !this.currentMousePoint) {
      this.overlay.style.display = "none";
      return;
    }

    const canvasRect = this.canvas.getBoundingClientRect();
    const containerRect = this.canvasScrollContainer.getBoundingClientRect();
    const canvasLeft = canvasRect.left - containerRect.left;
    const canvasTop = canvasRect.top - containerRect.top;

    const scaleFactor = this.getScaleFactor();
    this.overlay.style.display = "block";
    this.overlay.style.left = `${canvasLeft}px`;
    this.overlay.style.top = `${canvasTop}px`;
    this.overlay.style.width = `${this.canvas.width * scaleFactor}px`;
    this.overlay.style.height = `${this.canvas.height * scaleFactor}px`;

    // Update stroke color based on mode
    let strokeColor = COLOR_THEME.accent3;
    switch (this.mode) {
      case SelectionMode.ADD:
        strokeColor = COLOR_THEME.selectionMaskAdd;
        break;
      case SelectionMode.SUBTRACT:
        strokeColor = COLOR_THEME.selectionMaskSubtract;
        break;
      case SelectionMode.INTERSECT:
        strokeColor = COLOR_THEME.selectionMaskIntersect;
        break;
    }
    this.pathElement.setAttribute("stroke", strokeColor);
    this.previewLineElement.setAttribute("stroke", strokeColor);
    this.startPointCircle.setAttribute("stroke", strokeColor);

    // Build path from committed points
    if (this.points.length > 0) {
      let pathD = "";
      for (let i = 0; i < this.points.length; i++) {
        const point = this.points[i];
        const x = point.x * scaleFactor;
        const y = point.y * scaleFactor;
        if (i === 0) {
          pathD = `M ${x} ${y}`;
        } else {
          pathD += ` L ${x} ${y}`;
        }
      }
      this.pathElement.setAttribute("d", pathD);

      // Show start point circle when we have 3+ points
      if (this.points.length >= 3) {
        const startX = this.points[0].x * scaleFactor;
        const startY = this.points[0].y * scaleFactor;
        this.startPointCircle.setAttribute("cx", String(startX));
        this.startPointCircle.setAttribute("cy", String(startY));
        this.startPointCircle.style.display = "block";
      } else {
        this.startPointCircle.style.display = "none";
      }

      // Show preview line from last point to current mouse
      if (this.currentMousePoint) {
        const lastPoint = this.points[this.points.length - 1];
        this.previewLineElement.setAttribute(
          "x1",
          String(lastPoint.x * scaleFactor),
        );
        this.previewLineElement.setAttribute(
          "y1",
          String(lastPoint.y * scaleFactor),
        );
        this.previewLineElement.setAttribute(
          "x2",
          String(this.currentMousePoint.x * scaleFactor),
        );
        this.previewLineElement.setAttribute(
          "y2",
          String(this.currentMousePoint.y * scaleFactor),
        );
        this.previewLineElement.style.display = "block";
      } else {
        this.previewLineElement.style.display = "none";
      }
    } else {
      this.pathElement.setAttribute("d", "");
      this.previewLineElement.style.display = "none";
      this.startPointCircle.style.display = "none";
    }
  }

  private eventToCanvasPoint(e: MouseEvent): { x: number; y: number } {
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
    this.canvasScrollContainer.removeEventListener("click", this.handleClick);
    this.canvasScrollContainer.removeEventListener(
      "dblclick",
      this.handleDoubleClick,
    );
    this.canvasScrollContainer.removeEventListener(
      "pointermove",
      this.handlePointerMove,
    );
    this.document.removeEventListener("keydown", this.handleKeyDown);
    this.document.removeEventListener("keyup", this.handleKeyUp);
  }
}
