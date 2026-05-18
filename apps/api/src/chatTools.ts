import type { ChatCompletionTool } from "openai/resources/chat/completions";
import type { Cart, CartOperation, Menu } from "@bistro/shared";
import {
  applyCartOperations,
  getItemDetails,
  searchMenu,
} from "@bistro/shared";
import { getCart, setCart } from "./sessionStore.js";

export const CHAT_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_menu",
      description: "Search menu when item id is unknown. Returns top matches with item ids.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_item_details",
      description: "Modifier rules for one item id from the menu digest.",
      parameters: {
        type: "object",
        properties: { itemId: { type: "string" } },
        required: ["itemId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_cart",
      description: "Current cart with priced lines.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "apply_cart_operations",
      description: "Apply cart ops. Prices computed server-side.",
      parameters: {
        type: "object",
        properties: {
          operations: {
            type: "array",
            items: {
              anyOf: [
                {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["add_or_update_line"] },
                    itemId: { type: "string" },
                    qty: { type: "integer", minimum: 1 },
                    selection: {
                      type: "object",
                      properties: {
                        removedModifierIds: { type: "array", items: { type: "string" } },
                        extraModifierIds: { type: "array", items: { type: "string" } },
                      },
                    },
                  },
                  required: ["type", "itemId", "qty"],
                },
                {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["set_line_qty"] },
                    lineId: { type: "string" },
                    qty: { type: "integer", minimum: 0 },
                  },
                  required: ["type", "lineId", "qty"],
                },
                {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["remove_line"] },
                    lineId: { type: "string" },
                  },
                  required: ["type", "lineId"],
                },
                { type: "object", properties: { type: { type: "string", enum: ["clear_cart"] } }, required: ["type"] },
              ],
            },
          },
        },
        required: ["operations"],
      },
    },
  },
];

export function runTool(menu: Menu, name: string, args: unknown, sessionId: string): string {
  try {
    if (name === "search_menu") {
      const q = (args as { query?: string }).query ?? "";
      return JSON.stringify({ hits: searchMenu(menu, q, 5) });
    }
    if (name === "get_item_details") {
      const itemId = (args as { itemId?: string }).itemId ?? "";
      const details = getItemDetails(menu, itemId);
      return JSON.stringify(details ?? { error: "not_found" });
    }
    if (name === "get_cart") {
      const cart = getCart(sessionId);
      return JSON.stringify(cart ?? { error: "not_found" });
    }
    if (name === "apply_cart_operations") {
      const cart = getCart(sessionId);
      if (!cart) return JSON.stringify({ ok: false, errors: ["unknown session"] });
      const payload = args as { operations?: CartOperation[] };
      const result = applyCartOperations(menu, cart, {
        sessionId,
        operations: payload.operations ?? [],
      });
      setCart(sessionId, result.cart);
      return JSON.stringify(result);
    }
    return JSON.stringify({ error: "unknown_tool", name });
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

export function applyOps(menu: Menu, sessionId: string, operations: CartOperation[]): Cart | null {
  const cart = getCart(sessionId);
  if (!cart) return null;
  const result = applyCartOperations(menu, cart, { sessionId, operations });
  setCart(sessionId, result.cart);
  if (!result.ok) return null;
  return result.cart;
}
