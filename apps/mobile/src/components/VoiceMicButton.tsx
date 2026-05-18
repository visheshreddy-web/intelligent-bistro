import { useCallback, useEffect, useRef } from "react";
import { Platform, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { colors } from "../theme";
import type { VoiceUpload } from "../voiceUpload";
import { VOICE_ORDER_RECORDING } from "../recordingPreset";

const MIN_RECORD_MS = 1200;

type Props = {
  disabled?: boolean;
  recording: boolean;
  onRecordingChange: (recording: boolean) => void;
  onAudioReady: (audio: VoiceUpload) => void;
  onError: (message: string) => void;
};

type NativeRecorder = ReturnType<typeof useAudioRecorder>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function friendlyMicError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  if (/stop failed|already been prepared|too short/i.test(raw)) {
    return "Hold the mic about 1 second while you speak, then release.";
  }
  return raw.replace(/^Error:\s*/i, "").replace(/^Caused by:.*$/im, "").trim() || "Recording failed — try again.";
}

async function safeResetNativeRecorder(recorder: NativeRecorder) {
  const status = recorder.getStatus();
  if (status.isRecording) {
    try {
      await recorder.stop();
    } catch {}
    return;
  }
  if (status.canRecord) {
    try {
      recorder.record();
      await recorder.stop();
    } catch {}
  }
}

export function VoiceMicButton({
  disabled,
  recording,
  onRecordingChange,
  onAudioReady,
  onError,
}: Props) {
  const recorder = useAudioRecorder(VOICE_ORDER_RECORDING);
  const webChunksRef = useRef<Blob[]>([]);
  const webRecorderRef = useRef<MediaRecorder | null>(null);
  const webStreamRef = useRef<MediaStream | null>(null);
  const holdRef = useRef(false);
  const busyRef = useRef(false);
  const stopAfterStartRef = useRef(false);
  const recordStartedAtRef = useRef(0);
  const stoppingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (Platform.OS !== "web") {
        void safeResetNativeRecorder(recorder);
      }
    };
  }, [recorder]);

  const startNative = useCallback(async () => {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) throw new Error("Microphone permission denied");
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

    await safeResetNativeRecorder(recorder);

    const status = recorder.getStatus();
    if (!status.canRecord) {
      await recorder.prepareToRecordAsync();
    }
    recorder.record();
    recordStartedAtRef.current = Date.now();
    onRecordingChange(true);
  }, [recorder, onRecordingChange]);

  const stopNative = useCallback(async () => {
    const elapsed = Date.now() - recordStartedAtRef.current;
    const waitMs = MIN_RECORD_MS - elapsed;
    if (waitMs > 0) await sleep(waitMs);

    const status = recorder.getStatus();
    if (!status.isRecording) {
      await safeResetNativeRecorder(recorder);
      onRecordingChange(false);
      throw new Error("Hold the mic about 1 second while you speak, then release.");
    }

    try {
      await recorder.stop();
    } catch {
      await safeResetNativeRecorder(recorder);
      onRecordingChange(false);
      throw new Error("Hold the mic about 1 second while you speak, then release.");
    }

    onRecordingChange(false);

    const after = recorder.getStatus();
    if (after.durationMillis > 0 && after.durationMillis < 400) {
      await safeResetNativeRecorder(recorder);
      throw new Error("Hold the mic about 1 second while you speak, then release.");
    }

    const uri = recorder.uri;
    if (!uri) {
      await safeResetNativeRecorder(recorder);
      throw new Error("No recording captured — hold a little longer.");
    }

    onAudioReady({
      kind: "file",
      uri,
      name: uri.toLowerCase().endsWith(".3gp") ? "voice.3gp" : "voice.m4a",
      type: uri.toLowerCase().endsWith(".3gp") ? "audio/3gpp" : "audio/mp4",
    });
  }, [recorder, onRecordingChange, onAudioReady]);

  const startWeb = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    webStreamRef.current = stream;
    webChunksRef.current = [];
    const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) webChunksRef.current.push(e.data);
    };
    mr.start();
    webRecorderRef.current = mr;
    recordStartedAtRef.current = Date.now();
    onRecordingChange(true);
  }, [onRecordingChange]);

  const stopWeb = useCallback(async () => {
    const elapsed = Date.now() - recordStartedAtRef.current;
    const waitMs = MIN_RECORD_MS - elapsed;
    if (waitMs > 0) await sleep(waitMs);

    const mr = webRecorderRef.current;
    webRecorderRef.current = null;
    if (mr && mr.state !== "inactive") {
      await new Promise<void>((resolve) => {
        mr.onstop = () => resolve();
        mr.stop();
      });
    }
    webStreamRef.current?.getTracks().forEach((t) => t.stop());
    webStreamRef.current = null;
    onRecordingChange(false);
    if (webChunksRef.current.length === 0) {
      throw new Error("Hold the mic about 1 second while you speak, then release.");
    }
    onAudioReady({
      kind: "blob",
      blob: new Blob(webChunksRef.current, { type: "audio/webm" }),
      filename: "voice.webm",
    });
    webChunksRef.current = [];
  }, [onRecordingChange, onAudioReady]);

  const runStop = useCallback(async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    busyRef.current = true;
    try {
      if (Platform.OS === "web") await stopWeb();
      else await stopNative();
    } catch (e) {
      onRecordingChange(false);
      if (Platform.OS !== "web") await safeResetNativeRecorder(recorder);
      onError(friendlyMicError(e));
    } finally {
      busyRef.current = false;
      stoppingRef.current = false;
    }
  }, [recorder, stopNative, stopWeb, onError, onRecordingChange]);

  const onPressIn = async () => {
    if (disabled || busyRef.current || holdRef.current) return;
    holdRef.current = true;
    stopAfterStartRef.current = false;
    busyRef.current = true;
    try {
      if (Platform.OS === "web") await startWeb();
      else await startNative();
      if (stopAfterStartRef.current) {
        await runStop();
      }
    } catch (e) {
      holdRef.current = false;
      stopAfterStartRef.current = false;
      onRecordingChange(false);
      if (Platform.OS !== "web") await safeResetNativeRecorder(recorder);
      onError(friendlyMicError(e));
    } finally {
      busyRef.current = false;
    }
  };

  const onPressOut = async () => {
    if (!holdRef.current) return;
    holdRef.current = false;
    stopAfterStartRef.current = true;
    if (busyRef.current) return;
    await runStop();
  };

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      style={[styles.btn, recording && styles.btnActive, disabled && styles.btnDisabled]}
      accessibilityLabel="Hold to speak"
    >
      <MaterialIcons name={recording ? "mic" : "mic-none"} size={22} color={recording ? colors.cream : colors.gold} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  btnActive: {
    backgroundColor: colors.terracotta,
    borderColor: colors.terracotta,
  },
  btnDisabled: { opacity: 0.35 },
});
