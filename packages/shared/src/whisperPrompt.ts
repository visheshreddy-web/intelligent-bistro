import type { Menu } from "./types.js";

export function buildWhisperPrompt(menu: Menu): string {
  const itemNames = menu.items.map((i) => i.name).join(", ");
  return [
    "Intelligent Bistro restaurant order in English.",
    `Menu: ${itemNames}.`,
    "Modifiers: no lettuce, no onion, extra pickles, bacon, cheese, jalapeño, large size.",
    "Drinks: fountain drink, Coca-Cola, Diet Coke, Coke Zero, Sprite, Root Beer, Dr Pepper, lemonade, iced tea, water.",
    "Phrases: add, order, two, please.",
  ].join(" ");
}
