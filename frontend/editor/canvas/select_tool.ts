import { Layer } from "../project_metadata";

export class SelectTool {
  private static readonly SELECT_CLICK_DISTANCE = 5;

  private lastClickPos: { x: number; y: number } | null = null;
  private layersAtLastClick: Layer[] = [];
  private currentLayerIndex = 0;

  public constructor(
    private readonly canvasScrollContainer: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly getLayers: () => Layer[],
    private readonly onSelectLayer: (layerId: string) => void,
    private readonly onEditTextLayer: (layerId: string) => void,
  ) {
    this.canvasScrollContainer.style.cursor = "default";
    this.canvasScrollContainer.addEventListener("click", this.handleClick);
    this.canvasScrollContainer.addEventListener(
      "dblclick",
      this.handleDoubleClick,
    );
  }

  private handleClick = (event: MouseEvent): void => {
    if (event.button !== 0) {
      return;
    }

    const clickPos = this.eventToCanvasPoint(event);
    const layers = this.getLayersAtPosition(clickPos.x, clickPos.y);

    if (layers.length === 0) {
      // No layer clicked - could deselect or do nothing
      return;
    }

    // Check if this is a repeated click at the same position
    const isSamePosition =
      this.lastClickPos &&
      Math.abs(clickPos.x - this.lastClickPos.x) <
      SelectTool.SELECT_CLICK_DISTANCE &&
      Math.abs(clickPos.y - this.lastClickPos.y) <
      SelectTool.SELECT_CLICK_DISTANCE;

    if (isSamePosition && this.layersAtLastClick.length > 1) {
      // Cycle to next layer at this position
      this.currentLayerIndex =
        (this.currentLayerIndex + 1) % this.layersAtLastClick.length;
    } else {
      // New click location - select topmost layer
      this.layersAtLastClick = layers;
      this.currentLayerIndex = 0;
    }

    this.lastClickPos = clickPos;

    const selectedLayer = this.layersAtLastClick[this.currentLayerIndex];
    this.onSelectLayer(selectedLayer.id);
  };

  private handleDoubleClick = (event: MouseEvent): void => {
    const clickPos = this.eventToCanvasPoint(event);
    const layers = this.getLayersAtPosition(clickPos.x, clickPos.y);

    // Find first text layer at this position (Top-most)
    for (const layer of layers) {
      if (layer.basicText && !layer.locked) {
        // Ensure it's selected (in case we cycled away)
        this.onSelectLayer(layer.id);
        this.onEditTextLayer(layer.id);
        return;
      }
    }
  };

  private getLayersAtPosition(x: number, y: number): Layer[] {
    const layers = this.getLayers();
    const result: Layer[] = [];

    // Check from top to bottom
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (!layer.visible) {
        continue;
      }

      // Transform the click point into the layer's local coordinate space
      const transform = layer.transform;

      // Step 1: Translate to layer origin
      let localX = x - transform.translateX;
      let localY = y - transform.translateY;

      // Step 2: Apply inverse rotation (rotate by -angle)
      const angleRad = (-transform.rotation * Math.PI) / 180;
      const cosAngle = Math.cos(angleRad);
      const sinAngle = Math.sin(angleRad);
      const rotatedX = localX * cosAngle - localY * sinAngle;
      const rotatedY = localX * sinAngle + localY * cosAngle;

      // Step 3: Apply inverse scale
      const scaledX = rotatedX / transform.scaleX;
      const scaledY = rotatedY / transform.scaleY;

      // Step 4: Check if point is within layer bounds (0, 0, width, height)
      if (scaledX >= 0 && scaledX <= layer.width &&
        scaledY >= 0 && scaledY <= layer.height) {
        result.push(layer);
      }
    }

    return result;
  }

  private eventToCanvasPoint(event: MouseEvent): { x: number; y: number } {
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
    this.canvasScrollContainer.removeEventListener("click", this.handleClick);
    this.canvasScrollContainer.removeEventListener(
      "dblclick",
      this.handleDoubleClick,
    );
  }
}
