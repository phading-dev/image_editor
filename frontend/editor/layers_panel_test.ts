import { normalizeBody } from "../normalize_body";
import { LayersPanel } from "./layers_panel";
import { Project } from "./project";
import { PROJECT_METADATA } from "./project_metadata";
import { eqMessage } from "@selfage/message/test_matcher";
import {
  mouseDown,
  mouseMove,
  mouseUp,
  setViewport,
} from "@selfage/puppeteer_test_executor_api";
import { TEST_RUNNER, TestCase } from "@selfage/puppeteer_test_runner/runner";
import { asyncAssertScreenshot } from "@selfage/screenshot_test_matcher";
import { assertThat, eq, isArray } from "@selfage/test_matcher";

normalizeBody();

function waitForLayout() {
  document.body.offsetHeight; // Force layout
}

function getRowRect(panel: LayersPanel, project: Project, index: number) {
  return panel.layerRows
    .get(project.metadata.layers[index].id)
    .element.getBoundingClientRect();
}

function getPointOnRow(
  panel: LayersPanel,
  project: Project,
  index: number,
  verticalRatio: number,
) {
  let rect = getRowRect(panel, project, index);
  return {
    x: Math.round(rect.left + rect.width / 2),
    y: Math.round(rect.top + rect.height * verticalRatio),
  };
}

function getPointBelowRow(panel: LayersPanel, project: Project, index: number) {
  let rect = getRowRect(panel, project, index);
  return {
    x: Math.round(rect.left + rect.width / 2),
    y: Math.round(rect.bottom + 5),
  };
}

async function dragRowToPoint(
  panel: LayersPanel,
  project: Project,
  index: number,
  point: { x: number; y: number },
) {
  let rect = getRowRect(panel, project, index);
  let startPoint = {
    x: Math.round(rect.left + rect.width / 2),
    y: Math.round(rect.top + rect.height / 2),
  };
  await mouseMove(startPoint.x, startPoint.y, 1);
  await mouseDown();
  await mouseMove(point.x, point.y, 1);
  await mouseUp();
  await waitForLayout();
}

function reorderAction(
  project: Project,
  oldIndex: number,
  newIndex: number,
  cut: LayersPanel,
) {
  let layer = project.metadata.layers.splice(oldIndex, 1)[0];
  let beforeLayer = project.metadata.layers[newIndex];
  project.metadata.layers.splice(newIndex, 0, layer);
  cut.moveLayerRowBefore(layer.id, beforeLayer?.id);
}

