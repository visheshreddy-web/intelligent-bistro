import "./loadEnv.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import OpenAI from "openai";
import type { CartOperation } from "@bistro/shared";
import { applyCartOperations, emptyCart, searchMenu } from "@bistro/shared";
import { createSession, getCart, setCart } from "./sessionStore.js";
import { runChatTurn } from "./chat.js";
import { tryFastPathTurn } from "./chatFastPath.js";
import { OPENAI_CHAT_MODEL } from "./config.js";
import { loadMenu } from "./menu.js";
import { runVoiceTurn } from "./voice.js";
import { createLiveKitToken, isLiveKitConfigured } from "./livekit.js";

const openaiKey = process.env.OPENAI_API_KEY;
const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: true,
  });

  app.register(multipart, {
    limits: { fileSize: 8 * 1024 * 1024 },
  });

  app.get("/health", async () => ({ ok: true }));

  app.post("/sessions", async () => {
    const sessionId = createSession();
    return { sessionId };
  });

  app.get("/menu", async () => loadMenu());

  app.get<{ Querystring: { q?: string } }>("/menu/search", async (req) => {
    const q = req.query.q ?? "";
    return { hits: searchMenu(loadMenu(), q, 12) };
  });

  app.get<{ Params: { id: string } }>("/sessions/:id/cart", async (req, reply) => {
    const cart = getCart(req.params.id);
    if (!cart) return reply.code(404).send({ error: "not_found" });
    return cart;
  });

  app.post<{ Params: { id: string }; Body: { operations: CartOperation[] } }>(
    "/sessions/:id/cart",
    async (req, reply) => {
      const cart = getCart(req.params.id);
      if (!cart) return reply.code(404).send({ error: "not_found" });
      const result = applyCartOperations(loadMenu(), cart, {
        sessionId: req.params.id,
        operations: req.body.operations ?? [],
      });
      setCart(req.params.id, result.cart);
      if (!result.ok) return reply.code(400).send(result);
      return result;
    },
  );

  app.post<{
    Body: { sessionId: string; messages: { role: "user" | "assistant" | "system"; content: string }[] };
  }>("/chat", async (req, reply) => {
    if (!openai) {
      return reply.code(503).send({
        error: "OPENAI_API_KEY missing",
        hint: "Set OPENAI_API_KEY in apps/api/.env to enable conversational ordering.",
      });
    }
    const { sessionId, messages } = req.body;
    if (!sessionId || !messages?.length) {
      return reply.code(400).send({ error: "sessionId and messages required" });
    }
    if (!getCart(sessionId)) return reply.code(404).send({ error: "session not found" });
    try {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      if (lastUser?.content) {
        const fast = tryFastPathTurn(loadMenu(), sessionId, lastUser.content);
        if (fast) return { ...fast, fast: true };
      }
      const out = await runChatTurn(openai, sessionId, messages);
      return { ...out, fast: false };
    } catch (e) {
      req.log.error(e);
      return reply.code(500).send({ error: String(e) });
    }
  });

  app.post<{ Params: { id: string } }>("/sessions/:id/voice/turn", async (req, reply) => {
    if (!openai) {
      return reply.code(503).send({
        error: "OPENAI_API_KEY missing",
        hint: "Set OPENAI_API_KEY in apps/api/.env for voice ordering.",
      });
    }
    if (!getCart(req.params.id)) return reply.code(404).send({ error: "session not found" });
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: "audio file required (field name: audio)" });
    try {
      const buffer = await file.toBuffer();
      const out = await runVoiceTurn(openai, req.params.id, buffer, file.mimetype);
      return out;
    } catch (e) {
      req.log.error(e);
      const message = e instanceof Error ? e.message : String(e);
      const clientError = /too short|could not understand/i.test(message);
      return reply.code(clientError ? 400 : 500).send({ error: message });
    }
  });

  app.post<{ Params: { id: string } }>("/sessions/:id/livekit/token", async (req, reply) => {
    if (!isLiveKitConfigured()) {
      return reply.code(503).send({
        error: "livekit_not_configured",
        hint: "Set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET in apps/api/.env",
      });
    }
    if (!getCart(req.params.id)) return reply.code(404).send({ error: "session not found" });
    try {
      return await createLiveKitToken(req.params.id);
    } catch (e) {
      req.log.error(e);
      return reply.code(500).send({ error: String(e) });
    }
  });

  app.post<{ Params: { id: string } }>("/sessions/:id/checkout", async (req) => {
    const cart = getCart(req.params.id);
    if (!cart) return { error: "not_found" };
    if (cart.lines.length === 0) return { ok: false, message: "Cart is empty" };
    const orderId = `ord_${Date.now().toString(36)}`;
    setCart(req.params.id, emptyCart(req.params.id));
    return {
      ok: true,
      orderId,
      message: "Order placed (demo). Kitchen notified. Cart cleared.",
      totalCents: cart.subtotalCents,
    };
  });

  return app;
}

const port = Number(process.env.PORT ?? 3333);
const host = process.env.HOST ?? "0.0.0.0";

buildServer()
  .listen({ port, host })
  .then(() => {
    console.log(`API listening on http://${host}:${port}`);
    console.log(`OpenAI chat model: ${openaiKey ? OPENAI_CHAT_MODEL : "(chat disabled — no OPENAI_API_KEY)"}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
