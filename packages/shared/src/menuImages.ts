const pexels = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop`;

const unsplash = (slug: string) =>
  `https://images.unsplash.com/photo-${slug}?auto=format&fit=crop&w=800&h=600&q=85`;

export const MENU_IMAGE_BY_ITEM_ID: Record<string, string> = {
  "item-classic-burger": unsplash("1568901346375-23c9450c58cd"),
  "item-bbq-bacon-burger": pexels(1633578),
  "item-spicy-chicken": pexels(2097090),
  "item-grilled-cheese": pexels(4518846),
  "item-fries": unsplash("1573080496219-bb080dd4f877"),
  "item-tomato-soup": unsplash("1547592166-23ac45744acd"),
  "item-lemonade": unsplash("1523677011781-c91d1bbe2f9e"),
  "item-iced-tea": unsplash("1694825172740-5a718c4a5568"),
  "item-fountain-drink": unsplash("1562707459-4eb606600af4"),
  "item-water": pexels(416528),
};

const FALLBACK = pexels(1630437);

export function menuImageUrl(itemId: string): string {
  return MENU_IMAGE_BY_ITEM_ID[itemId] ?? FALLBACK;
}
