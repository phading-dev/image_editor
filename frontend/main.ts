import { Body } from "./body";
import { normalizeBody } from "./normalize_body";

normalizeBody();

export function main(): void {
  new Body(document.body);
}

main();
