import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { DIM, COLORWAYS } from '../lib/dims';
import { roundedRectShape, extrudeChamfered, frameGeometry, splitScreenPlane } from '../lib/shapes';
import {
  innerDisplayTexture,
  coverDisplayTexture,
  brushedRoughnessTexture,
  microRoughnessTexture,
  engraveTexture,
} from '../lib/textures';
import { useShowcase } from '../store';
import { foldBus } from '../lib/foldBus';

const HALF = DIM.halfW;
const H = DIM.height;
const T = DIM.thickness;
const R_OUT = DIM.outerR;
const R_IN = DIM.hingeR;
const SCREEN_Z = DIM.inner.z;
const SCREEN_HW = DIM.inner.w / 2; // half of the inner display width
const SCREEN_HH = DIM.inner.h / 2;

/* ------------------------------------------------------------------ */
/*  geometry                                                          */
/* ------------------------------------------------------------------ */

function useGeometry() {
  return useMemo(() => {
    const rightShape = roundedRectShape(HALF, H, [R_IN, R_OUT, R_OUT, R_IN], HALF / 2, 0);
    const leftShape = roundedRectShape(HALF, H, [R_OUT, R_IN, R_IN, R_OUT], -HALF / 2, 0);

    const backShape = (side) => {
      const w = HALF - 0.32;
      const h = H - 0.32;
      const radii =
        side > 0
          ? [R_IN * 0.7, R_OUT * 0.72, R_OUT * 0.72, R_IN * 0.7]
          : [R_OUT * 0.72, R_IN * 0.7, R_IN * 0.7, R_OUT * 0.72];
      return roundedRectShape(w, h, radii, (side * HALF) / 2, 0);
    };

    return {
      rightBody: extrudeChamfered(rightShape, T, DIM.bevel, 18),
      leftBody: extrudeChamfered(leftShape, T, DIM.bevel, 18),
      rightBack: extrudeChamfered(backShape(1), 0.028, 0.008, 18),
      leftBack: extrudeChamfered(backShape(-1), 0.028, 0.008, 18),
      rightScreen: splitScreenPlane(SCREEN_HW, DIM.inner.h, 0.5, 1),
      leftScreen: splitScreenPlane(SCREEN_HW, DIM.inner.h, 0, 0.5),
      coverScreen: splitScreenPlane(DIM.cover.w, DIM.cover.h, 0, 1),
      coverFrame: frameGeometry(DIM.cover.w + 0.34, DIM.cover.h + 0.34, 0.42, 0.17, 0.035),
      engravePlate: new THREE.PlaneGeometry(2.9, 0.72),
      lensRing: new THREE.CylinderGeometry(0.5, 0.5, 0.11, 56, 1, false),
      lensRim: new THREE.CylinderGeometry(0.44, 0.46, 0.08, 56, 1, false),
      lensGlass: new THREE.SphereGeometry(0.42, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5),
      knuckle: new THREE.TorusGeometry(0.184, 0.026, 12, 56),
      groove: new THREE.TorusGeometry(0.19, 0.005, 8, 56),
      spineBarrel: new THREE.CylinderGeometry(0.212, 0.212, H * 0.862, 64, 1, false),
      spineTaper: new THREE.CylinderGeometry(0.16, 0.212, 0.34, 48, 1, false),
      speakerHole: new THREE.CylinderGeometry(0.026, 0.026, 0.09, 10),
    };
  }, []);
}

/* ------------------------------------------------------------------ */
/*  materials                                                         */
/* ------------------------------------------------------------------ */

