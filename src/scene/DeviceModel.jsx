import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RB } from './parts';
import { roundedRectShape, extrudeChamfered, splitScreenPlane, frameGeometry } from '../lib/shapes';
import {
  innerDisplayTexture,
  coverDisplayTexture,
  brushedRoughnessTexture,
  microRoughnessTexture,
  engraveTexture,
  concentricTexture,
} from '../lib/textures';
import { useShowcase } from '../store';
import { foldBus } from '../lib/foldBus';
import { CameraIsland, CoverCluster } from './parts';

/* ------------------------------------------------------------------ */
/*  materials                                                         */
/* ------------------------------------------------------------------ */

function useMaterials(model, colorwayId) {
  const brushed = useMemo(() => brushedRoughnessTexture(), []);
  const micro = useMemo(() => microRoughnessTexture(), []);
  const innerTex = useMemo(() => innerDisplayTexture(model), [model]);
  const coverTex = useMemo(() => coverDisplayTexture(model), [model]);
  const etchTex = useMemo(() => engraveTexture(model.en), [model]);
  const conc = useMemo(() => concentricTexture(), []);

  const set = useMemo(() => {
    const c = model.colors.find((x) => x.id === colorwayId) ?? model.colors[0];
    const fin = model.finish;
    const gloss = fin.gloss;
    const ringRough = fin.matte ? 0.34 : 0.2;
    return {
      frame: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(c.frame),
        metalness: 1,
        roughness: fin.matte ? 0.42 : 0.3 + (1 - gloss) * 0.1,
        roughnessMap: brushed,
        clearcoat: gloss * 0.6,
        clearcoatRoughness: 0.22,
        envMapIntensity: 1.05,
      }),
      back: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(c.back),
        metalness: fin.matte ? 0.28 : 0.55,
        roughness: fin.backRough,
        roughnessMap: micro,
        clearcoat: gloss * 0.95,
        clearcoatRoughness: 0.26,
        envMapIntensity: fin.matte ? 0.95 : 1.18,
      }),
      hinge: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(c.hinge),
        metalness: 1,
        roughness: fin.matte ? 0.36 : 0.19,
        roughnessMap: brushed,
        clearcoat: gloss * 0.7,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1.55,
      }),
      ringDark: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(c.ringDark),
        metalness: 1,
        roughness: 0.3,
        clearcoat: 0.6,
        clearcoatRoughness: 0.18,
        envMapIntensity: 1.2,
      }),
      ring: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(c.ring),
        metalness: 1,
        roughness: ringRough,
        clearcoat: 0.9,
        clearcoatRoughness: 0.09,
        envMapIntensity: 1.3,
      }),
      ringTextured: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(c.ringDark),
        metalness: 1,
        roughness: 0.34,
        roughnessMap: conc,
        clearcoat: 0.4,
        clearcoatRoughness: 0.2,
        envMapIntensity: 1.1,
      }),
      bezel: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#05060a'),
        metalness: 0.5,
        roughness: 0.34,
        clearcoat: 0.9,
        clearcoatRoughness: 0.1,
        envMapIntensity: 0.85,
      }),
      bezelFlat: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#04050a'),
        metalness: 0.02,
        roughness: 0.72,
        clearcoat: 0.08,
        clearcoatRoughness: 0.5,
        envMapIntensity: 0.22,
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
      inner: new THREE.MeshBasicMaterial({ map: innerTex, toneMapped: false }),
      cover: new THREE.MeshBasicMaterial({ map: coverTex, toneMapped: false }),
      flash: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#f7ecd6'),
        emissive: new THREE.Color('#ffe7bb'),
        emissiveIntensity: 0.9,
        roughness: 0.22,
        metalness: 0.15,
      }),
    };
  }, [model, colorwayId, brushed, micro, innerTex, coverTex, etchTex, conc]);

  useEffect(
    () => () => {
      Object.values(set).forEach((m) => m.dispose?.());
    },
    [set]
  );

  return set;
}

/* ------------------------------------------------------------------ */
/*  geometry                                                          */
/* ------------------------------------------------------------------ */

