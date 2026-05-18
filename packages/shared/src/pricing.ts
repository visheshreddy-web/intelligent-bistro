import type { Cart, CartLine, LineSelection, Menu, MenuItem } from "./types.js";
import { modifierById } from "./menu.js";

function normalizeSelection(item: MenuItem, selection: LineSelection): LineSelection {
  const removed = [...new Set(selection.removedModifierIds)].filter((id) =>
    item.defaultModifierIds.includes(id),
  );
  const extras = [...new Set(selection.extraModifierIds)].filter((id) =>
    item.allowedExtraModifierIds.includes(id),
  );
  return { removedModifierIds: removed, extraModifierIds: extras };
}

export function priceLineCents(menu: Menu, item: MenuItem, qty: number, selection: LineSelection): number {
  const sel = normalizeSelection(item, selection);
  let perUnit = item.basePriceCents;
  for (const id of sel.extraModifierIds) {
    const mod = modifierById(menu, id);
    if (mod && mod.kind === "extra") perUnit += mod.priceDeltaCents;
  }
  return perUnit * qty;
}

export function buildCartLine(
  menu: Menu,
  lineId: string,
  itemId: string,
  qty: number,
  selection: LineSelection,
): CartLine {
  const item = menu.items.find((i) => i.id === itemId);
  if (!item) throw new Error(`Unknown item ${itemId}`);
  const sel = normalizeSelection(item, selection);
  return {
    lineId,
    itemId,
    qty,
    selection: sel,
    lineTotalCents: priceLineCents(menu, item, qty, sel),
  };
}

function cartTotals(lines: CartLine[]): number {
  return lines.reduce((s, l) => s + l.lineTotalCents, 0);
}

export function emptyCart(sessionId: string): Cart {
  return {
    sessionId,
    lines: [],
    subtotalCents: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function repriceCart(menu: Menu, cart: Cart): Cart {
  const lines = cart.lines.map((line) => {
    const item = menu.items.find((i) => i.id === line.itemId);
    if (!item) return line;
    return buildCartLine(menu, line.lineId, line.itemId, line.qty, line.selection);
  });
  return {
    ...cart,
    lines,
    subtotalCents: cartTotals(lines),
    updatedAt: new Date().toISOString(),
  };
}

function activeFountainFlavors(item: MenuItem, selection: LineSelection): string[] {
  const flavorIds = item.allowedExtraModifierIds.filter((id) => id.startsWith("flavor_"));
  if (!flavorIds.length) return [];
  const fromDefault = item.defaultModifierIds.filter(
    (id) => flavorIds.includes(id) && !selection.removedModifierIds.includes(id),
  );
  const fromExtra = selection.extraModifierIds.filter((id) => flavorIds.includes(id));
  return [...fromDefault, ...fromExtra];
}

export function selectionConflicts(item: MenuItem, selection: LineSelection): string[] {
  const errors: string[] = [];
  if (selection.extraModifierIds.includes("extra_pickles") && selection.removedModifierIds.includes("pickle")) {
    errors.push("Cannot remove pickles and add extra pickles");
  }
  const flavors = activeFountainFlavors(item, selection);
  if (item.allowedExtraModifierIds.some((id) => id.startsWith("flavor_"))) {
    if (flavors.length === 0) {
      errors.push("Select a fountain soda flavor");
    } else if (flavors.length > 1) {
      errors.push("Choose only one fountain soda flavor");
    }
  }
  return errors;
}
