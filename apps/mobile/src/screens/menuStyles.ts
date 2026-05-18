import { StyleSheet } from "react-native";
import { colors, layout, shadow } from "../theme";

export const menuStyles = StyleSheet.create({
  scroll: {
    paddingTop: 8,
    paddingBottom: 120,
  },
  categoryBlock: {
    marginBottom: 28,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  card: {
    borderRadius: layout.radiusLg,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardImageWrap: {
    width: "100%",
    position: "relative",
  },
  cardOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "40%",
    backgroundColor: "rgba(12, 11, 10, 0.55)",
  },
  badgeRow: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    gap: 6,
    zIndex: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: layout.radiusFull,
    backgroundColor: "rgba(12, 11, 10, 0.7)",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  badgeSpicy: {
    backgroundColor: "rgba(212, 113, 92, 0.25)",
    borderColor: "rgba(212, 113, 92, 0.5)",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.cream,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  cardBody: {
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTextCol: { flex: 1, minWidth: 0 },
  cardTitle: {
    fontWeight: "600",
    color: colors.cream,
    fontSize: 16,
    lineHeight: 22,
  },
  cardDesc: {
    marginTop: 4,
    fontSize: 12,
    color: colors.creamMuted,
    lineHeight: 16,
  },
  cardPrice: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.gold,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.terracotta,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: {
    color: colors.cream,
    fontSize: 22,
    fontWeight: "300",
    marginTop: -2,
  },
});
