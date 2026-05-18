import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

if (Platform.OS !== "web") {
  require("./global.css");
}
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { MainTabs } from "./src/RootTabs";
import { WebShell } from "./src/WebShell";
import { CartModal } from "./src/components/CartModal";
import { createSession, fetchCart, getApiBaseUrl, getApiConnectionHelp } from "./src/api";
import { useSessionStore } from "./src/sessionStore";
import { useCartSheetStore } from "./src/cartSheetStore";
import { useMainTabStore } from "./src/mainTabStore";
import { LayoutProvider, useAppLayout } from "./src/layout/LayoutProvider";
import { bodyText, centerScreen, colors, rootScreen, shadow, titleText } from "./src/theme";

const queryClient = new QueryClient();

const rootFlex: ViewStyle = { flex: 1, ...(Platform.OS === "web" ? { width: "100%", minHeight: "100%" } : {}) };

function Boot() {
  const sessionId = useSessionStore((s) => s.sessionId);
  const setSessionId = useSessionStore((s) => s.setSessionId);
  const layout = useAppLayout();
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { sessionId: id } = await createSession();
        if (!cancelled) setSessionId(id);
      } catch (e) {
        if (!cancelled) setBootError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setSessionId]);

  const cartQuery = useQuery({
    queryKey: ["cart", sessionId],
    queryFn: () => fetchCart(sessionId!),
    enabled: !!sessionId,
  });

  const cartSheetOpen = useCartSheetStore((s) => s.open);
  const closeCartSheet = useCartSheetStore((s) => s.closeSheet);
  const openCartSheet = useCartSheetStore((s) => s.openSheet);
  const activeTab = useMainTabStore((s) => s.tab);
  const showCartFab = activeTab === "menu";

  const theme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: colors.gold,
      background: colors.bg,
      card: colors.surface,
      text: colors.cream,
      border: colors.border,
    },
  };

  const fabRight =
    layout.windowWidth > layout.contentMaxWidth
      ? (layout.windowWidth - layout.contentMaxWidth) / 2 + 16
      : 16;

  if (bootError) {
    return (
      <View style={[centerScreen, styles.bootError]}>
        <Text style={titleText}>Could not reach API</Text>
        <Text style={styles.bootUrl}>{getApiBaseUrl()}</Text>
        <Text style={bodyText}>{getApiConnectionHelp()}</Text>
        <Text style={[bodyText, { marginTop: 12, opacity: 0.7, fontSize: 12 }]}>{bootError}</Text>
      </View>
    );
  }

  if (!sessionId) {
    return (
      <View style={centerScreen}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={[bodyText, { marginTop: 14 }]}>Preparing your table…</Text>
      </View>
    );
  }

  const count = cartQuery.data?.lines.reduce((s, l) => s + l.qty, 0) ?? 0;

  return (
    <View style={rootScreen}>
      <StatusBar style="light" />
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: layout.contentMaxWidth,
          alignSelf: "center",
        }}
      >
        {Platform.OS === "web" ? (
          <WebShell />
        ) : (
          <NavigationContainer theme={theme}>
            <MainTabs />
          </NavigationContainer>
        )}
      </View>
      {showCartFab ? (
        <Pressable
          onPress={() => openCartSheet()}
          style={[styles.cartFab, { bottom: layout.fabBottom, right: fabRight }]}
        >
          <MaterialIcons name="shopping-cart" size={20} color={colors.cream} />
          <Text style={styles.cartFabText}>Cart</Text>
          {count > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}
      <CartModal visible={cartSheetOpen} onClose={closeCartSheet} />
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={rootFlex}>
      <SafeAreaProvider style={rootFlex}>
        <LayoutProvider>
          <QueryClientProvider client={queryClient}>
            <Boot />
          </QueryClientProvider>
        </LayoutProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  cartFab: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.terracotta,
    paddingLeft: 16,
    paddingRight: 18,
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    zIndex: 50,
    ...shadow.fab,
  },
  cartFabText: {
    color: colors.cream,
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.bg,
  },
  bootError: {
    paddingHorizontal: 24,
    maxWidth: 420,
  },
  bootUrl: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 16,
    textAlign: "center",
  },
});
