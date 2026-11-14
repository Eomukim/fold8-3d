import { create } from 'zustand';
import { findModel, CATALOG, DEFAULT_MODEL } from './lib/models';

const initial = findModel(DEFAULT_MODEL.series, DEFAULT_MODEL.id);

export const useShowcase = create((set, get) => ({
  series: DEFAULT_MODEL.series,
  modelId: DEFAULT_MODEL.id,
  colorway: initial.colors[0].id,
  foldTarget: 180,
  camera: 'overview',
  cameraSeq: 0,
  auto: false,
  screensOn: true,
  hintDismissed: false,

  model: () => findModel(get().series, get().modelId),

  setSeries: (series) => {
    if (series === get().series) return;
    const list = CATALOG[series];
    const m = list[0];
    set({ series, modelId: m.id, colorway: m.colors[0].id, cameraSeq: get().cameraSeq + 1 });
  },

  setModel: (modelId) => {
    const m = findModel(get().series, modelId);
    if (m.id === get().modelId) return;
    set({ modelId: m.id, colorway: m.colors[0].id });
  },

  setFold: (v) => set({ foldTarget: Math.min(180, Math.max(0, v)), auto: false }),
  setColorway: (colorway) => set({ colorway }),
  setCamera: (camera) =>
    set((s) => ({
      camera,
      cameraSeq: s.cameraSeq + 1,
      auto: false,
      // for clamshells the cover display lives on the outside: show it closed
      foldTarget: camera === 'cover' && s.series === 'flip' ? 0 : s.foldTarget,
    })),
  toggleAuto: () => set((s) => ({ auto: !s.auto })),
  setAuto: (auto) => set({ auto }),
  toggleScreens: () => set((s) => ({ screensOn: !s.screensOn })),
  dismissHint: () => set({ hintDismissed: true }),
}));

// dev hook used by the verification scripts
if (typeof window !== 'undefined') window.__showcase = useShowcase;
