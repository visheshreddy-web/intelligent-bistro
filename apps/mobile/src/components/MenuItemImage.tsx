import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { colors } from "../theme";
import { MENU_IMAGE_FALLBACK, menuImageSource } from "../menuImageSources";

type Props = {
  itemId: string;
  uri: string;
  aspectRatio?: number;
  style?: StyleProp<ViewStyle>;
  rounded?: number;
};

export function MenuItemImage({ itemId, uri, aspectRatio = 16 / 9, style, rounded = 0 }: Props) {
  const [useFallback, setUseFallback] = useState(false);
  const source = useMemo(
    () => (useFallback ? MENU_IMAGE_FALLBACK : menuImageSource(itemId, uri)),
    [itemId, uri, useFallback],
  );

  useEffect(() => {
    setUseFallback(false);
  }, [itemId, uri]);

  const onError = () => {
    if (!useFallback) setUseFallback(true);
  };

  return (
    <View style={[styles.wrap, { aspectRatio, borderRadius: rounded }, style]}>
      <Image
        source={source}
        style={[StyleSheet.absoluteFillObject, { borderRadius: rounded }]}
        contentFit="cover"
        transition={250}
        onError={onError}
        recyclingKey={itemId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: colors.surfaceHover,
  },
});
