import { create } from "zustand";

type SessionState = {
  sessionId: string | null;
  setSessionId: (id: string) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),
}));
