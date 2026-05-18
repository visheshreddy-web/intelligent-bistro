import { config } from "dotenv";
import { resolve } from "node:path";
import { AccessToken } from "livekit-server-sdk";

config({ path: resolve(process.cwd(), "../api/.env") });
config({ path: resolve(process.cwd(), ".env") });

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const url = process.env.LIVEKIT_URL;

if (!apiKey || !apiSecret || !url) {
  console.log("LiveKit not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET in apps/api/.env");
  console.log("Voice ordering works today via POST /sessions/:id/voice/turn (Whisper + cart tools).");
  process.exit(0);
}

const sessionId = process.argv[2] ?? "demo-session";
const room = `bistro-${sessionId}`;
const at = new AccessToken(apiKey, apiSecret, { identity: "bistro-agent", ttl: "1h" });
at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true });
const token = await at.toJwt();

console.log("LiveKit ready.");
console.log("  URL:", url);
console.log("  Room:", room);
console.log("  Sample token (first 48 chars):", token.slice(0, 48) + "…");
console.log("Mobile can fetch a per-session token from POST /sessions/:sessionId/livekit/token");
