import { Platform } from "react-native";
import * as Device from "expo-device";

export function getApiBaseUrl(): string {
  const env = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (env) return env.replace(/\/$/, "");

  if (Platform.OS === "android") {
    if (Device.isDevice) return "http://127.0.0.1:3333";
    return "http://10.0.2.2:3333";
  }

  return "http://127.0.0.1:3333";
}

export type ApiConnectionKind = "env" | "android-emulator" | "android-physical" | "ios-simulator" | "localhost";

export function getApiConnectionKind(): ApiConnectionKind {
  if (process.env.EXPO_PUBLIC_API_URL?.trim()) return "env";
  if (Platform.OS === "android") return Device.isDevice ? "android-physical" : "android-emulator";
  if (Platform.OS === "ios" && Device.isDevice) return "env";
  return Platform.OS === "ios" ? "ios-simulator" : "localhost";
}

export function getApiConnectionHelp(): string {
  const url = getApiBaseUrl();
  const kind = getApiConnectionKind();

  if (kind === "env") {
    return `Using EXPO_PUBLIC_API_URL (${url}). Ensure the API is running and your phone is on the same Wi‑Fi.`;
  }

  if (kind === "android-physical") {
    return [
      `Trying ${url} on your phone.`,
      "",
      "Option A — USB (quickest):",
      "  adb reverse tcp:3333 tcp:3333",
      "  Then reload the app (shake device → Reload).",
      "",
      "Option B — Wi‑Fi:",
      "  1. On PC: ipconfig → note IPv4 (e.g. 192.168.1.10)",
      "  2. Create apps/mobile/.env:",
      "     EXPO_PUBLIC_API_URL=http://YOUR_IP:3333",
      "  3. Restart Expo (npm run dev:mobile)",
      "",
      "Also: npm run dev:api must be running; allow port 3333 in Windows Firewall.",
    ].join("\n");
  }

  if (kind === "android-emulator") {
    return `Using Android emulator → ${url}. Start the API with npm run dev:api on your PC.`;
  }

  return `Using ${url}. Start the API with npm run dev:api.`;
}
