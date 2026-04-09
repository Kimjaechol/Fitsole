/**
 * Zustand store for SALTED insole session state.
 * Transient data — NOT persisted to localStorage (per Phase 2 pattern).
 */

import { create } from 'zustand';
import type {
  BleConnectionState,
  SaltedPressureFrame,
  BiomechanicalAnalysis,
} from './types';

interface SaltedState {
  // State
  connectionState: BleConnectionState;
  sessionFrames: SaltedPressureFrame[];
  sessionDuration: number;
  isRecording: boolean;
  analysis: BiomechanicalAnalysis | null;
  error: string | null;

  // Actions
  setConnectionState: (state: BleConnectionState) => void;
  addFrame: (frame: SaltedPressureFrame) => void;
  startRecording: () => void;
  stopRecording: () => void;
  setAnalysis: (analysis: BiomechanicalAnalysis) => void;
  reset: () => void;
}

const initialState = {
  connectionState: 'disconnected' as BleConnectionState,
  sessionFrames: [] as SaltedPressureFrame[],
  sessionDuration: 0,
  isRecording: false,
  analysis: null as BiomechanicalAnalysis | null,
  error: null as string | null,
};

export const useSaltedStore = create<SaltedState>()((set) => ({
  ...initialState,

  setConnectionState: (connectionState: BleConnectionState) =>
    set({ connectionState, error: connectionState === 'error' ? 'Connection error' : null }),

  addFrame: (frame: SaltedPressureFrame) =>
    set((state) => ({
      sessionFrames: [...state.sessionFrames, frame],
      sessionDuration: frame.timestamp / 1000, // ms to seconds
    })),

  startRecording: () =>
    set({
      isRecording: true,
      sessionFrames: [],
      sessionDuration: 0,
      analysis: null,
      error: null,
    }),

  stopRecording: () =>
    set({ isRecording: false }),

  setAnalysis: (analysis: BiomechanicalAnalysis) =>
    set({ analysis }),

  reset: () => set(initialState),
}));
