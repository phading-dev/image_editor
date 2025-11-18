import EventEmitter = require("events");
import { COLOR_THEME } from "../../color_theme";
import { FONT_S } from "../../sizes";
import { Project } from "../project";
import { Layer } from "../project_metadata";
import { MoveTool } from "./move_tool";
import { PaintTool } from "./paint_tool";
import { PanTool } from "./pan_tool";
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
    return new MainCanvasPanel(document, project);
  }

  private static readonly ZOOM_STEPS = [
    0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0,
  ];

  public readonly element: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly canvasScrollContainer: HTMLDivElement;
  private readonly activeLayerOutline: HTMLDivElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly zoomLevelDisplay: HTMLSpanElement;
  private readonly zoomOutButton: HTMLButtonElement;
  private readonly zoomInButton: HTMLButtonElement;
  private scaleFactor = 1.0;
  private getActiveLayerId: () => string;
  private getSelectedLayerIds: () => Set<string>;
  private paintTool: PaintTool;
  private moveTool: MoveTool;
  private panTool: PanTool;
  private toolSwitch = new TabsSwitcher();
  private selectPreviousTool: () => void;
  private resizeObserver: ResizeObserver;

  public constructor(
    private document: Document,
    private project: Project,
  ) {
    super();
    let canvasRef = new Ref<HTMLCanvasElement>();
    let canvasScrollContainerRef = new Ref<HTMLDivElement>();
    let activeLayerOutlineRef = new Ref<HTMLDivElement>();
    let zoomLevelDisplayRef = new Ref<HTMLSpanElement>();
    let zoomOutButtonRef = new Ref<HTMLButtonElement>();
    let zoomInButtonRef = new Ref<HTMLButtonElement>();

    this.element = E.div(
      {
        style: [
          "flex:1 0 0",
          "min-width:0",
          "height:100%",
          "display:flex",
          "flex-direction:column",
          `background:${COLOR_THEME.neutral4}`,
          "user-select: none",
        ].join("; "),
      },
      E.div(
        {
          style: [
            "flex:1 0 0",
            "min-height:0",
            "width:100%",
            "position:relative",
            "overflow:hidden",
            "display:flex",
            "flex-direction:column",
          ].join("; "),
        },
        E.div(
          {
            ref: canvasScrollContainerRef,
            style: [
              "flex:1 0 0",
              "min-height:0",
              "width:100%",
              "overflow:auto",
              "display:flex",
              "padding:5rem",
              "box-sizing:border-box",
              "touch-action:none",
            ].join("; "),
          },
          E.canvas({
            ref: canvasRef,
            style: [
              "margin: auto",
              "flex: 0 0 auto",
              "width: " + this.project.metadata.width + "px",
              "height: " + this.project.metadata.height + "px",
            ].join("; "),
          }),
        ),
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
      E.div(
        {
          style: [
            "padding: 0.5rem 1rem",
            "display: flex",
            "align-items: center",
            "justify-content: center",
            "gap: 0.5rem",
            `border-top: 1px solid ${COLOR_THEME.neutral3}`,
          ].join("; "),
        },
        E.button(
          {
            ref: zoomOutButtonRef,
            style: [
              `background:${COLOR_THEME.neutral3}`,
              `color:${COLOR_THEME.neutral0}`,
              "border:none",
              "border-radius:0.25rem",
              "cursor:pointer",
              "width:2rem",
              "height:2rem",
              "display:flex",
              "align-items:center",
              "justify-content:center",
            ].join("; "),
          },
          E.svg(
            {
              viewBox: "0 0 24 24",
              style: [
                "width:1rem",
                "height:1rem",
                `fill:${COLOR_THEME.neutral0}`,
              ].join(";"),
            },
            E.path({
              d: "M19 13H5v-2h14v2z",
            }),
          ),
        ),
        E.span(
          {
            ref: zoomLevelDisplayRef,
            style: [
              `font-size:${FONT_S}rem`,
              `color:${COLOR_THEME.neutral0}`,
              "min-width:3rem",
              "text-align:center",
            ].join("; "),
          },
          E.text("100%"),
        ),
        E.button(
          {
            ref: zoomInButtonRef,
            style: [
              `background:${COLOR_THEME.neutral3}`,
              `color:${COLOR_THEME.neutral0}`,
              "border:none",
              "border-radius:0.25rem",
              "cursor:pointer",
              "width:2rem",
              "height:2rem",
              "display:flex",
              "align-items:center",
              "justify-content:center",
            ].join("; "),
          },
          E.svg(
            {
              viewBox: "0 0 24 24",
              style: [
                "width:1rem",
                "height:1rem",
                `fill:${COLOR_THEME.neutral0}`,
              ].join(";"),
            },
            E.path({
              d: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
            }),
          ),
        ),
      ),
    );
    if (
      !canvasRef.val ||
      !canvasScrollContainerRef.val ||
      !activeLayerOutlineRef.val ||
      !zoomLevelDisplayRef.val ||
      !zoomOutButtonRef.val ||
      !zoomInButtonRef.val
    ) {
      throw new Error("MainCanvasPanel failed to initialize DOM refs.");
    }
    this.canvas = canvasRef.val;
    this.canvasScrollContainer = canvasScrollContainerRef.val;
    this.activeLayerOutline = activeLayerOutlineRef.val;
    this.zoomLevelDisplay = zoomLevelDisplayRef.val;
    this.zoomOutButton = zoomOutButtonRef.val;
    this.zoomInButton = zoomInButtonRef.val;

    this.canvas.width = this.project.metadata.width;
    this.canvas.height = this.project.metadata.height;
    this.context = this.canvas.getContext("2d");

    this.zoomOutButton.addEventListener("click", () => this.zoomOut());
    this.zoomInButton.addEventListener("click", () => this.zoomIn());
    this.document.addEventListener("keydown", this.handleKeyDown);
    this.document.addEventListener("keyup", this.handleKeyUp);
    this.canvasScrollContainer.addEventListener("scroll", () => {
      this.drawActiveLayerOutline();
    });
    this.resizeObserver = new ResizeObserver(() => {
      this.drawActiveLayerOutline();
    });
    this.resizeObserver.observe(this.canvasScrollContainer);

    this.selectMoveTool();
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Alt" && !e.repeat) {
      this.selectPanTool();
      e.preventDefault();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (e.key === "Alt") {
      this.selectPreviousTool();
      e.preventDefault();
    }
  };

  public rerender(): void {
    this.canvas.style.width = `${this.project.metadata.width * this.scaleFactor}px`;
    this.canvas.style.height = `${this.project.metadata.height * this.scaleFactor}px`;
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
    // Add a small offset so the outline is visible around the layer edges
    const outlineOffset = 2; // pixels at 1x scale
    const x = transform.translateX - outlineOffset;
    const y = transform.translateY - outlineOffset;
    // Calculate padding to allow scrolling to the outline
    const left =
      x * this.scaleFactor +
      this.canvas.offsetLeft -
      this.canvasScrollContainer.scrollLeft;
    const top =
      y * this.scaleFactor +
      this.canvas.offsetTop -
      this.canvasScrollContainer.scrollTop;
    const rectWidth = width * this.scaleFactor;
    const rectHeight = height * this.scaleFactor;

    // Position and size the outline (in canvas coordinates, will scale with container)
    this.activeLayerOutline.style.left = `${left}px`;
    this.activeLayerOutline.style.top = `${top}px`;
    this.activeLayerOutline.style.width = `${rectWidth}px`;
    this.activeLayerOutline.style.height = `${rectHeight}px`;
    this.activeLayerOutline.style.display = "block";
  }

  private updateZoomDisplay(): void {
    this.zoomLevelDisplay.textContent = `${Math.round(this.scaleFactor * 100)}%`;
  }

  public zoomIn(): void {
    const currentIndex = MainCanvasPanel.ZOOM_STEPS.findIndex(
      (step) => step > this.scaleFactor,
    );
    if (currentIndex !== -1) {
      this.scaleFactor = MainCanvasPanel.ZOOM_STEPS[currentIndex];
      this.rerender();
      this.updateZoomDisplay();
    }
  }

  public zoomOut(): void {
    const currentIndex = MainCanvasPanel.ZOOM_STEPS.findIndex(
      (step) => step >= this.scaleFactor,
    );
    if (currentIndex > 0) {
      this.scaleFactor = MainCanvasPanel.ZOOM_STEPS[currentIndex - 1];
      this.rerender();
      this.updateZoomDisplay();
    }
  }

  public setZoom(scale: number): void {
    this.scaleFactor = scale / 100;
    this.rerender();
    this.updateZoomDisplay();
  }

  public setGetActiveLayerId(getActiveLayerId: () => string): this {
    this.getActiveLayerId = getActiveLayerId;
    return this;
  }

  private getActiveLayer(): Layer {
    if (!this.getActiveLayerId) {
      return undefined;
    }
    return this.project.metadata.layers.find(
      (layer) => layer.id === this.getActiveLayerId(),
    );
  }

  private getActiveLayerContext(): CanvasRenderingContext2D {
    if (!this.getActiveLayerId) {
      return undefined;
    }
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
          this.project.metadata,
          () => this.getActiveLayer(),
          () => this.getActiveLayerContext(),
          () => this.rerender(),
          (context, oldImageData, newImageData) =>
            this.emit("paint", context, oldImageData, newImageData),
          (message: string) => this.emit("warning", message),
        );
        this.selectPreviousTool = () => this.selectPaintTool();
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
          this.canvasScrollContainer,
          this.canvas,
          () => this.getSelectedLayers(),
          () => this.rerender(),
          (layers, deltaX, deltaY) => this.emit("move", layers, deltaX, deltaY),
          (message: string) => this.emit("warning", message),
        );
        this.selectPreviousTool = () => this.selectMoveTool();
      },
      () => {
        this.moveTool.remove();
      },
    );
  }

  public selectPanTool(): void {
    this.toolSwitch.show(
      () => {
        this.panTool = new PanTool(this.canvasScrollContainer);
      },
      () => {
        this.panTool.remove();
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
    this.resizeObserver.disconnect();
  }
}
