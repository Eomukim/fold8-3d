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
  const z = zBack - plate * 0.55;

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
  const lensZ = zBack - plate * 1.15;
  const lensScale = layout === 'ultra' ? 1.28 : model.id === 'fold-1' ? 0.82 : 1;

  const mult = layout === 'rings' ? 1.5 : 1; // concentric ring shell

  return (
    <group>
      {plateNode}
      {ys.map((ly, i) => (
        <group key={i} position={[x, ly, lensZ]}>
          {layout === 'rings' && (
            <mesh material={mats.ringTextured} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.055]}>
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
        <group position={[x + w / 2 + 0.42, y + 0.15, zBack - plate * 1.1]}>
          <Flash mats={mats} s={1.05} />
        </group>
      ) : layout === 'ultra' ? (
        <group position={[x + 0.72, y - 0.05, zBack - plate * 1.1]}>
          <Flash mats={mats} s={1} />
        </group>
      ) : layout === 'dual' ? (
        <group position={[x + 0.95, y + 0.2, zBack - plate * 1.1]}>
          <Flash mats={mats} s={0.95} />
        </group>
      ) : (
        <group position={[x + w / 2 + 0.34, y + 0.42, zBack - plate * 1.1]}>
          <Flash mats={mats} s={0.95} />
        </group>
      )}

      {/* mic dot */}
      <mesh
        position={[x + (layout === 'ultra' ? 0.72 : w / 2 + 0.3), y - 0.72, zBack - plate * 1.05]}
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
  const plate = 0.16;

  const geo = useMemo(
    () => ({
      lensRing: new THREE.CylinderGeometry(0.4, 0.4, 0.09, 48, 1, false),
      lensRingInner: new THREE.CylinderGeometry(0.32, 0.34, 0.045, 48, 1, false),
      lensRim: new THREE.CylinderGeometry(0.28, 0.3, 0.07, 48, 1, false),
      lensGlass: new THREE.SphereGeometry(0.34, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.5),
    }),
    []
  );

  const screenGeo = useMemo(
    () => splitScreenPlane(cover.w, cover.h, 0, 1),
    [cover.w, cover.h]
  );
  const bezelGeo = useMemo(
    () => frameGeometry(cover.w + model.geo.coverBand * 2, cover.h + model.geo.coverBand * 2, 0.42, model.geo.coverBand * 0.9, 0.03),
    [cover.w, cover.h, model.geo.coverBand]
  );

  const lensScale = model.id === 'flip-1' ? 0.85 : model.id === 'flip-3' ? 0.9 : 1;

  /* --- layouts ---------------------------------------------------- */
  /* local +y of the moving half runs from the hinge (0) to the free edge.
     The cameras sit next to the hinge; the cover display fills the rest.  */

  if (kind === 'pill') {
    // Z Flip: 1.1" pill to the right of a horizontal dual camera, near the hinge
    const y = half * 0.13;
    return (
      <group>
        <RB
          args={[3.0, 1.4, plate * 2]}
          radius={0.32}
          smoothness={5}
          position={[-width * 0.16, y, zOut - plate * 0.5]}
          material={mats.frame}
          castShadow
        />
        {[-0.66, 0.66].map((dx) => (
          <group key={dx} position={[-width * 0.16 + dx, y, zOut - plate * 1.1]}>
            <Lens geo={geo} mats={mats} r={lensScale} style="dark" />
          </group>
        ))}
        <Flash mats={mats} s={0.7} position={[-width * 0.16 + 1.42, y + 0.5, zOut - plate]} />
        <mesh
          geometry={screenGeo}
          material={mats.cover}
          position={[width * 0.18, y, zOut - 0.006]}
          rotation={[0, Math.PI, Math.PI]}
        />
        <mesh
          geometry={bezelGeo}
          material={mats.bezel}
          position={[width * 0.18, y, zOut - 0.003]}
          rotation={[0, Math.PI, Math.PI]}
        />
      </group>
    );
  }

  if (kind === 'strip') {
    // Z Flip3 / Flip4: black visor band — display left, dual cameras right
    const bandH = cover.h + 1.15;
    const bandY = half * 0.12;
    return (
      <group>
        <RB
          args={[width - 0.34, bandH, 0.1]}
          radius={0.32}
          smoothness={4}
          position={[0, bandY, zOut - 0.03]}
          material={mats.bezel}
        />
        <mesh
          geometry={screenGeo}
          material={mats.cover}
          position={[-width * 0.17, bandY, zOut - 0.085]}
          rotation={[0, Math.PI, Math.PI]}
        />
        {[0.42, -0.42].map((dy) => (
          <group key={dy} position={[width * 0.28, bandY + dy, zOut - 0.09]}>
            <Lens geo={geo} mats={mats} r={lensScale} style="dark" />
          </group>
        ))}
      </group>
    );
  }

  if (kind === 'folder') {
    // Z Flip5 / Flip6: folder-shaped Flex Window, vertical camera pair by the hinge
    const cy = half * 0.56;
    return (
      <group>
        <mesh
          geometry={screenGeo}
          material={mats.cover}
          position={[-width * 0.05, cy, zOut - 0.006]}
          rotation={[0, Math.PI, Math.PI]}
        />
        <mesh
          geometry={bezelGeo}
          material={mats.bezel}
          position={[-width * 0.05, cy, zOut - 0.003]}
          rotation={[0, Math.PI, Math.PI]}
        />
        {[0.34, -0.62].map((dy) => (
          <group key={dy} position={[width * 0.34, half * 0.13 + dy, zOut - plate * 0.9]}>
            <Lens geo={geo} mats={mats} r={lensScale} style="polish" />
          </group>
        ))}
        <Flash mats={mats} s={0.8} position={[width * 0.34, half * 0.13 + 1.05, zOut - plate * 0.7]} />
      </group>
    );
  }

  // full: Z Flip7 / Flip8 — edge-to-edge Flex Window, cameras inset near the hinge
  const cy = half * 0.53;
  return (
    <group>
      <mesh
        geometry={screenGeo}
        material={mats.cover}
        position={[0, cy, zOut - 0.006]}
        rotation={[0, Math.PI, Math.PI]}
      />
      <mesh
        geometry={bezelGeo}
        material={mats.bezel}
        position={[0, cy, zOut - 0.003]}
        rotation={[0, Math.PI, Math.PI]}
      />
      <RB
        args={[cover.w * 0.46, cover.h * 0.2, 0.04]}
        radius={0.22}
        smoothness={4}
        position={[-cover.w * 0.23, half * 0.11, zOut - 0.014]}
        material={mats.bezel}
      />
      {[-cover.w * 0.31, -cover.w * 0.15].map((x) => (
        <group key={x} position={[x, half * 0.11, zOut - 0.03]}>
          <Lens geo={geo} mats={mats} r={lensScale * 0.95} style="polish" />
        </group>
      ))}
      <Flash mats={mats} s={0.66} position={[-cover.w * 0.065, half * 0.11, zOut - 0.028]} />
    </group>
  );
}

/* rounded box with a radius that can never exceed the box's half-thickness */
export function RB({ args, radius = 0.1, smoothness = 4, ...rest }) {
  const [w, h, d] = args;
  const r = Math.max(0.005, Math.min(radius, Math.min(w, h, d) * 0.48));
  return <RoundedBox args={args} radius={r} smoothness={smoothness} {...rest} />;
}
