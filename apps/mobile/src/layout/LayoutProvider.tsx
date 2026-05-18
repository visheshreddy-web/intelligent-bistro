import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type AppLayout = {
  windowWidth: number;
  windowHeight: number;
  aspectRatio: number;
  isLandscape: boolean;
  isWide: boolean;
  isTablet: boolean;
  contentMaxWidth: number;
  contentWidth: number;
  menuColumns: 1 | 2;
  horizontalPadding: number;
  cardGap: number;
  cardWidth: number;
  cardImageAspectRatio: number;
  fabBottom: number;
};

const LayoutContext = createContext<AppLayout | null>(null);

function computeLayout(width: number, height: number, bottomInset: number): AppLayout {
  const aspectRatio = width / Math.max(height, 1);
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const isWide = width >= 520;

  const horizontalPadding = width < 380 ? 16 : 20;
  const contentMaxWidth = isTablet
    ? Math.min(800, width)
    : isWide
      ? Math.min(640, width - horizontalPadding * 2)
      : width;

  const contentWidth = Math.min(width, contentMaxWidth);
  const menuColumns: 1 | 2 = contentWidth >= 520 && isWide ? 2 : 1;
  const cardGap = 14;
  const gridInner = contentWidth - horizontalPadding * 2;
  const cardWidth =
    menuColumns === 2 ? (gridInner - cardGap) / 2 : gridInner;

  const cardImageAspectRatio =
    isLandscape && width >= 700 ? 4 / 3 : menuColumns === 2 ? 5 / 4 : 16 / 9;

  const fabBottom = (Platform.OS === "web" ? 88 : 16) + bottomInset;

  return {
    windowWidth: width,
    windowHeight: height,
    aspectRatio,
    isLandscape,
    isWide,
    isTablet,
    contentMaxWidth,
    contentWidth,
    menuColumns,
    horizontalPadding,
    cardGap,
    cardWidth,
    cardImageAspectRatio,
    fabBottom,
  };
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const value = useMemo(
    () => computeLayout(width, height, insets.bottom),
    [width, height, insets.bottom],
  );
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useAppLayout(): AppLayout {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    return computeLayout(390, 844, 0);
  }
  return ctx;
}
