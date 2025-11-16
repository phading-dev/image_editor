export class PanTool {
  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;
  private scrollStartX = 0;
  private scrollStartY = 0;

  public constructor(
    private readonly scrollContainer: HTMLElement,
  ) {
    this.scrollContainer.style.cursor = "grab";
    this.scrollContainer.addEventListener("pointerdown", this.handlePointerDown);
    this.scrollContainer.addEventListener("pointermove", this.handlePointerMove);
    this.scrollContainer.addEventListener("pointerup", this.handlePointerEnd);
    this.scrollContainer.addEventListener("pointercancel", this.handlePointerEnd);
  }

  private handlePointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) {
      return;
    }
    e.preventDefault();
    this.isPanning = true;
    this.panStartX = e.clientX;
    this.panStartY = e.clientY;
    this.scrollStartX = this.scrollContainer.scrollLeft;
    this.scrollStartY = this.scrollContainer.scrollTop;
    this.scrollContainer.style.cursor = "grabbing";
    this.scrollContainer.setPointerCapture(e.pointerId);
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.isPanning) {
      return;
    }
    e.preventDefault();
    const deltaX = e.clientX - this.panStartX;
    const deltaY = e.clientY - this.panStartY;
    this.scrollContainer.scrollLeft = this.scrollStartX - deltaX;
    this.scrollContainer.scrollTop = this.scrollStartY - deltaY;
  };

  private handlePointerEnd = (e: PointerEvent): void => {
    if (!this.isPanning) {
      return;
    }
    e.preventDefault();
    this.isPanning = false;
    this.scrollContainer.style.cursor = "grab";
    if (this.scrollContainer.hasPointerCapture(e.pointerId)) {
      this.scrollContainer.releasePointerCapture(e.pointerId);
    }
  };

  public remove(): void {
    this.scrollContainer.style.cursor = "";
    this.scrollContainer.removeEventListener("pointerdown", this.handlePointerDown);
    this.scrollContainer.removeEventListener("pointermove", this.handlePointerMove);
    this.scrollContainer.removeEventListener("pointerup", this.handlePointerEnd);
    this.scrollContainer.removeEventListener("pointercancel", this.handlePointerEnd);
  }
}
