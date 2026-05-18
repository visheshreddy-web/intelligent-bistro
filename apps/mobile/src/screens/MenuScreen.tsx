import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useSessionStore } from "../sessionStore";
import { applyCartOperations, fetchMenu, MENU_CACHE_KEY } from "../api";
import type { Menu, MenuItem } from "../types";
import { formatMoney } from "../format";
import { colors, headingMd, rootScreen } from "../theme";
import { AppHeader } from "../components/AppHeader";
import { MenuItemImage } from "../components/MenuItemImage";
import { useAppLayout } from "../layout/LayoutProvider";
import { menuStyles as s } from "./menuStyles";

function ModifierToggle({
  label,
  sub,
  active,
  onToggle,
}: {
  label: string;
  sub?: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} style={[modalStyles.toggle, active && modalStyles.toggleActive]}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={modalStyles.toggleLabel}>{label}</Text>
        {sub ? <Text style={modalStyles.toggleSub}>{sub}</Text> : null}
      </View>
      <Text style={[modalStyles.toggleState, active && { color: colors.gold }]}>{active ? "On" : "Off"}</Text>
    </Pressable>
  );
}

function ItemModal({
  visible,
  item,
  menu,
  onClose,
  sessionId,
  imageAspectRatio,
}: {
  visible: boolean;
  item: MenuItem | null;
  menu: Menu | undefined;
  onClose: () => void;
  sessionId: string | null;
  imageAspectRatio: number;
}) {
  const qc = useQueryClient();
  const [offDefaults, setOffDefaults] = useState<string[]>([]);
  const [onExtras, setOnExtras] = useState<string[]>([]);

  useEffect(() => {
    if (visible && item) {
      setOffDefaults([]);
      setOnExtras([]);
    }
  }, [visible, item?.id]);

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId || !item) throw new Error("no session");
      const removedModifierIds = offDefaults.filter((id) => item.defaultModifierIds.includes(id));
      const extraModifierIds = onExtras.filter((id) => item.allowedExtraModifierIds.includes(id));
      return applyCartOperations(sessionId, [
        {
          type: "add_or_update_line",
          itemId: item.id,
          qty: 1,
          selection: { removedModifierIds, extraModifierIds },
        },
      ]);
    },
    onSuccess: (res) => {
      if (!res.ok) return;
      if (sessionId) qc.setQueryData(["cart", sessionId], res.cart);
      onClose();
    },
  });

  if (!item || !menu) return null;

  const modMap = new Map(menu.modifiers.map((m) => [m.id, m]));

  const sodaFlavorIds = item.allowedExtraModifierIds.filter((id) => id.startsWith("flavor_"));
  const otherExtraIds = item.allowedExtraModifierIds.filter((id) => !id.startsWith("flavor_"));
  const defaultNonFlavorIds = item.defaultModifierIds.filter((id) => !id.startsWith("flavor_"));

  const isSodaFlavorOn = (id: string) =>
    item.defaultModifierIds.includes(id) ? !offDefaults.includes(id) : onExtras.includes(id);

  const pickSodaFlavor = (id: string) => {
    const off = item.defaultModifierIds.filter((d) => d.startsWith("flavor_") && d !== id);
    const extras = [
      ...onExtras.filter((x) => !sodaFlavorIds.includes(x)),
      ...(item.defaultModifierIds.includes(id) ? [] : [id]),
    ];
    setOffDefaults(off);
    setOnExtras(extras);
  };

  const toggleDefault = (id: string) => {
    setOffDefaults((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleExtra = (id: string) => {
    setOnExtras((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <MenuItemImage itemId={item.id} uri={item.imageUrl} aspectRatio={imageAspectRatio} rounded={20} />
            <Text style={modalStyles.itemTitle}>{item.name}</Text>
            <Text style={modalStyles.itemDesc}>{item.description}</Text>
            <Text style={modalStyles.itemPrice}>From {formatMoney(item.basePriceCents)}</Text>

            {defaultNonFlavorIds.length ? <Text style={modalStyles.section}>Included — tap to remove</Text> : null}
            {defaultNonFlavorIds.map((id) => {
              const m = modMap.get(id);
              const on = !offDefaults.includes(id);
              return (
                <ModifierToggle key={id} label={m?.displayName ?? id} active={on} onToggle={() => toggleDefault(id)} />
              );
            })}

            {sodaFlavorIds.length ? (
              <Text style={[modalStyles.section, { marginTop: defaultNonFlavorIds.length ? 16 : 0 }]}>Choose soda</Text>
            ) : null}
            {sodaFlavorIds.map((id) => {
              const m = modMap.get(id);
              return (
                <ModifierToggle
                  key={id}
                  label={m?.displayName ?? id}
                  active={isSodaFlavorOn(id)}
                  onToggle={() => pickSodaFlavor(id)}
                />
              );
            })}

            {otherExtraIds.length ? (
              <Text style={[modalStyles.section, { marginTop: 16 }]}>Add-ons</Text>
            ) : null}
            {otherExtraIds.map((id) => {
              const m = modMap.get(id);
              const on = onExtras.includes(id);
              return (
                <ModifierToggle
                  key={id}
                  label={m?.displayName ?? id}
                  sub={m && m.priceDeltaCents > 0 ? `+${formatMoney(m.priceDeltaCents)}` : undefined}
                  active={on}
                  onToggle={() => toggleExtra(id)}
                />
              );
            })}
          </ScrollView>
          <View style={modalStyles.actions}>
            <Pressable onPress={onClose} style={[modalStyles.btn, modalStyles.btnCancel]}>
              <Text style={modalStyles.btnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => addMutation.mutate()}
              disabled={addMutation.isPending || !sessionId}
              style={[modalStyles.btn, modalStyles.btnAdd, (addMutation.isPending || !sessionId) && { opacity: 0.4 }]}
            >
              {addMutation.isPending ? (
                <ActivityIndicator color={colors.cream} />
              ) : (
                <Text style={modalStyles.btnAddText}>Add to cart</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function MenuScreen() {
  const sessionId = useSessionStore((s) => s.sessionId);
  const layout = useAppLayout();
  const menuQuery = useQuery({
    queryKey: ["menu", MENU_CACHE_KEY],
    queryFn: fetchMenu,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);

  const categories = useMemo(() => {
    const m = menuQuery.data;
    if (!m) return [];
    return [...m.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [menuQuery.data]);

  if (menuQuery.isLoading) {
    return (
      <View style={[rootScreen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (menuQuery.isError) {
    return (
      <View style={[rootScreen, styles.centered]}>
        <Text style={styles.errorText}>Could not load menu. Is the API running?</Text>
      </View>
    );
  }

  const menu = menuQuery.data!;

  return (
    <View style={rootScreen}>
      <AppHeader title="Menu" subtitle="Tap a dish to customize toppings and add-ons." />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingHorizontal: layout.horizontalPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {categories.map((cat) => {
          const items = menu.items.filter((i) => i.categoryId === cat.id);
          return (
            <View key={cat.id} style={s.categoryBlock}>
              <Text style={headingMd}>{cat.name}</Text>
              <View style={[s.grid, { marginTop: 12, gap: layout.cardGap }]}>
                {items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setActiveItem(item)}
                    style={({ pressed }) => [
                      s.card,
                      { width: layout.cardWidth },
                      pressed && { opacity: 0.92 },
                    ]}
                  >
                    <View style={s.cardImageWrap}>
                      <MenuItemImage
                        itemId={item.id}
                        uri={item.imageUrl}
                        aspectRatio={layout.cardImageAspectRatio}
                      />
                      <View style={s.cardOverlay} pointerEvents="none" />
                      <View style={s.badgeRow}>
                        {item.tags.includes("popular") ? (
                          <View style={s.badge}>
                            <Text style={s.badgeText}>Popular</Text>
                          </View>
                        ) : null}
                        {item.spicy ? (
                          <View style={[s.badge, s.badgeSpicy]}>
                            <Text style={s.badgeText}>Spicy</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={s.cardBody}>
                      <View style={s.cardTextCol}>
                        <Text style={s.cardTitle} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={s.cardDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 8 }}>
                        <Text style={s.cardPrice}>{formatMoney(item.basePriceCents)}</Text>
                        <View style={s.addBtn}>
                          <Text style={s.addBtnText}>+</Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
      {activeItem ? (
        <ItemModal
          visible
          item={activeItem}
          menu={menu}
          sessionId={sessionId}
          imageAspectRatio={layout.cardImageAspectRatio}
          onClose={() => setActiveItem(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", justifyContent: "center", flex: 1 },
  errorText: { color: colors.creamMuted, textAlign: "center", padding: 24 },
});

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.65)" },
  sheet: {
    maxHeight: "92%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.borderStrong,
  },
  handle: {
    marginBottom: 14,
    height: 4,
    width: 40,
    alignSelf: "center",
    borderRadius: 4,
    backgroundColor: colors.borderStrong,
  },
  itemTitle: { marginTop: 14, fontSize: 22, fontWeight: "700", color: colors.cream },
  itemDesc: { marginBottom: 8, fontSize: 14, lineHeight: 20, color: colors.creamMuted },
  itemPrice: { marginBottom: 18, fontSize: 18, fontWeight: "700", color: colors.gold },
  section: { marginBottom: 10, fontWeight: "600", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: colors.gold },
  toggle: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  toggleActive: { borderColor: colors.gold, backgroundColor: colors.goldDim },
  toggleLabel: { fontSize: 16, fontWeight: "500", color: colors.cream },
  toggleSub: { fontSize: 12, color: colors.creamMuted, marginTop: 2 },
  toggleState: { fontSize: 14, fontWeight: "600", color: colors.creamMuted },
  actions: { marginTop: 16, flexDirection: "row", gap: 10 },
  btn: { flex: 1, alignItems: "center", borderRadius: 14, paddingVertical: 14 },
  btnCancel: { backgroundColor: colors.surfaceHover, borderWidth: 1, borderColor: colors.border },
  btnCancelText: { fontWeight: "600", color: colors.cream },
  btnAdd: { backgroundColor: colors.terracotta },
  btnAddText: { fontWeight: "700", color: colors.cream, letterSpacing: 0.3 },
});
