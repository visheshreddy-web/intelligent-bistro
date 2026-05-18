import { AudioQuality, IOSOutputFormat, type RecordingOptions } from "expo-audio";

export const VOICE_ORDER_RECORDING: RecordingOptions = {
  extension: ".m4a",
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 128000,
  android: {
    outputFormat: "mpeg4",
    audioEncoder: "aac",
  },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.HIGH,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 128000,
  },
};
