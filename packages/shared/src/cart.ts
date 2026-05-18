import type { Cart, CartLine, CartOperation, LineSelection, Menu } from "./types.js";
import { ApplyCartOperationsInputSchema, LineSelectionSchema } from "./types.js";
import { buildCartLine, emptyCart, repriceCart, selectionConflicts } from "./pricing.js";
import { itemById } from "./menu.js";

export { emptyCart } from "./pricing.js";

function newLineId(): string {
  return `ln_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function mergeSelection(
  existing: LineSelection | undefined,
  incoming: LineSelection | undefined,
): LineSelection {
  const base = existing ?? { removedModifierIds: [], extraModifierIds: [] };
  if (!incoming) return LineSelectionSchema.parse(base);
  return LineSelectionSchema.parse({
    removedModifierIds: [...new Set([...base.removedModifierIds, ...incoming.removedModifierIds])],
    extraModifierIds: [...new Set([...base.extraModifierIds, ...incoming.extraModifierIds])],
  });
}

export type ApplyResult =
  | { ok: true; cart: Cart; warnings: string[] }
  | { ok: false; cart: Cart; errors: string[] };

export function applyCartOperations(menu: Menu, cart: Cart, raw: unknown): ApplyResult {
  const parsed = ApplyCartOperationsInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, cart, errors: parsed.error.issues.map((i) => i.message) };
  }
  const input = parsed.data;
  if (input.sessionId !== cart.sessionId) {
    return { ok: false, cart, errors: ["sessionId mismatch"] };
  }
  let next: Cart = { ...cart, lines: [...cart.lines] };
  const warnings: string[] = [];
  const errors: string[] = [];

  const fail = (e: string[]): ApplyResult => ({ ok: false, cart: repriceCart(menu, next), errors: e });

  for (const op of input.operations as CartOperation[]) {
    if (op.type === "clear_cart") {
      next = emptyCart(cart.sessionId);
      continue;
    }
    if (op.type === "remove_line") {
      next.lines = next.lines.filter((l) => l.lineId !== op.lineId);
      continue;
    }
    if (op.type === "set_line_qty") {
      const idx = next.lines.findIndex((l) => l.lineId === op.lineId);
      if (idx === -1) {
        errors.push(`Unknown line ${op.lineId}`);
        continue;
      }
      if (op.qty === 0) {
        next.lines.splice(idx, 1);
        continue;
      }
      const line = next.lines[idx]!;
      const item = itemById(menu, line.itemId);
      if (!item) {
        errors.push(`Unknown item ${line.itemId}`);
        continue;
      }
      const conflicts = selectionConflicts(item, line.selection);
      if (conflicts.length) return fail(conflicts);
      next.lines[idx] = buildCartLine(menu, line.lineId, line.itemId, op.qty, line.selection);
      continue;
    }
    if (op.type === "add_or_update_line") {
      const item = itemById(menu, op.itemId);
      if (!item) {
        errors.push(`Unknown item ${op.itemId}`);
        continue;
      }
      const selection = mergeSelection(undefined, op.selection);
      const conflicts = selectionConflicts(item, selection);
      if (conflicts.length) return fail(conflicts);
      const existingIdx = next.lines.findIndex(
        (l) => l.itemId === op.itemId && sameSelection(l.selection, selection),
      );
      if (existingIdx >= 0) {
        const line = next.lines[existingIdx]!;
        const newQty = line.qty + op.qty;
        next.lines[existingIdx] = buildCartLine(menu, line.lineId, op.itemId, newQty, selection);
      } else {
        const lineId = newLineId();
        next.lines.push(buildCartLine(menu, lineId, op.itemId, op.qty, selection));
      }
    }
  }

  next = repriceCart(menu, next);
  if (errors.length) return { ok: false, cart: next, errors };
  return { ok: true, cart: next, warnings };
}

function sameSelection(a: LineSelection, b: LineSelection): boolean {
  const ar = [...a.removedModifierIds].sort().join(",");
  const br = [...b.removedModifierIds].sort().join(",");
  const ae = [...a.extraModifierIds].sort().join(",");
  const be = [...b.extraModifierIds].sort().join(",");
  return ar === br && ae === be;
}
