import EventEmitter = require("events");
import { COLOR_THEME } from "../color_theme";
import { FONT_S } from "../sizes";
import { Project } from "./project";
import { Layer } from "./project_metadata";
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
  on(event: "toggleVisibility", listener: (layerId: string) => void): this;
  on(event: "toggleLock", listener: (layerId: string) => void): this;
  on(event: "updateOpacity", listener: (layerId: string) => void): this;
}

export class LayerRow extends EventEmitter {
  public id: string;
  public element: HTMLDivElement;
  private nameSpan: HTMLSpanElement;
  private typeSpan: HTMLSpanElement;
  private visibleSpan: HTMLSpanElement;
  private opacitySpan: HTMLSpanElement;
  private lockedSpan: HTMLSpanElement;

  public constructor(private layer: Layer) {
    super();
    this.id = layer.id;

    let nameSpanRef = new Ref<HTMLSpanElement>();
    let typeSpanRef = new Ref<HTMLSpanElement>();
    let visibleSpanRef = new Ref<HTMLSpanElement>();
    let opacitySpanRef = new Ref<HTMLSpanElement>();
    let lockedSpanRef = new Ref<HTMLSpanElement>();
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
        E.span({
          ref: nameSpanRef,
          style: [
            `font-size:${FONT_S}rem`,
            "white-space:nowrap",
            "overflow:hidden",
            "text-overflow:ellipsis",
            "flex:1",
          ].join(";"),
        }),
        E.span({
          ref: typeSpanRef,
          style: [
            `font-size:${FONT_S * 0.85}rem`,
            `background:${COLOR_THEME.accent3}`,
            `color:${COLOR_THEME.neutral0}`,
            "padding:0.125rem 0.375rem",
            "border-radius:0.375rem",
            "white-space:nowrap",
          ].join(";"),
        }),
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
        E.span({
          ref: visibleSpanRef,
          style: [
            `font-size:${FONT_S * 0.85}rem`,
            `background:${COLOR_THEME.neutral3}`,
            `color:${COLOR_THEME.neutral0}`,
            "padding:0.125rem 0.375rem",
            "border-radius:0.375rem",
            "white-space:nowrap",
          ].join(";"),
        }),
        E.span({
          ref: opacitySpanRef,
          style: [
            `font-size:${FONT_S * 0.85}rem`,
            `background:${COLOR_THEME.neutral3}`,
            `color:${COLOR_THEME.neutral0}`,
            "padding:0.125rem 0.375rem",
            "border-radius:0.375rem",
            "white-space:nowrap",
          ].join(";"),
        }),
        E.span({
          ref: lockedSpanRef,
          style: [
            `font-size:${FONT_S * 0.85}rem`,
            `background:${COLOR_THEME.neutral3}`,
            `color:${COLOR_THEME.neutral0}`,
            "padding:0.125rem 0.375rem",
            "border-radius:0.375rem",
            "white-space:nowrap",
          ].join(";"),
        }),
      ),
    );
    this.nameSpan = nameSpanRef.val;
    this.typeSpan = typeSpanRef.val;
    this.visibleSpan = visibleSpanRef.val;
    this.opacitySpan = opacitySpanRef.val;
    this.lockedSpan = lockedSpanRef.val;
    this.rerender();

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
    this.visibleSpan.addEventListener("click", () => {
      this.emit("toggleVisibility", this.id);
    });
    this.opacitySpan.addEventListener("click", () => {
      this.emit("updateOpacity", this.id);
    });
    this.lockedSpan.addEventListener("click", () => {
      this.emit("toggleLock", this.id);
    });
  }

  public rerender(): void {
    this.nameSpan.textContent = this.layer.name;
    if (this.layer.basicText) {
      this.typeSpan.textContent = "Text";
      this.typeSpan.style.display = "";
    } else {
      this.typeSpan.style.display = "none";
    }
    this.visibleSpan.textContent = this.layer.visible ? "Visible" : "Hidden";
    this.opacitySpan.textContent = `${Math.round(this.layer.opacity)}%`;
    this.lockedSpan.textContent = this.layer.locked ? "Locked" : "Unlocked";
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
  on(
    event: "reorder",
    listener: (oldIndex: number, newIndex: number) => void,
  ): this;
  on(event: "layerSelectionChanged", listener: () => void): this;
  on(event: "toggleLayerVisibility", listener: (layerId: string) => void): this;
  on(event: "toggleLayerLock", listener: (layerId: string) => void): this;
  on(event: "updateLayerOpacity", listener: (layerId: string) => void): this;
}

export class LayersPanel extends EventEmitter {
  public static create(project: Project): LayersPanel {
    return new LayersPanel(project);
  }

  public element: HTMLElement;
  private listContainer: HTMLDivElement;
  private emptyState: HTMLDivElement;
  public layerRows = new Map<string, LayerRow>();
  public selectedLayerIds: Set<string> = new Set();
  public get activeLayerId(): string {
    for (let id of this.selectedLayerIds) {
      return id;
    }
    return undefined;
  }
  private draggingRow?: LayerRow;

