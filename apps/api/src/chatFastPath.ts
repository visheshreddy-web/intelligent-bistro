import type { Cart, Menu } from "@bistro/shared";
import {
  buildSuggestedChips,
  itemById,
  resolveOrderItemId,
  shouldUseOrderFastPath,
} from "@bistro/shared";
import { applyOps } from "./chatTools.js";
import { getCart } from "./sessionStore.js";
import { formatMoney } from "./formatMoney.js";

const QTY_RE = /\b(\d+)\s*(x|orders?|of)?\b/i;
const WORD_QTY: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function parseQty(text: string): number {
  const m = text.match(QTY_RE);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0 && n < 20) return n;
  }
  const lower = text.toLowerCase();
  for (const [word, n] of Object.entries(WORD_QTY)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(lower)) return n;
  }
  return 1;
}

function parseSelection(menu: Menu, itemId: string, text: string) {
  const item = itemById(menu, itemId);
  if (!item) return { removedModifierIds: [] as string[], extraModifierIds: [] as string[] };

  const removed: string[] = [];
  const extras: string[] = [];
  const t = text.toLowerCase();

  if (/\bno\s+lettuce\b|\bwithout\s+lettuce\b/.test(t) && item.defaultModifierIds.includes("lettuce")) {
    removed.push("lettuce");
  }
  if (/\bno\s+onion\b|\bwithout\s+onion\b/.test(t) && item.defaultModifierIds.includes("onion")) {
    removed.push("onion");
  }
  if (/\bno\s+tomato\b|\bwithout\s+tomato\b/.test(t) && item.defaultModifierIds.includes("tomato")) {
    removed.push("tomato");
  }
  if (/\bno\s+pickle\b|\bwithout\s+pickle\b/.test(t) && item.defaultModifierIds.includes("pickle")) {
    removed.push("pickle");
  }
  if (/\bextra\s+pickle\b/.test(t)) extras.push("extra_pickles");
  if (/\bbacon\b/.test(t) && item.allowedExtraModifierIds.includes("bacon")) extras.push("bacon");
  if (/\bcheese\b/.test(t) && item.allowedExtraModifierIds.includes("cheese")) extras.push("cheese");
  if (/\bjalapeno\b/.test(t) && item.allowedExtraModifierIds.includes("jalapeno")) extras.push("jalapeno");
  if (/\blarge\b/.test(t) && item.allowedExtraModifierIds.includes("size_large")) extras.push("size_large");

  const fountainFlavors = item.allowedExtraModifierIds.filter((id) => id.startsWith("flavor_"));
  if (fountainFlavors.length) {
    if (/\bdiet\s+coke\b/.test(t)) extras.push("flavor_diet_coke");
    else if (/\bcoke\s+zero\b|\bzero\b/.test(t)) extras.push("flavor_coke_zero");
    else if (/\bsprite\b|\blemon\s*[- ]?lime\b/.test(t)) extras.push("flavor_sprite");
    else if (/\broot\s*beer\b/.test(t)) extras.push("flavor_rootbeer");
    else if (/\bdr\.?\s*pepper\b/.test(t)) extras.push("flavor_dr_pepper");
    else if (/\bfanta\b/.test(t)) extras.push("flavor_fanta");
    else if (/\bginger\s*ale\b/.test(t)) extras.push("flavor_ginger_ale");
    else if (/\bcola\b|\bcoke\b/.test(t) && !/\bdiet\b/.test(t) && !/\bzero\b/.test(t)) {
      extras.push("flavor_cola");
    }
    const flavorExtras = extras.filter((id) => fountainFlavors.includes(id));
    if (flavorExtras.length) {
      if (item.defaultModifierIds.includes("flavor_cola")) removed.push("flavor_cola");
    }
  }

  return { removedModifierIds: removed, extraModifierIds: extras };
}

export type FastPathResult = {
  assistantText: string;
  cart: Cart;
  suggestedChips: ReturnType<typeof buildSuggestedChips>;
};

export function tryFastPathTurn(menu: Menu, sessionId: string, userText: string): FastPathResult | null {
  const text = userText.trim();
  if (!shouldUseOrderFastPath(text, menu)) return null;

  const itemId = resolveOrderItemId(menu, text);
  if (!itemId) return null;

  const item = itemById(menu, itemId);
  if (!item) return null;

  const qty = parseQty(text);
  const selection = parseSelection(menu, itemId, text);
  const cart = applyOps(menu, sessionId, [
    { type: "add_or_update_line", itemId, qty, selection },
  ]);
  if (!cart) return null;

  const finalCart = getCart(sessionId) ?? cart;
  const line = finalCart.lines.find((l) => l.itemId === itemId);
  const total = formatMoney(finalCart.subtotalCents);
  const linePrice = line ? formatMoney(line.lineTotalCents) : "";

  return {
    assistantText: `Added ${qty}× ${item.name}${linePrice ? ` (${linePrice})` : ""}. Cart subtotal is ${total}.`,
    cart: finalCart,
    suggestedChips: buildSuggestedChips(menu, finalCart),
  };
}
