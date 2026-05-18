import type { Cart, Menu } from "./types.js";
import { itemById } from "./menu.js";

export type SuggestedChip = { id: string; label: string; prompt: string };

export function buildSuggestedChips(menu: Menu, cart: Cart, lastItemId?: string): SuggestedChip[] {
  const chips: SuggestedChip[] = [];
  const seen = new Set<string>();

  const push = (c: SuggestedChip) => {
    if (seen.has(c.id)) return;
    seen.add(c.id);
    chips.push(c);
  };

  if (cart.lines.length === 0) {
    push({
      id: "popular-burger",
      label: "Popular: Classic Burger",
      prompt: "Add one Classic Bistro Burger",
    });
    push({
      id: "popular-chicken",
      label: "Popular: Spicy Chicken",
      prompt: "Add one Spicy Chicken Sandwich",
    });
    push({ id: "drink", label: "Add fries + lemonade", prompt: "Add herb fries and a house lemonade" });
    return chips.slice(0, 6);
  }

  const lastLine = cart.lines[cart.lines.length - 1];
  const anchorId = lastItemId ?? lastLine?.itemId;
  if (anchorId) {
    const item = itemById(menu, anchorId);
    for (const pid of item?.pairingItemIds ?? []) {
      const p = itemById(menu, pid);
      if (!p) continue;
      push({
        id: `pair-${p.id}`,
        label: `You might like: ${p.name}`,
        prompt: `Add one ${p.name}`,
      });
    }
  }

  push({ id: "more-water", label: "Add water", prompt: "Add a still water" });
  push({ id: "view-cart", label: "What's in my cart?", prompt: "Summarize my cart and total" });

  return chips.slice(0, 6);
}
