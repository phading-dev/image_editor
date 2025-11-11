export interface Command {
  do(): void;
  undo(): void;
}

export class CommandHistoryManager {
  public static create(): CommandHistoryManager {
    return new CommandHistoryManager();
  }

  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  public pushCommand(command: Command): void {
    command.do();
    this.undoStack.push(command);
    this.redoStack = [];
  }

  public undo(): void {
    if (this.undoStack.length === 0) {
      return;
    }
    let action = this.undoStack.pop();
    action.undo();
    this.redoStack.push(action);
  }

  public redo(): void {
    if (this.redoStack.length === 0) {
      return;
    }
    let action = this.redoStack.pop();
    action.do();
    this.undoStack.push(action);
  }
}
