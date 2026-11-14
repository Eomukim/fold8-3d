import { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { splitScreenPlane, frameGeometry } from '../lib/shapes';

/* ------------------------------------------------------------------ */
/*  lens stack                                                        */
/* ------------------------------------------------------------------ */

function Lens({ geo, mats, r = 1, plate = 0.0, inset = 0, style = 'dark' }) {
  const ringMat = style === 'polish' ? mats.ring : mats.ringDark;
  return (
    <group scale={[r, r, r]}>
      <mesh geometry={geo.lensRing} material={ringMat} rotation={[Math.PI / 2, 0, 0]} castShadow />
      <mesh
        geometry={geo.lensRingInner}
        material={mats.ring}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, 0.05]}
      />
      <mesh
        geometry={geo.lensRim}
        material={mats.dark}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, 0.07]}
      />
      <mesh
        geometry={geo.lensGlass}
        material={mats.lens}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1, 0.42, 1]}
        position={[0, 0, 0.085]}
      />
    </group>
  );
}

function Flash({ mats, s = 1, ...rest }) {
  return (
    <group scale={[s, s, s]} {...rest}>
      <mesh material={mats.ring}>
        <cylinderGeometry args={[0.17, 0.17, 0.09, 32]} />
      </mesh>
      <mesh material={mats.flash} position={[0, 0, 0.055]}>
        <cylinderGeometry args={[0.115, 0.115, 0.03, 32]} />
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
  const r = model.id === 'fold-1' ? 0.33 : model.id === 'fold-2' ? 0.35 : 0.38;

  const geo = useMemo(
    () => ({
      lensRing: new THREE.CylinderGeometry(0.46, 0.46, 0.1, 56, 1, false),
      lensRingInner: new THREE.CylinderGeometry(0.37, 0.39, 0.05, 56, 1, false),
      lensRim: new THREE.CylinderGeometry(0.33, 0.35, 0.08, 56, 1, false),
      lensGlass: new THREE.SphereGeometry(0.39, 44, 22, 0, Math.PI * 2, 0, Math.PI * 0.5),
    }),
    []
  );

  const { layout, count, w, h, x, y } = cam;
  const z = zBack - plate * 0.55;               // plate centre
  const zFace = zBack - plate * 1.55;           // plate's outer face

  // --- plate shapes -------------------------------------------------
  const plateNode =
    layout === 'rings' ? (
      <RB
        args={[w, h, plate * 2]}
        radius={0.16}
        smoothness={4}
        position={[x, y, z]}
        material={mats.ringDark}
        castShadow
      />
    ) : layout === 'ringsSlim' ? (
      <RB
        args={[w, h, plate * 1.5]}
        radius={0.24}
        smoothness={4}
        position={[x, y, z]}
        material={mats.frame}
        castShadow
      />
    ) : layout === 'ultra' ? (
      <RB
        args={[w, h, plate * 2]}
        radius={0.44}
        smoothness={5}
        position={[x, y, z]}
        material={mats.frame}
        castShadow
      />
    ) : layout === 'pill' || layout === 'pillFloat' ? (
      <RB
        args={[w, h, plate * 2]}
        radius={Math.min(w, h) / 2 - 0.02}
        smoothness={6}
        position={[x, y, z]}
        material={mats.frame}
        castShadow
      />
    ) : (
      <RB
        args={[w, h, plate * 2]}
        radius={layout === 'block' && model.id === 'fold-1' ? 0.36 : 0.3}
        smoothness={5}
        position={[x, y, z]}
        material={mats.frame}
        castShadow
      />
    );

  // --- lens positions ----------------------------------------------
  const gap = count === 2 ? 1.0 : 1.15;
  const ys = count === 2 ? [y + gap / 2, y - gap / 2] : [y + gap, y, y - gap];
  const lensZ = zFace - 0.012;
  const lensScale = layout === 'ultra' ? 1.28 : model.id === 'fold-1' ? 0.82 : 1;

  const mult = layout === 'rings' ? 1.5 : 1; // concentric ring shell

  return (
    <group>
      {plateNode}
      {ys.map((ly, i) => (
        <group key={i} position={[x, ly, lensZ]}>
          {layout === 'rings' && (
            <mesh material={mats.ringTextured} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.05]}>
              <cylinderGeometry args={[0.56, 0.56, 0.06, 48]} />
            </mesh>
          )}
          <Lens
            geo={geo}
            mats={mats}
            r={lensScale * mult}
            style={layout === 'ringsSlim' || layout === 'ultra' || layout === 'rings' ? 'polish' : 'dark'}
          />
        </group>
      ))}

      {/* flash */}
      {layout === 'pillFloat' ? (
        <group position={[x + w / 2 + 0.42, y + 0.15, zFace - 0.006]}>
          <Flash mats={mats} s={1.05} />
        </group>
      ) : layout === 'ultra' ? (
        <group position={[x + 0.72, y - 0.05, zFace - 0.006]}>
          <Flash mats={mats} s={1} />
        </group>
      ) : layout === 'dual' ? (
        <group position={[x + 0.95, y + 0.2, zFace - 0.006]}>
          <Flash mats={mats} s={0.95} />
        </group>
      ) : (
        <group position={[x + w / 2 + 0.34, y + 0.42, zFace - 0.006]}>
          <Flash mats={mats} s={0.95} />
        </group>
      )}

      {/* mic dot */}
      <mesh
        position={[x + (layout === 'ultra' ? 0.72 : w / 2 + 0.3), y - 0.72, zFace - 0.004]}
        material={mats.dark}
      >
        <cylinderGeometry args={[0.06, 0.06, 0.05, 20]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  cover cluster — clamshell Flips                                   */
/* ------------------------------------------------------------------ */

export function CoverCluster({ model, mats, half, width, T, coverW, coverH }) {
  const { cam } = model;
  const cover = { w: coverW ?? model.coverW, h: coverH ?? model.coverH, kind: model.cover.kind };
  const kind = cover.kind;
  const zOut = -T / 2;

  const geo = useMemo(
    () => ({
      lensRing: new THREE.CylinderGeometry(0.4, 0.4, 0.09, 48, 1, false),
      lensRingInner: new THREE.CylinderGeometry(0.32, 0.34, 0.045, 48, 1, false),
      lensRim: new THREE.CylinderGeometry(0.28, 0.3, 0.07, 48, 1, false),
      lensGlass: new THREE.SphereGeometry(0.34, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.5),
    }),
    []
  );

  const screenGeo = useMemo(() => splitScreenPlane(cover.w, cover.h, 0, 1), [cover.w, cover.h]);
  const bezelGeo = useMemo(
    () =>
      frameGeometry(
        cover.w + model.geo.coverBand * 2,
        cover.h + model.geo.coverBand * 2,
        0.42,
        model.geo.coverBand * 0.9,
        0.03
      ),
    [cover.w, cover.h, model.geo.coverBand]
  );

  const lensScale = model.id === 'flip-1' ? 0.82 : model.id === 'flip-3' ? 0.9 : 1;

  /* local +y runs from the fold (0) to the free end (half).  The camera band
     always sits at the free end; the Flex Window fills the space below it.   */
  const yTop = -half * 0.845;

  const Screen = ({ x, y, w, h, band, dz = 0 }) => (
    <group position={[x, y, 0]}>
      {band != null && (
        <RB
          args={[w + band * 2, h + band * 2, 0.1]}
          radius={0.28}
          smoothness={4}
          position={[0, 0, zOut - 0.028]}
          material={mats.bezel}
        />
      )}
      <mesh
        geometry={splitScreenPlane(w, h, 0, 1)}
        material={mats.cover}
        position={[0, 0, zOut - (band != null ? 0.085 : 0.008) + dz]}
        rotation={[0, Math.PI, Math.PI]}
      />
    </group>
  );

  if (kind === 'pill') {
    /* Z Flip (1): horizontal dual camera with the 1.1" pill display beside it */
    const camX = -width * 0.13;
    return (
      <group>
        <RB
          args={[3.05, 1.42, 0.2]}
          radius={0.34}
          smoothness={5}
          position={[camX, yTop, zOut - 0.05]}
          material={mats.frame}
          castShadow
        />
        {[-0.68, 0.68].map((dx) => (
          <group key={dx} position={[camX + dx, yTop, zOut - 0.12]}>
            <Lens geo={geo} mats={mats} r={lensScale} style="dark" />
          </group>
        ))}
        <Flash mats={mats} s={0.62} position={[camX + 1.32, yTop - 0.58, zOut - 0.08]} />
        <Screen x={width * 0.3} y={yTop + 0.25} w={cover.w} h={cover.h} band={0.16} />
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
          args={[width - 0.5, bandH, 0.11]}
          radius={0.34}
          smoothness={4}
          position={[0, yTop + 0.28, zOut - 0.03]}
          material={mats.bezel}
        />
        <Screen x={-width * 0.13} y={yTop + 0.28} w={sw} h={Math.min(sh, bandH - 0.55)} dz={-0.085} />
        {[0.46, -0.46].map((dy) => (
          <group key={dy} position={[width * 0.31, yTop + 0.28 + dy, zOut - 0.1]}>
            <Lens geo={geo} mats={mats} r={lensScale} style="dark" />
          </group>
        ))}
        <Flash mats={mats} s={0.5} position={[width * 0.31, yTop - 0.72, zOut - 0.09]} />
      </group>
    );
  }

  if (kind === 'folder') {
    /* Z Flip5 / Flip6: 3.4" folder Flex Window with the camera pair in the
       top-left corner of the cover, outside the window */
    return (
      <group>
        <Screen x={width * 0.045} y={-half * 0.42} w={cover.w * 1.02} h={cover.h * 1.04} band={0.18} />
        {[-0.68, 0.68].map((dx) => (
          <group key={dx} position={[dx - width * 0.28, yTop + 0.1, zOut - 0.1]}>
            <Lens geo={geo} mats={mats} r={lensScale} style="polish" />
          </group>
        ))}
        <Flash mats={mats} s={0.62} position={[width * 0.02, yTop + 0.1, zOut - 0.09]} />
      </group>
    );
  }

  /* full: Z Flip7 / Flip8 — edge-to-edge Flex Window wrapping around the cameras */
  return (
    <group>
      <Screen x={0} y={-half * 0.455} w={cover.w * 1.04} h={cover.h * 1.05} band={0.05} />
      <RB
        args={[3.05, 1.5, 0.06]}
        radius={0.4}
        smoothness={4}
        position={[-width * 0.24, yTop + 0.05, zOut - 0.05]}
        material={mats.bezel}
      />
      {[-0.6, 0.62].map((dx) => (
        <group key={dx} position={[dx - width * 0.24, yTop + 0.05, zOut - 0.1]}>
          <Lens geo={geo} mats={mats} r={lensScale * 0.92} style="polish" />
        </group>
      ))}
      <Flash mats={mats} s={0.55} position={[width * 0.02, yTop + 0.05, zOut - 0.08]} />
    </group>
  );
}

/* rounded box with a radius that can never exceed the box's half-thickness */
export function RB({ args, radius = 0.1, smoothness = 4, ...rest }) {
  const [w, h, d] = args;
  const r = Math.max(0.005, Math.min(radius, Math.min(w, h, d) * 0.48));
  return <RoundedBox args={args} radius={r} smoothness={smoothness} {...rest} />;
}
