import { EditorFactory } from "./editor/editor_factory";
import { normalizeBody } from "./normalize_body";

normalizeBody();

export async function main(): Promise<void> {
  await EditorFactory.create(document.body);
}

main();
