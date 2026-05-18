export type VoiceUpload =
  | { kind: "blob"; blob: Blob; filename?: string }
  | { kind: "file"; uri: string; name: string; type: string };