function useMaterials(colorway) {
  const brushed = useMemo(() => brushedRoughnessTexture(), []);
  const micro = useMemo(() => microRoughnessTexture(), []);
  const innerTex = useMemo(() => innerDisplayTexture(), []);
  const coverTex = useMemo(() => coverDisplayTexture(), []);
  const etchTex = useMemo(() => engraveTexture('GALAXY Z FOLD 8'), []);

  const set = useMemo(() => {
    const c = COLORWAYS[colorway] ?? COLORWAYS.titanium;
    return {
      frame: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(c.frame),
        metalness: 1,
        roughness: c.frameRough,
        roughnessMap: brushed,
        clearcoat: 0.5,
        clearcoatRoughness: 0.24,
        envMapIntensity: 1.75,
      }),
      back: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(c.back),
        metalness: 0.55,
        roughness: 0.36,
        roughnessMap: micro,
        clearcoat: 0.9,
        clearcoatRoughness: 0.28,
        envMapIntensity: 1.15,
      }),
      hinge: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(c.hinge),
        metalness: 1,
        roughness: 0.19,
        roughnessMap: brushed,
        clearcoat: 0.7,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1.55,
      }),
      ring: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(c.ring),
        metalness: 1,
        roughness: 0.2,
        clearcoat: 0.9,
        clearcoatRoughness: 0.09,
        envMapIntensity: 1.3,
      }),
      bezel: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#05060a'),
        metalness: 0.6,
        roughness: 0.24,
        clearcoat: 1,
        clearcoatRoughness: 0.07,
        envMapIntensity: 1.2,
      }),
      dark: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#090a0e'),
        metalness: 0.4,
        roughness: 0.52,
      }),
      etch: new THREE.MeshStandardMaterial({
        map: etchTex,
        transparent: true,
        metalness: 1,
        roughness: 0.45,
        envMapIntensity: 1.2,
        depthWrite: false,
      }),
      lens: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#04060b'),
        metalness: 0.25,
        roughness: 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        ior: 1.9,
        envMapIntensity: 2.3,
        emissive: new THREE.Color('#0b2148'),
        emissiveIntensity: 0.4,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#ffffff'),
        metalness: 0,
        roughness: 0.025,
        transparent: true,
        opacity: 0.03,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        envMapIntensity: 0.55,
        depthWrite: false,
      }),
      inner: new THREE.MeshBasicMaterial({
        map: innerTex,
        toneMapped: true,
      }),
      cover: new THREE.MeshBasicMaterial({
        map: coverTex,
        toneMapped: true,
      }),
      flash: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#f7ecd6'),
        emissive: new THREE.Color('#ffe7bb'),
        emissiveIntensity: 0.9,
        roughness: 0.22,
        metalness: 0.15,
      }),
    };
  }, [colorway, brushed, micro, innerTex, coverTex, etchTex]);

  useEffect(
    () => () => {
      Object.values(set).forEach((m) => m.dispose?.());
    },
    [set]
  );

  return set;
}

/* ------------------------------------------------------------------ */
/*  pieces                                                            */
/* ------------------------------------------------------------------ */

function BezelLip({ side, mats }) {
  const bar = 0.14;
  const z = SCREEN_Z - 0.004;
  return (
    <group>
      {[1, -1].map((sy) => (
        <RoundedBox
          key={`h${sy}`}
          args={[SCREEN_HW + bar, bar, 0.05]}
          radius={0.04}
          smoothness={3}
          position={[(side * (SCREEN_HW + bar)) / 2, sy * (SCREEN_HH + bar / 2), z]}
          material={mats.bezel}
        />
      ))}
      <RoundedBox
        args={[bar, DIM.inner.h, 0.05]}
        radius={0.04}
        smoothness={3}
        position={[side * (SCREEN_HW + bar / 2), 0, z]}
        material={mats.bezel}
      />
    </group>
  );
}

function ScreenGlass({ geo, side, mats }) {
  return (
    <mesh
      geometry={geo}
      material={mats.glass}
      position={[(side * SCREEN_HW) / 2, 0, SCREEN_Z + 0.014]}
      renderOrder={4}
    />
  );
}

function Buttons({ mats }) {
  const x = HALF - 0.04;
  return (
    <group>
      <RoundedBox
        args={[0.115, 2.1, 0.3]}
        radius={0.05}
        smoothness={4}
        position={[x, 3.9, -0.01]}
        material={mats.ring}
        castShadow
      />
      <RoundedBox
        args={[0.115, 1.25, 0.29]}
        radius={0.048}
        smoothness={4}
        position={[x, 1.35, -0.01]}
        material={mats.ring}
        castShadow
      />
      {[6.7, -6.7].map((y) => (
        <mesh key={y} position={[HALF - 0.13, y, 0]} material={mats.dark}>
          <boxGeometry args={[0.1, 0.52, T * 0.97]} />
        </mesh>
      ))}
    </group>
  );
}

