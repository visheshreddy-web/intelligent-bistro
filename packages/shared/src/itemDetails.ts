import type { Menu } from "./types.js";
import { modifierById, itemById } from "./menu.js";

export type ItemDetailsPayload = {
  item: {
    id: string;
    name: string;
    description: string;
    basePriceCents: number;
    categoryId: string;
    imageUrl: string;
    tags: string[];
    spicy?: boolean;
  };
  defaults: { id: string; displayName: string }[];
  extras: { id: string; displayName: string; priceDeltaCents: number }[];
  pairingNames: string[];
};

export function getItemDetails(menu: Menu, itemId: string): ItemDetailsPayload | null {
  const item = itemById(menu, itemId);
  if (!item) return null;
  const defaults = item.defaultModifierIds
    .map((id) => {
      const m = modifierById(menu, id);
      return m ? { id: m.id, displayName: m.displayName } : null;
    })
    .filter(Boolean) as { id: string; displayName: string }[];
  const extras = item.allowedExtraModifierIds
    .map((id) => {
      const m = modifierById(menu, id);
      return m && m.kind === "extra"
        ? { id: m.id, displayName: m.displayName, priceDeltaCents: m.priceDeltaCents }
        : null;
    })
    .filter(Boolean) as { id: string; displayName: string; priceDeltaCents: number }[];
  const pairingNames = item.pairingItemIds
    .map((id) => itemById(menu, id)?.name)
    .filter(Boolean) as string[];
  return {
    item: {
      id: item.id,
      name: item.name,
      description: item.description,
      basePriceCents: item.basePriceCents,
      categoryId: item.categoryId,
      imageUrl: item.imageUrl,
      tags: item.tags,
      spicy: item.spicy,
    },
    defaults,
    extras,
    pairingNames,
  };
}
