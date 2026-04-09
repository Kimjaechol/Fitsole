import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ScanStatus,
  FootSide,
  ProcessingStage,
  QualityWarning,
  ScanResult,
  ScanSession,
} from './types';

interface ScanState {
  // State
  scanSession: ScanSession | null;
  currentStatus: ScanStatus;
  processingStage: ProcessingStage | null;
  processingProgress: number; // 0-100
  qualityWarnings: QualityWarning[];
  isOnboarded: boolean;

  // Actions
  startScan: (sessionId: string, userId: string) => void;
  setStep: (step: number) => void;
  setFoot: (side: FootSide) => void;
  setStatus: (status: ScanStatus) => void;
  setProcessingStage: (stage: ProcessingStage, progress: number) => void;
  addQualityWarning: (warning: QualityWarning) => void;
  clearWarnings: () => void;
  setResults: (scanResult: ScanResult) => void;
  reset: () => void;
  markOnboarded: () => void;
}

const initialState = {
  scanSession: null,
  currentStatus: 'idle' as ScanStatus,
  processingStage: null,
  processingProgress: 0,
  qualityWarnings: [],
};

export const useScanStore = create<ScanState>()(
  persist(
    (set) => ({
      ...initialState,
      isOnboarded: false,

      startScan: (sessionId: string, userId: string) =>
        set({
          scanSession: {
            id: sessionId,
            userId,
            leftFoot: null,
            rightFoot: null,
            currentStep: 1,
            currentFoot: 'left',
          },
          currentStatus: 'positioning',
          processingStage: null,
          processingProgress: 0,
          qualityWarnings: [],
        }),

      setStep: (step: number) =>
        set((state) => ({
          scanSession: state.scanSession
            ? { ...state.scanSession, currentStep: step }
            : null,
        })),

      setFoot: (side: FootSide) =>
        set((state) => ({
          scanSession: state.scanSession
            ? { ...state.scanSession, currentFoot: side }
            : null,
        })),

      setStatus: (status: ScanStatus) =>
        set({ currentStatus: status }),

      setProcessingStage: (stage: ProcessingStage, progress: number) =>
        set({
          processingStage: stage,
          processingProgress: progress,
        }),

      addQualityWarning: (warning: QualityWarning) =>
        set((state) => ({
          qualityWarnings: [...state.qualityWarnings, warning],
        })),

      clearWarnings: () =>
        set({ qualityWarnings: [] }),

      setResults: (scanResult: ScanResult) =>
        set((state) => {
          if (!state.scanSession) return {};
          const foot = scanResult.footSide === 'left' ? 'leftFoot' : 'rightFoot';
          return {
            scanSession: {
              ...state.scanSession,
              [foot]: scanResult,
            },
            currentStatus: 'results',
          };
        }),

      reset: () => set(initialState),

      markOnboarded: () => set({ isOnboarded: true }),
    }),
    {
      name: 'fitsole_scan_onboarded',
      partialize: (state) => ({ isOnboarded: state.isOnboarded }),
    }
  )
);
