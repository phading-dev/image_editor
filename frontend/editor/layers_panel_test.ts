import { normalizeBody } from "../normalize_body";
import { LayersPanel } from "./layers_panel";
import { PROJECT, Project } from "./project";
import { eqMessage } from "@selfage/message/test_matcher";
import {
  mouseDown,
  mouseMove,
  mouseUp,
  setViewport,
} from "@selfage/puppeteer_test_executor_api";
import { TEST_RUNNER, TestCase } from "@selfage/puppeteer_test_runner/runner";
import { asyncAssertScreenshot } from "@selfage/screenshot_test_matcher";
import { assertThat } from "@selfage/test_matcher";

normalizeBody();

const waitForLayout = () => {
  document.body.offsetHeight; // Force layout
};

const getRowRect = (panel: LayersPanel, index: number) =>
  panel.layerRows[index].element.getBoundingClientRect();

const getPointOnRow = (
  panel: LayersPanel,
  index: number,
  verticalRatio: number,
) => {
  let rect = getRowRect(panel, index);
  return {
    x: Math.round(rect.left + rect.width / 2),
    y: Math.round(rect.top + rect.height * verticalRatio),
  };
};

const getPointBelowRow = (panel: LayersPanel, index: number) => {
  let rect = getRowRect(panel, index);
  return {
    x: Math.round(rect.left + rect.width / 2),
    y: Math.round(rect.bottom + 5),
  };
};