function BottomEdge({ mats, geos }) {
  const y = -H / 2 + 0.04;
  const holes = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 9; i += 1) arr.push(-6.4 + i * 0.19);
    return arr;
  }, []);
  const ref = useRef();

  useEffect(() => {
    if (!ref.current) return;
    const m = new THREE.Matrix4();
    holes.forEach((x, i) => {
      m.makeTranslation(x, y, 0);
      ref.current.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [holes, y]);

  return (
    <group>
      <RoundedBox
        args={[0.98, 0.1, 0.22]}
        radius={0.06}
        smoothness={3}
        position={[3.5, y - 0.02, 0]}
        material={mats.dark}
      />
      <RoundedBox
        args={[1.16, 0.05, 0.27]}
        radius={0.08}
        smoothness={3}
        position={[3.5, y + 0.01, 0]}
        material={mats.ring}
      />
      <instancedMesh ref={ref} args={[geos.speakerHole, mats.dark, holes.length]} />
      <mesh position={[5.7, y + 0.006, 0]} material={mats.dark}>
        <boxGeometry args={[1.45, 0.02, 0.16]} />
      </mesh>
      <mesh position={[-3.5, y, 0]} material={mats.dark}>
        <cylinderGeometry args={[0.032, 0.032, 0.06, 10]} />
      </mesh>
    </group>
  );
}

function CameraIsland({ mats, geos }) {
  const { x, y, w, h, plate } = DIM.camera;
  const zBack = -T / 2;
  const lenses = [y + 1.16, y, y - 1.16];
  return (
    <group position={[0, 0, 0]}>
      <RoundedBox
        args={[w, h, plate * 2]}
        radius={0.3}
        smoothness={5}
        position={[x, y, zBack - plate * 0.6]}
        material={mats.frame}
        castShadow
      />
      {lenses.map((ly, i) => (
        <group key={i} position={[x, ly, zBack - plate * 1.2]}>
          <mesh geometry={geos.lensRing} material={mats.ring} rotation={[Math.PI / 2, 0, 0]} castShadow />
          <mesh
            geometry={geos.lensRim}
            material={mats.dark}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, 0, 0.035]}
          />
          <mesh
            geometry={geos.lensGlass}
            material={mats.lens}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[1, 0.4, 1]}
            position={[0, 0, 0.06]}
          />
        </group>
      ))}
      <group position={[x + 1.02, y + 0.55, zBack - plate * 1.2]}>
        <mesh material={mats.ring}>
          <cylinderGeometry args={[0.185, 0.185, 0.09, 32]} />
        </mesh>
        <mesh material={mats.flash} position={[0, 0, 0.055]}>
          <cylinderGeometry args={[0.125, 0.125, 0.03, 32]} />
        </mesh>
      </group>
      <mesh position={[x + 1.02, y - 0.62, zBack - plate * 1.05]} material={mats.dark}>
        <cylinderGeometry args={[0.07, 0.07, 0.05, 24]} />
      </mesh>
    </group>
  );
}

