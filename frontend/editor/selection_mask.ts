export class SelectionMask {
  public mask: ImageData;

  constructor(width: number, height: number) {
    // Initialize with empty mask (all zeros = no selection)
    this.mask = new ImageData(width, height);
  }

  public setMask(mask: ImageData): void {
    this.mask = mask;
  }

  public isEmpty(): boolean {
    // Check if mask is empty (all pixels are 0)
    for (let i = 0; i < this.mask.data.length; i += 4) {
      if (this.mask.data[i] > 0) {
        return false;
      }
    }
    return true;
  }
}
