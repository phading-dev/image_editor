import EventEmitter = require("events");
import { COLOR_THEME } from "../../color_theme";
import { Project } from "../project";
import { Layer } from "../project_metadata";
import { MoveTool } from "./move_tool";
import { PaintTool } from "./paint_tool";
import { E } from "@selfage/element/factory";
import { Ref } from "@selfage/ref";
import { TabsSwitcher } from "@selfage/tabs/switcher";

export interface MainCanvasPanel {
  on(
    event: "paint",
    listener: (
      context: CanvasRenderingContext2D,
      oldImageData: ImageData,
      newImageData: ImageData,
    ) => void,
  ): this;
  on(
    event: "move",
    listener: (layers: Layer[], deltaX: number, deltaY: number) => void,
  ): this;
  on(event: "warning", listener: (message: string) => void): this;
}

export class MainCanvasPanel extends EventEmitter {
  public static create(project: Project): MainCanvasPanel {
    return new MainCanvasPanel(project);
  }

  public readonly element: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly canvasContainer: HTMLDivElement;
  private readonly activeLayerOutline: HTMLDivElement;
  private readonly context: CanvasRenderingContext2D;
  private scaleFactor = 1.0;
  private getActiveLayerId: () => string;
  private getSelectedLayerIds: () => Set<string>;
  private paintTool: PaintTool;
  private moveTool: MoveTool;
  private toolSwitch = new TabsSwitcher();

  public constructor(private project: Project) {
    super();
    let canvasRef = new Ref<HTMLCanvasElement>();
    let canvasContainerRef = new Ref<HTMLDivElement>();
    let activeLayerOutlineRef = new Ref<HTMLDivElement>();

    this.element = E.div(
      {
        style: [
          "flex:1 0 0",
          "min-width:0",
          "height:100%",
          "overflow:auto",
          "display:flex",
          `background:${COLOR_THEME.neutral4}`,
          "user-select: none",
          "touch-action: none",
        ].join("; "),
      },
      E.div(
        {
          ref: canvasContainerRef,
          style: [
            "position: relative",
            "margin: auto",
            "width: " + this.project.metadata.width + "px",
            "height: " + this.project.metadata.height + "px",
          ].join("; "),
        },
        E.canvas({
          ref: canvasRef,
          style: "width: 100%; height: 100%;",
        }),
        E.div({
          ref: activeLayerOutlineRef,
          style: [
            "position: absolute",
            "pointer-events: none",
            `border: 2px dashed ${COLOR_THEME.neutral3}`,
            "display: none",
          ].join("; "),
        }),
      ),
    );
    if (
      !canvasRef.val ||
      !canvasContainerRef.val ||
      !activeLayerOutlineRef.val
    ) {
      throw new Error("MainCanvasPanel failed to initialize DOM refs.");
    }
    this.canvas = canvasRef.val;
    this.canvasContainer = canvasContainerRef.val;
    this.activeLayerOutline = activeLayerOutlineRef.val;

    this.canvas.width = this.project.metadata.width;
    this.canvas.height = this.project.metadata.height;
    this.context = this.canvas.getContext("2d");
  }

  public rerender(): void {
    this.canvasContainer.style.width = `${this.project.metadata.width * this.scaleFactor}px`;
    this.canvasContainer.style.height = `${this.project.metadata.height * this.scaleFactor}px`;
    this.drawActiveLayerOutline();
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Draw checkerboard pattern to indicate transparency
    this.drawCheckerboard();
    this.render(this.context);
  }

