import { normalizeBody } from "../normalize_body";
import { Editor } from "./editor";
import { Project } from "./project";
import { setViewport } from "@selfage/puppeteer_test_executor_api";
import { TEST_RUNNER, TestCase } from "@selfage/puppeteer_test_runner/runner";
import { asyncAssertScreenshot } from "@selfage/screenshot_test_matcher";

normalizeBody();

TEST_RUNNER.run({
  name: "EditorTest",
  cases: [
    new (class implements TestCase {
      public name = "creates and initializes Editor";
      public cut: Editor;
      public async execute() {
        // Arrange
        let project: Project = {
          metadata: {
            name: "Test Project",
            width: 800,
            height: 600,
            layers: [
              {
                id: "layer-1",
                name: "Foreground",
                width: 800,
                height: 600,
                visible: true,
                opacity: 100,
                locked: false,
                transform: {
                  rotation: 0,
                  scaleX: 1,
                  scaleY: 1,
                  translateX: 0,
                  translateY: 0,
                }
              },
              {
                id: "layer-2",
                name: "Background",
                width: 800,
                height: 600,
                visible: true,
                opacity: 100,
                locked: false,
                transform: {
                  rotation: 0,
                  scaleX: 1,
                  scaleY: 1,
                  translateX: 0,
                  translateY: 0,
                }
              },
            ],
          },
          layersToCanvas: new Map<string, HTMLCanvasElement>(),
        };

        // Create canvas for layer-1 (Foreground) with a blue box
        let canvas1 = document.createElement("canvas");
        canvas1.width = 800;
        canvas1.height = 600;
        let context1 = canvas1.getContext("2d");
        context1.fillStyle = "#3498db";
        context1.fillRect(100, 100, 200, 150);
        project.layersToCanvas.set("layer-1", canvas1);

        // Create canvas for layer-2 (Background) with a red box
        let canvas2 = document.createElement("canvas");
        canvas2.width = 800;
        canvas2.height = 600;
        let context2 = canvas2.getContext("2d");
        context2.fillStyle = "#e74c3c";
        context2.fillRect(200, 200, 250, 180);
        project.layersToCanvas.set("layer-2", canvas2);

        this.cut = Editor.create(project);

        // Act
        await setViewport(1200, 800);
        document.body.appendChild(this.cut.element);
        await new Promise((resolve) => setTimeout(resolve, 1000000));

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/editor_test.create_and_initialize.png",
          __dirname + "/golden/editor_test.create_and_initialize.png",
          __dirname + "/editor_test.create_and_initialize.diff.png",
        );
      }
      public tearDown() {
        this.cut.remove();
      }
    })(),
  ],
});
