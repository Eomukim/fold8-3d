/**
 * Device capability tier for the studio renderer.
 *
 * Desktop keeps the full-quality path (full DPR, SMAA + Bloom + ACES composer,
 * 1024px contact shadow, 256px environment, high-segment geometry).
 * Phones and tablets (coarse pointer / narrow viewport) get the same models,
 * materials and lighting, but render in a single pass, at a capped DPR and with
 * lighter tessellation, so the fold slider and auto showcase stay smooth.
 *
 * Force a tier with ?perf=low or ?perf=high (also handy for verification).
 */

function detectTier() {
  if (typeof window === 'undefined') return 'high';
  let forced = null;
  try {
    forced = new URLSearchParams(window.location.search).get('perf');
  } catch (e) {
    forced = null;
  }
  if (forced === 'low' || forced === 'high') return forced;

  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const narrow = Math.min(window.innerWidth || 1024, window.innerHeight || 768) < 768;
  const uaMobile = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(navigator.userAgent || '');
  if (coarse || narrow || uaMobile) return 'low';
  return 'high';
}

export const TIER = detectTier();
export const IS_LOW = TIER === 'low';

export const PERF = {
  tier: TIER,
  /* mobile Retina is 2.5x-3x: rendering at 1.25x is still crisp on a phone
     screen but fills roughly 60% fewer pixels than the old 1.6x cap */
  dpr: IS_LOW ? [1, 1.25] : [1, 2],
  /* SMAA + mipmap Bloom + ToneMapping = 10+ full-screen passes; phones render
     one pass with canvas MSAA + renderer ACES instead */
  postFx: !IS_LOW,
  /* the baked contact shadow is a 30-unit plane under the device: on phones
     its bake window lands on the studio floor and turns into a dark square,
     so the low tier keeps the floor's own soft glow instead */
  contactShadow: !IS_LOW,
  shadowRes: 1024,
  envRes: IS_LOW ? 128 : 256,
  aniso: IS_LOW ? 4 : 8,
};

/* tessellation budget per tier — the `high` column is exactly the geometry
   the studio shipped with, so desktop output is unchanged */
export const SEG = IS_LOW
  ? {
      curve: 10, // extruded body silhouette
      plate: 8, // dark bezel plate
      frame: 12, // bezel ring (+ its inner hole)
      screen: 8, // display plane width segments
      barrel: 28, // hinge spine arc
      band: 20,
      knuckle: [8, 26], // torus (radial, tubular)
      lens: 32, // rear camera ring stack
      lensGlass: [28, 14],
      ringShell: 28, // concentric ring shell around rear lenses
      lensCover: 28, // clamshell cover camera ring stack
      lensCoverGlass: [26, 13],
      small: 20, // flash barrel
      mic: 8,
      dot: 12,
      circle: 14,
      punch: [12, 8],
      hole: 8,
      smooth: 0.6, // RoundedBox smoothness multiplier
    }
  : {
      curve: 20,
      plate: 16,
      frame: 24,
      screen: 24,
      barrel: 48,
      band: 32,
      knuckle: [10, 48],
      lens: 56,
      lensGlass: [44, 22],
      ringShell: 48,
      lensCover: 48,
      lensCoverGlass: [40, 20],
      small: 32,
      mic: 10,
      dot: 20,
      circle: 20,
      punch: [18, 12],
      hole: 10,
      smooth: 1,
    };

if (typeof window !== 'undefined') window.__perf = PERF;
