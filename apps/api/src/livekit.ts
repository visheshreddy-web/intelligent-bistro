import { AccessToken } from "livekit-server-sdk";

export function isLiveKitConfigured(): boolean {
  return Boolean(
    process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET &&
      process.env.LIVEKIT_URL,
  );
}

export async function createLiveKitToken(sessionId: string): Promise<{ token: string; url: string; room: string }> {
  const apiKey = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;
  const url = process.env.LIVEKIT_URL!;
  const room = `bistro-${sessionId}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity: `guest-${sessionId.slice(0, 8)}`,
    ttl: "1h",
  });
  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
  });

  return { token: await at.toJwt(), url, room };
}
