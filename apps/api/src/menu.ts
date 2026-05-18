import type { Menu } from "@bistro/shared";
import { getSeedMenu } from "@bistro/shared";

export function loadMenu(): Menu {
  return getSeedMenu();
}
