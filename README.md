# Intelligent Bistro

Text-first **Expo** client and **Node (Fastify)** API for a conversational restaurant cart. Menu browsing, priced modifiers, and an OpenAI tool loop live in one monorepo.

## Structure

| Package / app | Role |
|---------------|------|
| `packages/shared` | Zod menu schema, seed menu, search, pricing, cart apply + unit tests |
| `apps/api` | REST + `POST /chat` + `POST /sessions/:id/voice/turn` (Whisper + fast path + tools) |
| `apps/mobile` | Expo + NativeWind, Menu + Chat (text + hold-to-talk mic), floating cart |
| `apps/agent` | LiveKit token helper + docs (see `apps/agent/README.md`) |

## Prerequisites

- Node 20+
- OpenAI API key for chat (uses **gpt-4o-mini** by default; override with `OPENAI_MODEL` in `apps/api/.env`)

## Setup

```bash
cd intelligent-bistro
npm install
cp .env.example apps/api/.env
# edit apps/api/.env — set OPENAI_API_KEY
npm run build
npm run test
```

## Run API

```bash
npm run dev:api
```

Runs on `http://0.0.0.0:3333` by default.

## Run mobile (Expo)

```bash
npm run dev:mobile
```

Then press **`w`** for web, or run web directly:

```bash
npm run dev:web
```

**Web requires the API running first** (`npm run dev:api`). If the page is blank, check the browser console (F12); you should see either the menu or a “Could not reach API” message.

- **iOS simulator / web**: API URL defaults to `http://127.0.0.1:3333`.
- **Android emulator**: defaults to `http://10.0.2.2:3333`.
- **Physical Android (USB)** — with API running, from repo root:
  ```bash
  npm run android:reverse
  ```
  (Finds `adb` under Android Studio’s SDK even if it’s not on PATH.) Then reload the app in Expo Go.
  Optional: add `%LOCALAPPDATA%\Android\Sdk\platform-tools` to your user **PATH** so `adb` works in any terminal.
- **Physical device (Wi‑Fi)** — copy `apps/mobile/.env.example` to `apps/mobile/.env` and set `EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:3333` (same Wi‑Fi as the phone). Restart Expo.
- If it still fails, allow **port 3333** through Windows Firewall.

## Loom demo script (≈5 min)

1. Browse **Menu**, open **Classic Bistro Burger**, toggle **no lettuce** + **extra pickles**, add to cart.
2. Open **Cart**, show priced line and subtotal.
3. Switch to **Chat**: “Add two spicy chicken sandwiches and a water.”
4. Use a **suggested chip** (“You might like…”) and show cart updating.
5. Brief code tour: `packages/shared` pricing tests, `apps/api/src/chat.ts` tool loop, `apps/mobile` Menu vs Chat.

## Voice in Chat (Phase 2)

On the **Chat** tab, **hold the mic** next to the message box, speak, and release. Audio goes to `POST /sessions/:id/voice/turn` → Whisper → same cart logic as typed chat.

Optional **LiveKit** realtime: set `LIVEKIT_*` in `apps/api/.env`. See [`apps/agent/README.md`](apps/agent/README.md).

## Chat performance

Common phrases like “add a burger with extra pickles” skip the multi-round LLM via a server **fast path**. Full chat uses a compact menu digest, parallel tools, and at most **3** tool rounds.
