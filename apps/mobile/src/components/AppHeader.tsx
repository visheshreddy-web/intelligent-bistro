import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, headingLg, label } from "../theme";

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

export function AppHeader({ title, subtitle, right }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.inner}>
        <View style={styles.brandRow}>
          <View style={styles.mark}>
            <Text style={styles.markText}>IB</Text>
          </View>
          <View style={styles.titles}>
            <Text style={styles.brand}>Intelligent Bistro</Text>
            <Text style={headingLg}>{title}</Text>
          </View>
          {right}
        </View>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  inner: {
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  mark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.goldDim,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.gold,
    letterSpacing: -0.5,
  },
  titles: { flex: 1 },
  brand: {
    ...label,
    marginBottom: 2,
    color: colors.gold,
  },
  sub: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: colors.creamMuted,
  },
});
