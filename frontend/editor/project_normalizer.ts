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
    if (layer.shadow) {
      layer.shadow.color ??= "#000000";
      layer.shadow.blur ??= 0;
      layer.shadow.offsetX ??= 0;
      layer.shadow.offsetY ??= 0;
    }
    if (layer.basicText) {
      layer.basicText.content ??= "";
      layer.basicText.color ??= "#000000";
      layer.basicText.fontFamily ??= "Arial";
      layer.basicText.fontSize ??= 24;
      layer.basicText.fontStyle ??= "normal";
      layer.basicText.fontWeight ??= "normal";
      layer.basicText.textAlign ??= "left";
      layer.basicText.letterSpacing ??= 0;
      layer.basicText.lineHeight ??= 1.2;
    }
  }
  projectMetadata.settings ??= {};
  projectMetadata.settings.foregroundColor ??= "#000000";
  projectMetadata.settings.backgroundColor ??= "#FFFFFF";
  projectMetadata.settings.paintToolSettings ??= {};
  projectMetadata.settings.paintToolSettings.brushSize ??= 1;
  return projectMetadata;
}