TEST_RUNNER.run({
  name: "LayersPanelTest",
  environment: {
    setUp() {
      document.body.style.height = "100vh";
    },
    tearDown() {
      document.body.style.height = "";
    },
  },
  cases: [
    new (class implements TestCase {
      public name = "renders empty state";
      private cut: LayersPanel;
      public async execute() {
        // Arrange
        this.cut = new LayersPanel({ metadata: { layers: [] } });

        // Act
        await setViewport(400, 600);
        document.body.appendChild(this.cut.element);

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.empty_layers.png",
          __dirname + "/golden/layers_panel_test.empty_layers.png",
          __dirname + "/layers_panel_test.empty_layers.diff.png",
        );
      }
      public tearDown(): void {
        this.cut.element.remove();
      }
    })(),
    new (class implements TestCase {
      public name = "renders initial layers and handles selection";
      private cut: LayersPanel;
      public async execute() {
        // Arrange
        let project: Project = {
          metadata: {
            layers: [
              {
                id: "layer-4",
                name: "This is a layer with a super long name that should test how the UI handles very lengthy layer names in the layers panel",
              },
              {
                id: "layer-3",
                name: "Foreground",
                locked: false,
                visible: true,
                opacity: 10,
              },
              {
                id: "layer-2",
                name: "Midground",
                locked: false,
                visible: false,
                opacity: 100,
              },
              {
                id: "layer-1",
                name: "Background",
                locked: true,
                visible: true,
                opacity: 100,
              },
            ],
          },
        };
        this.cut = new LayersPanel(project);

        // Act
        await setViewport(400, 600);
        document.body.appendChild(this.cut.element);

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.initial_layers.png",
          __dirname + "/golden/layers_panel_test.initial_layers.png",
          __dirname + "/layers_panel_test.initial_layers.diff.png",
        );

        // Arrange
        const clickLayer = (index: number, shiftKey = false) => {
          this.cut.layerRows
            .get(project.metadata.layers[index].id)
            .element.dispatchEvent(
              new MouseEvent("click", { bubbles: true, shiftKey }),
            );
        };

        // Act
        clickLayer(1);

        // Assert
        assertThat(
          Array.from(this.cut.selectedLayerIds),
          isArray([eq("layer-3")]),
          "only layer 3 is selected",
        );
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.click_without_shift.png",
          __dirname + "/golden/layers_panel_test.click_without_shift.png",
          __dirname + "/layers_panel_test.click_without_shift.diff.png",
        );

        // Act
        clickLayer(2, true);

        // Assert
        assertThat(
          Array.from(this.cut.selectedLayerIds),
          isArray([eq("layer-3"), eq("layer-2")]),
          "layers 2 and 3 are selected",
        );
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.shift_click_add.png",
          __dirname + "/golden/layers_panel_test.shift_click_add.png",
          __dirname + "/layers_panel_test.shift_click_add.diff.png",
        );

        // Act
        clickLayer(1, true);
        clickLayer(2, true);

        // Assert
        assertThat(
          Array.from(this.cut.selectedLayerIds),
          isArray([eq("layer-2")]),
          "only layer 2 is selected",
        );
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.shift_click_selected.png",
          __dirname + "/golden/layers_panel_test.shift_click_selected.png",
          __dirname + "/layers_panel_test.shift_click_selected.diff.png",
        );
      }
      public tearDown(): void {
        this.cut.element.remove();
      }
    })(),
    new (class implements TestCase {
      public name = "adds layer to empty panel";
      private cut: LayersPanel;
      public async execute() {
        // Arrange
        this.cut = new LayersPanel({ metadata: { layers: [] } });

        // Act
        await setViewport(400, 600);
        document.body.appendChild(this.cut.element);

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.empty_state_before_add.png",
          __dirname + "/golden/layers_panel_test.empty_state_before_add.png",
          __dirname + "/layers_panel_test.empty_state_before_add.diff.png",
        );

        // Act
        this.cut.addLayerRow({ id: "layer-new", name: "First Layer" });

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.empty_state_after_add.png",
          __dirname + "/golden/layers_panel_test.empty_state_after_add.png",
          __dirname + "/layers_panel_test.empty_state_after_add.diff.png",
        );
      }
      public tearDown(): void {
        this.cut.element.remove();
      }
    })(),
    new (class implements TestCase {
      public name = "adds layer to panel";
      private cut: LayersPanel;
      public async execute() {
        // Arrange
        this.cut = new LayersPanel({
          metadata: {
            layers: [
              { id: "layer-2", name: "Existing Layer 2" },
              { id: "layer-1", name: "Existing Layer 1" },
            ],
          },
        });

        // Act
        await setViewport(400, 600);
        document.body.appendChild(this.cut.element);

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.before_add_layer.png",
          __dirname + "/golden/layers_panel_test.before_add_layer.png",
          __dirname + "/layers_panel_test.before_add_layer.diff.png",
        );

        // Act
        this.cut.addLayerRow({ id: "layer-new", name: "New Layer" });

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.after_add_layer.png",
          __dirname + "/golden/layers_panel_test.after_add_layer.png",
          __dirname + "/layers_panel_test.after_add_layer.diff.png",
        );
      }
      public tearDown(): void {
        this.cut.element.remove();
      }
    })(),
    new (class implements TestCase {
      public name = "deletes layer";
      private cut: LayersPanel;
      public async execute() {
        // Arrange
        let project: Project = {
          metadata: {
            layers: [
              { id: "layer-2", name: "Layer Two" },
              { id: "layer-1", name: "Layer One" },
            ],
          },
        };
        this.cut = new LayersPanel(project);

        // Act
        await setViewport(400, 600);
        document.body.appendChild(this.cut.element);

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.delete_default_selected.before.png",
          __dirname +
            "/golden/layers_panel_test.delete_default_selected.before.png",
          __dirname +
            "/layers_panel_test.delete_default_selected.before.diff.png",
        );

        // Act
        project.metadata.layers.shift();
        this.cut.deleteLayerRow("layer-2");

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.delete_default_selected.after.png",
          __dirname +
            "/golden/layers_panel_test.delete_default_selected.after.png",
          __dirname +
            "/layers_panel_test.delete_default_selected.after.diff.png",
        );

        // Act
        project.metadata.layers.pop();
        this.cut.deleteLayerRow("layer-1");

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.delete_default_selected.empty.png",
          __dirname +
            "/golden/layers_panel_test.delete_default_selected.empty.png",
          __dirname +
            "/layers_panel_test.delete_default_selected.empty.diff.png",
        );
      }
      public tearDown(): void {
        this.cut.element.remove();
      }
    })(),
    new (class implements TestCase {
      public name = "drag row onto first half of itself";
      private cut: LayersPanel;
      public async execute() {
        // Arrange
        let project: Project = {
          metadata: {
            layers: [
              { id: "layer-4", name: "Layer Four" },
              { id: "layer-3", name: "Layer Three" },
              { id: "layer-2", name: "Layer Two" },
              { id: "layer-1", name: "Layer One" },
            ],
          },
        };
        this.cut = new LayersPanel(project);
        this.cut.on("reorder", (oldIndex: number, newIndex: number) => {
          reorderAction(project, oldIndex, newIndex, this.cut);
        });

        // Act
        await setViewport(400, 600);
        document.body.appendChild(this.cut.element);
        await waitForLayout();
        await dragRowToPoint(
          this.cut,
          project,
          1,
          getPointOnRow(this.cut, project, 1, 0.25),
        );

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.drag_self_first_half.png",
          __dirname + "/golden/layers_panel_test.drag_self_first_half.png",
          __dirname + "/layers_panel_test.drag_self_first_half.diff.png",
        );
        assertThat(
          project.metadata,
          eqMessage(
            {
              layers: [
                { id: "layer-4", name: "Layer Four" },
                { id: "layer-3", name: "Layer Three" },
                { id: "layer-2", name: "Layer Two" },
                { id: "layer-1", name: "Layer One" },
              ],
            },
            PROJECT_METADATA,
          ),
          "layers remain unchanged after dragging onto first half",
        );
      }
      public tearDown(): void {
        this.cut.element.remove();
      }
    })(),
    new (class implements TestCase {
      public name = "drag row onto second half of itself";
      private cut: LayersPanel;
      public async execute() {
        // Arrange
        let project: Project = {
          metadata: {
            layers: [
              { id: "layer-4", name: "Layer Four" },
              { id: "layer-3", name: "Layer Three" },
              { id: "layer-2", name: "Layer Two" },
              { id: "layer-1", name: "Layer One" },
            ],
          },
        };
        this.cut = new LayersPanel(project);
        this.cut.on("reorder", (oldIndex: number, newIndex: number) => {
          reorderAction(project, oldIndex, newIndex, this.cut);
        });

        // Act
        await setViewport(400, 600);
        document.body.appendChild(this.cut.element);
        await waitForLayout();
        await dragRowToPoint(
          this.cut,
          project,
          1,
          getPointOnRow(this.cut, project, 1, 0.75),
        );

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.drag_self_second_half.png",
          __dirname + "/golden/layers_panel_test.drag_self_second_half.png",
          __dirname + "/layers_panel_test.drag_self_second_half.diff.png",
        );
        assertThat(
          project.metadata,
          eqMessage(
            {
              layers: [
                { id: "layer-4", name: "Layer Four" },
                { id: "layer-3", name: "Layer Three" },
                { id: "layer-2", name: "Layer Two" },
                { id: "layer-1", name: "Layer One" },
              ],
            },
            PROJECT_METADATA,
          ),
          "layers remain unchanged after dragging onto second half",
        );
      }
      public tearDown(): void {
        this.cut.element.remove();
      }
    })(),
    new (class implements TestCase {
      public name = "drag middle row below last row";
      private cut: LayersPanel;
      public async execute() {
        // Arrange
        let project: Project = {
          metadata: {
            layers: [
              { id: "layer-4", name: "Layer Four" },
              { id: "layer-3", name: "Layer Three" },
              { id: "layer-2", name: "Layer Two" },
              { id: "layer-1", name: "Layer One" },
            ],
          },
        };
        this.cut = new LayersPanel(project);
        this.cut.on("reorder", (oldIndex: number, newIndex: number) => {
          reorderAction(project, oldIndex, newIndex, this.cut);
        });

        // Act
        await setViewport(400, 600);
        document.body.appendChild(this.cut.element);
        await waitForLayout();
        await dragRowToPoint(
          this.cut,
          project,
          1,
          getPointBelowRow(this.cut, project, this.cut.layerRows.size - 1),
        );

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.drag_middle_below_last.png",
          __dirname + "/golden/layers_panel_test.drag_middle_below_last.png",
          __dirname + "/layers_panel_test.drag_middle_below_last.diff.png",
        );
        assertThat(
          project.metadata,
          eqMessage(
            {
              layers: [
                { id: "layer-4", name: "Layer Four" },
                { id: "layer-2", name: "Layer Two" },
                { id: "layer-1", name: "Layer One" },
                { id: "layer-3", name: "Layer Three" },
              ],
            },
            PROJECT_METADATA,
          ),
          "layer three moved below the last row",
        );
      }
      public tearDown(): void {
        this.cut.element.remove();
      }
    })(),
    new (class implements TestCase {
      public name = "drag middle row to second half of last row";
      private cut: LayersPanel;
      public async execute() {
        // Arrange
        let project: Project = {
          metadata: {
            layers: [
              { id: "layer-4", name: "Layer Four" },
              { id: "layer-3", name: "Layer Three" },
              { id: "layer-2", name: "Layer Two" },
              { id: "layer-1", name: "Layer One" },
            ],
          },
        };
        this.cut = new LayersPanel(project);
        this.cut.on("reorder", (oldIndex: number, newIndex: number) => {
          reorderAction(project, oldIndex, newIndex, this.cut);
        });

        // Act
        await setViewport(400, 600);
        document.body.appendChild(this.cut.element);
        await waitForLayout();
        await dragRowToPoint(
          this.cut,
          project,
          1,
          getPointOnRow(this.cut, project, this.cut.layerRows.size - 1, 0.75),
        );

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.drag_middle_second_half_last.png",
          __dirname +
            "/golden/layers_panel_test.drag_middle_second_half_last.png",
          __dirname +
            "/layers_panel_test.drag_middle_second_half_last.diff.png",
        );
        assertThat(
          project.metadata,
          eqMessage(
            {
              layers: [
                { id: "layer-4", name: "Layer Four" },
                { id: "layer-2", name: "Layer Two" },
                { id: "layer-1", name: "Layer One" },
                { id: "layer-3", name: "Layer Three" },
              ],
            },
            PROJECT_METADATA,
          ),
          "layer three moved after the last row",
        );
      }
      public tearDown(): void {
        this.cut.element.remove();
      }
    })(),
    new (class implements TestCase {
      public name = "drag middle row to first half of last row";
      private cut: LayersPanel;
      public async execute() {
        // Arrange
        let project: Project = {
          metadata: {
            layers: [
              { id: "layer-4", name: "Layer Four" },
              { id: "layer-3", name: "Layer Three" },
              { id: "layer-2", name: "Layer Two" },
              { id: "layer-1", name: "Layer One" },
            ],
          },
        };
        this.cut = new LayersPanel(project);
        this.cut.on("reorder", (oldIndex: number, newIndex: number) => {
          reorderAction(project, oldIndex, newIndex, this.cut);
        });

        // Act
        await setViewport(400, 600);
        document.body.appendChild(this.cut.element);
        await waitForLayout();
        await dragRowToPoint(
          this.cut,
          project,
          1,
          getPointOnRow(this.cut, project, this.cut.layerRows.size - 1, 0.25),
        );

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.drag_middle_first_half_last.png",
          __dirname +
            "/golden/layers_panel_test.drag_middle_first_half_last.png",
          __dirname + "/layers_panel_test.drag_middle_first_half_last.diff.png",
        );
        assertThat(
          project.metadata,
          eqMessage(
            {
              layers: [
                { id: "layer-4", name: "Layer Four" },
                { id: "layer-2", name: "Layer Two" },
                { id: "layer-3", name: "Layer Three" },
                { id: "layer-1", name: "Layer One" },
              ],
            },
            PROJECT_METADATA,
          ),
          "layer three inserted before the last row",
        );
      }
      public tearDown(): void {
        this.cut.element.remove();
      }
    })(),
    new (class implements TestCase {
      public name = "drag middle row to first half of first row";
      private cut: LayersPanel;
      public async execute() {
        // Arrange
        let project: Project = {
          metadata: {
            layers: [
              { id: "layer-4", name: "Layer Four" },
              { id: "layer-3", name: "Layer Three" },
              { id: "layer-2", name: "Layer Two" },
              { id: "layer-1", name: "Layer One" },
            ],
          },
        };
        this.cut = new LayersPanel(project);
        this.cut.on("reorder", (oldIndex: number, newIndex: number) => {
          reorderAction(project, oldIndex, newIndex, this.cut);
        });

        // Act
        await setViewport(400, 600);
        document.body.appendChild(this.cut.element);
        await waitForLayout();
        await dragRowToPoint(
          this.cut,
          project,
          2,
          getPointOnRow(this.cut, project, 0, 0.25),
        );

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.drag_middle_first_half_first.png",
          __dirname +
            "/golden/layers_panel_test.drag_middle_first_half_first.png",
          __dirname +
            "/layers_panel_test.drag_middle_first_half_first.diff.png",
        );
        assertThat(
          project.metadata,
          eqMessage(
            {
              layers: [
                { id: "layer-2", name: "Layer Two" },
                { id: "layer-4", name: "Layer Four" },
                { id: "layer-3", name: "Layer Three" },
                { id: "layer-1", name: "Layer One" },
              ],
            },
            PROJECT_METADATA,
          ),
          "layer two moved to the very top",
        );
      }
      public tearDown(): void {
        this.cut.element.remove();
      }
    })(),
    new (class implements TestCase {
      public name = "drag middle row to second half of first row";
      private cut: LayersPanel;
      public async execute() {
        // Arrange
        let project: Project = {
          metadata: {
            layers: [
              { id: "layer-4", name: "Layer Four" },
              { id: "layer-3", name: "Layer Three" },
              { id: "layer-2", name: "Layer Two" },
              { id: "layer-1", name: "Layer One" },
            ],
          },
        };
        this.cut = new LayersPanel(project);
        this.cut.on("reorder", (oldIndex: number, newIndex: number) => {
          reorderAction(project, oldIndex, newIndex, this.cut);
        });

        // Act
        await setViewport(400, 600);
        document.body.appendChild(this.cut.element);
        await waitForLayout();
        await dragRowToPoint(
          this.cut,
          project,
          2,
          getPointOnRow(this.cut, project, 0, 0.75),
        );

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.drag_middle_second_half_first.png",
          __dirname +
            "/golden/layers_panel_test.drag_middle_second_half_first.png",
          __dirname +
            "/layers_panel_test.drag_middle_second_half_first.diff.png",
        );
        assertThat(
          project.metadata,
          eqMessage(
            {
              layers: [
                { id: "layer-4", name: "Layer Four" },
                { id: "layer-2", name: "Layer Two" },
                { id: "layer-3", name: "Layer Three" },
                { id: "layer-1", name: "Layer One" },
              ],
            },
            PROJECT_METADATA,
          ),
          "layer two inserted after the first row",
        );
      }
      public tearDown(): void {
        this.cut.element.remove();
      }
    })(),
  ],
});
