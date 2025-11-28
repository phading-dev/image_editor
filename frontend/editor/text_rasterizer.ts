import { Layer } from "./project_metadata";

/**
 * Rasterizes a text layer to a canvas element.
 * Converts the BasicText properties to rendered text on canvas.
 * 
 * @param layer The layer with basicText to rasterize
 * @returns A new canvas element with the rendered text
 */
export function rasterizeTextLayer(layer: Layer): HTMLCanvasElement {
  if (!layer.basicText) {
    throw new Error("Layer does not have basicText to rasterize");
  }

  const canvas = document.createElement("canvas");
  canvas.width = layer.width;
  canvas.height = layer.height;

  const ctx = canvas.getContext("2d");
  const basicText = layer.basicText;
  // Apply shadow if present
  if (layer.shadow) {
    ctx.shadowColor = layer.shadow.color;
    ctx.shadowBlur = layer.shadow.blur;
    ctx.shadowOffsetX = layer.shadow.offsetX;
    ctx.shadowOffsetY = layer.shadow.offsetY;
  }
  // Build font string
  const fontStyle = basicText.fontStyle;
  const fontWeight = basicText.fontWeight;
  const fontSize = basicText.fontSize;
  const fontFamily = basicText.fontFamily;
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

  // Set text properties
  ctx.fillStyle = basicText.color;
  ctx.textBaseline = "top";

  // Apply letter spacing if present
  if (basicText.letterSpacing) {
    ctx.letterSpacing = `${basicText.letterSpacing}px`;
  }

  // Handle text alignment
  let textX = 0;
  const textAlign = basicText.textAlign;
  if (textAlign === "center") {
    textX = canvas.width / 2;
    ctx.textAlign = "center";
  } else if (textAlign === "right") {
    textX = canvas.width;
    ctx.textAlign = "right";
  } else {
    ctx.textAlign = "left";
  }

  // Process and render text
  const content = basicText.content;
  const paragraphs = content.split("\n");
  const lineHeight = fontSize * basicText.lineHeight;
  let y = 0;

  paragraphs.forEach((paragraph) => {
    const wrappedLines = wrapText(ctx, paragraph, canvas.width - 20);
    wrappedLines.forEach((line) => {
      ctx.fillText(line, textX, y);
      y += lineHeight;
    });
  });
  return canvas;
}

/**
 * Wraps text to fit within a maximum width by breaking at word boundaries.
 * 
 * @param ctx The canvas context (needed for text measurement)
 * @param text The text to wrap
 * @param maxWidth Maximum width in pixels
 * @returns Array of wrapped lines
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (maxWidth <= 0) {
    return [text];
  }

  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine + (currentLine ? " " : "") + words[i];
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine !== "") {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}
