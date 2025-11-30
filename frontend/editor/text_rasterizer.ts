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
  let y = (lineHeight - fontSize) / 2 + 1; // 1 is a magic number to align with how textarea renders text

  paragraphs.forEach((paragraph) => {
    const wrappedLines = wrapText(ctx, paragraph, canvas.width);
    wrappedLines.forEach((line) => {
      ctx.fillText(line, textX, y);
      y += lineHeight;
    });
  });
  return canvas;
}

/**
 * Wraps text to fit within a maximum width, matching textarea's default behavior.
 * Implements white-space: pre-wrap (preserves whitespace, wraps at boundaries)
 * and overflow-wrap: break-word (breaks long words when necessary).
 * 
 * @param ctx The canvas context (needed for text measurement)
 * @param text The text to wrap (single line/paragraph)
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

  // Handle empty string
  if (text === "") {
    return [""];
  }

  const lines: string[] = [];
  let currentLine = "";

  // Split by whitespace boundaries while preserving spaces
  // This regex splits but keeps the spaces
  const tokens = text.split(/(\s+)/);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Skip empty tokens
    if (token === "") {
      continue;
    }

    // Check if the token itself is a word that's too long (overflow-wrap: break-word)
    const tokenMetrics = ctx.measureText(token);
    const isLongWord = tokenMetrics.width > maxWidth && !/\s/.test(token);

    if (isLongWord) {
      // Token is a long word that needs to be broken character by character
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }

      // Break the word character by character
      for (let j = 0; j < token.length; j++) {
        const char = token[j];
        const testChar = currentLine + char;
        const charMetrics = ctx.measureText(testChar);

        if (charMetrics.width > maxWidth && currentLine !== "") {
          lines.push(currentLine);
          currentLine = char;
        } else {
          currentLine = testChar;
        }
      }
    } else {
      // Normal token (word or whitespace that fits)
      const testLine = currentLine + token;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine !== "") {
        // Normal word wrap
        lines.push(currentLine);
        currentLine = token;
      } else {
        currentLine = testLine;
      }
    }
  }

  // Push the last line
  if (currentLine !== "") {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}
