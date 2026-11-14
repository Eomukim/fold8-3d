// A tiny one-way bus so the HUD can show the live, damped fold angle
// without re-rendering the React tree every frame.
export const foldBus = { deg: 180 };
export const FOLD_MIN = 0;
export const FOLD_MAX = 180;
