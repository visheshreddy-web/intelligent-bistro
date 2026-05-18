import { useMemo } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCart, fetchMenu, applyCartOperations, checkout, MENU_CACHE_KEY } from "../api";
import { useSessionStore } from "../sessionStore";
import type { CartLine } from "../types";
import { formatMoney } from "../format";
import { colors, layout, shadow } from "../theme";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function CartModal({ visible, onClose }: Props) {
  const sessionId = useSessionStore((s) => s.sessionId);
  const qc = useQueryClient();

  const menuQuery = useQuery({ queryKey: ["menu", MENU_CACHE_KEY], queryFn: fetchMenu });
  const cartQuery = useQuery({
    queryKey: ["cart", sessionId],
    queryFn: () => fetchCart(sessionId!),
    enabled: !!sessionId && visible,
  });

  const nameByItem = useMemo(() => {
    const m = menuQuery.data;
    if (!m) return new Map<string, string>();
    return new Map(m.items.map((i) => [i.id, i.name]));
  }, [menuQuery.data]);

  const lines = cartQuery.data?.lines ?? [];

  const setQty = useMutation({
    mutationFn: async ({ lineId, qty }: { lineId: string; qty: number }) => {
      if (!sessionId) throw new Error("no session");
      return applyCartOperations(sessionId, [{ type: "set_line_qty", lineId, qty }]);
    },
    onSuccess: (res) => {
      if (sessionId && res.ok) qc.setQueryData(["cart", sessionId], res.cart);
    },
  });

  const removeLine = useMutation({
    mutationFn: async (lineId: string) => {
      if (!sessionId) throw new Error("no session");
      return applyCartOperations(sessionId, [{ type: "remove_line", lineId }]);
    },
    onSuccess: (res) => {
      if (sessionId && res.ok) qc.setQueryData(["cart", sessionId], res.cart);
    },
  });

  const co = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error("no session");
      return checkout(sessionId);
    },
    onSuccess: (res) => {
      if (sessionId && res.ok) {
        qc.invalidateQueries({ queryKey: ["cart", sessionId] });
      }
    },
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Your order</Text>
          <Text style={styles.subtitle}>Prices are calculated on the server.</Text>
          {cartQuery.isLoading ? (
            <ActivityIndicator color={colors.gold} style={{ marginVertical: 24 }} />
          ) : (
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {lines.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.empty}>Your cart is empty.</Text>
                  <Text style={styles.emptyHint}>Browse the menu or ask BistroBot in Chat.</Text>
                </View>
              ) : (
                lines.map((line) => (
                  <LineRow
                    key={line.lineId}
                    line={line}
                    name={nameByItem.get(line.itemId) ?? line.itemId}
                    onInc={() => setQty.mutate({ lineId: line.lineId, qty: line.qty + 1 })}
                    onDec={() => setQty.mutate({ lineId: line.lineId, qty: Math.max(0, line.qty - 1) })}
                    onRemove={() => removeLine.mutate(line.lineId)}
                    busy={setQty.isPending || removeLine.isPending}
                  />
                ))
              )}
            </ScrollView>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.total}>{formatMoney(cartQuery.data?.subtotalCents ?? 0)}</Text>
          </View>
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={[styles.btn, styles.btnClose]}>
              <Text style={styles.btnCloseText}>Keep browsing</Text>
            </Pressable>
            <Pressable
              onPress={() => co.mutate()}
              disabled={lines.length === 0 || co.isPending}
              style={[styles.btn, styles.btnOrder, (lines.length === 0 || co.isPending) && styles.btnDisabled]}
            >
              {co.isPending ? (
                <ActivityIndicator color={colors.bg} />
              ) : (
                <Text style={styles.btnOrderText}>Place order</Text>
              )}
            </Pressable>
          </View>
          {co.data?.ok ? <Text style={styles.confirm}>{co.data.message}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

function LineRow({
  line,
  name,
  onInc,
  onDec,
  onRemove,
  busy,
}: {
  line: CartLine;
  name: string;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
  busy: boolean;
}) {
  const rem = line.selection.removedModifierIds.length ? `No: ${line.selection.removedModifierIds.join(", ")}` : "";
  const ex = line.selection.extraModifierIds.length ? `Extras: ${line.selection.extraModifierIds.join(", ")}` : "";
  return (
    <View style={styles.line}>
      <View style={styles.lineTop}>
        <Text style={styles.lineName}>{name}</Text>
        <Text style={styles.linePrice}>{formatMoney(line.lineTotalCents)}</Text>
      </View>
      {rem ? <Text style={styles.lineMetaMuted}>{rem}</Text> : null}
      {ex ? <Text style={styles.lineMetaGold}>{ex}</Text> : null}
      <View style={styles.lineActions}>
        <View style={styles.qtyRow}>
          <Pressable disabled={busy} onPress={onDec} style={styles.qtyBtn}>
            <Text style={styles.qtyBtnText}>−</Text>
          </Pressable>
          <Text style={styles.qty}>{line.qty}</Text>
          <Pressable disabled={busy} onPress={onInc} style={styles.qtyBtn}>
            <Text style={styles.qtyBtnText}>+</Text>
          </Pressable>
        </View>
        <Pressable disabled={busy} onPress={onRemove}>
          <Text style={styles.remove}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.65)" },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: layout.radiusLg,
    borderTopRightRadius: layout.radiusLg,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 28,
    paddingTop: 12,
    backgroundColor: colors.bgElevated,
    borderTopWidth: 1,
    borderColor: colors.borderStrong,
    ...shadow.card,
  },
  handle: {
    marginBottom: 12,
    height: 4,
    width: 40,
    alignSelf: "center",
    borderRadius: 4,
    backgroundColor: colors.borderStrong,
  },
  title: { fontSize: 22, fontWeight: "700", color: colors.cream, letterSpacing: -0.3 },
  subtitle: { marginTop: 4, marginBottom: 12, fontSize: 13, color: colors.creamMuted },
  scroll: { maxHeight: 340 },
  emptyWrap: { alignItems: "center", paddingVertical: 32, gap: 8 },
  empty: { fontSize: 16, fontWeight: "600", color: colors.cream },
  emptyHint: { fontSize: 14, color: colors.creamMuted, textAlign: "center" },
  totalRow: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  totalLabel: { fontSize: 13, fontWeight: "600", color: colors.creamMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  total: { fontSize: 24, fontWeight: "700", color: colors.gold },
  actions: { marginTop: 14, flexDirection: "row", gap: 10 },
  btn: { flex: 1, alignItems: "center", borderRadius: layout.radiusMd, paddingVertical: 14 },
  btnClose: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnCloseText: { fontWeight: "600", color: colors.cream },
  btnOrder: { backgroundColor: colors.gold },
  btnOrderText: { fontWeight: "700", color: colors.bg, fontSize: 15 },
  btnDisabled: { opacity: 0.4 },
  confirm: { marginTop: 10, textAlign: "center", fontSize: 14, color: colors.success },
  line: {
    marginBottom: 10,
    borderRadius: layout.radiusMd,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
  },
  lineTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  lineName: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.cream },
  lineMetaMuted: { marginTop: 4, fontSize: 12, color: colors.terracotta },
  lineMetaGold: { marginTop: 2, fontSize: 12, color: colors.gold },
  linePrice: { fontSize: 15, fontWeight: "700", color: colors.gold },
  lineActions: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: {
    borderRadius: layout.radiusSm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  qtyBtnText: { fontWeight: "700", fontSize: 16, color: colors.cream },
  qty: { minWidth: 28, textAlign: "center", fontWeight: "700", fontSize: 16, color: colors.cream },
  remove: { fontSize: 14, fontWeight: "600", color: colors.danger },
});
