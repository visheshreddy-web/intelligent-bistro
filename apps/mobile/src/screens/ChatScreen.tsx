import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";
import { useSessionStore } from "../sessionStore";
import { fetchCart, sendChat, sendVoiceTurn } from "../api";
import type { VoiceUpload } from "../voiceUpload";
import type { ChatMessage, SuggestedChip } from "../types";
import { formatMoney } from "../format";
import { colors, rootScreen } from "../theme";
import { useAppLayout } from "../layout/LayoutProvider";
import { useCartSheetStore } from "../cartSheetStore";
import { AppHeader } from "../components/AppHeader";
import { VoiceMicButton } from "../components/VoiceMicButton";

export function ChatScreen() {
  const layout = useAppLayout();
  const openCartSheet = useCartSheetStore((s) => s.openSheet);
  const sessionId = useSessionStore((s) => s.sessionId);
  const qc = useQueryClient();
  const cartQuery = useQuery({
    queryKey: ["cart", sessionId],
    queryFn: () => fetchCart(sessionId!),
    enabled: !!sessionId,
  });

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Welcome to BistroBot. Type or hold the mic (~1 sec) and speak clearly — e.g. “Add a classic burger with extra pickles and no lettuce.”",
    },
  ]);
  const [chips, setChips] = useState<SuggestedChip[]>([]);
  const [voiceRecording, setVoiceRecording] = useState(false);

  const chatMutation = useMutation({
    mutationFn: async (next: ChatMessage[]) => {
      if (!sessionId) throw new Error("No session");
      return sendChat(sessionId, next);
    },
    onSuccess: (data) => {
      const prefix = data.fast ? "Quick order — " : "";
      setMessages((m) => [...m, { role: "assistant", content: `${prefix}${data.assistantText}` }]);
      qc.setQueryData(["cart", sessionId!], data.cart);
      setChips(data.suggestedChips ?? []);
    },
    onError: (err: Error) => {
      setMessages((m) => [...m, { role: "assistant", content: `Sorry — ${err.message}` }]);
    },
  });

  const voiceMutation = useMutation({
    mutationFn: async (audio: VoiceUpload) => {
      if (!sessionId) throw new Error("No session");
      return sendVoiceTurn(sessionId, audio);
    },
    onSuccess: (data) => {
      setMessages((m) => [
        ...m,
        { role: "user", content: data.userText },
        {
          role: "assistant",
          content: `${data.fast ? "Quick order — " : ""}${data.assistantText}`,
        },
      ]);
      qc.setQueryData(["cart", sessionId!], data.cart);
      setChips(data.suggestedChips ?? []);
    },
    onError: (err: Error) => {
      const msg = err.message.replace(/^Sorry —\s*/i, "");
      if (/too short|hold the mic/i.test(msg)) {
        setMessages((m) => [...m, { role: "assistant", content: msg }]);
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: `Sorry — ${msg}` }]);
    },
  });

  const busy = chatMutation.isPending || voiceMutation.isPending || voiceRecording;

  const onVoiceReady = useCallback(
    (audio: VoiceUpload) => {
      if (voiceMutation.isPending) return;
      voiceMutation.mutate(audio);
    },
    [voiceMutation],
  );

  const onVoiceError = useCallback((message: string) => {
    setMessages((m) => [...m, { role: "assistant", content: `Sorry — ${message}` }]);
  }, []);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !sessionId) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    chatMutation.mutate(nextMessages);
  };

  const cartCount = cartQuery.data?.lines.reduce((s, l) => s + l.qty, 0) ?? 0;

  return (
    <View style={rootScreen}>
      <View style={{ flex: 1, width: "100%" }}>
        <AppHeader
          title="Chat"
          subtitle="Hold the mic, speak your full order, then release — check “You said” below."
          right={
            <Pressable onPress={() => openCartSheet()} style={styles.headerCart} hitSlop={8}>
              <MaterialIcons name="shopping-cart" size={22} color={colors.gold} />
              {cartCount > 0 ? (
                <View style={styles.headerCartBadge}>
                  <Text style={styles.headerCartBadgeText}>{cartCount > 9 ? "9+" : cartCount}</Text>
                </View>
              ) : null}
            </Pressable>
          }
        />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={80}
        >
          <FlatList
            style={{ flex: 1 }}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={[styles.list, { paddingHorizontal: layout.horizontalPadding }]}
            ListHeaderComponent={
              cartQuery.data && cartQuery.data.lines.length > 0 ? (
                <View style={styles.cartBanner}>
                  <Text style={styles.cartBannerLabel}>Current total</Text>
                  <Text style={styles.cartBannerTotal}>{formatMoney(cartQuery.data.subtotalCents)}</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const mine = item.role === "user";
              return (
                <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                  {!mine ? (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>B</Text>
                    </View>
                  ) : null}
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.content}</Text>
                  </View>
                </View>
              );
            }}
          />
          {chips.length ? <ScrollChips chips={chips} onPick={(p) => send(p)} /> : null}
          {busy ? (
            <View style={styles.thinkingWrap}>
              <View style={styles.thinkingPill}>
                <ActivityIndicator color={colors.gold} size="small" />
                <Text style={styles.thinkingText}>
                  {voiceMutation.isPending ? "Listening…" : "BistroBot is thinking…"}
                </Text>
              </View>
            </View>
          ) : null}
          <View style={[styles.composer, { paddingHorizontal: layout.horizontalPadding }]}>
            <VoiceMicButton
              disabled={!sessionId || busy}
              recording={voiceRecording}
              onRecordingChange={setVoiceRecording}
              onAudioReady={onVoiceReady}
              onError={onVoiceError}
            />
            <TextInput
              style={styles.input}
              placeholder={
                voiceRecording ? "Release when done speaking…" : "Message or hold mic ~1 sec…"
              }
              placeholderTextColor={colors.creamMuted}
              value={input}
              onChangeText={setInput}
              multiline
              editable={!!sessionId && !busy}
            />
            <Pressable
              onPress={() => send(input)}
              disabled={!sessionId || busy}
              style={[styles.sendBtn, (!sessionId || busy) && styles.sendBtnDisabled]}
            >
              <Text style={styles.sendBtnText}>↑</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

