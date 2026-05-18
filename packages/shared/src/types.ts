import { z } from "zod";

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number(),
});
export type Category = z.infer<typeof CategorySchema>;

export const ModifierSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  kind: z.enum(["default", "extra"]),
  priceDeltaCents: z.number().int(),
});
export type Modifier = z.infer<typeof ModifierSchema>;

export const MenuItemSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: z.string(),
  description: z.string(),
  basePriceCents: z.number().int(),
  imageUrl: z.string().url(),
  defaultModifierIds: z.array(z.string()),
  allowedExtraModifierIds: z.array(z.string()),
  pairingItemIds: z.array(z.string()),
  tags: z.array(z.string()),
  spicy: z.boolean().optional(),
});
export type MenuItem = z.infer<typeof MenuItemSchema>;

export const MenuSchema = z.object({
  categories: z.array(CategorySchema),
  modifiers: z.array(ModifierSchema),
  items: z.array(MenuItemSchema),
});
export type Menu = z.infer<typeof MenuSchema>;

export const LineSelectionSchema = z.object({
  removedModifierIds: z.array(z.string()).default([]),
  extraModifierIds: z.array(z.string()).default([]),
});
export type LineSelection = z.infer<typeof LineSelectionSchema>;

export const CartLineSchema = z.object({
  lineId: z.string(),
  itemId: z.string(),
  qty: z.number().int().positive(),
  selection: LineSelectionSchema,
  lineTotalCents: z.number().int().nonnegative(),
});
export type CartLine = z.infer<typeof CartLineSchema>;

export const CartSchema = z.object({
  sessionId: z.string(),
  lines: z.array(CartLineSchema),
  subtotalCents: z.number().int().nonnegative(),
  updatedAt: z.string(),
});
export type Cart = z.infer<typeof CartSchema>;

export const CartOperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("add_or_update_line"),
    itemId: z.string(),
    qty: z.number().int().positive(),
    selection: LineSelectionSchema.optional(),
  }),
  z.object({
    type: z.literal("set_line_qty"),
    lineId: z.string(),
    qty: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("remove_line"),
    lineId: z.string(),
  }),
  z.object({
    type: z.literal("clear_cart"),
  }),
]);
export type CartOperation = z.infer<typeof CartOperationSchema>;

export const ApplyCartOperationsInputSchema = z.object({
  sessionId: z.string(),
  operations: z.array(CartOperationSchema).max(20),
});
export type ApplyCartOperationsInput = z.infer<typeof ApplyCartOperationsInputSchema>;
