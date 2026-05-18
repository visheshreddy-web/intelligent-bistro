import type { OpenAI } from "openai";
import { toFile } from "openai";
import { buildWhisperPrompt, normalizeOrderTranscript } from "@bistro/shared";
import { loadMenu } from "./menu.js";
import { tryFastPathTurn } from "./chatFastPath.js";
import { runChatTurn, type ChatRequestMessage } from "./chat.js";
import { OPENAI_TRANSCRIBE_MODEL } from "./config.js";

const MIN_AUDIO_BYTES = 2_000;

function fileMeta(mimeType: string): { ext: string; type: string } {
  const m = mimeType.toLowerCase();
  if (m.includes("webm")) return { ext: "webm", type: "audio/webm" };
  if (m.includes("3gp")) return { ext: "3gp", type: m || "audio/3gpp" };
  if (m.includes("wav")) return { ext: "wav", type: "audio/wav" };
  return { ext: "m4a", type: m.includes("mp4") || m.includes("m4a") ? m : "audio/mp4" };
}

export async function transcribeBuffer(
  openai: OpenAI,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (buffer.length < MIN_AUDIO_BYTES) {
    throw new Error("Recording too short — hold the mic about 1 second while you speak.");
  }

  const menu = loadMenu();
  const { ext, type } = fileMeta(mimeType);
  const file = await toFile(buffer, `voice.${ext}`, { type });
  const model = OPENAI_TRANSCRIBE_MODEL;
  const usesGpt4oTranscribe = model.includes("gpt-4o");

  try {
    const result = await openai.audio.transcriptions.create({
      file,
      model,
      language: "en",
      temperature: 0,
      prompt: buildWhisperPrompt(menu),
      ...(usesGpt4oTranscribe
        ? { response_format: "json" as const, chunking_strategy: "auto" as const }
        : {}),
    });
    const raw = typeof result === "string" ? result : result.text;
    return normalizeOrderTranscript(raw.trim());
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/too short|minimum audio length/i.test(msg)) {
      throw new Error("Recording too short — hold the mic about 1 second while you speak.");
    }
    throw e;
  }
}

export async function runVoiceTurn(
  openai: OpenAI,
  sessionId: string,
  audioBuffer: Buffer,
  mimeType: string,
  history: ChatRequestMessage[] = [],
): Promise<{
  userText: string;
  assistantText: string;
  cart: Awaited<ReturnType<typeof runChatTurn>>["cart"];
  suggestedChips: Awaited<ReturnType<typeof runChatTurn>>["suggestedChips"];
  fast: boolean;
}> {
  const userText = await transcribeBuffer(openai, audioBuffer, mimeType);
  if (!userText) {
    throw new Error("Could not understand audio — speak clearly and try again.");
  }

  const menu = loadMenu();
  const fastResult = tryFastPathTurn(menu, sessionId, userText);
  if (fastResult) {
    return { userText, ...fastResult, fast: true };
  }

  const messages: ChatRequestMessage[] = [...history, { role: "user", content: userText }];
  const out = await runChatTurn(openai, sessionId, messages);
  return { userText, ...out, fast: false };
}
