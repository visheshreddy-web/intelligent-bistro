import type { Cart, CartOperation, ChatMessage, Menu, SuggestedChip } from "./types";
import { getApiBaseUrl } from "./apiConfig";
import type { VoiceUpload } from "./voiceUpload";

export { getApiBaseUrl, getApiConnectionHelp, getApiConnectionKind } from "./apiConfig";

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function createSession(): Promise<{ sessionId: string }> {
  return json("/sessions", { method: "POST", body: "{}" });
}

export const MENU_CACHE_KEY = "menu-v7";

export async function fetchMenu(): Promise<Menu> {
  return json(`/menu?_=${MENU_CACHE_KEY}`);
}

export async function fetchCart(sessionId: string): Promise<Cart> {
  return json(`/sessions/${sessionId}/cart`);
}

export async function applyCartOperations(
  sessionId: string,
  operations: CartOperation[],
): Promise<{ ok: boolean; cart: Cart; errors?: string[] }> {
  return json(`/sessions/${sessionId}/cart`, {
    method: "POST",
    body: JSON.stringify({ operations }),
  });
}

export async function sendChat(
  sessionId: string,
  messages: ChatMessage[],
): Promise<{
  assistantText: string;
  cart: Cart;
  suggestedChips: SuggestedChip[];
  fast?: boolean;
}> {
  return json("/chat", {
    method: "POST",
    body: JSON.stringify({ sessionId, messages }),
  });
}

export async function sendVoiceTurn(
  sessionId: string,
  audio: VoiceUpload,
): Promise<{
  userText: string;
  assistantText: string;
  cart: Cart;
  suggestedChips: SuggestedChip[];
  fast?: boolean;
}> {
  const form = new FormData();
  if (audio.kind === "file") {
    form.append("audio", {
      uri: audio.uri,
      name: audio.name,
      type: audio.type,
    } as unknown as Blob);
  } else {
    form.append("audio", audio.blob, audio.filename ?? "voice.webm");
  }

  const url = `${getApiBaseUrl()}/sessions/${sessionId}/voice/turn`;
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", body: form });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/network request failed/i.test(msg)) {
      throw new Error(
        `Cannot reach API at ${getApiBaseUrl()}. Start npm run dev:api. On a physical phone use Wi‑Fi (.env IP) or npm run android:reverse (USB).`,
      );
    }
    throw e;
  }
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const body = JSON.parse(text) as { error?: string };
      if (body.error) message = body.error;
    } catch {}
    if (res.status === 400 || /too short|hold the mic/i.test(message)) {
      throw new Error("Hold the mic about 1 second while you speak, then release.");
    }
    throw new Error(message.length > 160 ? `${res.status} voice request failed` : message);
  }
  return res.json() as Promise<{
    userText: string;
    assistantText: string;
    cart: Cart;
    suggestedChips: SuggestedChip[];
    fast?: boolean;
  }>;
}

export async function fetchLiveKitToken(
  sessionId: string,
): Promise<{ token: string; url: string; room: string } | null> {
  const res = await fetch(`${getApiBaseUrl()}/sessions/${sessionId}/livekit/token`, { method: "POST" });
  if (res.status === 503) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return res.json() as Promise<{ token: string; url: string; room: string }>;
}

export async function checkout(
  sessionId: string,
): Promise<{ ok: boolean; orderId?: string; message?: string; totalCents?: number }> {
  return json(`/sessions/${sessionId}/checkout`, { method: "POST", body: "{}" });
}
