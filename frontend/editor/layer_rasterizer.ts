import { Layer } from "./project_metadata";
import { rasterizeTextLayer } from "./text_rasterizer";

/**
 * Rasterizes a single layer onto the given context, applying all transforms,
 * opacity, and shadow effects.
 *
 * @param context - The 2D rendering context to draw onto
 * @param layer - The layer to rasterize
 * @param layerCanvas - The canvas containing the layer's image data (undefined for text layers)
 */
export function rasterizeLayerToContext(
  context: CanvasRenderingContext2D,
  layer: Layer,
  layerCanvas: HTMLCanvasElement | undefined,
): void {
  const sourceCanvas = layer.basicText ? rasterizeTextLayer(layer) : layerCanvas;
  const opacity = Math.max(0, Math.min(1, layer.opacity / 100));

  context.save();
  context.globalAlpha = opacity;
  context.translate(layer.transform.translateX, layer.transform.translateY);
  context.rotate((layer.transform.rotation * Math.PI) / 180);
  context.scale(layer.transform.scaleX, layer.transform.scaleY);
  if (layer.shadow) {
    context.shadowColor = layer.shadow.color;
    context.shadowBlur = layer.shadow.blur;
    context.shadowOffsetX = layer.shadow.offsetX;
    context.shadowOffsetY = layer.shadow.offsetY;
  }
  context.drawImage(sourceCanvas, 0, 0);
  context.restore();
}

/**
 * Rasterizes a single layer to a new canvas with all transforms, opacity, and shadow applied.
 *
 * @param layer - The layer to rasterize
 * @param layerCanvas - The canvas containing the layer's image data (undefined for text layers)
 * @param canvasWidth - The width of the output canvas
 * @param canvasHeight - The height of the output canvas
 * @returns A new canvas with the rasterized layer
 */
export function rasterizeLayerToCanvas(
  layer: Layer,
  layerCanvas: HTMLCanvasElement | undefined,
  canvasWidth: number,
  canvasHeight: number,
): HTMLCanvasElement {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvasWidth;
  tempCanvas.height = canvasHeight;
  const tempCtx = tempCanvas.getContext("2d");
  rasterizeLayerToContext(tempCtx, layer, layerCanvas);
  return tempCanvas;
}