  private drawCheckerboard(): void {
    const squareSize = 10; // Size of each checkerboard square in pixels
    const lightColor = "#ffffff";
    const darkColor = "#cccccc";

    for (let y = 0; y < this.canvas.height; y += squareSize) {
      for (let x = 0; x < this.canvas.width; x += squareSize) {
        // Alternate colors based on position
        const isLight =
          (Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2 === 0;
        this.context.fillStyle = isLight ? lightColor : darkColor;
        this.context.fillRect(x, y, squareSize, squareSize);
      }
    }
  }

  private render(context: CanvasRenderingContext2D): void {
    let layers = this.project.metadata.layers;
    for (let index = layers.length - 1; index >= 0; index--) {
      let layer = layers[index];
      if (layer.visible === false) {
        continue;
      }
      let layerCanvas = this.project.layersToCanvas.get(layer.id);
      let opacity = Math.max(0, Math.min(1, layer.opacity / 100));
      context.save();
      context.globalAlpha = opacity;
      context.translate(layer.transform.translateX, layer.transform.translateY);
      // Rotate around the top-left corner to stay consistent with translation.
      context.rotate((layer.transform.rotation * Math.PI) / 180);
      context.scale(layer.transform.scaleX, layer.transform.scaleY);
      context.drawImage(layerCanvas, 0, 0);
      context.restore();
    }
  }

  private drawActiveLayerOutline(): void {
    const activeLayer = this.getActiveLayer();
    if (!activeLayer) {
      this.activeLayerOutline.style.display = "none";
      return;
    }

    // Calculate the bounding box of the layer after transformations
    const transform = activeLayer.transform;
    const width = activeLayer.width * transform.scaleX;
    const height = activeLayer.height * transform.scaleY;
    const x = transform.translateX;
    const y = transform.translateY;

    // Add a small offset so the outline is visible around the layer edges
    const outlineOffset = 2; // pixels at 1x scale

    // Position and size the outline (in canvas coordinates, will scale with container)
    this.activeLayerOutline.style.left = `${(x - outlineOffset) * this.scaleFactor}px`;
    this.activeLayerOutline.style.top = `${(y - outlineOffset) * this.scaleFactor}px`;
    this.activeLayerOutline.style.width = `${width * this.scaleFactor}px`;
    this.activeLayerOutline.style.height = `${height * this.scaleFactor}px`;
    this.activeLayerOutline.style.display = "block";
  }

  public scale(factor: number): void {
    this.scaleFactor = factor;
    this.rerender();
  }

  public setGetActiveLayerId(getActiveLayerId: () => string): this {
    this.getActiveLayerId = getActiveLayerId;
    return this;
  }

  private getActiveLayer(): Layer {
    return this.project.metadata.layers.find(
      (layer) => layer.id === this.getActiveLayerId(),
    );
  }

  private getActiveLayerContext(): CanvasRenderingContext2D {
    return this.project.layersToCanvas
      .get(this.getActiveLayerId())
      .getContext("2d");
  }

  public setGetSelectedLayerIds(getSelectedLayerIds: () => Set<string>): this {
    this.getSelectedLayerIds = getSelectedLayerIds;
    return this;
  }

  private getSelectedLayers(): Layer[] {
    const selectedIds = this.getSelectedLayerIds();
    return this.project.metadata.layers.filter((layer) =>
      selectedIds.has(layer.id),
    );
  }

  public selectPaintTool(): void {
    this.toolSwitch.show(
      () => {
        this.paintTool = new PaintTool(
          this.canvas,
          () => this.getActiveLayer(),
          () => this.getActiveLayerContext(),
          () => this.rerender(),
          (context, oldImageData, newImageData) =>
            this.emit("paint", context, oldImageData, newImageData),
          (message: string) => this.emit("warning", message),
        );
      },
      () => {
        this.paintTool.remove();
      },
    );
  }

  public selectMoveTool(): void {
    this.toolSwitch.show(
      () => {
        this.moveTool = new MoveTool(
          this.element,
          this.canvas,
          () => this.getSelectedLayers(),
          () => this.rerender(),
          (layers, deltaX, deltaY) => this.emit("move", layers, deltaX, deltaY),
          (message: string) => this.emit("warning", message),
        );
      },
      () => {
        this.moveTool.remove();
      },
    );
  }

  public async exportAsImage(
    filename: string,
    imageType: string,
    quality?: number,
  ): Promise<void> {
    // Create a temporary canvas without the checkerboard
    let tempCanvas = document.createElement("canvas");
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    let tempContext = tempCanvas.getContext("2d");
    this.render(tempContext);

    return new Promise((resolve, reject) => {
      tempCanvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to export canvas"));
            return;
          }
          let url = URL.createObjectURL(blob);
          let a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
          resolve();
        },
        `image/${imageType}`,
        quality,
      );
    });
  }

  public remove(): void {
    this.canvas.remove();
    this.removeAllListeners();
  }
}
