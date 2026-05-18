import { Pressable, StyleSheet, Text, View } from "react-native";
import { MenuScreen } from "./screens/MenuScreen";
import { ChatScreen } from "./screens/ChatScreen";
import { useAppLayout } from "./layout/LayoutProvider";
import { useMainTabStore } from "./mainTabStore";
import { colors, layout, shadow } from "./theme";

export function WebShell() {
  const tab = useMainTabStore((s) => s.tab);
  const setTab = useMainTabStore((s) => s.setTab);
  const appLayout = useAppLayout();

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        {tab === "menu" ? <MenuScreen /> : <ChatScreen />}
      </View>
      <View style={[styles.tabBarOuter, { paddingHorizontal: appLayout.horizontalPadding }]}>
        <View style={styles.tabBarPill}>
          <TabButton id="menu" label="Menu" icon="◎" active={tab === "menu"} onPress={() => setTab("menu")} />
          <TabButton id="chat" label="Chat" icon="✦" active={tab === "chat"} onPress={() => setTab("chat")} />
        </View>
      </View>
    </View>
  );
}

function TabButton({
  label,
  icon,
  active,
  onPress,
}: {
  id: string;
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    width: "100%",
    minHeight: "100%",
    alignItems: "center",
  },
  content: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  tabBarOuter: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: "transparent",
  },
  tabBarPill: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: layout.radiusFull,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    ...shadow.card,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: layout.radiusFull,
  },
  tabActive: {
    backgroundColor: colors.goldDim,
    borderWidth: 1,
    borderColor: "rgba(228, 184, 114, 0.35)",
  },
  tabIcon: {
    fontSize: 14,
    color: colors.creamMuted,
  },
  tabIconActive: {
    color: colors.gold,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.creamMuted,
  },
  tabLabelActive: {
    color: colors.cream,
  },
});
