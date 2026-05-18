import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, Text } from "react-native";
import { MenuScreen } from "./screens/MenuScreen";
import { ChatScreen } from "./screens/ChatScreen";
import { colors } from "./theme";
import { useMainTabStore } from "./mainTabStore";

const Tab = createBottomTabNavigator();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.creamMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>◎</Text>,
        }}
        listeners={{
          focus: () => {
            useMainTabStore.getState().setTab("menu");
          },
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>✦</Text>,
        }}
        listeners={{
          focus: () => {
            useMainTabStore.getState().setTab("chat");
          },
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
});
