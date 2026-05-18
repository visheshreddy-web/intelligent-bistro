import { Platform, type TextStyle, type ViewStyle } from "react-native";

export const colors = {
  bg: "#0c0b0a",
  bgElevated: "#141210",
  surface: "#1c1916",
  surfaceHover: "#252220",
  border: "rgba(255, 248, 240, 0.08)",
  borderStrong: "rgba(255, 248, 240, 0.14)",
  cream: "#f7f2ea",
  creamMuted: "#c9c0b4",
  gold: "#e4b872",
  goldDim: "rgba(228, 184, 114, 0.15)",
  terracotta: "#d4715c",
  terracottaDark: "#b85a48",
  white: "#ffffff",
  danger: "#e85d5d",
  success: "#6dbf8a",
};

export const layout = {
  maxContentWidth: 480,
  screenPadding: 20,
  radiusSm: 10,
  radiusMd: 16,
  radiusLg: 24,
  radiusFull: 999,
};

export const shadow = Platform.select({
  ios: {
    card: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
    },
    fab: {
      shadowColor: "#e4b872",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
    },
  },
  default: {
    card: { elevation: 6 },
    fab: { elevation: 8 },
  },
}) as { card: ViewStyle; fab: ViewStyle };

export const rootScreen: ViewStyle = {
  flex: 1,
  backgroundColor: colors.bg,
  ...(Platform.OS === "web" ? { width: "100%", alignItems: "center" } as ViewStyle : {}),
};

export const contentColumn: ViewStyle = {
  flex: 1,
  width: "100%",
  maxWidth: layout.maxContentWidth,
};

export const centerScreen: ViewStyle = {
  ...rootScreen,
  alignItems: "center",
  justifyContent: "center",
  padding: layout.screenPadding,
};

export const titleText: TextStyle = {
  color: colors.cream,
  fontSize: 20,
  fontWeight: "700",
  textAlign: "center",
  letterSpacing: 0.3,
};

export const bodyText: TextStyle = {
  color: colors.creamMuted,
  fontSize: 14,
  textAlign: "center",
  lineHeight: 20,
};

export const headingLg: TextStyle = {
  fontSize: 28,
  fontWeight: "700",
  color: colors.cream,
  letterSpacing: -0.5,
};

export const headingMd: TextStyle = {
  fontSize: 13,
  fontWeight: "700",
  color: colors.gold,
  letterSpacing: 1.2,
  textTransform: "uppercase",
};

export const label: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  color: colors.creamMuted,
  letterSpacing: 0.5,
  textTransform: "uppercase",
};
