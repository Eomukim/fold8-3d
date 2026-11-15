import { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { roundedRectOutline, roundedFace, frameGeometry, hingePlateGeometry } from '../lib/shapes';
import { SEG } from '../lib/perf';

const SM = (n) => Math.max(2, Math.round(n * SEG.smooth));

/* ------------------------------------------------------------------ */
/*  lens stack                                                        */
/*  A real phone camera is not a disc: it is a machined metal ring     */
/*  standing proud of the glass, a dark tapering bore inside it, and   */
/*  the lens element sunk at the bottom of that bore. Outward is -z.   */
/* ------------------------------------------------------------------ */

function LensStack({ mats, R = 0.5, D = 0.08, ring = 'polished' }) {
  const seg = SEG.lens;
  const segS = SEG.small;
  const metal = ring === 'dark' ? mats.lensBarrel : mats.lensRing;
  const zF = -D;             // front (outer) face of the ring
  const rFace = R * 0.995;   // outer edge of that face
  const rBore = R * 0.87;    // inner edge of the flat metal face
  const rBevel = R * 0.76;   // inner bright bevel
  const rWall = R * 0.70;    // drop into the barrel
  const zGlass = zF + 0.03;  // the element sits a little below the rim
  return (
    <group>
      {/* shadowed seat ring: the lens sits in the surface, not on it */}
      <mesh material={mats.lensBore} rotation={[Math.PI, 0, 0]} position={[0, 0, 0.0012]}>
        <ringGeometry args={[R * 1.0, R * 1.1, seg]} />
      </mesh>
      {/* hairline seat where the barrel meets the device */}
      <mesh material={mats.lensBore} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.004]}>
        <cylinderGeometry args={[R * 1.03, R * 1.06, 0.012, seg, 1, true]} />
      </mesh>
      {/* the barrel wall standing proud of the glass */}
      <mesh material={metal} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, zF / 2 + 0.004]}>
        <cylinderGeometry args={[rFace - R * 0.02, R, -zF - 0.008, seg, 1, true]} />
      </mesh>
      {/* flat machined face of the ring */}
      <mesh material={metal} rotation={[Math.PI, 0, 0]} position={[0, 0, zF]}>
        <ringGeometry args={[rBore, rFace, seg]} />
      </mesh>
      {/* the chamfer inside the ring — the bright line a real camera shows */}
      <mesh material={metal} rotation={[Math.PI, 0, 0]} position={[0, 0, zF + 0.0006]}>
        <ringGeometry args={[rBevel, rBore, seg]} />
      </mesh>
      <mesh material={metal} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, zF + 0.009]}>
        <cylinderGeometry args={[rBevel, rBore, 0.018, seg, 1, true]} />
      </mesh>
      {/* black bore dropping away behind the chamfer */}
      <mesh material={mats.lensBore} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, zF + 0.022]}>
        <cylinderGeometry args={[rWall, rBevel, 0.026, seg, 1, true]} />
      </mesh>
      {/* the element: dark glass sunk at the bottom of the bore */}
      <mesh material={mats.lensGlass} rotation={[Math.PI, 0, 0]} position={[0, 0, zGlass]}>
        <circleGeometry args={[rWall, seg * 2]} />
      </mesh>
      {/* inner barrel ring, iris and aperture, caught behind the glass */}
      <mesh material={mats.lensInner} rotation={[Math.PI, 0, 0]} position={[0, 0, zGlass + 0.0012]}>
        <ringGeometry args={[rWall * 0.52, rWall * 0.9, seg]} />
      </mesh>
      <mesh material={mats.lensBore} rotation={[Math.PI, 0, 0]} position={[0, 0, zGlass + 0.0018]}>
        <circleGeometry args={[rWall * 0.5, segS * 3]} />
      </mesh>
      {/* a single soft catch-light on the coating */}
      <mesh rotation={[Math.PI, 0, 0]} position={[-rWall * 0.34, rWall * 0.3, zGlass + 0.0022]} material={mats.lensCatch}>
        <circleGeometry args={[rWall * 0.14, segS * 2]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  flash                                                             */
/* ------------------------------------------------------------------ */

function Flash({ mats, s = 1, ring = false, ...rest }) {
  return (
    <group scale={[s, s, s]} {...rest}>
      {/* reflector bezel */}
      <mesh material={mats.lensBarrel} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.012]}>
        <cylinderGeometry args={[0.115, 0.125, 0.024, SEG.small, 1, true]} />
      </mesh>
      <mesh material={mats.lensBarrel} rotation={[Math.PI, 0, 0]} position={[0, 0, 0.0016]}>
        <ringGeometry args={[0.082, 0.115, SEG.small * 2]} />
      </mesh>
      {ring ? (
        <mesh material={mats.flash} rotation={[Math.PI, 0, 0]} position={[0, 0, -0.0012]}>
          <ringGeometry args={[0.042, 0.086, SEG.small * 3]} />
        </mesh>
      ) : (
        <mesh material={mats.flash} rotation={[Math.PI, 0, 0]} position={[0, 0, -0.0012]}>
          <circleGeometry args={[0.086, SEG.small * 3]} />
        </mesh>
      )}
      {/* diffuser sheen + the little sensor dot beside the emitter */}
      <mesh material={mats.flashGloss} rotation={[Math.PI, 0, 0]} position={[-0.014, 0.014, 0.0008]}>
        <circleGeometry args={[0.03, SEG.small]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  per-model camera hardware (from the real product photos)          */
/*                                                                    */
/*  island: 'pill' | 'rect' | 'none'   — the raised camera platform   */
/*  ring:   'polished' | 'dark'        — machined metal vs black bore */
/* ------------------------------------------------------------------ */

export const CAM = {
  /* Galaxy Fold (2019): a narrow black vertical module, 3 small lenses,
     flash as a separate dot under the module */
  'fold-1': { island: 'dark-pill', w: 1.02, h: 3.1, plate: 0.1, lensR: 0.29, pitch: 0.86, ring: 'dark', flash: { dx: 0, dy: -2.12, s: 0.62 } },
  /* Fold2: body-coloured island, big rings, flash beside the top lens */
  'fold-2': { island: 'pill', w: 1.56, h: 3.9, plate: 0.15, lensR: 0.36, pitch: 1.13, ring: 'polished', flash: { dx: -0.86, dy: 1.3, s: 0.85 } },
  /* Fold3/4: no island — three rings standing straight on the back glass,
     flash below the last lens */
  'fold-3': { island: 'none', w: 1.4, h: 3.9, plate: 0.02, lensR: 0.35, pitch: 1.06, ring: 'polished', flash: { dx: 0, dy: -2.06, s: 0.72 } },
  'fold-4': { island: 'none', w: 1.4, h: 3.95, plate: 0.02, lensR: 0.36, pitch: 1.08, ring: 'polished', flash: { dx: 0.02, dy: -2.1, s: 0.72 } },
  /* Fold5: bare rings again, flash tucked above-right of the top lens */
  'fold-5': { island: 'none', w: 1.4, h: 4.0, plate: 0.02, lensR: 0.38, pitch: 1.1, ring: 'polished', flash: { dx: -0.86, dy: 1.24, s: 0.85 } },
  /* Fold6/7: a slim pill island in body colour with concentric-machined rings */
  'fold-6': { island: 'pill', w: 1.5, h: 3.62, plate: 0.09, lensR: 0.42, pitch: 1.12, ring: 'polished', flash: { dx: -0.92, dy: 1.16, s: 1.0 } },
  'fold-7': { island: 'pill', w: 1.56, h: 3.86, plate: 0.075, lensR: 0.44, pitch: 1.19, ring: 'polished', flash: { dx: -1.0, dy: 1.2, s: 1.0 } },
  /* Fold8: dual camera — two large rings in one short pill, flash inside it */
  'fold-8': { island: 'pill', w: 1.62, h: 2.9, plate: 0.095, lensR: 0.45, pitch: 1.34, ring: 'polished', flash: { dx: 0, dy: -1.52, s: 0.78, inside: true } },
  /* Fold8 Ultra: the 200MP stack — three big rings, flash beside the middle */
  'fold-8-ultra': { island: 'pill', w: 1.72, h: 3.9, plate: 0.11, lensR: 0.46, pitch: 1.2, ring: 'polished', flash: { dx: -1.05, dy: 1.12, s: 1.0 } },
};

export function CameraIsland({ model, mats, zBack, T }) {
  const { cam } = model;
  const s = CAM[model.id] ?? {};
  const w = s.w ?? cam.w;
  const h = s.h ?? cam.h;
  const plate = s.plate ?? cam.plate ?? 0.1;
  const count = cam.count ?? 3;
  const lensR = s.lensR ?? 0.42;
  const pitch = s.pitch ?? (h - lensR * 3) / Math.max(1, count - 1);
  const radius = Math.min(w, h) / 2;
  const t = plate + 0.04;
  const zTop = zBack - plate;

  const spots = Array.from({ length: count }, (_, i) => [
    cam.x,
    cam.y + ((count - 1) / 2) * pitch - i * pitch,
  ]);

  const islandKind = s.island ?? 'pill';
  const flashIn = s.flash?.inside;
  const flash = s.flash ?? { dx: w / 2 + 0.4, dy: h / 2 - 0.6, s: 0.8 };

  return (
    <group userData={{ dbg: 'cams', modelId: model.id }}>
      {islandKind !== 'none' && (
        <mesh
          geometry={hingePlateGeometry(w, h, t, radius, 0.024, SM(6))}
          material={islandKind === 'dark-pill' ? mats.lensBarrel : mats.island}
          position={[cam.x, cam.y, zTop + t]}
          castShadow
          receiveShadow
        />
      )}
      {spots.map(([lx, ly], i) => (
        <group key={i} position={[lx, ly, zTop]}>
          <LensStack mats={mats} R={lensR} D={0.072 + (s.plate ?? 0.1) * 0.2} ring={s.ring ?? 'polished'} />
        </group>
      ))}

      {!flashIn && (
        <group position={[cam.x + flash.dx, cam.y + flash.dy, zTop - 0.004]}>
          <Flash mats={mats} s={flash.s ?? 0.8} />
        </group>
      )}
      {flashIn && (
        <group position={[cam.x + flash.dx, cam.y + flash.dy, zTop - 0.002]}>
          <Flash mats={mats} s={flash.s ?? 0.8} />
        </group>
      )}

      {/* rear mic pinhole */}
      <mesh
        position={[cam.x - w / 2 + 0.26, cam.y - h / 2 + 0.3, zTop - 0.002]}
        material={mats.dark}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.028, 0.028, 0.012, SEG.dot]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  cover cluster — clamshell Flips                                   */
/* ------------------------------------------------------------------ */

const FLIP_CAM = {
  /* Flip1: a raised horizontal module, two lenses and a flash beside them */
  'flip-1': { lensR: 0.34, gap: 1.42, module: true },
  /* Flip3/4: black visor band, camera pair stacked at one end, flash below */
  'flip-3': { lensR: 0.33, gap: 1.1 },
  'flip-4': { lensR: 0.34, gap: 1.12 },
  /* Flip5/6: pair above the Flex Window, flash between and right */
  'flip-5': { lensR: 0.35, gap: 1.24 },
  'flip-6': { lensR: 0.36, gap: 1.26 },
  /* Flip7/8: the pair sits in the window surround, ring flash beside it */
  'flip-7': { lensR: 0.37, gap: 1.3, ringFlash: true },
  'flip-8': { lensR: 0.38, gap: 1.32, ringFlash: true },
};

export function CoverCluster({ model, mats, half, width, T, coverW, coverH }) {
  const kind = model.cover.kind;
  const cover = { w: coverW ?? model.coverW, h: coverH ?? model.coverH };
  const zOut = -T / 2;
  const zG = zOut - 0.016; // window glass plane
  const zPlate = zOut - 0.058; // camera plateau outer face
  const rGlass = Math.max(0.08, model.geo.rOuter * 0.78);
  const fc = FLIP_CAM[model.id] ?? { lensR: 0.36, gap: 1.25 };
  const yTop = -half * 0.855;

  /* polished bevel that frames a window of w × h */
  const bevel = (w, h, r) =>
    frameGeometry(w + 0.1, h + 0.1, Math.max(0.05, r + 0.05), 0.05, 0.022);

  const Window = ({ x, y, w, h, band = 0.16, r = rGlass, dz = 0, rim = true }) => (
    <group position={[x, y, 0]}>
      <RB
        args={[w + band * 2, h + band * 2, 0.07]}
        radius={0.28}
        smoothness={SM(4)}
        position={[0, 0, zG + 0.04 + dz]}
        material={mats.bezel}
      />
      {rim ? (
        <mesh geometry={bevel(w, h, r)} material={mats.frame} position={[0, 0, zG - 0.009 + dz]} />
      ) : (
        <mesh
          geometry={roundedFace(roundedRectOutline(w + 0.09, h + 0.09, r + 0.045, 0, 0), 0, 1, 0, 1)}
          material={mats.bezelFlat}
          position={[0, 0, zG + 0.001 + dz]}
          rotation={[0, Math.PI, Math.PI]}
        />
      )}
      <mesh
        geometry={roundedFace(roundedRectOutline(w, h, r, 0, 0), 0, 1, 0, 1)}
        material={mats.cover}
        position={[0, 0, zG + dz]}
        rotation={[0, Math.PI, Math.PI]}
      />
    </group>
  );

  const Cam = ({ x, y, s = fc.lensR }) => (
    <group position={[x, y, zPlate + 0.014]}>
      <LensStack mats={mats} R={s} D={0.07} ring="polished" />
    </group>
  );

  if (kind === 'pill') {
    /* Z Flip (1): horizontal dual camera with the 1.1" pill display beside it */
    const camX = -width * 0.13;
    return (
      <group userData={{ dbg: 'cams', modelId: model.id }}>
        <mesh
          geometry={hingePlateGeometry(3.15, 1.42, 0.16, 0.36, 0.02, SM(5))}
          material={mats.island}
          position={[camX, yTop, zPlate + 0.02]}
          castShadow
        />
        {[-0.71, 0.71].map((dx) => (
          <Cam key={dx} x={camX + dx} y={yTop} />
        ))}
        <group position={[camX + 1.42, yTop - 0.02, zPlate + 0.03]}>
          <Flash mats={mats} s={0.62} />
        </group>
        <Window x={width * 0.3} y={yTop + 0.25} w={cover.w} h={cover.h} band={0.14} r={0.16} />
      </group>
    );
  }

  if (kind === 'strip') {
    /* Z Flip3 / Flip4: black visor band — display left, cameras right */
    const bandH = 2.55;
    const sw = Math.min(width - 1.5, cover.h * 0.92);
    const sh = sw / Math.max(1.05, cover.h / cover.w);
    return (
      <group userData={{ dbg: 'cams', modelId: model.id }}>
        <RB
          args={[width - 0.4, bandH, 0.09]}
          radius={0.3}
          smoothness={SM(4)}
          position={[0, yTop + 0.28, zG + 0.05]}
          material={mats.bezel}
        />
        <Window
          x={-width * 0.13}
          y={yTop + 0.28}
          w={sw}
          h={Math.min(sh, bandH - 0.55)}
          band={0}
          r={0.1}
        />
        {[fc.gap / 2, -fc.gap / 2].map((dy) => (
          <Cam key={dy} x={width * 0.31} y={yTop + 0.28 + dy} />
        ))}
        <group position={[width * 0.31, yTop - 0.62, zG - 0.012]}>
          <Flash mats={mats} s={0.5} />
        </group>
      </group>
    );
  }

  if (kind === 'folder') {
    /* Z Flip5 / Flip6: black visor band with the camera pair along the top
       edge, 3.4" folder Flex Window below it */
    const vy = -half + 0.92;
    const halfGap = fc.gap / 2;
    return (
      <group userData={{ dbg: 'cams', modelId: model.id }}>
        <RB
          args={[width - 0.34, 1.68, 0.07]}
          radius={0.3}
          smoothness={SM(4)}
          position={[0, vy, zG + 0.032]}
          material={mats.bezel}
        />
        {[-halfGap, halfGap].map((dx) => (
          <Cam key={dx} x={dx - width * 0.24} y={vy} />
        ))}
        <group position={[halfGap + 0.28 - width * 0.24, vy, zPlate + 0.03]}>
          <Flash mats={mats} s={0.56} />
        </group>
        <Window x={0} y={-half * 0.38} w={cover.w} h={Math.min(cover.h, half * 0.62)} band={0.13} />
      </group>
    );
  }

  /* full: Z Flip7 / Flip8 — edge-to-edge Flex Window that wraps the cameras */
  const vy = -half + 0.95;
  const halfGap = fc.gap / 2;
  return (
    <group userData={{ dbg: 'cams', modelId: model.id }}>
      <Window
        x={0}
        y={-Math.min(cover.h, half - 0.26) / 2 - 0.1}
        w={cover.w * 1.02}
        h={Math.min(cover.h, half - 0.26)}
        band={0.09}
        rim={false}
      />
      {[-halfGap, halfGap].map((dx) => (
        <group key={dx}>
          <mesh
            position={[dx - width * 0.235, vy, zG - 0.0015]}
            material={mats.bezelFlat}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[fc.lensR * 1.55, fc.lensR * 1.55, 0.008, SEG.lens]} />
          </mesh>
          <Cam x={dx - width * 0.235} y={vy} />
        </group>
      ))}
      <group position={[halfGap + 0.4 - width * 0.235, vy, zG - 0.006]}>
        <Flash mats={mats} s={0.58} ring={fc.ringFlash} />
      </group>
    </group>
  );
}

/* rounded box with a radius that can never exceed the box's half-thickness */
export function RB({ args, radius = 0.1, smoothness = 4, ...rest }) {
  const [w, h, d] = args;
  const r = Math.max(0.004, Math.min(radius, Math.min(w, h, d) * 0.4));
  return <RoundedBox args={args} radius={r} smoothness={smoothness} {...rest} />;
}