function ScrollChips({ chips, onPick }: { chips: SuggestedChip[]; onPick: (prompt: string) => void }) {
  return (
    <View style={styles.chipsBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
        {chips.map((item) => (
          <Pressable key={item.id} onPress={() => onPick(item.prompt)} style={styles.chip}>
            <Text style={styles.chipText} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCart: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCartBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.terracotta,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  headerCartBadgeText: { fontSize: 10, fontWeight: "800", color: colors.cream },
  list: { paddingBottom: 16, paddingTop: 8 },
  cartBanner: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.goldDim,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cartBannerLabel: { fontSize: 12, fontWeight: "600", color: colors.gold, letterSpacing: 0.5, textTransform: "uppercase" },
  cartBannerTotal: { fontSize: 20, fontWeight: "700", color: colors.cream },
  bubbleRow: { marginBottom: 12, flexDirection: "row", alignItems: "flex-end", gap: 8, maxWidth: "100%" },
  bubbleRowMine: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  bubbleRowTheirs: { alignSelf: "flex-start" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.goldDim,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontWeight: "800", color: colors.gold },
  bubble: { maxWidth: "82%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: colors.terracotta, borderBottomRightRadius: 4 },
  bubbleTheirs: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 22, color: colors.cream },
  bubbleTextMine: { color: colors.cream },
  thinkingWrap: { paddingVertical: 8, alignItems: "center" },
  thinkingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thinkingText: { color: colors.creamMuted, fontSize: 13 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 14,
    backgroundColor: colors.bgElevated,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: colors.surface,
    color: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.35 },
  sendBtnText: { fontWeight: "700", fontSize: 20, color: colors.bg },
  chipsBar: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.bgElevated },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: { fontSize: 13, fontWeight: "500", color: colors.cream },
});
