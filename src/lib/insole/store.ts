import { create } from 'zustand';
import type { InsoleDesign } from './types';

interface InsoleDesignState {
  // State
  currentDesign: InsoleDesign | null;
  isGenerating: boolean;
  error: string | null;
  showPressureOverlay: boolean;

  // Actions
  setDesign: (design: InsoleDesign) => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  togglePressureOverlay: () => void;
  reset: () => void;
}

export const useInsoleDesignStore = create<InsoleDesignState>()((set) => ({
  currentDesign: null,
  isGenerating: false,
  error: null,
  showPressureOverlay: false,

  setDesign: (design: InsoleDesign) =>
    set({ currentDesign: design, isGenerating: false, error: null }),

  setGenerating: (generating: boolean) =>
    set({ isGenerating: generating }),

  setError: (error: string | null) =>
    set({ error, isGenerating: false }),

  togglePressureOverlay: () =>
    set((state) => ({ showPressureOverlay: !state.showPressureOverlay })),

  reset: () =>
    set({
      currentDesign: null,
      isGenerating: false,
      error: null,
      showPressureOverlay: false,
    }),
}));