  public constructor(private project: Project) {
    super();
    let listRef = new Ref<HTMLDivElement>();
    let emptyRef = new Ref<HTMLDivElement>();

    this.element = E.div(
      {
        class: "layers-panel",
        style: [
          "flex:0 0 auto",
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

    for (let index = 0; index < project.metadata.layers.length; index++) {
      let row = this.createLayerRow(project.metadata.layers[index]).setSelected(
        false,
      );
      this.listContainer.appendChild(row.element);
    }
    this.updateEmptyState();
    this.setupListContainerDragHandlers();
  }

  private createLayerRow(layer: Layer): LayerRow {
    let row = new LayerRow(layer);
    this.setupRowClickHandlers(row);
    this.setupRowDragHandlers(row);
    this.layerRows.set(row.id, row);
    return row;
  }

  public addLayerRow(layer: Layer): void {
    let row = this.createLayerRow(layer);
    this.emptyState.after(row.element);
    this.layerRows.set(row.id, row);
    this.selectExclusiveLayer(row);
    this.emptyState.style.display = "none";
    this.emit("layerSelectionChanged");
  }

  public deleteLayerRow(layerId: string): void {
    let row = this.layerRows.get(layerId);
    row.remove();
    this.layerRows.delete(layerId);
    this.selectedLayerIds.delete(layerId);
    this.updateEmptyState();
    this.emit("layerSelectionChanged");
  }

  public moveLayerRowBefore(layerId: string, beforeLayerId?: string): void {
    let targetRow = this.layerRows.get(layerId);
    let beforeRow = beforeLayerId ? this.layerRows.get(beforeLayerId) : undefined;
    this.listContainer.insertBefore(targetRow.element, beforeRow?.element);
  }

  public rerenderLayerRow(layerId: string): void {
    this.layerRows.get(layerId).rerender();
  }

  public selectLayer(layerId: string): void {
    const row = this.layerRows.get(layerId);
    if (row) {
      this.selectExclusiveLayer(row);
      this.emit("layerSelectionChanged");
    }
  }

  private updateEmptyState(): void {
    if (!this.project.metadata.layers.length) {
      this.emptyState.style.display = "block";
    } else {
      if (!this.selectedLayerIds.size) {
        let firstLayer = this.layerRows.get(this.project.metadata.layers[0].id);
        firstLayer.setSelected(true);
        this.selectedLayerIds.add(firstLayer.id);
      }
      this.emptyState.style.display = "none";
    }
  }

  private setupRowClickHandlers(row: LayerRow): void {
    row
      .on("click", (event) => {
        if (!event.shiftKey) {
          this.selectExclusiveLayer(row);
        } else {
          let isSelected = this.selectedLayerIds.has(row.id);
          if (isSelected) {
            if (this.selectedLayerIds.size === 1) {
              // Prevent deselecting the last selected layer
              return;
            }
            row.setSelected(false);
            this.selectedLayerIds.delete(row.id);
          } else {
            row.setSelected(true);
            this.selectedLayerIds.add(row.id);
          }
        }
        this.emit("layerSelectionChanged");
      })
      .on("toggleVisibility", (layerId) => {
        this.emit("toggleLayerVisibility", layerId);
      })
      .on("updateOpacity", (layerId) => {
        this.emit("updateLayerOpacity", layerId);
      })
      .on("toggleLock", (layerId) => {
        this.emit("toggleLayerLock", layerId);
      });
  }

  private selectExclusiveLayer(row: LayerRow): void {
    for (let id of this.selectedLayerIds) {
      this.layerRows.get(id).setSelected(false);
    }
    this.selectedLayerIds.clear();
    row.setSelected(true);
    this.selectedLayerIds.add(row.id);
  }

  private setupRowDragHandlers(row: LayerRow): void {
    row.on("dragstart", () => {
      this.draggingRow = row;
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
      if (this.draggingRow === row) {
        return;
      }
      let rect = row.element.getBoundingClientRect();
      let newIndex = this.project.metadata.layers.findIndex(
        (layer) => layer.id === row.id,
      );
      let dropBefore = event.clientY < rect.top + rect.height / 2;
      if (!dropBefore) {
        newIndex += 1;
      }
      let oldIndex = this.project.metadata.layers.findIndex(
        (layer) => layer.id === this.draggingRow.id,
      );
      if (oldIndex < newIndex) {
        newIndex -= 1;
      }
      if (oldIndex === newIndex) {
        return;
      }
      this.emit("reorder", oldIndex, newIndex);
    });
  }

  private setupListContainerDragHandlers(): void {
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
      let oldIndex = this.project.metadata.layers.findIndex(
        (layer) => layer.id === this.draggingRow.id,
      );
      let newIndex = this.project.metadata.layers.length - 1;
      if (oldIndex === newIndex) {
        return;
      }
      this.emit("reorder", oldIndex, newIndex);
    });
  }

  public remove(): void {
    this.element.remove();
    this.removeAllListeners();
  }
}
