import type { Cart } from "@bistro/shared";
import { emptyCart } from "@bistro/shared";

const carts = new Map<string, Cart>();

export function createSession(): string {
  const id = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  carts.set(id, emptyCart(id));
  return id;
}

export function getCart(sessionId: string): Cart | undefined {
  return carts.get(sessionId);
}

export function setCart(sessionId: string, cart: Cart): void {
  carts.set(sessionId, cart);
}
