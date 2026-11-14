import { create } from 'zustand';

export const useShowcase = create((set, get) => ({
  foldTarget: 180,
  colorway: 'titanium',
  camera: 'overview',
  cameraSeq: 0,
  auto: false,
  screensOn: true,
  hintDismissed: false,

  setFold: (v) => set({ foldTarget: Math.min(180, Math.max(0, v)), auto: false }),
  setColorway: (colorway) => set({ colorway }),
  setCamera: (camera) => {
    const { camera: prev, auto } = get();
    if (prev === camera && !auto) {
      // re-trigger the same preset
      set((s) => ({ camera, cameraSeq: s.cameraSeq + 1, auto: false }));
      return;
    }
    set((s) => ({ camera, cameraSeq: s.cameraSeq + 1, auto: false }));
  },
  toggleAuto: () => set((s) => ({ auto: !s.auto })),
  setAuto: (auto) => set({ auto }),
  toggleScreens: () => set((s) => ({ screensOn: !s.screensOn })),
  dismissHint: () => set({ hintDismissed: true }),
}));
