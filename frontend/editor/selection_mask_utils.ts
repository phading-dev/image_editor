export enum SelectionMode {
  REPLACE = "replace",
  ADD = "add",
  SUBTRACT = "subtract",
  INTERSECT = "intersect",
}

// Combine two masks using the specified mode
export function combineMasks(
  existing: ImageData,
  newMask: ImageData,
  mode: SelectionMode,
): ImageData {
  if (mode === SelectionMode.REPLACE) {
    return copyImageData(newMask);
  }

  const result = copyImageData(existing);

  for (let i = 0; i < result.data.length; i += 4) {
    const existingVal = existing.data[i];
    const newVal = newMask.data[i];

    let combinedVal: number;
    switch (mode) {
      case SelectionMode.ADD:
        combinedVal = Math.max(existingVal, newVal);
        break;
      case SelectionMode.SUBTRACT:
        combinedVal = existingVal * (1 - newVal / 255);
        break;
      case SelectionMode.INTERSECT:
        combinedVal = Math.min(existingVal, newVal);
        break;
      default:
        combinedVal = existingVal;
    }

    result.data[i] = combinedVal; // R
    result.data[i + 1] = combinedVal; // G
    result.data[i + 2] = combinedVal; // B
    result.data[i + 3] = 255; // A (always opaque)
  }

  return result;
}

// Helper to copy ImageData
export function copyImageData(source: ImageData): ImageData {
  const copy = new ImageData(source.width, source.height);
  copy.data.set(source.data);
  return copy;
}

// Detect edges in mask for marching ants rendering
// Returns array of edge pixel coordinates
export function getMaskEdges(
  mask: ImageData,
): Array<{ x: number; y: number }> {
  const edges: Array<{ x: number; y: number }> = [];
  const width = mask.width;
  const height = mask.height;

  // Simple edge detection: find pixels where mask value changes
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const value = mask.data[index];

      // Check if this pixel is selected (value > threshold)
      if (value > 127) {
        // Check if any neighbor is unselected (edge detection)
        let isEdge = false;

        // Check 4-connected neighbors
        const neighbors = [
          { dx: -1, dy: 0 }, // left
          { dx: 1, dy: 0 }, // right
          { dx: 0, dy: -1 }, // top
          { dx: 0, dy: 1 }, // bottom
        ];

        for (const { dx, dy } of neighbors) {
          const nx = x + dx;
          const ny = y + dy;

          // Out of bounds = edge
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
            isEdge = true;
            break;
          }

          const neighborIndex = (ny * width + nx) * 4;
          const neighborValue = mask.data[neighborIndex];

          // Neighbor is unselected = edge
          if (neighborValue <= 127) {
            isEdge = true;
            break;
          }
        }

        if (isEdge) {
          edges.push({ x, y });
        }
      }
    }
  }

  return edges;
}
