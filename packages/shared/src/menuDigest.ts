import type { Menu } from "./types.js";

export function buildMenuDigest(menu: Menu): string {
  return menu.items
    .map((i) => `${i.id}: ${i.name} ($${(i.basePriceCents / 100).toFixed(2)})`)
    .join("; ");
}
