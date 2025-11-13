import { Editor } from "./editor";
import { Project } from "./project";
import { loadFromZip } from "./project_serializer";

export class EditorFactory {
  public static create(documentBody: HTMLElement): EditorFactory {
    return new EditorFactory(Editor.create, documentBody);
  }

  private editor: Editor;

  public constructor(
    private createEditor: typeof Editor.create,
    private documentBody: HTMLElement,
  ) {
    let project: Project = {
      metadata: {
        name: "New Project",
        width: 800,
        height: 600,
        settings: {
          foregroundColor: "#FFFFFF",
          backgroundColor: "#000000",
          paintToolSettings: {
            brushColor: "#000000",
            brushSize: 1,
            strokeWidth: 1,
          },
        },
        layers: [],
      },
      layersToCanvas: new Map<string, HTMLCanvasElement>(),
    };
    this.editor = this.createEditor(() => this.loadProject(), project);
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
    this.editor = this.createEditor(() => this.loadProject(), loadedProject);
    this.documentBody.append(this.editor.element);
  }
}
