import EventEmitter = require("events");
import { COLOR_THEME } from "../color_theme";
import { FONT_S } from "../sizes";
import { Layer, Project } from "./project";
import { E } from "@selfage/element/factory";
import { Ref } from "@selfage/ref";

export interface LayerRowClickEvent {
  id: string;
  shiftKey: boolean;
}

export interface LayerRow {
  on(event: "click", listener: (event: LayerRowClickEvent) => void): this;
  on(event: "dragstart", listener: (event: DragEvent) => void): this;
  on(event: "dragover", listener: (event: DragEvent) => void): this;
  on(event: "drop", listener: (event: DragEvent) => void): this;
  on(event: "dragend", listener: (event: DragEvent) => void): this;
}

export class LayerRow extends EventEmitter {
  public id: string;
  public element: HTMLDivElement;

  public constructor(layer: Layer) {
    super();
    this.id = layer.id;
    let name = layer.name ?? "Untitled Layer";
    let visible = layer.visible !== false;
    let opacity = layer.opacity != null ? layer.opacity : 1;
    if (opacity > 1) {
      opacity = opacity / 100;
    }
    opacity = Math.max(0, Math.min(1, opacity));
    let locked = !!layer.locked;

    this.element = E.div(
      {
        style: [
          "padding:0.5rem 1rem",
          "display:flex",
          "align-items:center",
          "gap:0.5rem",
          `border-bottom:0.0625rem solid ${COLOR_THEME.neutral3}`,
          "background:transparent",
          "cursor:pointer",
        ].join(";"),
      },
      E.div(
        {
          style: [
            "flex:1",
            "display:flex",
            "align-items:center",
            "gap:0.5rem",
            "min-width:0",
          ].join(";"),
        },
        E.span(
          {
            style: [
              `font-size:${FONT_S}rem`,
              "white-space:nowrap",
              "overflow:hidden",
              "text-overflow:ellipsis",
              "flex:1",
            ].join(";"),
          },
          E.text(name),
        ),
      ),
      E.div(
        {
          style: [
            "display:flex",
            "align-items:center",
            "gap:0.25rem",
            "flex-wrap:wrap",
            "justify-content:flex-end",
          ].join(";"),
        },
        E.span(
          {
            style: [
              `font-size:${FONT_S * 0.85}rem`,
              `background:${COLOR_THEME.neutral3}`,
              `color:${COLOR_THEME.neutral0}`,
              "padding:0.125rem 0.375rem",
              "border-radius:0.375rem",
              "white-space:nowrap",
            ].join(";"),
          },
          E.text(visible ? "Visible" : "Hidden"),
        ),
        E.span(
          {
            style: [
              `font-size:${FONT_S * 0.85}rem`,
              `background:${COLOR_THEME.neutral3}`,
              `color:${COLOR_THEME.neutral0}`,
              "padding:0.125rem 0.375rem",
              "border-radius:0.375rem",
              "white-space:nowrap",
            ].join(";"),
          },
          E.text(`${Math.round(opacity * 100)}%`),
        ),
        E.span(
          {
            style: [
              `font-size:${FONT_S * 0.85}rem`,
              `background:${COLOR_THEME.neutral3}`,
              `color:${COLOR_THEME.neutral0}`,
              "padding:0.125rem 0.375rem",
              "border-radius:0.375rem",
              "white-space:nowrap",
            ].join(";"),
          },
          E.text(locked ? "Locked" : "Unlocked"),
        ),
      ),
    );
    this.element.draggable = true;
    this.element.addEventListener("click", (event) => {
      this.emit("click", {
        id: this.id,
        shiftKey: event.shiftKey,
      });
    });
    this.element.addEventListener("dragstart", (event) => {
      this.emit("dragstart", event);
    });
    this.element.addEventListener("dragover", (event) => {
      this.emit("dragover", event);
    });
    this.element.addEventListener("drop", (event) => {
      this.emit("drop", event);
    });
    this.element.addEventListener("dragend", (event) => {
      this.emit("dragend", event);
    });
  }

  public setSelected(selected: boolean): this {
    this.element.style.background = selected
      ? COLOR_THEME.neutral3
      : "transparent";
    return this;
  }

  public remove(): void {
    this.element.remove();
    this.removeAllListeners();
  }
}

export interface LayersPanel {
  on(event: "rerender", listener: () => void): this;
}

export class LayersPanel extends EventEmitter {
  public element: HTMLElement;
  private listContainer: HTMLDivElement;
  private emptyState: HTMLDivElement;
  public layerRows: Array<LayerRow> = [];
  private draggingRow?: LayerRow;
  public selectedLayerRows: Set<LayerRow> = new Set();
  public get getSelectedLayerIds(): Array<string> {
    return Array.from(this.selectedLayerRows).map((row) => row.id);
  }
  public get firstActiveSelectedLayerId(): string {
    for (let row of this.selectedLayerRows) {
      return row.id;
    }
    return undefined;
  }

