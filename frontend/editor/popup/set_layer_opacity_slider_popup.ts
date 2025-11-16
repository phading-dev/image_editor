import EventEmitter = require("events");
import { MainCanvasPanel } from "../canvas/main_canvas_panel";
import { LayersPanel } from "../layers_panel";
import { Layer } from "../project_metadata";
import { SliderPopup } from "./slider_popup";

export interface SetLayerOpacitySliderPopup {
  on(
    event: "commit",
    listener: (layer: Layer, oldOpacity: number, newOpacity: number) => void,
  ): this;
}

export class SetLayerOpacitySliderPopup extends EventEmitter {
  public static create(
    layer: Layer,
    layersPanel: LayersPanel,
    mainCanvasPanel: MainCanvasPanel,
  ): SetLayerOpacitySliderPopup {
    return new SetLayerOpacitySliderPopup(
      SliderPopup.create,
      layer,
      layersPanel,
      mainCanvasPanel,
    );
  }

  public readonly element: HTMLElement;
  private readonly sliderPopup: SliderPopup;
  private readonly initialOpacity: number;

  public constructor(
    private createSliderPopup: typeof SliderPopup.create,
    private layer: Layer,
    private layersPanel: LayersPanel,
    private mainCanvasPanel: MainCanvasPanel,
  ) {
    super();
    this.initialOpacity = layer.opacity;
    this.sliderPopup = this.createSliderPopup(
      "Set Layer Opacity",
      this.initialOpacity,
      0,
      100,
      "%",
    )
      .on("change", (newOpacity: number) => {
        this.layer.opacity = newOpacity;
        this.layersPanel.rerenderLayerRow(this.layer.id);
        this.mainCanvasPanel.rerender();
      })
      .on("commit", (oldOpacity: number, newOpacity: number) => {
        this.emit("commit", layer, oldOpacity, newOpacity);
      });

    this.element = this.sliderPopup.element;
  }

  public remove(): void {
    this.sliderPopup.remove();
    this.removeAllListeners();
  }
}
