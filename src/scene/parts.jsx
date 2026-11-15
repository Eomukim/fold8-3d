import { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { roundedRectOutline, roundedFace, frameGeometry } from '../lib/shapes';
import { SEG } from '../lib/perf';

const SM = (n) => Math.max(2, Math.round(n * SEG.smooth));

/* ------------------------------------------------------------------ */
/*  lens stack: gunmetal barrel, polished chamfer, recessed glass      */
/* ------------------------------------------------------------------ */

function LensStack({ mats, r = 1, polished = false }) {
  const seg = SEG.lens;
  return (
    <group scale={[r, r, r]}>
      {/* housing disc: sits proud of the island and closes the barrel */}
      <mesh material={mats.ringDark} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.016]}>
        <cylinderGeometry args={[0.47, 0.47, 0.07, seg]} />
      </mesh>
      {/* polished chamfer that catches the light on the ring's outer edge */}
      <mesh material={mats.ring} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.032]}>
        <cylinderGeometry args={[0.47, 0.405, 0.032, seg]} />
      </mesh>
      {/* flat top of the bezel */}
      <mesh material={mats.ring} rotation={[0, Math.PI, 0]} position={[0, 0, -0.048]}>
        <ringGeometry args={[0.4, 0.47, seg]} />
      </mesh>
      {/* dark wall falling to the glass seat */}
      <mesh material={mats.ringDark} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.04]}>
        <cylinderGeometry args={[0.355, 0.4, 0.016, seg, 1, true]} />
      </mesh>
      {/* cover glass, sunk below the bezel rim */}
      <mesh
        material={mats.lens}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1, 0.06, 1]}
        position={[0, 0, -0.03]}
      >
        <sphereGeometry args={[0.356, SEG.lensGlass[0], SEG.lensGlass[1], 0, Math.PI * 2, 0, Math.PI * 0.5]} />
      </mesh>
      {/* element glint in the middle of the glass */}
      <mesh material={mats.lensInner} rotation={[0, Math.PI, 0]} position={[0, 0, -0.041]}>
        <ringGeometry args={[0.09, 0.13, SEG.dot]} />
      </mesh>
      <mesh material={mats.dark} rotation={[0, Math.PI, 0]} position={[0, 0, -0.0405]}>
        <circleGeometry args={[0.09, SEG.dot]} />
      </mesh>
      {polished && (
        <mesh material={mats.ringTextured} rotation={[0, Math.PI, 0]} position={[0, 0, -0.001]}>
          <ringGeometry args={[0.475, 0.555, SEG.ringShell]} />
        </mesh>
      )}
    </group>
  );
}

function Flash({ mats, s = 1, ...rest }) {
  return (
    <group scale={[s, s, s]} {...rest}>
      <mesh material={mats.ringDark} >
        <cylinderGeometry args={[0.17, 0.17, 0.08, SEG.small]} />
      </mesh>
      <mesh material={mats.ring} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.03]}>
        <cylinderGeometry args={[0.168, 0.148, 0.02, SEG.small]} />
      </mesh>
      <mesh material={mats.flash} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.042]}>
        <cylinderGeometry args={[0.11, 0.11, 0.02, SEG.small]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  rear camera island — book-style Folds                             */
/* ------------------------------------------------------------------ */

export function CameraIsland({ model, mats, zBack, T }) {
  const { cam } = model;
  const plate = cam.plate ?? 0.12;
  const { layout, count, w, h, x, y } = cam;

  const tp = plate * 1.15; // island thickness
  const z = zBack - tp / 2; // plate centre
  const zFace = zBack - tp; // plate's outer face

  /* the island plate is body-coloured on the rings models (Fold6+),
     a dark trimmed block on the early ones */
  const plateMat =
    layout === 'rings' || layout === 'ringsSlim' || layout === 'ultra' ? mats.frame : mats.frame;

  const plateNode = (
    <RB
      args={[w, h, tp]}
      radius={
        layout === 'pill' || layout === 'pillFloat'
          ? Math.min(w, h) / 2 - 0.02
          : layout === 'ultra'
            ? 0.44
            : layout === 'rings'
              ? 0.3
              : 0.28
      }
      smoothness={SM(5)}
      position={[x, y, z]}
      material={plateMat}
      castShadow
    />
  );

  const gap = count === 2 ? 1.0 : 1.12;
  const ys = count === 2 ? [y + gap / 2, y - gap / 2] : [y + gap, y, y - gap];
  const lensZ = zFace - 0.016;
  const lensScale = layout === 'ultra' ? 1.3 : model.id === 'fold-1' ? 0.84 : 1;

  return (
    <group>
      {/* bright machined lip around the island */}
      <RB
        args={[w + 0.07, h + 0.07, plate * 0.7]}
        radius={
          layout === 'pill' || layout === 'pillFloat'
            ? Math.min(w, h) / 2
            : layout === 'ultra'
              ? 0.48
              : 0.34
        }
        smoothness={SM(5)}
        position={[x, y, z + plate * 0.32]}
        material={mats.ring}
      />
      {plateNode}
      {ys.map((ly, i) => (
        <group key={i} position={[x, ly, lensZ]}>
          <LensStack
            mats={mats}
            r={lensScale}
            polished={layout === 'ringsSlim' || layout === 'ultra' || layout === 'rings'}
          />
        </group>
      ))}

      {/* flash sits inside the island, beside the top lens */}
      {layout === 'pillFloat' || layout === 'pill' ? (
        <group position={[x + w / 2 + 0.42, y + 0.15, zFace - 0.004]}>
          <Flash mats={mats} s={1.0} />
        </group>
      ) : (
        <group position={[x + w / 2 - 0.3, y + 1.14, zFace - 0.004]}>
          <Flash mats={mats} s={0.82} />
        </group>
      )}

      {/* mic dot */}
      <mesh
        position={[x + w / 2 - 0.3, y - 0.9, zFace - 0.012]}
        material={mats.dark}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.042, 0.042, 0.02, SEG.dot]} />
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
  const zPlate = zOut - 0.062; // camera plateau outer face
  const rGlass = Math.max(0.08, model.geo.rOuter * 0.78);
  const lensScale = model.id === 'flip-1' ? 0.8 : model.id === 'flip-3' ? 0.88 : 0.96;
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
    <group position={[x, y, zPlate + 0.017]}>
      <LensStack mats={mats} r={s} polished={polished} />
    </group>
  );

  const Plateau = ({ x, y, w, h, r = 0.4 }) => (
    <RB
      args={[w, h, 0.062]}
      radius={r}
      smoothness={SM(4)}
      position={[x, y, zPlate + 0.031]}
      material={mats.bezel}
    />
  );

  if (kind === 'pill') {
    /* Z Flip (1): horizontal dual camera with the 1.1" pill display beside it */
    const camX = -width * 0.13;
    return (
      <group>
        <RB
          args={[3.05, 1.42, 0.14]}
          radius={0.34}
          smoothness={SM(5)}
          position={[camX, yTop, zPlate + 0.07]}
          material={mats.frame}
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
