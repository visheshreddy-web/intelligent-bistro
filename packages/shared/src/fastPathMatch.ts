import type { Menu } from "./types.js";
import { itemById } from "./menu.js";

const ADVISORY_RE =
  /\b(help\s+me|help\s+with|recommend|suggestion|suggest|what\s+should|high[- ]?protein|hungry|starving|what\s+can\s+i|what\s+do\s+you|show\s+me|browse|menu|options|advice|so\s+help)\b/i;

function hasExplicitOrderIntent(text: string): boolean {
  if (/\b(add|order)\s+(a|an|the|some|\d|two|three|\w+)/i.test(text)) return true;
  if (/\b(i\s+want)\s+(a|an|the|some|\d|two|three)\s+\w/i.test(text)) return true;
  if (/\b(i'?d\s+like|get\s+me)\s+(a|an|the|some|\d|two|three)\s+\w/i.test(text)) return true;
  return ITEM_ALIAS_PATTERNS.some(({ pattern }) => pattern.test(text));
}

export const ITEM_ALIAS_PATTERNS: { pattern: RegExp; itemId: string }[] = [
  { pattern: /\b(bbq|bacon)\b.*\bburgers?\b|\bburgers?\b.*\b(bbq|bacon)\b/i, itemId: "item-bbq-bacon-burger" },
  { pattern: /\bclassic\b.*\bburgers?\b|\bburgers?\b/i, itemId: "item-classic-burger" },
  { pattern: /\bspicy\b.*\bchicken\b|\bchicken\s+sandwich\b/i, itemId: "item-spicy-chicken" },
  { pattern: /\bgrilled\b.*\bcheese\b|\btruffle\b.*\bcheese\b/i, itemId: "item-grilled-cheese" },
  { pattern: /\bfries\b|\bherb\s+fries\b/i, itemId: "item-fries" },
  { pattern: /\b(tomato\s+basil|basil)\s+soup\b|\btomato\s+soup\b/i, itemId: "item-tomato-soup" },
  { pattern: /\bfountain\b|\bfountain\s+drink\b/i, itemId: "item-fountain-drink" },
  { pattern: /\b(diet\s+coke|coke\s+zero|sprite|root\s*beer|dr\.?\s*pepper)\b/i, itemId: "item-fountain-drink" },
  { pattern: /\b(soda|soft\s+drink)\b/i, itemId: "item-fountain-drink" },
  { pattern: /\blemonade\b/i, itemId: "item-lemonade" },
  { pattern: /\biced\b.*\btea\b/i, itemId: "item-iced-tea" },
  { pattern: /\b(still\s+)?water\b/i, itemId: "item-water" },
];

export function collectMatchedItemIds(menu: Menu, text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { pattern, itemId } of ITEM_ALIAS_PATTERNS) {
    if (!pattern.test(text) || !itemById(menu, itemId)) continue;
    if (seen.has(itemId)) continue;
    seen.add(itemId);
    out.push(itemId);
  }
  return out;
}

export function resolveOrderItemId(menu: Menu, text: string): string | null {
  const ids = collectMatchedItemIds(menu, text);
  return ids[0] ?? null;
}

export function shouldUseOrderFastPath(text: string, menu: Menu): boolean {
  const t = text.trim();
  if (!t || t.length > 200) return false;

  if (ADVISORY_RE.test(t)) return false;

  const matchedIds = collectMatchedItemIds(menu, t);
  if (matchedIds.length >= 2) return false;
  if (matchedIds.length === 1) return true;

  return hasExplicitOrderIntent(t);
}