const dragRowToPoint = async (
  panel: LayersPanel,
  index: number,
  point: { x: number; y: number },
) => {
  let rect = getRowRect(panel, index);
  let startPoint = {
    x: Math.round(rect.left + rect.width / 2),
    y: Math.round(rect.top + rect.height / 2),
  };
  await mouseMove(startPoint.x, startPoint.y, 1);
  await mouseDown();
  await mouseMove(point.x, point.y, 1);
  await mouseUp();
  await waitForLayout();
};

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
        this.cut = new LayersPanel({ layers: [] });

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
        this.cut = new LayersPanel({
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
        });

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
          this.cut.layerRows[index].element.dispatchEvent(
            new MouseEvent("click", { bubbles: true, shiftKey }),
          );
        };

        // Act
        clickLayer(1);

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.click_without_shift.png",
          __dirname + "/golden/layers_panel_test.click_without_shift.png",
          __dirname + "/layers_panel_test.click_without_shift.diff.png",
        );

        // Act
        clickLayer(2, true);

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.shift_click_add.png",
          __dirname + "/golden/layers_panel_test.shift_click_add.png",
          __dirname + "/layers_panel_test.shift_click_add.diff.png",
        );

        // Act
        clickLayer(1, true);
        clickLayer(2, true);

        // Assert
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
        this.cut = new LayersPanel({ layers: [] });

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
        this.cut.addLayer({ id: "layer-new", name: "First Layer" });

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
          layers: [
            { id: "layer-2", name: "Existing Layer 2" },
            { id: "layer-1", name: "Existing Layer 1" },
          ],
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
        this.cut.addLayer({ id: "layer-new", name: "New Layer" });

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
      public name = "deletes default selected layer";
      private cut: LayersPanel;
      public async execute() {
        // Arrange
        this.cut = new LayersPanel({
          layers: [
            { id: "layer-2", name: "Layer Two" },
            { id: "layer-1", name: "Layer One" },
          ],
        });

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
        this.cut.deleteSelectedLayers();

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.delete_default_selected.after.png",
          __dirname +
            "/golden/layers_panel_test.delete_default_selected.after.png",
          __dirname +
            "/layers_panel_test.delete_default_selected.after.diff.png",
        );
      }
      public tearDown(): void {
        this.cut.element.remove();
      }
    })(),
    new (class implements TestCase {
      public name = "selects all layers then deletes all";
      private cut: LayersPanel;
      public async execute() {
        // Arrange
        this.cut = new LayersPanel({
          layers: [
            { id: "layer-3", name: "Layer Three" },
            { id: "layer-2", name: "Layer Two" },
            { id: "layer-1", name: "Layer One" },
          ],
        });

        // Act
        await setViewport(400, 600);
        document.body.appendChild(this.cut.element);

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.delete_all.before.png",
          __dirname + "/golden/layers_panel_test.delete_all.before.png",
          __dirname + "/layers_panel_test.delete_all.before.diff.png",
        );

        const clickLayer = (index: number, shiftKey = false) => {
          this.cut.layerRows[index].element.dispatchEvent(
            new MouseEvent("click", { bubbles: true, shiftKey }),
          );
        };

        // Act
        clickLayer(0);
        clickLayer(1, true);
        clickLayer(2, true);
        this.cut.deleteSelectedLayers();

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.delete_all.after.png",
          __dirname + "/golden/layers_panel_test.delete_all.after.png",
          __dirname + "/layers_panel_test.delete_all.after.diff.png",
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
          layers: [
            { id: "layer-4", name: "Layer Four" },
            { id: "layer-3", name: "Layer Three" },
            { id: "layer-2", name: "Layer Two" },
            { id: "layer-1", name: "Layer One" },
          ],
        };
        this.cut = new LayersPanel(project);

        // Act
        await setViewport(400, 600);
        document.body.appendChild(this.cut.element);
        await waitForLayout();
        await dragRowToPoint(this.cut, 1, getPointOnRow(this.cut, 1, 0.25));

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.drag_self_first_half.png",
          __dirname + "/golden/layers_panel_test.drag_self_first_half.png",
          __dirname + "/layers_panel_test.drag_self_first_half.diff.png",
        );
        assertThat(
          project,
          eqMessage(
            {
              layers: [
                { id: "layer-4", name: "Layer Four" },
                { id: "layer-3", name: "Layer Three" },
                { id: "layer-2", name: "Layer Two" },
                { id: "layer-1", name: "Layer One" },
              ],
            },
            PROJECT,
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
          layers: [
            { id: "layer-4", name: "Layer Four" },
            { id: "layer-3", name: "Layer Three" },
            { id: "layer-2", name: "Layer Two" },
            { id: "layer-1", name: "Layer One" },
          ],
        };
        this.cut = new LayersPanel(project);

        // Act
        await setViewport(400, 600);
        document.body.appendChild(this.cut.element);
        await waitForLayout();
        await dragRowToPoint(this.cut, 1, getPointOnRow(this.cut, 1, 0.75));

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.drag_self_second_half.png",
          __dirname + "/golden/layers_panel_test.drag_self_second_half.png",
          __dirname + "/layers_panel_test.drag_self_second_half.diff.png",
        );
        assertThat(
          project,
          eqMessage(
            {
              layers: [
                { id: "layer-4", name: "Layer Four" },
                { id: "layer-3", name: "Layer Three" },
                { id: "layer-2", name: "Layer Two" },
                { id: "layer-1", name: "Layer One" },
              ],
            },
            PROJECT,
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
          layers: [
            { id: "layer-4", name: "Layer Four" },
            { id: "layer-3", name: "Layer Three" },
            { id: "layer-2", name: "Layer Two" },
            { id: "layer-1", name: "Layer One" },
          ],
        };
        this.cut = new LayersPanel(project);

        // Act
        await setViewport(400, 600);
        document.body.appendChild(this.cut.element);
        await waitForLayout();
        await dragRowToPoint(
          this.cut,
          1,
          getPointBelowRow(this.cut, this.cut.layerRows.length - 1),
        );

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.drag_middle_below_last.png",
          __dirname + "/golden/layers_panel_test.drag_middle_below_last.png",
          __dirname + "/layers_panel_test.drag_middle_below_last.diff.png",
        );
        assertThat(
          project,
          eqMessage(
            {
              layers: [
                { id: "layer-4", name: "Layer Four" },
                { id: "layer-2", name: "Layer Two" },
                { id: "layer-1", name: "Layer One" },
                { id: "layer-3", name: "Layer Three" },
              ],
            },
            PROJECT,
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
          layers: [
            { id: "layer-4", name: "Layer Four" },
            { id: "layer-3", name: "Layer Three" },
            { id: "layer-2", name: "Layer Two" },
            { id: "layer-1", name: "Layer One" },
          ],
        };
        this.cut = new LayersPanel(project);

        // Act
        await setViewport(400, 600);
        document.body.appendChild(this.cut.element);
        await waitForLayout();
        await dragRowToPoint(
          this.cut,
          1,
          getPointOnRow(this.cut, this.cut.layerRows.length - 1, 0.75),
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
          project,
          eqMessage(
            {
              layers: [
                { id: "layer-4", name: "Layer Four" },
                { id: "layer-2", name: "Layer Two" },
                { id: "layer-1", name: "Layer One" },
                { id: "layer-3", name: "Layer Three" },
              ],
            },
            PROJECT,
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
          layers: [
            { id: "layer-4", name: "Layer Four" },
            { id: "layer-3", name: "Layer Three" },
            { id: "layer-2", name: "Layer Two" },
            { id: "layer-1", name: "Layer One" },
          ],
        };
        this.cut = new LayersPanel(project);

        // Act
        await setViewport(400, 600);
        document.body.appendChild(this.cut.element);
        await waitForLayout();
        await dragRowToPoint(
          this.cut,
          1,
          getPointOnRow(this.cut, this.cut.layerRows.length - 1, 0.25),
        );

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.drag_middle_first_half_last.png",
          __dirname +
            "/golden/layers_panel_test.drag_middle_first_half_last.png",
          __dirname + "/layers_panel_test.drag_middle_first_half_last.diff.png",
        );
        assertThat(
          project,
          eqMessage(
            {
              layers: [
                { id: "layer-4", name: "Layer Four" },
                { id: "layer-2", name: "Layer Two" },
                { id: "layer-3", name: "Layer Three" },
                { id: "layer-1", name: "Layer One" },
              ],
            },
            PROJECT,
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
          layers: [
            { id: "layer-4", name: "Layer Four" },
            { id: "layer-3", name: "Layer Three" },
            { id: "layer-2", name: "Layer Two" },
            { id: "layer-1", name: "Layer One" },
          ],
        };
        this.cut = new LayersPanel(project);

        // Act
        await setViewport(400, 600);
        document.body.appendChild(this.cut.element);
        await waitForLayout();
        await dragRowToPoint(this.cut, 2, getPointOnRow(this.cut, 0, 0.25));

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.drag_middle_first_half_first.png",
          __dirname +
            "/golden/layers_panel_test.drag_middle_first_half_first.png",
          __dirname +
            "/layers_panel_test.drag_middle_first_half_first.diff.png",
        );
        assertThat(
          project,
          eqMessage(
            {
              layers: [
                { id: "layer-2", name: "Layer Two" },
                { id: "layer-4", name: "Layer Four" },
                { id: "layer-3", name: "Layer Three" },
                { id: "layer-1", name: "Layer One" },
              ],
            },
            PROJECT,
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
          layers: [
            { id: "layer-4", name: "Layer Four" },
            { id: "layer-3", name: "Layer Three" },
            { id: "layer-2", name: "Layer Two" },
            { id: "layer-1", name: "Layer One" },
          ],
        };
        this.cut = new LayersPanel(project);

        // Act
        await setViewport(400, 600);
        document.body.appendChild(this.cut.element);
        await waitForLayout();
        await dragRowToPoint(this.cut, 2, getPointOnRow(this.cut, 0, 0.75));

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/layers_panel_test.drag_middle_second_half_first.png",
          __dirname +
            "/golden/layers_panel_test.drag_middle_second_half_first.png",
          __dirname +
            "/layers_panel_test.drag_middle_second_half_first.diff.png",
        );
        assertThat(
          project,
          eqMessage(
            {
              layers: [
                { id: "layer-4", name: "Layer Four" },
                { id: "layer-2", name: "Layer Two" },
                { id: "layer-3", name: "Layer Three" },
                { id: "layer-1", name: "Layer One" },
              ],
            },
            PROJECT,
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
