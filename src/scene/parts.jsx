import { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { roundedRectOutline, roundedFace, frameGeometry, hingePlateGeometry } from '../lib/shapes';
import { SEG } from '../lib/perf';

const SM = (n) => Math.max(2, Math.round(n * SEG.smooth));

/* ------------------------------------------------------------------ */
/*  lens stack: black barrel, hairline metal rim, sunk sapphire glass  */
/*  local +z points into the body; outward is -z                       */
/* ------------------------------------------------------------------ */

const LR = 0.655; // barrel radius (cm) -> 13.1 mm outer diameter

function LensStack({ mats, r = 1, polished = false }) {
  const seg = SEG.lens;
  const R = LR;
  const D = 0.052; // how far the barrel stands proud of the island
  const flip = [0, Math.PI, 0]; // ring/circle geometry faces outward (-z)

  return (
    <group scale={[r, r, r]}>
      {/* bright machined seat where the barrel meets the island */}
      <mesh material={mats.lensRim} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.004]}>
        <cylinderGeometry args={[R * 0.985, R * 1.015, 0.014, seg]} />
      </mesh>
      {/* black anodised barrel */}
      <mesh material={mats.lensRing} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -(D - 0.01) / 2]}>
        <cylinderGeometry args={[R * 0.955, R * 0.995, D - 0.01, seg]} />
      </mesh>
      {/* rolled chamfer on the front edge */}
      <mesh material={mats.lensRing} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -(D - 0.005)]}>
        <cylinderGeometry args={[R * 0.865, R * 0.955, 0.012, seg]} />
      </mesh>
      {/* flat top of the ring: a thin black shoulder around the glass */}
      <mesh material={mats.lensRing} rotation={flip} position={[0, 0, -D + 0.001]}>
        <ringGeometry args={[R * 0.79, R * 0.865, seg]} />
      </mesh>
      {/* short bore down to the glass seat */}
      <mesh material={mats.lensRing} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -D + 0.007]}>
        <cylinderGeometry args={[R * 0.79, R * 0.79, 0.013, seg, 1, true]} />
      </mesh>
      {/* sapphire cover glass: a nearly flat, very dark disc that fills the ring */}
      <mesh material={mats.lens} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.06, 1]} position={[0, 0, -D + 0.0115]}>
        <sphereGeometry args={[R * 0.788, SEG.lensGlass[0], SEG.lensGlass[1], 0, Math.PI * 2, 0, Math.PI * 0.5]} />
      </mesh>
      {/* the lens element behind the glass, and its iris */}
      <mesh material={mats.lensInner} rotation={flip} position={[0, 0, -D + 0.0125]}>
        <circleGeometry args={[R * 0.52, SEG.dot * 3]} />
      </mesh>
      <mesh material={mats.dark} rotation={flip} position={[0, 0, -D + 0.013]}>
        <circleGeometry args={[R * 0.15, SEG.dot * 2]} />
      </mesh>
      {polished && (
        <mesh material={mats.lensRim} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.012]}>
          <cylinderGeometry args={[R * 1.02, R * 1.055, 0.012, seg]} />
        </mesh>
      )}
    </group>
  );
}

