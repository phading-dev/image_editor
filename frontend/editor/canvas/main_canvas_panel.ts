import EventEmitter = require("events");
import { COLOR_THEME } from "../../color_theme";
import { Project } from "../project";
import { Layer } from "../project_metadata";
import { MoveTool } from "./move_tool";
import { PaintTool } from "./paint_tool";
import { E } from "@selfage/element/factory";

export interface MainCanvasPanel {
  on(
    event: "paint",
    listener: (
      canvas: HTMLCanvasElement,
      oldImageData: ImageData,
      newImageData: ImageData,
    ) => void,
  ): this;
  on(
    event: "move",
    listener: (layer: Layer, deltaX: number, deltaY: number) => void,
  ): this;
}

export class MainCanvasPanel extends EventEmitter {
  public static create(project: Project): MainCanvasPanel {
    return new MainCanvasPanel(project);
  }

  public readonly element: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private getActiveLayerId: () => string;
  private paintTool: PaintTool;
  private moveTool: MoveTool;

  public constructor(private project: Project) {
    super();
    this.canvas = E.canvas({
      style: [
        "margin: auto;",
        "width: " + this.project.metadata.width + "px",
        "height: " + this.project.metadata.height + "px",
      ].join("; "),
    });
    this.canvas.width = this.project.metadata.width;
    this.canvas.height = this.project.metadata.height;
    this.context = this.canvas.getContext("2d");
    this.element = E.div(
      {
        style: [
          "flex:1 0 0",
          "min-width:0",
          "height:100%",
          "overflow:auto",
          "display:flex",
          `background:${COLOR_THEME.neutral4}`,
        ].join("; "),
      },
      this.canvas,
    );
    this.rerender();
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

  public rerender(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Draw checkerboard pattern to indicate transparency
    this.drawCheckerboard();

    let layers = this.project.metadata.layers;
    for (let index = layers.length - 1; index >= 0; index--) {
      let layer = layers[index];
      if (layer.visible === false) {
        continue;
      }
      let layerCanvas = this.project.layersToCanvas.get(layer.id);
      let opacity = Math.max(0, Math.min(1, layer.opacity / 100));
      this.context.save();
      this.context.globalAlpha = opacity;
      this.context.translate(
        layer.transform.translateX,
        layer.transform.translateY,
      );
      // Rotate around the top-left corner to stay consistent with translation.
      this.context.rotate((layer.transform.rotation * Math.PI) / 180);
      this.context.scale(layer.transform.scaleX, layer.transform.scaleY);
      this.context.drawImage(layerCanvas, 0, 0);
      this.context.restore();
    }
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

  public selectPaintTool(): void {
    this.paintTool = new PaintTool(
      this.canvas,
      () => this.getActiveLayer(),
      () => this.getActiveLayerContext(),
      () => this.rerender(),
      (canvas, oldImageData, newImageData) =>
        this.emit("paint", canvas, oldImageData, newImageData),
    );
    this.moveTool?.remove();
  }

  public selectMoveTool(): void {
    this.moveTool = new MoveTool(
      this.element,
      this.canvas,
      () => this.getActiveLayer(),
      (layer, deltaX, deltaY) => this.emit("move", layer, deltaX, deltaY),
    );
    this.paintTool?.remove();
  }

  public remove(): void {
    this.canvas.remove();
    this.removeAllListeners();
  }
}
