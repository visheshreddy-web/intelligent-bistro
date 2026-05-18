# LiveKit voice (Phase 2)

## What works out of the box

**Hold-to-talk voice ordering** (no LiveKit required):

1. Mobile **Chat** tab mic button records audio (`expo-audio` on device, `MediaRecorder` on web).
2. API `POST /sessions/:id/voice/turn` transcribes with **Whisper**, then updates the cart (fast rule path or optimized chat tools).

Same cart and pricing as text chat — server-first, no invented prices.

## Optional LiveKit realtime

When `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` are set in `apps/api/.env`:

- `POST /sessions/:id/livekit/token` returns a join token for room `bistro-{sessionId}`.
- Run `npm run verify-livekit -w @bistro/agent` to sanity-check credentials.
- Run `npm run dev -w @bistro/agent` to print a sample agent token.

A production **@livekit/agents** worker would join that room, stream audio to **OpenAI Realtime**, and call the same HTTP cart endpoints as `POST /chat`. The business logic already lives in `@bistro/shared` + `@bistro/api`.

**Note:** `@livekit/react-native` needs a dev client build; Expo Go is fine for hold-to-talk mic in Chat.

## Chat speed optimizations

- Menu digest in the system prompt (fewer `search_menu` round-trips)
- Rule-based **fast path** for common “add …” phrases
- Tool rounds capped at **3**, history trimmed to **6** messages, tools run **in parallel**
- `loadMenu()` once per turn (not per tool call)
