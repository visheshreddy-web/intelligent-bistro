import { create } from "zustand";

type CartSheetStore = {
  open: boolean;
  openSheet: () => void;
  closeSheet: () => void;
};

export const useCartSheetStore = create<CartSheetStore>((set) => ({
  open: false,
  openSheet: () => set({ open: true }),
  closeSheet: () => set({ open: false }),
}));
