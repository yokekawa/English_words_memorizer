import { create } from 'zustand';

interface SettingsState {
  defaultWordCount: number;
  showHints: boolean;
  hapticEnabled: boolean;
  setDefaultWordCount: (count: number) => void;
  setShowHints: (show: boolean) => void;
  setHapticEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>(set => ({
  defaultWordCount: 10,
  showHints: false,
  hapticEnabled: true,

  setDefaultWordCount: count => set({ defaultWordCount: count }),
  setShowHints: show => set({ showHints: show }),
  setHapticEnabled: enabled => set({ hapticEnabled: enabled }),
}));