function HingeSpine({ mats, geos, detailRef }) {
  return (
    <group>
      <mesh geometry={geos.spineBarrel} material={mats.hinge} castShadow receiveShadow />
      {[1, -1].map((s) => (
        <mesh
          key={s}
          geometry={geos.spineTaper}
          material={mats.hinge}
          position={[0, (s * (H * 0.862)) / 2 + s * 0.17, 0]}
        />
      ))}
      <group ref={detailRef}>
        {[-6.4, -3.2, 0, 3.2, 6.4].map((y) => (
          <mesh
            key={`k${y}`}
            geometry={geos.knuckle}
            material={mats.ring}
            position={[0, y, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        ))}
        {[-7.9, -4.8, -1.6, 1.6, 4.8, 7.9].map((y) => (
          <mesh
            key={`g${y}`}
            geometry={geos.groove}
            material={mats.dark}
            position={[0, y, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        ))}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  model                                                             */
/* ------------------------------------------------------------------ */

export default function Fold8Model() {
  const geos = useGeometry();
  const colorway = useShowcase((s) => s.colorway);
  const mats = useMaterials(colorway);

  const rootRef = useRef();
  const leftRef = useRef();
  const spineDetailRef = useRef();
  const cur = useRef(Math.PI);
  const autoPhase = useRef(Math.PI / 2);

  useFrame((_, dt) => {
    const s = useShowcase.getState();
    const d = Math.min(dt, 0.05);

    let targetDeg = s.foldTarget;
    if (s.auto) {
      autoPhase.current += (d * Math.PI * 2) / 11; // ~11 s per cycle
      const t = (Math.sin(autoPhase.current) + 1) / 2;
      targetDeg = 8 + t * 172;
    }
    const target = THREE.MathUtils.degToRad(targetDeg);
    cur.current = THREE.MathUtils.damp(cur.current, target, s.auto ? 3.2 : 6.5, d);

    const a = Math.PI - cur.current; // 0 = flat, PI = closed
    foldBus.deg = THREE.MathUtils.radToDeg(cur.current);
    if (leftRef.current) leftRef.current.rotation.y = a;
    if (spineDetailRef.current) spineDetailRef.current.rotation.y = a * 0.5;
    if (rootRef.current) rootRef.current.position.x = -(HALF / 2) * (1 - Math.cos(a));

    const on = s.screensOn ? 1 : 0.04;
    const k = THREE.MathUtils.damp(mats.inner.color.r || 1, on, 9, d);
    mats.inner.color.setScalar(k);
    mats.cover.color.setScalar(k);
  });

  return (
    <group ref={rootRef}>
      {/* ---------- right half (fixed) ---------- */}
      <group>
        <mesh geometry={geos.rightBody} material={mats.frame} castShadow receiveShadow />
        <mesh geometry={geos.rightBack} material={mats.back} position={[0, 0, -T / 2 + 0.01]} />
        <mesh geometry={geos.rightScreen} material={mats.inner} position={[SCREEN_HW / 2, 0, SCREEN_Z]} />
        <ScreenGlass geo={geos.rightScreen} side={1} mats={mats} />
        <BezelLip side={1} mats={mats} />
        <CameraIsland mats={mats} geos={geos} />
        <Buttons mats={mats} />
        <BottomEdge mats={mats} geos={geos} />
        {/* engraved wordmark on the lower back */}
        <mesh
          geometry={geos.engravePlate}
          material={mats.etch}
          position={[3.4, -8.1, -T / 2 - 0.028]}
          rotation={[0, Math.PI, 0]}
          renderOrder={2}
        />
      </group>

      {/* ---------- left half (pivots on the hinge axis) ---------- */}
      <group ref={leftRef} position={[0, 0, DIM.pivotZ]}>
        <group position={[0, 0, -DIM.pivotZ]}>
          <mesh geometry={geos.leftBody} material={mats.frame} castShadow receiveShadow />
          <mesh geometry={geos.leftBack} material={mats.back} position={[0, 0, -T / 2 + 0.01]} />
          <mesh geometry={geos.leftScreen} material={mats.inner} position={[-SCREEN_HW / 2, 0, SCREEN_Z]} />
          <ScreenGlass geo={geos.leftScreen} side={-1} mats={mats} />
          <BezelLip side={-1} mats={mats} />
          {/* cover display, on the outer face */}
          <mesh
            geometry={geos.coverScreen}
            material={mats.cover}
            position={[-HALF / 2, 0, -T / 2 - 0.007]}
            rotation={[0, Math.PI, 0]}
          />
          <mesh
            geometry={geos.coverFrame}
            material={mats.bezel}
            position={[-HALF / 2, 0, -T / 2 - 0.004]}
            rotation={[0, Math.PI, 0]}
          />
        </group>
      </group>

      {/* ---------- hinge spine ---------- */}
      <HingeSpine mats={mats} geos={geos} detailRef={spineDetailRef} />
    </group>
  );
}