function useGeometry(model) {
  return useMemo(() => {
    const { form, dims, geo: g } = model;
    const T = dims.tOpen; // each half is as thick as the unfolded device
    const half = model.half;
    const across = model.across;
    const bev = Math.min(0.05, T * 0.16);
    const [rw, rh] = model.main.res;

    /* inner display rectangle (real aspect, fitted to the inner face) */
    const availU = form === 'book' ? 2 * (half - g.bezel) : across - 2 * g.bezel;
    const availV = form === 'book' ? across - 2 * g.bezel : 2 * (half - g.bezel);
    let dispW = availU;
    let dispH = (dispW * rh) / rw;
    if (dispH > availV) {
      dispH = availV;
      dispW = (dispH * rw) / rh;
    }

    /* body slabs */
    let fixedShape;
    let movingShape;
    if (form === 'book') {
      fixedShape = roundedRectShape(half, across, [g.rHinge, g.rOuter, g.rOuter, g.rHinge], half / 2, 0);
      movingShape = roundedRectShape(half, across, [g.rOuter, g.rHinge, g.rHinge, g.rOuter], -half / 2, 0);
    } else {
      fixedShape = roundedRectShape(across, half, [g.rHinge, g.rHinge, g.rOuter, g.rOuter], 0, -half / 2);
      movingShape = roundedRectShape(across, half, [g.rOuter, g.rOuter, g.rHinge, g.rHinge], 0, half / 2);
    }

    const inset = g.backInset ?? 0.24;
    const backShape = (s) => {
      if (form === 'book') {
        const w = half - inset;
        const h = across - inset;
        const radii =
          s > 0
            ? [g.rHinge * 0.7, g.rOuter * 0.7, g.rOuter * 0.7, g.rHinge * 0.7]
            : [g.rOuter * 0.7, g.rHinge * 0.7, g.rHinge * 0.7, g.rOuter * 0.7];
        return roundedRectShape(w, h, radii, (s * half) / 2, 0);
      }
      const w = across - inset;
      const h = half - inset;
      const radii =
        s > 0
          ? [g.rHinge * 0.7, g.rHinge * 0.7, g.rOuter * 0.7, g.rOuter * 0.7]
          : [g.rOuter * 0.7, g.rOuter * 0.7, g.rHinge * 0.7, g.rHinge * 0.7];
      return roundedRectShape(w, h, radii, 0, (s * half) / 2);
    };

    /* dark bezel plate hugging the inner display, split per half */
    const platePad = 0.17;
    const plateShape = (s) => {
      if (form === 'book') {
        const w = dispW / 2 + platePad;
        const h = dispH + platePad * 2;
        return roundedRectShape(w, h, 0.16, (s * dispW) / 4, 0);
      }
      const w = dispW + platePad * 2;
      const h = dispH / 2 + platePad;
      return roundedRectShape(w, h, 0.16, 0, (s * dispH) / 4);
    };

    /* screens */
    let fixedScreen;
    let movingScreen;
    if (form === 'book') {
      fixedScreen = splitScreenPlane(dispW / 2, dispH, 0.5, 1);
      movingScreen = splitScreenPlane(dispW / 2, dispH, 0, 0.5);
    } else {
      fixedScreen = splitScreenPlane(dispW, dispH / 2, 0, 1, 0, 0.5);
      movingScreen = splitScreenPlane(dispW, dispH / 2, 0, 1, 0.5, 1);
    }

    const coverW = Math.min(model.coverW, (form === 'book' ? half : across) - 0.5);
    const coverH = Math.min(model.coverH, (form === 'book' ? across : half) - 0.5);

    return {
      T,
      half,
      across,
      dispW,
      dispH,
      coverW,
      coverH,
      fixedBody: extrudeChamfered(fixedShape, T, bev, 20),
      movingBody: extrudeChamfered(movingShape, T, bev, 20),
      fixedBack: extrudeChamfered(backShape(form === 'book' ? 1 : -1), 0.03, 0.008, 20),
      movingBack: extrudeChamfered(backShape(form === 'book' ? -1 : 1), 0.03, 0.008, 20),
      fixedPlate: extrudeChamfered(plateShape(form === 'book' ? 1 : -1), 0.012, 0.004, 16),
      movingPlate: extrudeChamfered(plateShape(form === 'book' ? -1 : 1), 0.012, 0.004, 16),
      fixedScreen,
      movingScreen,
      coverScreen: splitScreenPlane(coverW, coverH, 0, 1),
      coverFrame: frameGeometry(
        coverW + model.geo.coverBand * 2,
        coverH + model.geo.coverBand * 2,
        0.36,
        model.geo.coverBand * 0.85,
        0.03
      ),
      engravePlate: new THREE.PlaneGeometry(Math.min(3.2, across * 0.28), 0.62),
      spindle: new THREE.CylinderGeometry(1, 1, 1, 64, 1, false),
      knuckle: new THREE.TorusGeometry(1, 0.13, 10, 48),
      speakerHole: new THREE.CylinderGeometry(0.024, 0.024, 0.09, 10),
      punch: new THREE.SphereGeometry(1, 24, 16),
    };
  }, [model]);
}

