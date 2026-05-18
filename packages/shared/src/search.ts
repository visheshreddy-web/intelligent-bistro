import type { Menu, MenuItem } from "./types.js";

export type SearchHit = Pick<
  MenuItem,
  "id" | "name" | "description" | "basePriceCents" | "categoryId" | "tags" | "spicy"
>;

export function searchMenu(menu: Menu, query: string, limit = 8): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return menu.items.slice(0, limit).map(toHit);
  }
  const scored = menu.items
    .map((item) => ({ item, score: scoreItem(item, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => toHit(x.item));
}

function toHit(item: MenuItem): SearchHit {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    basePriceCents: item.basePriceCents,
    categoryId: item.categoryId,
    tags: item.tags,
    spicy: item.spicy,
  };
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "i",
  "me",
  "my",
  "we",
  "you",
  "to",
  "so",
  "and",
  "or",
  "with",
  "for",
  "of",
  "in",
  "on",
  "at",
  "is",
  "it",
  "am",
  "are",
  "be",
  "eat",
  "want",
  "help",
  "order",
  "food",
  "really",
  "please",
  "can",
  "could",
  "would",
  "like",
  "get",
  "add",
]);

function wordMatches(hay: string, word: string): boolean {
  if (word.length < 3 || STOP_WORDS.has(word)) return false;
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(hay);
}

function scoreItem(item: MenuItem, q: string): number {
  let s = 0;
  const hay = `${item.name} ${item.description} ${item.tags.join(" ")}`.toLowerCase();
  const name = item.name.toLowerCase();
  if (name === q) s += 100;
  if (name.includes(q) && q.length >= 4) s += 40;
  if (q.length >= 4 && hay.includes(q)) s += 20;
  for (const word of q.split(/\s+/).filter(Boolean)) {
    if (wordMatches(hay, word)) s += 10;
  }
  if (/\bspicy\b/i.test(q) && item.spicy) s += 15;
  if (/\bburgers?\b/i.test(q) && name.includes("burger")) s += 20;
  if (/\bchicken\b/i.test(q) && name.includes("chicken")) s += 20;
  if (/\bsoup\b/i.test(q) && name.includes("soup")) s += 20;
  if (/\bfries\b/i.test(q) && name.includes("fries")) s += 20;
  return s;
}
