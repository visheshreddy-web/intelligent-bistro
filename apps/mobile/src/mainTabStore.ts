import { create } from "zustand";

export type MainTabId = "menu" | "chat";

type MainTabStore = {
  tab: MainTabId;
  setTab: (tab: MainTabId) => void;
};

export const useMainTabStore = create<MainTabStore>((set) => ({
  tab: "menu",
  setTab: (tab) => set({ tab }),
}));
