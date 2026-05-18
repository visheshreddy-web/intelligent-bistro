import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { Cart } from "@bistro/shared";
import { buildMenuDigest, buildSuggestedChips } from "@bistro/shared";
import { getCart } from "./sessionStore.js";
import { OPENAI_CHAT_MODEL } from "./config.js";
import { loadMenu } from "./menu.js";
import { CHAT_TOOLS, runTool } from "./chatTools.js";

export type ChatRequestMessage = { role: "user" | "assistant" | "system"; content: string };

const MAX_TOOL_ROUNDS = 3;
const MAX_HISTORY = 6;
const MAX_OUTPUT_TOKENS = 256;

function trimHistory(userMessages: ChatRequestMessage[]): ChatRequestMessage[] {
  const filtered = userMessages.filter(
    (m) =>
      m.role === "user" ||
      (m.role === "assistant" && !/session\s*id|provide.*session/i.test(m.content)),
  );
  return filtered.length <= MAX_HISTORY ? filtered : filtered.slice(-MAX_HISTORY);
}

export async function runChatTurn(
  openai: OpenAI,
  sessionId: string,
  userMessages: ChatRequestMessage[],
): Promise<{ assistantText: string; cart: Cart; suggestedChips: ReturnType<typeof buildSuggestedChips> }> {
  const menu = loadMenu();
  const cart = getCart(sessionId);
  if (!cart) throw new Error("Session not found");

  const digest = buildMenuDigest(menu);
  const cartSummary = JSON.stringify({
    lines: cart.lines.length,
    subtotalCents: cart.subtotalCents,
  });

  const system: ChatCompletionMessageParam = {
    role: "system",
    content: [
      "You are BistroBot — concise restaurant ordering assistant.",
      "Tools auto-bind to this customer; never ask for session/login.",
      "Use item ids from the menu digest. When the user orders several items in one message, call apply_cart_operations once with multiple add_or_update_line operations (one per item).",
      "Fountain (item-fountain-drink): exactly one flavor_* in extraModifierIds; swap default flavor_cola by removing it.",
      "Burgers: 'no lettuce' → removedModifierIds includes lettuce.",
      `Menu: ${digest}`,
      `Cart: ${cartSummary}`,
    ].join(" "),
  };

  const history: ChatCompletionMessageParam[] = trimHistory(userMessages).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const messages: ChatCompletionMessageParam[] = [system, ...history];
  let lastAssistant = "";

  for (let i = 0; i < MAX_TOOL_ROUNDS; i++) {
    const completion = await openai.chat.completions.create({
      model: OPENAI_CHAT_MODEL,
      messages,
      tools: CHAT_TOOLS,
      tool_choice: "auto",
      temperature: 0.2,
      max_tokens: MAX_OUTPUT_TOKENS,
    });

    const choice = completion.choices[0];
    if (!choice?.message) throw new Error("No assistant message");

    const msg = choice.message;
    lastAssistant = typeof msg.content === "string" ? msg.content : "";

    if (msg.tool_calls?.length) {
      messages.push(msg);
      const toolResults = await Promise.all(
        msg.tool_calls.map(async (call) => {
          if (call.type !== "function") {
            return { call, content: JSON.stringify({ error: "unsupported_tool_type" }) };
          }
          let parsed: unknown = {};
          try {
            parsed = JSON.parse(call.function.arguments || "{}");
          } catch {
            parsed = {};
          }
          const content = runTool(menu, call.function.name, parsed, sessionId);
          return { call, content };
        }),
      );
      for (const { call, content } of toolResults) {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content,
        });
      }
      continue;
    }

    break;
  }

  const finalCart = getCart(sessionId) ?? cart;
  return {
    assistantText: lastAssistant || "Done.",
    cart: finalCart,
    suggestedChips: buildSuggestedChips(menu, finalCart),
  };
}
