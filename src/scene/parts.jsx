import { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import {
  roundedRectOutline,
  roundedFace,
  frameGeometry,
  padGeometry,
  lensDomeGeometry,
} from '../lib/shapes';
import { SEG } from '../lib/perf';

const SM = (n) => Math.max(2, Math.round(n * SEG.smooth));

/* ------------------------------------------------------------------ */
/*  lens stack                                                        */
/*                                                                    */
/*  Read off the real rear cameras: the glass is the camera — a wide   */
/*  sapphire window that fills almost the whole barrel, a hairline     */
/*  machined lip around it, and a dark throat between the two. The old */
/*  stack spent a third of its radius on a grey metal donut, which is  */
/*  what made it read as a cheap toy ring.                            */
/* ------------------------------------------------------------------ */

function LensStack({ mats, R = 0.5, D = 0.06, ring = 'polished', halo = 0 }) {
  const seg = SEG.lens;
  const metal = ring === 'dark' ? mats.lensBarrel : ring === 'match' ? mats.ring : mats.lensRing;
  const lipR = R * 0.99;
  const glassR = R * 0.93;
  const zRim = -D;
  const zGlass = -D + Math.min(0.016, D * 0.32);
  const dome = useMemo(() => lensDomeGeometry(glassR, glassR * 0.34, SEG.lensGlass[0]), [glassR]);

  return (
    <group>
      {/* shadow line where the barrel is seated in the pad */}
      <mesh material={mats.lensBore} rotation={[Math.PI, 0, 0]} position={[0, 0, 0.006]}>
        <ringGeometry args={[R * 0.965, R * (halo > 0 ? halo : 1.02), seg]} />
      </mesh>
      {halo > 0 && (
        <mesh material={mats.lensBarrel} rotation={[Math.PI, 0, 0]} position={[0, 0, 0.0055]}>
          <ringGeometry args={[R * 1.02, R * halo, seg]} />
        </mesh>
      )}
      {/* barrel wall: sunk a little into the pad so its base never z-fights */}
      <mesh material={mats.lensBarrel} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -D / 2 + 0.006]}>
        <cylinderGeometry args={[lipR, R, D + 0.012, seg, 1, true]} />
      </mesh>
      {/* the machined lip: one crisp rounded ring */}
      <mesh material={metal} position={[0, 0, zRim]}>
        <torusGeometry args={[lipR - R * 0.014, R * 0.016, 6, seg]} />
      </mesh>
      {/* dark throat between the lip and the glass */}
      <mesh material={mats.lensBore} rotation={[Math.PI, 0, 0]} position={[0, 0, zGlass + 0.003]}>
        <ringGeometry args={[glassR * 0.99, lipR * 1.005, seg]} />
      </mesh>
      {/* the sapphire window itself */}
      <mesh geometry={dome} material={mats.lensGlass} position={[0, 0, zGlass]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  flash                                                             */
/*  A round window set into the glass: thin dark bezel, warm diffuser, */
/*  no sticker ring around it.                                        */
/* ------------------------------------------------------------------ */

function Flash({ mats, s = 1, ...rest }) {
  const seg = SEG.small * 2;
  return (
    <group scale={[s, s, s]} {...rest}>
      <mesh material={mats.lensBore} rotation={[Math.PI, 0, 0]} position={[0, 0, 0.006]}>
        <ringGeometry args={[0.152, 0.176, seg]} />
      </mesh>
      <mesh material={mats.lensBarrel} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.002]}>
        <cylinderGeometry args={[0.156, 0.164, 0.024, seg, 1, true]} />
      </mesh>
      <mesh material={mats.flashFace} rotation={[Math.PI, 0, 0]} position={[0, 0, -0.0132]}>
        <circleGeometry args={[0.156, seg * 2]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  per-model camera hardware (proportions measured off product photos)*/
/*                                                                    */
/*  island: 'pill' | 'dark-pill' | 'none'                              */
/*  ring:   'polished' | 'dark' | 'match'  — machined metal / black /  */
/*          colour-matched (Flip6, Fold6 style)                        */
/*                                                                    */
/*  w/h are derived from the lens size so the pad always hugs the      */
/*  lenses the way the real ones do — never a wide flat plate with     */
/*  small lenses in it.                                                */
/* ------------------------------------------------------------------ */

const spec = (lensR, pitch, count, o = {}) => ({
  lensR,
  pitch,
  count,
  w: o.w ?? 2 * lensR + 0.26,
  h: o.h ?? (count - 1) * pitch + 2 * lensR + 0.46,
  ...o,
});

export const CAM = {
  /* Galaxy Fold (2019): a narrow black vertical module, small lenses,
     flash as a separate dot under the module */
  'fold-1': spec(0.31, 0.9, 3, {
    island: 'dark-pill',
    w: 1.08,
    h: 3.24,
    plate: 0.11,
    ring: 'dark',
    flash: { dx: 0, dy: -2.15, s: 0.95 },
  }),
  /* Fold2: body-coloured pill, big rings, flash beside the top lens */
  'fold-2': spec(0.55, 1.24, 3, {
    island: 'pill',
    plate: 0.1,
    ring: 'polished',
    flash: { dx: -0.98, dy: 1.28, s: 0.95 },
  }),
  /* Fold3/4/5: no island — the rings stand straight on the back glass,
     flash below the last lens */
  'fold-3': spec(0.56, 1.26, 3, { island: 'none', plate: 0.0, ring: 'polished', flash: { dx: 0, dy: -2.2, s: 0.92 } }),
  'fold-4': spec(0.57, 1.28, 3, { island: 'none', plate: 0.0, ring: 'polished', flash: { dx: 0.02, dy: -2.24, s: 0.92 } }),
  'fold-5': spec(0.6, 1.34, 3, { island: 'none', plate: 0.0, ring: 'polished', flash: { dx: -0.98, dy: 1.34, s: 0.95 } }),
  /* Fold6/7: a slim pill in body colour, colour-matched machined rings */
  'fold-6': spec(0.66, 1.48, 3, {
    island: 'pill',
    plate: 0.085,
    ring: 'match',
    flash: { dx: -1.06, dy: 1.28, s: 1.0 },
  }),
  'fold-7': spec(0.72, 1.62, 3, {
    island: 'pill',
    plate: 0.08,
    ring: 'polished',
    flash: { dx: -1.16, dy: 1.4, s: 1.0 },
  }),
  /* Fold8: dual camera — two large rings in one short pill, flash inside */
  'fold-8': spec(0.75, 1.6, 2, {
    island: 'pill',
    w: 1.78,
    h: 3.78,
    plate: 0.085,
    ring: 'polished',
    flash: { dx: 0, dy: -1.52, s: 0.95, inside: true },
  }),
  /* Fold8 Ultra: the 200MP stack — three big rings, flash beside the top */
  'fold-8-ultra': spec(0.74, 1.66, 3, {
    island: 'pill',
    plate: 0.095,
    ring: 'polished',
    flash: { dx: -1.18, dy: 1.44, s: 1.0 },
  }),
};

export function CameraIsland({ model, mats, zBack }) {
  const { cam } = model;
  const s = CAM[model.id] ?? {};
  const count = s.count ?? cam.count ?? 3;
  const lensR = s.lensR ?? 0.5;
  const pitch = s.pitch ?? (2 * lensR + 0.3) * 1.13;
  const w = s.w ?? 2 * lensR + 0.26;
  const h = s.h ?? (count - 1) * pitch + 2 * lensR + 0.46;
  const plate = s.plate ?? 0.06;
  const islandKind = s.island ?? 'pill';

  const padGeo = useMemo(() => {
    if (islandKind === 'none') return null;
    const out = roundedRectOutline(w, h, Math.min(w, h) / 2 - 0.002, 0, 0, {
      curveSegs: Math.max(8, SEG.curve),
      step: 0.5,
    });
    return padGeometry(out, plate > 0 ? plate : 0.03, (plate > 0 ? plate : 0.03) * 0.96, 4);
  }, [w, h, plate, islandKind]);

  const spots = Array.from({ length: count }, (_, i) => [
    cam.x,
    cam.y + ((count - 1) / 2) * pitch - i * pitch,
  ]);
  const flash = s.flash ?? { dx: w / 2 + 0.45, dy: h / 2 - 0.7, s: 0.9 };
  const zTop = zBack - plate;

  return (
    <group userData={{ dbg: 'cams', modelId: model.id }}>
      {padGeo && (
        <mesh
          geometry={padGeo}
          material={islandKind === 'dark-pill' ? mats.lensBarrel : mats.island}
          position={[cam.x, cam.y, zTop]}
          rotation={[Math.PI, 0, 0]}
          receiveShadow
        />
      )}
      {spots.map(([lx, ly]) => (
        <group key={`l${ly.toFixed(2)}`} position={[lx, ly, zTop - 0.0008]}>
          <LensStack mats={mats} R={lensR} D={0.058 + plate * 0.22} ring={s.ring ?? 'polished'} />
        </group>
      ))}

      <group position={[cam.x + flash.dx, cam.y + flash.dy, zTop - 0.0008]}>
        <Flash mats={mats} s={flash.s ?? 0.9} />
      </group>

      {/* rear mic pinhole, at the foot of the island */}
      <mesh
        position={[cam.x - w / 2 + 0.24, cam.y - h / 2 + 0.26, zTop + 0.001]}
        material={mats.dark}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.026, 0.026, 0.012, SEG.dot]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  cover cluster — clamshell Flips                                   */
/* ------------------------------------------------------------------ */

const FLIP_CAM = {
  /* Flip1: raised horizontal module at the top-left, 1.1" pill beside it */
  'flip-1': { lensR: 0.44, gap: 1.16, module: true, ring: 'dark' },
  /* Flip3/4: black visor band, camera pair stacked vertically at the left,
     flash below them */
  'flip-3': { lensR: 0.5, gap: 1.2, ring: 'polished' },
  'flip-4': { lensR: 0.51, gap: 1.22, ring: 'polished' },
  /* Flip5/6: pair side by side above the Flex Window, flash to the right */
  'flip-5': { lensR: 0.54, gap: 1.3, ring: 'polished' },
  'flip-6': { lensR: 0.58, gap: 1.36, ring: 'match' },
  /* Flip7/8: the pair sits inside the top-left corner of the window */
  'flip-7': { lensR: 0.57, gap: 1.46, ring: 'polished' },
  'flip-8': { lensR: 0.58, gap: 1.48, ring: 'polished' },
};

export function CoverCluster({ model, mats, half, width, T, coverW, coverH }) {
  const kind = model.cover.kind;
  const cover = { w: coverW ?? model.coverW, h: coverH ?? model.coverH };
  const zOut = -T / 2;
  const zG = zOut - 0.016; // window glass plane
  const zPlate = zOut - 0.05; // camera plateau outer face
  const rGlass = Math.max(0.08, model.geo.rOuter * 0.78);
  const fc = FLIP_CAM[model.id] ?? { lensR: 0.5, gap: 1.25, ring: 'polished' };
  const yTop = -half * 0.855;
  const halfW = width / 2;

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

  const Cam = ({ x, y, halo = 0 }) => (
    <group position={[x, y, zPlate + 0.012]}>
      <LensStack mats={mats} R={fc.lensR} D={0.062} ring={fc.ring ?? 'polished'} halo={halo} />
    </group>
  );

  if (kind === 'pill') {
    /* Z Flip (1): horizontal dual module at the top-left with the 1.1"
       pill display beside it */
    const camX = -1.86;
    return (
      <group userData={{ dbg: 'cams', modelId: model.id }}>
        <mesh
          geometry={padGeometry(
            roundedRectOutline(3.24, 1.46, 0.4, 0, 0, { curveSegs: Math.max(8, SEG.curve), step: 0.5 }),
            0.13,
            0.05,
            3
          )}
          material={mats.lensBarrel}
          position={[camX, yTop, zPlate + 0.005]}
          rotation={[Math.PI, 0, 0]}
          castShadow
        />
        {[-0.62, 0.62].map((dx) => (
          <Cam key={dx} x={camX + dx} y={yTop} />
        ))}
        <group position={[camX + 1.3, yTop, zPlate + 0.004]}>
          <Flash mats={mats} s={0.9} />
        </group>
        <Window x={halfW - 1.62} y={yTop + 0.1} w={1.5} h={1.5} band={0.06} r={0.34} rim={false} />
      </group>
    );
  }

  if (kind === 'strip') {
    /* Z Flip3 / Flip4: the black visor band runs the full width; the pair
       stands vertically at the left edge with the flash under it, and the
       1.9" panel sits to their right */
    const bandH = 2.7;
    const bandY = -half + bandH / 2 + 0.28;
    const camX = -halfW + 1.12;
    const p = cover;
    const winW = Math.min(width - 2.55, p.w * 1.06);
    const winH = Math.min(bandH - 0.6, (winW * p.h) / p.w);
    return (
      <group userData={{ dbg: 'cams', modelId: model.id }}>
        <RB
          args={[width - 0.4, bandH, 0.09]}
          radius={0.3}
          smoothness={SM(4)}
          position={[0, bandY, zG + 0.05]}
          material={mats.bezel}
        />
        <Window x={halfW - winW / 2 - 0.62} y={bandY} w={winW} h={winH} band={0} r={0.1} rim={false} />
        {[fc.gap / 2, -fc.gap / 2].map((dy) => (
          <Cam key={dy} x={camX} y={bandY + dy} />
        ))}
        <group position={[camX - 0.02, bandY + fc.gap / 2 + 0.95, zPlate + 0.02]}>
          <Flash mats={mats} s={0.86} />
        </group>
      </group>
    );
  }

  if (kind === 'folder') {
    /* Z Flip5 / Flip6: black top half; the pair sits above the window at the
       left, the flash to the right of it */
    const bandY = -half + 0.9;
    const halfGap = fc.gap / 2;
    const x0 = -halfW + 1.16;
    return (
      <group userData={{ dbg: 'cams', modelId: model.id }}>
        <RB
          args={[width - 0.34, 1.72, 0.07]}
          radius={0.3}
          smoothness={SM(4)}
          position={[0, bandY, zG + 0.032]}
          material={mats.bezel}
        />
        {[0, 1].map((i) => (
          <Cam key={i} x={x0 + i * fc.gap} y={bandY - 0.02} />
        ))}
        <group position={[x0 + fc.gap + fc.lensR + 0.36, bandY - 0.02, zPlate + 0.004]}>
          <Flash mats={mats} s={0.9} />
        </group>
        <Window x={0} y={-half * 0.38} w={cover.w} h={Math.min(cover.h, half * 0.62)} band={0.13} />
      </group>
    );
  }

  /* full: Z Flip7 / Flip8 — edge-to-edge Flex Window that wraps the cameras */
  const x0 = -halfW + 1.14;
  const vy = -half + 1.04;
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
      {[0, 1].map((i) => (
        <group key={i}>
          <Cam x={x0 + i * fc.gap} y={vy} halo={1.13} />
        </group>
      ))}
      <group position={[x0 + fc.gap + fc.lensR + 0.42, vy, zPlate + 0.004]}>
        <Flash mats={mats} s={0.92} />
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
