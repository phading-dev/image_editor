import { ProjectMetadata } from "./project_metadata";

export function normalizeProjectMetadata(
  projectMetadata?: ProjectMetadata,
): ProjectMetadata {
  projectMetadata ??= {};
  projectMetadata.name ??= "Untitled Project";
  projectMetadata.width ??= 800;
  projectMetadata.height ??= 600;
  projectMetadata.layers ??= [];
  for (let layer of projectMetadata.layers) {
    layer.id ??= crypto.randomUUID();
    layer.name ??= "Unnamed Layer";
    layer.visible ??= true;
    layer.opacity ??= 100;
    layer.locked ??= false;
    layer.width ??= projectMetadata.width;
    layer.height ??= projectMetadata.height;
    layer.transform ??= {};
    layer.transform.translateX ??= 0;
    layer.transform.translateY ??= 0;
    layer.transform.scaleX ??= 1;
    layer.transform.scaleY ??= 1;
    layer.transform.rotation ??= 0;
  }
  projectMetadata.settings ??= {};
  projectMetadata.settings.foregroundColor ??= "#FFFFFF";
  projectMetadata.settings.backgroundColor ??= "#000000";
  projectMetadata.settings.paintToolSettings ??= {};
  projectMetadata.settings.paintToolSettings.brushColor ??= "#000000";
  projectMetadata.settings.paintToolSettings.brushSize ??= 1;
  projectMetadata.settings.paintToolSettings.strokeWidth ??= 1;
  return projectMetadata;
}
