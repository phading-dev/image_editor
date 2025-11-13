import { EditorFactory } from "./editor/editor_factory";
import { normalizeBody } from "./normalize_body";

normalizeBody();

export function main(): void {
  EditorFactory.create(document.body);
}

main();
