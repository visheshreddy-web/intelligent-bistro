import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const isWin = process.platform === "win32";
const adbName = isWin ? "adb.exe" : "adb";

function findAdb() {
  const envRoots = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT].filter(Boolean);
  const candidates = [
    ...envRoots.map((root) => join(root, "platform-tools", adbName)),
    join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk", "platform-tools", adbName),
    join(homedir(), "AppData", "Local", "Android", "Sdk", "platform-tools", adbName),
    adbName,
  ];
  for (const p of candidates) {
    if (p === adbName) continue;
    if (existsSync(p)) return p;
  }
  return adbName;
}

const adb = findAdb();

try {
  execFileSync(adb, ["reverse", "tcp:3333", "tcp:3333"], { stdio: "inherit" });
  console.log("\nOK — phone localhost:3333 → PC port 3333. Reload the Expo app on your device.");
} catch {
  console.error("\nCould not run adb reverse.");
  console.error(`Tried: ${adb}`);
  console.error("\nIf adb is missing from PATH, add this folder to your user PATH:");
  console.error("  %LOCALAPPDATA%\\Android\\Sdk\\platform-tools");
  console.error("\nOr use Wi‑Fi instead — apps/mobile/.env:");
  console.error("  EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:3333");
  process.exit(1);
}