/* ------------------------------------------------------------------ */
/*  small parts                                                       */
/* ------------------------------------------------------------------ */

function Buttons({ mats, T, sideX, across, form }) {
  const x = sideX - 0.03;
  const len = Math.min(2.0, across * 0.14);
  const y0 = across * 0.22;
  return (
    <group>
      <RB
        args={[0.1, len, T * 0.55]}
        radius={0.04}
        smoothness={4}
        position={[x, y0, 0]}
        material={mats.ring}
        castShadow
      />
      <RB
        args={[0.1, len * 0.6, T * 0.55]}
        radius={0.038}
        smoothness={4}
        position={[x, y0 - len * 0.95, 0]}
        material={mats.ring}
        castShadow
      />
      <mesh position={[x, y0 - len * 1.85, 0]} material={mats.dark}>
        <boxGeometry args={[0.09, len * 0.34, T * 0.6]} />
      </mesh>
    </group>
  );
}

function BottomEdge({ mats, geos, T, x, y, width }) {
  const holes = useMemo(() => {
    const arr = [];
    const n = 8;
    for (let i = 0; i < n; i += 1) arr.push(x + 0.55 + i * 0.075);
    return arr;
  }, [x]);

  return (
    <group>
      {/* USB-C */}
      <RB
        args={[0.92, 0.09, T * 0.42]}
        radius={0.06}
        smoothness={3}
        position={[x, y + 0.005, 0]}
        material={mats.dark}
      />
      <RB
        args={[1.12, 0.045, T * 0.5]}
        radius={0.07}
        smoothness={3}
        position={[x, y + 0.028, 0]}
        material={mats.ring}
      />
      {/* speaker */}
      <mesh position={[x + 0.95, y + 0.01, 0]} material={mats.dark}>
        <boxGeometry args={[Math.min(1.4, width * 0.16), 0.02, T * 0.34]} />
      </mesh>
      {holes.map((hx, i) => (
        <mesh key={i} position={[hx, y + 0.02, 0]} material={mats.dark}>
          <boxGeometry args={[0.05, 0.02, T * 0.3]} />
        </mesh>
      ))}
      {/* mic */}
      <mesh position={[x - 0.72, y + 0.01, 0]} material={mats.dark}>
        <cylinderGeometry args={[0.028, 0.028, 0.06, 10]} />
      </mesh>
    </group>
  );
}

