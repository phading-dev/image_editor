import JSZip from "jszip";
import { Project } from "./project";
import { normalizeProjectMetadata } from "./project_normalizer";

export async function saveToZip(project: Project): Promise<Blob> {
  const zip = new JSZip();

  // Save project metadata as JSON
  zip.file("project.json", JSON.stringify(project.metadata));

  // Save each layer's canvas as PNG
  if (project.layersToCanvas) {
    const layersFolder = zip.folder("layers");
    for (const [layerId, canvas] of project.layersToCanvas) {
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/png");
      });
      layersFolder.file(`${layerId}.png`, blob);
    }
  }

  // Generate ZIP file
  return await zip.generateAsync({ type: "blob" });
}

export async function loadFromZip(zipBlob: Blob): Promise<Project> {
  const zip = await JSZip.loadAsync(zipBlob);

  // Load project metadata
  const projectJsonFile = zip.file("project.json");
  if (!projectJsonFile) {
    throw new Error("Invalid project file: missing project.json");
  }
  const projectJson = await projectJsonFile.async("text");
  const metadata = normalizeProjectMetadata(JSON.parse(projectJson));

  // Load layer images
  const layersToCanvas = new Map<string, HTMLCanvasElement>();

  // Iterate through all files in the ZIP and filter for layers folder
  let loadPromises: Promise<void>[] = [];
  zip.forEach((relativePath, zipEntry) => {
    // Only process files in the layers/ folder
    if (relativePath.startsWith("layers/") && !zipEntry.dir) {
      loadPromises.push(loadCanvas(relativePath, zipEntry, layersToCanvas));
    }
  });

  await Promise.all(loadPromises);

  return {
    metadata,
    layersToCanvas,
  };
}

async function loadCanvas(
  filename: string,
  zipEntry: JSZip.JSZipObject,
  layersToCanvas: Map<string, HTMLCanvasElement>,
): Promise<void> {
  const layerId = filename.replace("layers/", "").replace(".png", "");
  const imageBlob = await zipEntry.async("blob");
  const image = await loadImage(imageBlob);

  // Create canvas from image
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);

  layersToCanvas.set(layerId, canvas);
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(blob);
  });
}