function Flash({ mats, s = 1, ...rest }) {
  return (
    <group scale={[s, s, s]} {...rest}>
      <mesh material={mats.lensRing} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.155, 0.16, 0.05, SEG.small]} />
      </mesh>
      <mesh material={mats.flash} rotation={[0, Math.PI, 0]} position={[0, 0, -0.026]}>
        <circleGeometry args={[0.108, SEG.small]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  rear camera island — book-style Folds                             */
/* ------------------------------------------------------------------ */

export function CameraIsland({ model, mats, zBack, T }) {
  const { cam } = model;
  const plate = cam.plate ?? 0.1;
  const { layout, count, w, h, x, y } = cam;

  const horizontal = layout === 'blockH';
  const pill =
    layout === 'pill' || layout === 'pillFloat' || layout === 'ultra' ||
    layout === 'rings' || layout === 'ringsSlim' || layout === 'dual';
  const radius = horizontal ? Math.min(w, h) / 2 : pill ? Math.min(w, h) / 2 : 0.22;
  const t = plate + 0.04; // island block, sunk into the body at its base
  const zTop = zBack - plate; // outer face of the island

  /* lens pitch: rings just about clear each other on the slim generations */
  const span = (horizontal ? w : h) - 1.42 * (layout === 'ultra' ? 1 : 0.92);
  const pitch = count > 1 ? span / (count - 1) : 0;
  const lensScale = layout === 'ultra' ? 0.95 : model.id === 'fold-1' ? 0.74 : horizontal ? 0.78 : 0.84;
  const spots = horizontal
    ? Array.from({ length: count }, (_, i) => [x - ((count - 1) / 2) * pitch + i * pitch, y])
    : Array.from({ length: count }, (_, i) => [x, y + ((count - 1) / 2) * pitch - i * pitch]);

  return (
    <group>
      {/* the island is the body glass lifted a fraction of a millimetre, with
          a soft machined shoulder — not a metal plate */}
      <mesh
        geometry={hingePlateGeometry(w, h, t, radius, 0.022, SM(6))}
        material={mats.island}
        position={[x, y, zTop + t]}
        castShadow
        receiveShadow
      />
      {spots.map(([lx, ly], i) => (
        <group key={i} position={[lx, ly, zTop]}>
          <LensStack mats={mats} r={lensScale} polished={layout === 'ringsSlim' || layout === 'ultra'} />
        </group>
      ))}

      {/* flash: inside the pill under the lowest lens on the newest Folds,
          beside the block on the early ones */}
      <group
        position={
          layout === 'dual' || layout === 'ultra'
            ? [x, y - h / 2 + 0.36, zTop - 0.004]
            : layout === 'rings' || layout === 'ringsSlim'
              ? [x + w / 2 + 0.44, y + h / 2 - 0.62, zTop - 0.004]
              : [x + w / 2 - 0.26, y + h / 2 - 0.60, zTop - 0.004]
        }
      >
        <Flash mats={mats} s={layout === 'blockH' ? 0.8 : 0.92} />
      </group>

      {/* rear mic pinhole */}
      <mesh
        position={[x - w / 2 + 0.24, y - h / 2 + 0.28, zTop - 0.002]}
        material={mats.dark}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.03, 0.03, 0.012, SEG.dot]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  cover cluster — clamshell Flips                                   */
/* ------------------------------------------------------------------ */

export function CoverCluster({ model, mats, half, width, T, coverW, coverH }) {
  const kind = model.cover.kind;
  const cover = { w: coverW ?? model.coverW, h: coverH ?? model.coverH };
  const zOut = -T / 2;
  const zG = zOut - 0.016; // window glass plane
  const zPlate = zOut - 0.058; // camera plateau outer face
  const rGlass = Math.max(0.08, model.geo.rOuter * 0.78);
  const lensScale = model.id === 'flip-1' ? 0.68 : model.id === 'flip-3' ? 0.74 : 0.8;
  const yTop = -half * 0.855;

  /* polished bevel that frames a window of w × h */
  const bevel = (w, h, r) =>
    frameGeometry(w + 0.1, h + 0.1, Math.max(0.05, r + 0.05), 0.05, 0.022);

  const Window = ({ x, y, w, h, band = 0.16, r = rGlass, dz = 0 }) => (
    <group position={[x, y, 0]}>
      <RB
        args={[w + band * 2, h + band * 2, 0.07]}
        radius={0.28}
        smoothness={SM(4)}
        position={[0, 0, zG + 0.04 + dz]}
        material={mats.bezel}
      />
      <mesh geometry={bevel(w, h, r)} material={mats.frame} position={[0, 0, zG - 0.003 + dz]} />
      <mesh
        geometry={roundedFace(roundedRectOutline(w, h, r, 0, 0), 0, 1, 0, 1)}
        material={mats.cover}
        position={[0, 0, zG + dz]}
        rotation={[0, Math.PI, Math.PI]}
      />
    </group>
  );

  const Cam = ({ x, y, s = lensScale, polished = false }) => (
    <group position={[x, y, zPlate + 0.014]}>
      <LensStack mats={mats} r={s} polished={polished} />
    </group>
  );

  if (kind === 'pill') {
    /* Z Flip (1): horizontal dual camera with the 1.1" pill display beside it */
    const camX = -width * 0.13;
    return (
      <group>
        <mesh
          geometry={hingePlateGeometry(3.05, 1.42, 0.16, 0.36, 0.02, SM(5))}
          material={mats.island}
          position={[camX, yTop, zPlate + 0.02]}
          castShadow
        />
        {[-0.68, 0.68].map((dx) => (
          <Cam key={dx} x={camX + dx} y={yTop} />
        ))}
        <group position={[camX + 1.32, yTop - 0.58, zPlate + 0.02]}>
          <Flash mats={mats} s={0.6} />
        </group>
        <Window x={width * 0.3} y={yTop + 0.25} w={cover.w} h={cover.h} band={0.14} r={0.16} />
      </group>
    );
  }

  if (kind === 'strip') {
    /* Z Flip3 / Flip4: black visor band — landscape display left, cameras right */
    const bandH = 2.55;
    const sw = Math.min(width - 1.5, cover.h * 0.92);
    const sh = sw / Math.max(1.05, cover.h / cover.w);
    return (
      <group>
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
        {[0.5, -0.5].map((dy) => (
          <Cam key={dy} x={width * 0.31} y={yTop + 0.28 + dy} />
        ))}
        <group position={[width * 0.31, yTop - 0.66, zG - 0.012]}>
          <Flash mats={mats} s={0.52} />
        </group>
      </group>
    );
  }

  if (kind === 'folder') {
    /* Z Flip5 / Flip6: black visor band with the camera pair along the top
       edge, 3.4" folder Flex Window below it */
    const vy = -half + 0.92;
    return (
      <group>
        <RB
          args={[width - 0.34, 1.68, 0.07]}
          radius={0.3}
          smoothness={SM(4)}
          position={[0, vy, zG + 0.032]}
          material={mats.bezel}
        />
        {[-0.62, 0.62].map((dx) => (
          <Cam key={dx} x={dx - width * 0.24} y={vy} polished />
        ))}
        <group position={[width * 0.06, vy, zPlate + 0.014]}>
          <Flash mats={mats} s={0.56} />
        </group>
        <Window x={0} y={-half * 0.38} w={cover.w} h={Math.min(cover.h, half * 0.62)} band={0.13} />
      </group>
    );
  }

  /* full: Z Flip7 / Flip8 — edge-to-edge Flex Window that wraps the cameras */
  const vy = -half + 0.95;
  return (
    <group>
      <Window x={0} y={-half * 0.44} w={cover.w * 1.02} h={cover.h} band={0.07} />
      {[-0.6, 0.6].map((dx) => (
        <group key={dx}>
          <mesh
            position={[dx - width * 0.235, vy, zG - 0.002]}
            material={mats.dark}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.52, 0.52, 0.01, SEG.lens]} />
          </mesh>
          <Cam x={dx - width * 0.235} y={vy} s={lensScale * 0.94} polished />
        </group>
      ))}
      <group position={[width * 0.075, vy, zG - 0.012]}>
        <Flash mats={mats} s={0.54} />
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
