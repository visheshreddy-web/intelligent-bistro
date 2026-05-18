export type MenuModifier = {
  id: string;
  displayName: string;
  kind: "default" | "extra";
  priceDeltaCents: number;
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  basePriceCents: number;
  imageUrl: string;
  defaultModifierIds: string[];
  allowedExtraModifierIds: string[];
  pairingItemIds: string[];
  tags: string[];
  spicy?: boolean;
};

export type Menu = {
  categories: { id: string; name: string; sortOrder: number }[];
  modifiers: MenuModifier[];
  items: MenuItem[];
};

export type CartLine = {
  lineId: string;
  itemId: string;
  qty: number;
  selection: { removedModifierIds: string[]; extraModifierIds: string[] };
  lineTotalCents: number;
};

export type Cart = {
  sessionId: string;
  lines: CartLine[];
  subtotalCents: number;
  updatedAt: string;
};

export type CartOperation =
  | {
      type: "add_or_update_line";
      itemId: string;
      qty: number;
      selection?: { removedModifierIds: string[]; extraModifierIds: string[] };
    }
  | { type: "set_line_qty"; lineId: string; qty: number }
  | { type: "remove_line"; lineId: string }
  | { type: "clear_cart" };

export type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export type SuggestedChip = { id: string; label: string; prompt: string };
