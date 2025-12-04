import EventEmitter = require("events");
import { COLOR_THEME } from "../../color_theme";
import { FONT_S } from "../../sizes";
import { Project } from "../project";
import { Layer, Transform } from "../project_metadata";
import { rasterizeTextLayer } from "../text_rasterizer";
import { CropTool } from "./crop_tool";
import { FreeTransformTool } from "./free_transform_tool";
import { MoveTool } from "./move_tool";
import { PaintTool } from "./paint_tool";
import { PanTool } from "./pan_tool";
import { ResizeCanvasTool } from "./resize_canvas_tool";
import { SelectTool } from "./select_tool";
import { TextEditTool } from "./text_edit_tool";
import { E } from "@selfage/element/factory";
import { Ref } from "@selfage/ref";
import { TabsSwitcher } from "@selfage/tabs/switcher";

export interface MainCanvasPanel {
  on(event: "selectLayer", listener: (layerId: string) => void): this;
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
  on(
    event: "transform",
    listener: (
      layer: Layer,
      oldTransform: Transform,
      newTransform: Transform,
    ) => void,
  ): this;
  on(
    event: "crop",
    listener: (
      layer: Layer,
      cropRect: { x: number; y: number; width: number; height: number },
    ) => void,
  ): this;
  on(
    event: "resizeCanvas",
    listener: (
      newWidth: number,
      newHeight: number,
      deltaX: number,
      deltaY: number,
    ) => void,
  ): this;
  on(
    event: "textEdit",
    listener: (layer: Layer, oldText: string, newText: string) => void,
  ): this;
  on(
    event: "resizeTextLayer",
    listener: (
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
  private readonly canvasContainer: HTMLDivElement;
  private readonly canvasScrollContainer: HTMLDivElement;
  private readonly outlineContainerParent: HTMLDivElement;
  private readonly outlineContainer: HTMLDivElement;
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
  private freeTransformTool: FreeTransformTool;
  private cropTool: CropTool;
  private resizeCanvasTool: ResizeCanvasTool;
  private panTool: PanTool;
  private textEditTool: TextEditTool;
  private selectTool: SelectTool;
  private toolSwitch = new TabsSwitcher();
  private selectPreviousTool: () => void;
  private resizeObserver: ResizeObserver;

  public constructor(
    private document: Document,
    private project: Project,
  ) {
    super();
    let canvasRef = new Ref<HTMLCanvasElement>();
    let canvasContainerRef = new Ref<HTMLDivElement>();
    let canvasScrollContainerRef = new Ref<HTMLDivElement>();
    let outlineContainerParentRef = new Ref<HTMLDivElement>();
    let outlineContainerRef = new Ref<HTMLDivElement>();
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
          ref: outlineContainerParentRef,
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
          E.div(
            {
              ref: canvasContainerRef,
              style: [
                "margin: auto",
                "flex: 0 0 auto",
                "width: " + this.project.metadata.width + "px",
                "height: " + this.project.metadata.height + "px",
                "position: relative",
                "overflow: hidden",
              ].join("; "),
            },
            E.canvas({
              ref: canvasRef,
              style: ["width: 100%", "height: 100%", "display: block"].join(
                "; ",
              ),
            }),
          ),
        ),
        E.div(
          {
            ref: outlineContainerRef,
            style: [
              "position: absolute",
              "pointer-events: none",
              "display: none",
            ].join("; "),
          },
          E.div({
            ref: activeLayerOutlineRef,
            style: [
              "position: absolute",
              "pointer-events: none",
              `border: 2px dashed ${COLOR_THEME.neutral3}`,
              "left: -2px",
              "top: -2px",
            ].join("; "),
          }),
        ),
      ),
      E.div(
        {
          style: [
            "padding: 0.5rem 1rem",
            "display: flex",
            "align-items: center",
            "justify-content: center",
            "gap: 0.5rem",
            `border-top: 0.0625rem solid ${COLOR_THEME.neutral3}`,
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
      !canvasContainerRef.val ||
      !canvasScrollContainerRef.val ||
      !outlineContainerParentRef.val ||
      !outlineContainerRef.val ||
      !activeLayerOutlineRef.val ||
      !zoomLevelDisplayRef.val ||
      !zoomOutButtonRef.val ||
      !zoomInButtonRef.val
    ) {
      throw new Error("MainCanvasPanel failed to initialize DOM refs.");
    }
    this.canvas = canvasRef.val;
    this.canvasContainer = canvasContainerRef.val;
    this.canvasScrollContainer = canvasScrollContainerRef.val;
    this.outlineContainerParent = outlineContainerParentRef.val;
    this.outlineContainer = outlineContainerRef.val;
    this.activeLayerOutline = activeLayerOutlineRef.val;
    this.zoomLevelDisplay = zoomLevelDisplayRef.val;
    this.zoomOutButton = zoomOutButtonRef.val;
    this.zoomInButton = zoomInButtonRef.val;
    this.context = this.canvas.getContext("2d");

    this.zoomOutButton.addEventListener("click", () => this.zoomOut());
    this.zoomInButton.addEventListener("click", () => this.zoomIn());
    this.document.addEventListener("keydown", this.handleKeyDown);
    this.document.addEventListener("keyup", this.handleKeyUp);
    this.canvasScrollContainer.addEventListener("scroll", () => {
      this.drawActiveLayerOutlineAndHandles();
    });
    this.resizeObserver = new ResizeObserver(() => {
      this.drawActiveLayerOutlineAndHandles();
    });
    this.resizeObserver.observe(this.canvasScrollContainer);

    this.selectSelectTool();
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      this.selectSelectTool();
      e.preventDefault();
    } else if (e.key === "Alt" && !e.repeat) {
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
    this.canvasContainer.style.width = `${this.project.metadata.width * this.scaleFactor}px`;
    this.canvasContainer.style.height = `${this.project.metadata.height * this.scaleFactor}px`;
    this.canvas.width = this.project.metadata.width;
    this.canvas.height = this.project.metadata.height;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Draw checkerboard pattern to indicate transparency
    this.drawCheckerboard();
    this.renderLayers();
    this.drawActiveLayerOutlineAndHandles();
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

  private renderLayers(): void {
    // Clear all layer elements from canvasContainer (keep only the main canvas)
    const children = Array.from(this.canvasContainer.children);
    for (const child of children) {
      if (child !== this.canvas) {
        child.remove();
      }
    }

    // Add all layers as DOM elements in reverse order (bottom to top)
    // Since we append in reverse order, the first layer (index 0, top) will be appended last and appear on top
    let layers = this.project.metadata.layers;
    for (let index = layers.length - 1; index >= 0; index--) {
      let layer = layers[index];
      if (layer.visible === false) {
        continue;
      }

      if (layer.basicText) {
        // Render text layer as textarea
        let textarea = this.project.layersToTextareas.get(layer.id);
        textarea.value = layer.basicText.content;
        this.canvasContainer.appendChild(textarea);
        this.updateTextareaStyle(textarea, layer);
      } else {
        // Render canvas layer
        let layerCanvas = this.project.layersToCanvas.get(layer.id);
        this.canvasContainer.appendChild(layerCanvas);
        this.updateLayerCanvasStyle(layerCanvas, layer);
      }
    }
  }

  private updateLayerCanvasStyle(
    canvas: HTMLCanvasElement,
    layer: Layer,
  ): void {
    // Position and styling
    canvas.style.position = "absolute";
    canvas.style.left = `${layer.transform.translateX * this.scaleFactor}px`;
    canvas.style.top = `${layer.transform.translateY * this.scaleFactor}px`;
    canvas.style.transformOrigin = "0 0";
    canvas.style.transform = `rotate(${layer.transform.rotation}deg) scale(${layer.transform.scaleX * this.scaleFactor}, ${layer.transform.scaleY * this.scaleFactor})`;
    canvas.style.opacity = `${layer.opacity / 100}`;
    canvas.style.pointerEvents = "none";
    if (layer.shadow) {
      canvas.style.filter = `drop-shadow(${layer.shadow.offsetX}px ${layer.shadow.offsetY}px ${layer.shadow.blur}px ${layer.shadow.color})`;
    } else {
      canvas.style.filter = "none";
    }
  }

  private updateTextareaStyle(
    textarea: HTMLTextAreaElement,
    layer: Layer,
  ): void {
    textarea.setSelectionRange(0, 0);
    const basicText = layer.basicText;
    textarea.style.fontFamily = basicText.fontFamily;
    textarea.style.fontSize = `${basicText.fontSize}px`;
    textarea.style.fontWeight = basicText.fontWeight;
    textarea.style.fontStyle = basicText.fontStyle;
    textarea.style.color = basicText.color;
    textarea.style.textAlign = basicText.textAlign;
    textarea.style.lineHeight = `${basicText.lineHeight}`;
    textarea.style.verticalAlign = "top";
    textarea.style.letterSpacing = `${basicText.letterSpacing}px`;
    textarea.style.width = `${layer.width}px`;
    textarea.style.height = `${layer.height}px`;
    textarea.style.opacity = `${layer.opacity / 100}`;
    if (layer.shadow) {
      textarea.style.filter = `drop-shadow(${layer.shadow.offsetX}px ${layer.shadow.offsetY}px ${layer.shadow.blur}px ${layer.shadow.color})`;
    } else {
      textarea.style.filter = "none";
    }

    // Basic textarea styling
    textarea.style.position = "absolute";
    textarea.style.resize = "none";
    textarea.style.border = "none";
    textarea.style.background = "transparent";
    textarea.style.outline = "none";
    textarea.style.padding = "0";
    textarea.style.margin = "0";
    textarea.style.overflow = "hidden";
    textarea.style.pointerEvents = "none";
    textarea.readOnly = true;

    // Position and transforms
    textarea.style.left = `${layer.transform.translateX * this.scaleFactor}px`;
    textarea.style.top = `${layer.transform.translateY * this.scaleFactor}px`;
    textarea.style.transformOrigin = "0 0";
    textarea.style.transform = `rotate(${layer.transform.rotation}deg) scale(${layer.transform.scaleX * this.scaleFactor}, ${layer.transform.scaleY * this.scaleFactor})`;
  }

  public drawActiveLayerOutlineAndHandles(): void {
    this.drawActiveLayerOutline();
    this.freeTransformTool?.updateHandlePositions();
    this.textEditTool?.updateBorderAndHandlePositionsAndEditingStyle();
    this.cropTool?.updateOverlayAndHandles();
    this.resizeCanvasTool?.updateOverlayAndHandles();
  }

  private drawActiveLayerOutline(): void {
    const activeLayer = this.getActiveLayer();
    if (!activeLayer) {
      this.outlineContainer.style.display = "none";
      return;
    }

    // Calculate the bounding box of the layer after transformations
    const transform = activeLayer.transform;
    // Get actual screen positions using getBoundingClientRect for accuracy
    const canvasRect = this.canvas.getBoundingClientRect();
    const containerRect = this.canvasScrollContainer.getBoundingClientRect();
    // Calculate position in screen pixels, then convert to position relative to container and convert to position relative to the scroll container's parent
    const left =
      canvasRect.left -
      containerRect.left +
      transform.translateX * this.scaleFactor;
    const top =
      canvasRect.top -
      containerRect.top +
      transform.translateY * this.scaleFactor;
    // Position the wrapper container (no rotation)
    this.outlineContainer.style.left = `${left}px`;
    this.outlineContainer.style.top = `${top}px`;
    this.outlineContainer.style.display = "block";

    const rectWidth = activeLayer.width * transform.scaleX * this.scaleFactor;
    const rectHeight = activeLayer.height * transform.scaleY * this.scaleFactor;
    // The outline div handles rotation and size
    this.activeLayerOutline.style.width = `${rectWidth}px`;
    this.activeLayerOutline.style.height = `${rectHeight}px`;
    // Transform origin should be the top-left of the layer content excluding the border
    this.activeLayerOutline.style.transformOrigin = `2px 2px`;
    this.activeLayerOutline.style.transform = `rotate(${transform.rotation}deg)`;
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
          (context, oldImageData, newImageData) =>
            this.emit("paint", context, oldImageData, newImageData),
          (message: string) => this.emit("warning", message),
        );
        this.selectPreviousTool = () => this.selectPaintTool();
      },
      () => {
        this.paintTool.remove();
        this.paintTool = undefined;
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
          (layerId) => this.project.layersToCanvas.get(layerId),
          (canvas, layer) => this.updateLayerCanvasStyle(canvas, layer),
          (layerId) => this.project.layersToTextareas.get(layerId),
          (textarea, layer) => this.updateTextareaStyle(textarea, layer),
          () => this.drawActiveLayerOutline(),
          (layers: Layer[], deltaX: number, deltaY: number) => this.emit("move", layers, deltaX, deltaY),
          (message: string) => this.emit("warning", message),
        );
        this.selectPreviousTool = () => this.selectMoveTool();
      },
      () => {
        this.moveTool.remove();
        this.moveTool = undefined;
      },
    );
  }

  public selectFreeTransformTool(): void {
    this.toolSwitch.show(
      () => {
        this.freeTransformTool = new FreeTransformTool(
          this.canvasScrollContainer,
          this.canvas,
          this.outlineContainer,
          () => this.scaleFactor,
          () => this.getActiveLayer(),
          (layerId) => this.project.layersToCanvas.get(layerId),
          (canvas, layer) => this.updateLayerCanvasStyle(canvas, layer),
          (layerId) => this.project.layersToTextareas.get(layerId),
          (textarea, layer) => this.updateTextareaStyle(textarea, layer),
          () => this.drawActiveLayerOutline(),
          (layer, oldTransform, newTransform) =>
            this.emit("transform", layer, oldTransform, newTransform),
          (message: string) => this.emit("warning", message),
        );
        this.freeTransformTool.updateHandlePositions();
        this.selectPreviousTool = () => this.selectFreeTransformTool();
      },
      () => {
        this.freeTransformTool.remove();
        this.freeTransformTool = undefined;
      },
    );
  }

  public selectSelectTool(): void {
    this.toolSwitch.show(
      () => {
        this.selectTool = new SelectTool(
          this.canvasScrollContainer,
          this.canvas,
          () => this.project.metadata.layers,
          (layerId: string) => this.emit("selectLayer", layerId),
          () => this.selectTextEditTool(),
        );
        this.selectPreviousTool = () => this.selectSelectTool();
      },
      () => {
        this.selectTool.remove();
        this.selectTool = undefined;
      },
    );
  }

  public selectCropTool(): void {
    this.toolSwitch.show(
      () => {
        this.cropTool = new CropTool(
          this.outlineContainerParent,
          this.canvasScrollContainer,
          this.canvas,
          () => this.scaleFactor,
          () => this.getActiveLayer(),
          (layer, cropRect) => this.emit("crop", layer, cropRect),
          (message) => this.emit("warning", message),
        );
        this.selectPreviousTool = () => this.selectCropTool();
      },
      () => {
        this.cropTool.remove();
        this.cropTool = undefined;
      },
    );
  }

  public selectResizeCanvasTool(): void {
    this.toolSwitch.show(
      () => {
        this.resizeCanvasTool = new ResizeCanvasTool(
          this.outlineContainerParent,
          this.canvasScrollContainer,
          this.canvas,
          () => this.scaleFactor,
          (newWidth, newHeight, deltaX, deltaY) =>
            this.emit("resizeCanvas", newWidth, newHeight, deltaX, deltaY),
        );
        this.selectPreviousTool = () => this.selectResizeCanvasTool();
      },
      () => {
        this.resizeCanvasTool.remove();
        this.resizeCanvasTool = undefined;
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
        this.panTool = undefined;
      },
    );
  }

  public selectTextEditTool(): void {
    const activeLayer = this.getActiveLayer();
    const activeTextarea = activeLayer
      ? this.project.layersToTextareas.get(activeLayer.id)
      : undefined;
    // Assumes an active layer is selected and is a text layer.

    this.toolSwitch.show(
      () => {
        this.textEditTool = new TextEditTool(
          this.canvasScrollContainer,
          this.canvas,
          this.outlineContainer,
          () => this.scaleFactor,
          activeLayer,
          activeTextarea,
          (textarea, layer) => this.updateTextareaStyle(textarea, layer),
          () => this.drawActiveLayerOutline(),
          (
            layer,
            oldWidth,
            oldHeight,
            oldX,
            oldY,
            newWidth,
            newHeight,
            newX,
            newY,
          ) =>
            this.emit(
              "resizeTextLayer",
              layer,
              oldWidth,
              oldHeight,
              oldX,
              oldY,
              newWidth,
              newHeight,
              newX,
              newY,
            ),
          (layer, oldText, newText) => {
            this.emit("textEdit", layer, oldText, newText);
          },
          () => this.selectPreviousTool(),
          (message: string) => this.emit("warning", message),
        );
      },
      () => {
        let tool = this.textEditTool;
        this.textEditTool = undefined;
        // remove() may trigger rerender. By setting textEditTool to undefined first, we can avoid rendering special textarea editing style.
        tool.remove();
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
    this.rasterizeLayers(tempContext);

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

  private rasterizeLayers(context: CanvasRenderingContext2D): void {
    let layers = this.project.metadata.layers;
    for (let index = layers.length - 1; index >= 0; index--) {
      let layer = layers[index];
      if (layer.visible === false) {
        continue;
      }
      let layerCanvas = layer.basicText
        ? rasterizeTextLayer(layer)
        : this.project.layersToCanvas.get(layer.id);
      let opacity = Math.max(0, Math.min(1, layer.opacity / 100));
      context.save();
      context.globalAlpha = opacity;
      context.translate(layer.transform.translateX, layer.transform.translateY);
      // Rotate around the top-left corner to stay consistent with translation.
      context.rotate((layer.transform.rotation * Math.PI) / 180);
      context.scale(layer.transform.scaleX, layer.transform.scaleY);
      if (layer.shadow) {
        context.shadowColor = layer.shadow.color;
        context.shadowBlur = layer.shadow.blur;
        context.shadowOffsetX = layer.shadow.offsetX;
        context.shadowOffsetY = layer.shadow.offsetY;
      }
      context.drawImage(layerCanvas, 0, 0);
      context.restore();
    }
  }

  public remove(): void {
    this.canvas.remove();
    for (const textarea of this.project.layersToTextareas.values()) {
      textarea.remove();
    }
    this.removeAllListeners();
    this.resizeObserver.disconnect();
  }
}
