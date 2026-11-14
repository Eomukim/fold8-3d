// All dimensions are in centimetres (1 unit = 1 cm) — a Galaxy Z Fold 8 concept.
export const DIM = {
  halfW: 7.6, // width of one half
  height: 20.0, // 200 mm tall
  thickness: 0.42, // 4.2 mm per half when unfolded
  outerR: 0.52, // outer corner radius
  hingeR: 0.09, // corner radius on the hinge side (nearly square)
  bevel: 0.05, // machined chamfer on the frame

  // Hinge axis sits a hair above the front glass so the two displays meet,
  // exactly like a book closing, without the glass planes z-fighting.
  pivotZ: 0.235,

  inner: {
    w: 14.24,
    h: 19.1,
    z: 0.214,
    lipW: 0.26,
    lipH: 0.035,
  },
  cover: {
    w: 6.62,
    h: 17.4,
    z: -0.212,
  },
  camera: {
    x: 2.5,
    y: 6.1,
    w: 3.0,
    h: 3.85,
    plate: 0.075,
  },
};

export const COLORWAYS = {
  titanium: {
    id: 'titanium',
    name: '타이타늄 그레이',
    en: 'Titanium Gray',
    frame: '#8d9096',
    frameRough: 0.3,
    back: '#7f828a',
    hinge: '#9ba0a7',
    ring: '#b9bec6',
    accent: '#9aa3b2',
  },
  silver: {
    id: 'silver',
    name: '실버 섀도',
    en: 'Silver Shadow',
    frame: '#cfd2d7',
    frameRough: 0.24,
    back: '#c3c7cd',
    hinge: '#dfe3e8',
    ring: '#e7eaee',
    accent: '#d7dbe1',
  },
  black: {
    id: 'black',
    name: '크래프티드 블랙',
    en: 'Crafted Black',
    frame: '#2b2d33',
    frameRough: 0.34,
    back: '#24262b',
    hinge: '#3a3d44',
    ring: '#4a4e57',
    accent: '#5b606b',
  },
  navy: {
    id: 'navy',
    name: '딥 네이비',
    en: 'Deep Navy',
    frame: '#31415f',
    frameRough: 0.28,
    back: '#2a3750',
    hinge: '#415372',
    ring: '#5b6f92',
    accent: '#6d82a6',
  },
};

export const CAMERA_PRESETS = {
  overview: { pos: [28, 8.5, 52], target: [0, -2.0, 0] },
  hinge: { pos: [-6.8, -2.6, -9.2], target: [0, 0.4, 0] },
  camera: { pos: [-8.5, 6.2, -22.5], target: [2.2, 4.6, -0.4] },
  cover: { pos: [-18, 3.2, -37], target: [-3.0, 0.9, 0] },
};
