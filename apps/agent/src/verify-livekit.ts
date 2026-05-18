import { config } from "dotenv";
import { resolve } from "node:path";
import { AccessToken } from "livekit-server-sdk";

config({ path: resolve(process.cwd(), "../api/.env") });

const required = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"] as const;
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing:", missing.join(", "));
  process.exit(1);
}

const token = await new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, {
  identity: "verify",
  ttl: "5m",
})
  .addGrant({ roomJoin: true, room: "bistro-verify" })
  .toJwt();

console.log("OK — token length", token.length, "url", process.env.LIVEKIT_URL);