  public constructor(private project: Project) {
    super();
    let listRef = new Ref<HTMLDivElement>();
    let emptyRef = new Ref<HTMLDivElement>();

    this.element = E.div(
      {
        class: "layers-panel",
        style: [
          "height:100%",
          "display:flex",
          "flex-direction:column",
          `background:${COLOR_THEME.neutral4}`,
          `color:${COLOR_THEME.neutral0}`,
          "box-sizing:border-box",
          "padding:0.75rem 0",
          "gap:0.5rem",
        ].join(";"),
      },
      E.div(
        {
          style: [
            "padding:0 1rem",
            `font-size:${FONT_S}rem`,
            "font-weight:600",
            "letter-spacing:0.02em",
            "text-transform:uppercase",
            `color:${COLOR_THEME.neutral1}`,
          ].join(";"),
        },
        E.text("Layers"),
      ),
      E.div(
        {
          ref: listRef,
          style: [
            "flex:1",
            "overflow-y:auto",
            "display:flex",
            "flex-direction:column",
          ].join(";"),
        },
        E.div(
          {
            ref: emptyRef,
            style: [
              "padding:1rem",
              `color:${COLOR_THEME.neutral2}`,
              `font-size:${FONT_S}rem`,
              "text-align:center",
            ].join(";"),
          },
          E.text("No layers to display."),
        ),
      ),
    );
    if (!listRef.val || !emptyRef.val) {
      throw new Error("LayersPanel failed to initialize.");
    }
    this.listContainer = listRef.val;
    this.emptyState = emptyRef.val;

    this.listContainer.addEventListener("dragover", (event) => {
      if (!this.draggingRow) {
        return;
      }
      event.preventDefault();
    });
    this.listContainer.addEventListener("drop", (event) => {
      if (!this.draggingRow) {
        return;
      }
      event.preventDefault();
      this.moveRowBefore(this.draggingRow);
    });

    for (let index = 0; index < project.layers.length; index++) {
      let row = this.createLayer(project.layers[index]).setSelected(false);
      this.listContainer.appendChild(row.element);
      this.layerRows.push(row);
    }
    this.updateEmptyState();
  }

  private createLayer(layer: Layer): LayerRow {
    let row = new LayerRow(layer);
    this.setupRowClickHandlers(row);
    this.setupRowDragHandlers(row);
    return row;
  }

  // No event emitted for this action
  public addLayer(layer: Layer): void {
    let row = this.createLayer(layer);
    this.listContainer.insertBefore(row.element, this.layerRows[0]?.element);
    this.layerRows.unshift(row);
    this.selectExclusiveLayer(row);
    this.emptyState.style.display = "none";
  }

  // No event emitted for this action
  public deleteSelectedLayers(): void {
    for (let row of this.selectedLayerRows) {
      row.remove();
      let index = this.layerRows.findIndex((r) => r === row);
      this.layerRows.splice(index, 1);
    }
    this.selectedLayerRows.clear();
    this.updateEmptyState();
  }

  private updateEmptyState(): void {
    if (!this.layerRows.length) {
      this.emptyState.style.display = "block";
    } else {
      if (!this.selectedLayerRows.size) {
        let firstLayer = this.layerRows[0];
        firstLayer.setSelected(true);
        this.selectedLayerRows.add(firstLayer);
      }
      this.emptyState.style.display = "none";
    }
  }

  private setupRowClickHandlers(row: LayerRow): void {
    row.on("click", (event) => {
      if (!event.shiftKey) {
        this.selectExclusiveLayer(row);
      } else {
        let isSelected = this.selectedLayerRows.has(row);
        if (isSelected) {
          if (this.selectedLayerRows.size === 1) {
            // Prevent deselecting the last selected layer
            return;
          }
          row.setSelected(false);
          this.selectedLayerRows.delete(row);
        } else {
          row.setSelected(true);
          this.selectedLayerRows.add(row);
        }
      }
    });
  }

  private selectExclusiveLayer(row: LayerRow): void {
    for (let layer of this.selectedLayerRows) {
      layer.setSelected(false);
    }
    this.selectedLayerRows.clear();
    row.setSelected(true);
    this.selectedLayerRows.add(row);
  }

  private setupRowDragHandlers(row: LayerRow): void {
    row.on("dragstart", (event) => {
      console.log("dragstart", row.id);
      this.draggingRow = row;
      if (event.dataTransfer) {
        // event.dataTransfer.effectAllowed = "move";
        // event.dataTransfer.setData("text/plain", row.id ?? "");
      }
    });
    row.on("dragend", () => {
      this.draggingRow = undefined;
    });
    row.on("dragover", (event) => {
      if (!this.draggingRow || this.draggingRow === row) {
        return;
      }
      event.preventDefault();
    });
    row.on("drop", (event) => {
      if (!this.draggingRow) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      let rect = row.element.getBoundingClientRect();
      let beforeRow: LayerRow;
      let dropBefore = event.clientY < rect.top + rect.height / 2;
      if (dropBefore) {
        beforeRow = row;
      } else {
        let beforeIndex = this.layerRows.indexOf(row) + 1;
        beforeRow = this.layerRows[beforeIndex];
      }
      this.moveRowBefore(this.draggingRow, beforeRow);
    });
  }

  private moveRowBefore(row: LayerRow, beforeRow?: LayerRow): void {
    if (row === beforeRow) {
      return;
    }
    let currentIndex = this.layerRows.indexOf(row);
    let currentLayer = this.project.layers[currentIndex];
    this.layerRows.splice(currentIndex, 1);
    this.project.layers.splice(currentIndex, 1);
    if (beforeRow) {
      let targetIndex = this.layerRows.indexOf(beforeRow);
      this.layerRows.splice(targetIndex, 0, row);
      this.project.layers.splice(targetIndex, 0, currentLayer);
      this.listContainer.insertBefore(row.element, beforeRow.element);
    } else {
      this.layerRows.push(row);
      this.project.layers.push(currentLayer);
      this.listContainer.appendChild(row.element);
    }
    this.emit("rerender");
  }

  public remove(): void {
    this.element.remove();
    this.removeAllListeners();
  }
}