function Hinge({ mats, geos, T, length, form, detailRef, pivotZ }) {
  const r = pivotZ * 0.58;
  const zc = -pivotZ * 0.12;
  const rot = form === 'book' ? 0 : Math.PI / 2;
  const knuckles = useMemo(() => {
    const n = 5;
    const out = [];
    for (let i = 0; i < n; i += 1) out.push((-length / 2) * 0.78 + (i * length * 0.78) / (n - 1));
    return out;
  }, [length]);

  return (
    <group>
      <group rotation={[0, 0, rot]}>
        <mesh
          geometry={geos.spindle}
          material={mats.hinge}
          scale={[r, length * 0.9, r]}
          position={[0, 0, zc]}
          castShadow
          receiveShadow
        />
        <group ref={detailRef}>
          {knuckles.map((k, i) => (
            <mesh
              key={i}
              geometry={geos.knuckle}
              material={mats.ring}
              scale={[r * 1.06, r * 1.06, r * 1.06]}
              position={[0, k, zc]}
              rotation={[Math.PI / 2, 0, 0]}
            />
          ))}
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  device                                                            */
/* ------------------------------------------------------------------ */

export default function DeviceModel({ model }) {
  const geos = useGeometry(model);
  const colorway = useShowcase((s) => s.colorway);
  const mats = useMaterials(model, colorway);

  const rootRef = useRef();
  const movingRef = useRef();
  const detailRef = useRef();
  const cur = useRef(Math.PI);
  const autoPhase = useRef(Math.PI / 2);

  const { T, half, across, dispW, dispH } = geos;
  const form = model.form;
  const gap = Math.max(0.02, model.dims.tFold - 2 * model.dims.tOpen);
  const pivotZ = T / 2 + gap / 2;
  const wedge = model.dims.wedge;

  /* facing helpers */
  const S = 1; // fixed half positive side
  const fixedCx = form === 'book' ? dispW / 4 : 0;
  const fixedCy = form === 'book' ? 0 : -dispH / 4;
  const movingCx = form === 'book' ? -dispW / 4 : 0;
  const movingCy = form === 'book' ? 0 : dispH / 4;
  const screenZ = T / 2 + 0.018;
  const plateZ = T / 2 + 0.002;

  useFrame((_, dt) => {
    const s = useShowcase.getState();
    const d = Math.min(dt, 0.12);

    let targetDeg = s.foldTarget;
    if (s.auto) {
      autoPhase.current += (d * Math.PI * 2) / 11;
      const t = (Math.sin(autoPhase.current) + 1) / 2;
      targetDeg = 8 + t * 172;
    }
    const target = THREE.MathUtils.degToRad(targetDeg);
    if (typeof window !== 'undefined' && window.__snap) cur.current = target;
    else cur.current = THREE.MathUtils.damp(cur.current, target, s.auto ? 3.2 : 6.5, d);

    const open = Math.PI - cur.current;
    const a = open * (1 - THREE.MathUtils.degToRad(wedge) / Math.PI);
    foldBus.deg = THREE.MathUtils.radToDeg(cur.current);

    if (movingRef.current) {
      if (form === 'book') movingRef.current.rotation.y = a;
      else movingRef.current.rotation.x = a;
    }
    if (detailRef.current) detailRef.current.rotation.y = a * 0.5;
    if (rootRef.current) {
      const span = form === 'book' ? half : across;
      const k = (1 - Math.cos(a)) / 2;
      if (form === 'book') rootRef.current.position.x = -(span / 2) * k;
      else rootRef.current.position.y = (span / 4) * k;
    }

    const on = s.screensOn ? 1 : 0.035;
    const k2 = THREE.MathUtils.damp(mats.inner.color.r || 1, on, 9, d);
    mats.inner.color.setScalar(k2);
    mats.cover.color.setScalar(k2);
  });

  const hingeLength = across * 0.9;

  return (
    <group ref={rootRef}>
      {/* ---------------- fixed half ---------------- */}
      <group userData={{ dbg: 'fixed' }}>
        <mesh geometry={geos.fixedBody} material={mats.frame} castShadow receiveShadow userData={{ dbg: 'fixedBody' }} />
        <mesh geometry={geos.fixedBack} material={mats.back} position={[0, 0, -T / 2 + 0.012]} />
        <mesh geometry={geos.fixedPlate} material={mats.bezelFlat} position={[0, 0, plateZ]} />
        <mesh
          geometry={geos.fixedScreen}
          material={mats.inner}
          position={[fixedCx, fixedCy, screenZ]}
        />
        {form === 'book' ? (
          <>
            <CameraIsland model={model} mats={mats} zBack={-T / 2} T={T} />
            <Buttons mats={mats} T={T} sideX={half} across={across} form={form} />
            <BottomEdge mats={mats} geos={geos} T={T} x={half / 2} y={-across / 2 + 0.02} width={half} />
            <mesh
              geometry={geos.engravePlate}
              material={mats.etch}
              position={[half / 2, -across / 2 + 1.5, -T / 2 - 0.03]}
              rotation={[0, Math.PI, 0]}
              renderOrder={2}
            />
          </>
        ) : (
          <>
            <Buttons mats={mats} T={T} sideX={across / 2} across={across} form={form} />
            <BottomEdge mats={mats} geos={geos} T={T} x={0} y={-across / 2 + 0.02} width={across} />
            <mesh
              geometry={geos.engravePlate}
              material={mats.etch}
              position={[0, -across / 2 + 1.3, -T / 2 - 0.03]}
              rotation={[0, Math.PI, 0]}
              renderOrder={2}
            />
          </>
        )}
      </group>

      {/* ---------------- moving half ---------------- */}
      <group ref={movingRef} position={[0, 0, pivotZ]} userData={{ dbg: 'moving' }}>
        <group position={[0, 0, -pivotZ]}>
          <mesh geometry={geos.movingBody} material={mats.frame} castShadow receiveShadow userData={{ dbg: 'movingBody' }} />
          <mesh geometry={geos.movingBack} material={mats.back} position={[0, 0, -T / 2 + 0.012]} />
          <mesh geometry={geos.movingPlate} material={mats.bezelFlat} position={[0, 0, plateZ]} />
          <mesh
            geometry={geos.movingScreen}
            material={mats.inner}
            position={[movingCx, movingCy, screenZ]}
          />

          {/* cover display on the outer face */}
          {form === 'book' ? (
            <>
              <mesh
                geometry={geos.coverScreen}
                material={mats.cover}
                position={[-half / 2, 0, -T / 2 - 0.012]}
                rotation={[0, Math.PI, 0]}
              />
              <mesh
                geometry={geos.coverFrame}
                material={mats.bezel}
                position={[-half / 2, 0, -T / 2 - 0.006]}
                rotation={[0, Math.PI, 0]}
              />
            </>
          ) : (
            <CoverCluster model={model} mats={mats} half={half} width={across} T={T} coverW={geos.coverW} coverH={geos.coverH} />
          )}

          {/* inner selfie camera */}
          {model.innerCam === 'punch' && form === 'book' && (
            <mesh
              material={mats.bezel}
              position={[dispW * 0.36, dispH / 2 - 0.42, screenZ + 0.03]}
            >
              <sphereGeometry args={[0.07, 18, 12]} />
            </mesh>
          )}
          {model.innerCam === 'punch' && form === 'flip' && (
            <mesh
              material={mats.bezel}
              position={[dispW * 0.22, dispH / 2 - 0.42, screenZ + 0.03]}
            >
              <sphereGeometry args={[0.07, 18, 12]} />
            </mesh>
          )}
          {model.innerCam === 'udc' && (
            <mesh
              material={mats.bezel}
              position={[form === 'book' ? dispW * 0.36 : dispW * 0.22, dispH / 2 - 0.42, screenZ + 0.006]}
            >
              <circleGeometry args={[0.055, 20]} />
            </mesh>
          )}
          {model.innerCam === 'notch' && (
            <RB
              args={[2.55, 0.74, 0.05]}
              radius={0.3}
              smoothness={5}
              position={[dispW * 0.16, dispH / 2 - 0.3, screenZ + 0.01]}
              material={mats.bezelFlat}
            />
          )}
        </group>
      </group>

      {/* ---------------- hinge ---------------- */}
      <Hinge
        mats={mats}
        geos={geos}
        T={T}
        length={hingeLength}
        form={form}
        detailRef={detailRef}
        pivotZ={pivotZ}
      />
    </group>
  );
}
