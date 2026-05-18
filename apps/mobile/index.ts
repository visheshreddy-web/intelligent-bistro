import "react-native-gesture-handler";
import { Platform } from "react-native";
import { registerRootComponent } from "expo";
import App from "./App";

if (Platform.OS !== "web") {
  const { enableScreens } = require("react-native-screens");
  enableScreens(true);
}

registerRootComponent(App);
