import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { Command } from "../command_history_manager";
import { rasterizeLayerToCanvas } from "../layer_rasterizer";
import { LayersPanel } from "../layers_panel";
import { Project } from "../project";
import { BasicText, Layer, Shadow, Transform } from "../project_metadata";

export class RasterizeLayerCommand implements Command {
  private oldCanvas: HTMLCanvasElement | undefined;
  private oldBasicText: BasicText | undefined;
  private oldWidth: number;
  private oldHeight: number;
  private oldTransform: Transform;
  private oldOpacity: number;
  private oldShadow: Shadow | undefined;
  private newCanvas: HTMLCanvasElement;

  public constructor(
    private project: Project,
    private layer: Layer,
    private mainCanvasPanel: MainCanvasPanel,
    private layersPanel: LayersPanel,
  ) {
    // Store old state for undo
    this.oldCanvas = this.project.layersToCanvas.get(this.layer.id);
    this.oldBasicText = this.layer.basicText;
    this.oldWidth = this.layer.width;
    this.oldHeight = this.layer.height;
    this.oldTransform = { ...this.layer.transform };
    this.oldOpacity = this.layer.opacity;
    this.oldShadow = this.layer.shadow ? { ...this.layer.shadow } : undefined;

    // Rasterize the layer with all transforms applied
    this.newCanvas = rasterizeLayerToCanvas(
      this.layer,
      this.oldCanvas,
      this.project.metadata.width,
      this.project.metadata.height,
    );
  }

  public do(): void {
    // Remove text layer data if present
    delete this.layer.basicText;
    // Resets everything.
    this.layer.width = this.project.metadata.width;
    this.layer.height = this.project.metadata.height;
    this.layer.transform = {
      translateX: 0,
      translateY: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    };
    this.layer.opacity = 100;
    delete this.layer.shadow;

    this.project.layersToCanvas.set(this.layer.id, this.newCanvas);
    this.mainCanvasPanel.rerender();
    this.layersPanel.rerenderLayerRow(this.layer.id);
  }

  public undo(): void {
    if (this.oldBasicText) {
      this.layer.basicText = this.oldBasicText;
      this.project.layersToCanvas.delete(this.layer.id);
    } else if (this.oldCanvas) {
      this.project.layersToCanvas.set(this.layer.id, this.oldCanvas);
    }

    this.layer.width = this.oldWidth;
    this.layer.height = this.oldHeight;
    this.layer.transform = this.oldTransform;
    this.layer.opacity = this.oldOpacity;
    if (this.oldShadow) {
      this.layer.shadow = this.oldShadow;
    } else {
      delete this.layer.shadow;
    }

    this.mainCanvasPanel.rerender();
    this.layersPanel.rerenderLayerRow(this.layer.id);
  }
}
