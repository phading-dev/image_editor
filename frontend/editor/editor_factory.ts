import projectMetadataFilePath = require("./project_metadata.yaml");
import { Editor } from "./editor";
import { Project } from "./project";
import { normalizeProjectMetadata } from "./project_normalizer";
import { loadFromZip } from "./project_serializer";

export class EditorFactory {
  public static async create(
    documentBody: HTMLElement,
  ): Promise<EditorFactory> {
    const projectMetadataContent = await fetch(projectMetadataFilePath).then(
      (r) => r.text(),
    );
    return new EditorFactory(
      Editor.create,
      documentBody,
      projectMetadataContent,
    );
  }

  private editor: Editor;

  public constructor(
    private createEditor: typeof Editor.create,
    private documentBody: HTMLElement,
    private projectMetadataContent: string,
  ) {
    this.newProject();
  }

  private newProject(): void {
    let project: Project = {
      metadata: normalizeProjectMetadata({}),
      layersToCanvas: new Map<string, HTMLCanvasElement>(),
    };
    this.editor?.remove();
    this.editor = this.createEditor(
      () => this.newProject(),
      () => this.loadProject(),
      project,
      this.projectMetadataContent,
    );
    this.documentBody.append(this.editor.element);
  }

  private loadProject(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".zip";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await this.loadProjectToEditor(file);
      }
    };
    input.click();
  }

  private async loadProjectToEditor(file: File): Promise<void> {
    let loadedProject: Project;
    try {
      loadedProject = await loadFromZip(file);
    } catch (error) {
      console.error("Failed to load project:", error);
      throw error;
    }
    this.editor.remove();
    this.editor = this.createEditor(
      () => this.newProject(),
      () => this.loadProject(),
      loadedProject,
      this.projectMetadataContent,
    );
    this.documentBody.append(this.editor.element);
  }
}
