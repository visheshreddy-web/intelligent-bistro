import { describe, expect, it } from "vitest";
import { getSeedMenu } from "./menu.js";
import { priceLineCents, buildCartLine, selectionConflicts } from "./pricing.js";
import { applyCartOperations, emptyCart } from "./cart.js";
import { searchMenu } from "./search.js";
import { normalizeOrderTranscript } from "./normalizeTranscript.js";
import { resolveOrderItemId, shouldUseOrderFastPath, collectMatchedItemIds } from "./fastPathMatch.js";

describe("pricing", () => {
  const menu = getSeedMenu();
  const burger = menu.items.find((i) => i.id === "item-classic-burger")!;

  it("charges for extras", () => {
    const cents = priceLineCents(menu, burger, 1, {
      removedModifierIds: [],
      extraModifierIds: ["extra_pickles", "bacon"],
    });
    expect(cents).toBe(1299 + 75 + 199);
  });

  it("removes default toppings without changing base", () => {
    const cents = priceLineCents(menu, burger, 2, {
      removedModifierIds: ["lettuce"],
      extraModifierIds: [],
    });
    expect(cents).toBe(1299 * 2);
  });
});

describe("cart operations", () => {
  const menu = getSeedMenu();

  it("adds line with modifiers", () => {
    let cart = emptyCart("s1");
    const res = applyCartOperations(menu, cart, {
      sessionId: "s1",
      operations: [
        {
          type: "add_or_update_line",
          itemId: "item-classic-burger",
          qty: 1,
          selection: { removedModifierIds: ["lettuce"], extraModifierIds: ["extra_pickles"] },
        },
      ],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    cart = res.cart;
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]!.lineTotalCents).toBe(1299 + 75);
  });

  it("rejects conflicting pickle ops", () => {
    const cart = emptyCart("s1");
    const res = applyCartOperations(menu, cart, {
      sessionId: "s1",
      operations: [
        {
          type: "add_or_update_line",
          itemId: "item-classic-burger",
          qty: 1,
          selection: { removedModifierIds: ["pickle"], extraModifierIds: ["extra_pickles"] },
        },
      ],
    });
    expect(res.ok).toBe(false);
  });
});

describe("search", () => {
  it("finds chicken", () => {
    const hits = searchMenu(getSeedMenu(), "chicken");
    expect(hits[0]?.id).toBe("item-spicy-chicken");
  });

  it("finds fountain drink", () => {
    const hits = searchMenu(getSeedMenu(), "fountain");
    expect(hits.some((h) => h.id === "item-fountain-drink")).toBe(true);
  });

  it("finds bbq burger", () => {
    const hits = searchMenu(getSeedMenu(), "bbq bacon");
    expect(hits[0]?.id).toBe("item-bbq-bacon-burger");
  });

  it("finds sprite fountain flavor", () => {
    const menu = getSeedMenu();
    const hits = searchMenu(menu, "sprite");
    expect(hits.some((h) => h.id === "item-fountain-drink")).toBe(true);
  });
});

describe("fountain drink flavors", () => {
  const menu = getSeedMenu();
  const fountain = menu.items.find((i) => i.id === "item-fountain-drink")!;

  it("rejects two soda flavors at once", () => {
    const conflicts = selectionConflicts(fountain, {
      removedModifierIds: [],
      extraModifierIds: ["flavor_sprite", "flavor_coke_zero"],
    });
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it("allows coke zero when cola default is removed", () => {
    const conflicts = selectionConflicts(fountain, {
      removedModifierIds: ["flavor_cola"],
      extraModifierIds: ["flavor_coke_zero"],
    });
    expect(conflicts).toHaveLength(0);
  });
});

describe("order fast path", () => {
  const menu = getSeedMenu();

  it("does not fast-path vague or advisory messages", () => {
    expect(shouldUseOrderFastPath("I want to eat high-protein food, so help me.", menu)).toBe(false);
    expect(
      shouldUseOrderFastPath("I am really hungry and I want to eat food, so help me with the order.", menu),
    ).toBe(false);
    expect(shouldUseOrderFastPath("what should I order?", menu)).toBe(false);
  });

  it("skips fast path when multiple menu items match (e.g. sandwiches + water)", () => {
    const phrase = "Add two spicy chicken sandwiches and a still water.";
    expect(collectMatchedItemIds(menu, phrase)).toEqual(["item-spicy-chicken", "item-water"]);
    expect(shouldUseOrderFastPath(phrase, menu)).toBe(false);
  });

  it("fast-paths explicit item orders", () => {
    expect(shouldUseOrderFastPath("add a classic burger with extra pickles", menu)).toBe(true);
    expect(resolveOrderItemId(menu, "add a classic burger with extra pickles")).toBe("item-classic-burger");
    expect(shouldUseOrderFastPath("I want to eat burgers", menu)).toBe(true);
    expect(resolveOrderItemId(menu, "I want to eat burgers")).toBe("item-classic-burger");
    expect(shouldUseOrderFastPath("I want to eat burgers, so help me with the order.", menu)).toBe(false);
    expect(resolveOrderItemId(menu, "two fountain drinks diet coke")).toBe("item-fountain-drink");
  });

  it("search no longer ranks soup for generic help text", () => {
    const hits = searchMenu(menu, "I am really hungry and I want to eat food, so help me with the order.", 1);
    expect(hits[0]?.id).not.toBe("item-tomato-soup");
  });
});

describe("normalizeOrderTranscript", () => {
  it("fixes common misheard food phrases", () => {
    expect(normalizeOrderTranscript("add a classic burger with extra pickle no lettuces")).toBe(
      "add a Classic Bistro Burger with extra pickles no lettuce",
    );
    expect(normalizeOrderTranscript("two fountain drinks diet coke large")).toContain("Diet Coke");
  });
});
