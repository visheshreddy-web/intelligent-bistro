import type { ImageSource } from "expo-image";

export const LOCAL_MENU_IMAGE: Record<string, ImageSource> = {
  "item-classic-burger": require("../assets/menu/classic-burger.jpg"),
  "item-bbq-bacon-burger": require("../assets/menu/bbq-bacon-burger.jpg"),
  "item-spicy-chicken": require("../assets/menu/spicy-chicken.jpg"),
  "item-grilled-cheese": require("../assets/menu/grilled-cheese.jpg"),
  "item-fries": require("../assets/menu/fries.jpg"),
  "item-tomato-soup": require("../assets/menu/tomato-soup.jpg"),
  "item-fountain-drink": require("../assets/menu/fountain-drink.jpg"),
  "item-lemonade": require("../assets/menu/lemonade.jpg"),
  "item-iced-tea": require("../assets/menu/iced-tea.jpg"),
  "item-water": require("../assets/menu/water.jpg"),
};

export const MENU_IMAGE_FALLBACK: ImageSource = require("../assets/menu/classic-burger.jpg");

export function menuImageSource(itemId: string, remoteUri: string): ImageSource {
  return LOCAL_MENU_IMAGE[itemId] ?? { uri: remoteUri };
}
