import { ProjectMetadata } from "./project_metadata";

export interface Project {
  metadata?: ProjectMetadata;
  layersToCanvas?: Map<string, HTMLCanvasElement>;
}
