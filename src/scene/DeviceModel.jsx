import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RB } from './parts';
import {
  roundedRectOutline,
  chamferSlab,
  roundedFace,
  spineGeometry,
  spineCaps,
} from '../lib/shapes';
import {
  innerDisplayTexture,
  coverDisplayTexture,
  brushedRoughnessTexture,
  microRoughnessTexture,
  wordmarkTexture,
  concentricTexture,
} from '../lib/textures';
import { useShowcase } from '../store';
import { foldBus } from '../lib/foldBus';
import { SEG } from '../lib/perf';
import { CameraIsland, CoverCluster } from './parts';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ------------------------------------------------------------------ */
/*  materials                                                         */
/* ------------------------------------------------------------------ */

function useMaterials(model, colorwayId) {
  const brushed = useMemo(() => brushedRoughnessTexture(), []);
  const micro = useMemo(() => microRoughnessTexture(), []);
  const innerTex = useMemo(() => innerDisplayTexture(model), [model]);
  const coverTex = useMemo(() => coverDisplayTexture(model), [model]);
  const word = useMemo(() => wordmarkTexture('SAMSUNG'), []);
  const conc = useMemo(() => concentricTexture(), []);

  const set = useMemo(() => {
    const c = model.colors.find((x) => x.id === colorwayId) ?? model.colors[0];
    const fin = model.finish;
    const gloss = fin.gloss;
    const ringRough = fin.matte ? 0.34 : 0.2;
    return {
      /* the side rail: Armor Aluminum — flat with a crisp chamfer highlight */
      frame: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(c.frame),
        metalness: 1,
        roughness: fin.matte ? 0.38 : 0.24 + (1 - gloss) * 0.08,
        roughnessMap: brushed,
        clearcoat: gloss * 0.5,
        clearcoatRoughness: 0.24,
        envMapIntensity: 1.15,
      }),
      back: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(c.back),
        metalness: fin.matte ? 0.24 : 0.5,
        roughness: fin.backRough,
        roughnessMap: micro,
        clearcoat: gloss * 0.95,
        clearcoatRoughness: 0.26,
        envMapIntensity: fin.matte ? 0.9 : 1.12,
      }),
      hinge: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(c.hinge).multiplyScalar(0.62),
        metalness: 0.92,
        roughness: fin.matte ? 0.5 : 0.42,
        roughnessMap: brushed,
        clearcoat: gloss * 0.2,
        clearcoatRoughness: 0.18,
        envMapIntensity: 0.6,
      }),
      ringDark: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(c.ringDark),
        metalness: 1,
        roughness: 0.34,
        clearcoat: 0.4,
        clearcoatRoughness: 0.2,
        envMapIntensity: 1.0,
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
        roughness: 0.3,
        roughnessMap: conc,
        clearcoat: 0.4,
        clearcoatRoughness: 0.2,
        envMapIntensity: 1.05,
      }),
      /* display surround: glossy black glass under the panel */
      frontGlass: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#03040a'),
        metalness: 0.08,
        roughness: 0.14,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 0.7,
      }),
      bezel: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#05060a'),
        metalness: 0.45,
        roughness: 0.34,
        clearcoat: 0.9,
        clearcoatRoughness: 0.1,
        envMapIntensity: 0.8,
      }),
      bezelFlat: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#04050a'),
        metalness: 0.02,
        roughness: 0.7,
        clearcoat: 0.08,
        clearcoatRoughness: 0.5,
        envMapIntensity: 0.22,
      }),
      /* antenna band / port plastic */
      dark: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#0b0c11'),
        metalness: 0.35,
        roughness: 0.55,
        envMapIntensity: 0.6,
      }),
      word: new THREE.MeshStandardMaterial({
        map: word,
        transparent: true,
        metalness: 1,
        roughness: 0.42,
        envMapIntensity: 1.15,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
      lens: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#03060e'),
        metalness: 0.0,
        roughness: 0.34,
        clearcoat: 0.12,
        clearcoatRoughness: 0.14,
        ior: 1.5,
        specularIntensity: 0.25,
        envMapIntensity: 0.3,
        emissive: new THREE.Color('#060d1c'),
        emissiveIntensity: 0.3,
      }),
      lensInner: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#0a1226'),
        metalness: 0.6,
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        envMapIntensity: 1.1,
      }),
      inner: new THREE.MeshBasicMaterial({ map: innerTex, toneMapped: false }),
      cover: new THREE.MeshBasicMaterial({ map: coverTex, toneMapped: false }),
      flash: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#f7ecd6'),
        emissive: new THREE.Color('#ffe7bb'),
        emissiveIntensity: 0.85,
        roughness: 0.22,
        metalness: 0.15,
      }),
    };
  }, [model, colorwayId, brushed, micro, innerTex, coverTex, word, conc]);

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
  const built = useMemo(() => {
    const { form, dims, geo: g } = model;
    const T = dims.tOpen; // each half is as thick as the unfolded device
    const half = model.half;
    const across = model.across;
    const book = form === 'book';
    const gap = Math.max(0.02, dims.tFold - 2 * T);
    const pivotZ = T / 2 + gap / 2;
    const rOut = g.rOuter;
    const rSeam = Math.min(0.075, T * 0.14);
    const bevel = Math.min(0.05, T * 0.11);
    const lip = Math.min(0.115, Math.max(0.07, T * 0.2)); // metal frame visible from the front
    const [rw, rh] = model.main.res;

    /* inner display rectangle (real aspect, fitted to the inner face) */
    const availU = book ? 2 * (half - g.bezel) : across - 2 * g.bezel;
    const availV = book ? across - 2 * g.bezel : 2 * (half - g.bezel);
    let dispW = availU;
    let dispH = (dispW * rh) / rw;
    if (dispH > availV) {
      dispH = availV;
      dispW = (dispH * rw) / rh;
    }

    const c = bevel;
    const curveOpts = { curveSegs: SEG.curve, step: SEG.tier === 'low' ? 2.2 : 1.35 };

    /* ---- body outline per half ------------------------------------ */
    const bodyRadii = book
      ? {
          fixed: [rSeam, rOut, rOut, rSeam],
          moving: [rOut, rSeam, rSeam, rOut],
        }
      : {
          fixed: [rOut, rOut, rSeam, rSeam],
          moving: [rSeam, rSeam, rOut, rOut],
        };
    const mkOutline = (side) => {
      const w = book ? half : across;
      const h = book ? across : half;
      const cx = book ? (side > 0 ? half / 2 : -half / 2) : 0;
      const cy = book ? 0 : side > 0 ? half / 2 : -half / 2;
      return roundedRectOutline(w, h, side > 0 ? bodyRadii.fixed : bodyRadii.moving, cx, cy, curveOpts);
    };
    const fixedOutline = mkOutline(1);
    const movingOutline = mkOutline(-1);

    /* ---- inset faces (front glass, back glass) --------------------- */
    /* insetBox(side, outerInset, seamInset) -> rounded face outline */
    const faceOutline = (side, outerInset, seamInset) => {
      const outer = outerInset;
      const seam = seamInset;
      if (book) {
        const x0 = side > 0 ? seam : -half + outer;
        const x1 = side > 0 ? half - outer : -seam;
        const w = x1 - x0;
        const cx = (x0 + x1) / 2;
        const h = across - outer * 2;
        const radii =
          side > 0
            ? [Math.max(0.01, rSeam - seam), Math.max(0.02, rOut - outer), Math.max(0.02, rOut - outer), Math.max(0.01, rSeam - seam)]
            : [Math.max(0.02, rOut - outer), Math.max(0.01, rSeam - seam), Math.max(0.01, rSeam - seam), Math.max(0.02, rOut - outer)];
        return roundedRectOutline(w, h, radii, cx, 0, curveOpts);
      }
      const y0 = side > 0 ? seam : -half + outer;
      const y1 = side > 0 ? half - outer : -seam;
      const h = y1 - y0;
      const cy = (y0 + y1) / 2;
      const w = across - outer * 2;
      const radii =
        side > 0
          ? [Math.max(0.02, rOut - outer), Math.max(0.02, rOut - outer), Math.max(0.01, rSeam - seam), Math.max(0.01, rSeam - seam)]
          : [Math.max(0.01, rSeam - seam), Math.max(0.01, rSeam - seam), Math.max(0.02, rOut - outer), Math.max(0.02, rOut - outer)];
      return roundedRectOutline(w, h, radii, 0, cy, curveOpts);
    };

    /* ---- display rectangle split per half -------------------------- */
    const screenOutline = (side) => {
      const seamPad = 0.012;
      if (book) {
        const x0 = side > 0 ? seamPad : -dispW / 2;
        const x1 = side > 0 ? dispW / 2 : -seamPad;
        const rd = Math.max(0.045, rOut - g.bezel * 0.35);
        const radii =
          side > 0 ? [0.02, rd, rd, 0.02] : [rd, 0.02, 0.02, rd];
        return roundedRectOutline(x1 - x0, dispH, radii, (x0 + x1) / 2, 0, curveOpts);
      }
      const y0 = side > 0 ? seamPad : -dispH / 2;
      const y1 = side > 0 ? dispH / 2 : -seamPad;
      const rd = Math.max(0.045, rOut - g.bezel * 0.35);
      const radii = side > 0 ? [rd, rd, 0.02, 0.02] : [0.02, 0.02, rd, rd];
      return roundedRectOutline(dispW, y1 - y0, radii, 0, (y0 + y1) / 2, curveOpts);
    };

    const coverW = Math.min(model.coverW, (book ? half : across) - 0.62);
    const coverH = Math.min(model.coverH, (book ? across : half) * 0.8);
    const rCover = Math.max(0.08, rOut * 0.78);

    /* ---- hinge spine ---------------------------------------------- */
    const hinge = model.hinge ?? { protrude: 0.03, ribs: 0 };
    const protrude = hinge.protrude;
    const R = T + gap / 2 + protrude;
    const stripHalf = Math.sqrt(Math.max(0.0004, 2 * R * protrude));
    const hingeLength = across * 0.945;
    /* half the fold angle at which the spine starts to wrap the fold edge */
    const spanFlat = Math.acos(clamp(1 - protrude / R, -1, 1)) + 0.06;
    const LADDER = SEG.tier === 'low' ? 9 : 14;
    const spine = [];
    const caps = [];
    const segU = Math.max(12, Math.round(SEG.barrel * 0.8));
    for (let i = 0; i < LADDER; i += 1) {
      const t = i / (LADDER - 1);
      /* the spine frame turns with half the fold; its ends always reach the two
         back faces and finish a little inside the halves */
      const halfSpan = Math.max(spanFlat, (t * Math.PI) / 2 + 0.17);
      spine.push(
        spineGeometry(R, halfSpan, hingeLength, segU, {
          ribs: hinge.ribs ?? 0,
          ribDepth: Math.min(0.03, protrude * 0.9),
          ribWidth: 0.055,
          vSegs: SEG.tier === 'low' ? 6 : 10,
          caps: false,
        })
      );
      caps.push(spineCaps(R * 0.998, halfSpan, hingeLength, segU));
    }
    const wordLength = Math.min(2.55, across * 0.32);
    const wordWidth = wordLength / 8;

    return {
      T,
      half,
      across,
      gap,
      pivotZ,
      dispW,
      dispH,
      coverW,
      coverH,
      rCover,
      lip,
      bevel,
      stripHalf,
      R,
      fixed: {
        body: chamferSlab(fixedOutline, T, c),
        front: roundedFace(faceOutline(1, lip, lip * 0.6), 0, 1, 0, 1),
        back: chamferSlab(faceOutline(1, 0.1, stripHalf + 0.16), 0.036, 0.012),
        screen: roundedFace(screenOutline(1), book ? 0.5 : 0, book ? 1 : 1, book ? 0 : 0.5, book ? 1 : 1),
      },
      moving: {
        body: chamferSlab(movingOutline, T, c),
        front: roundedFace(faceOutline(-1, lip, lip * 0.6), 0, 1, 0, 1),
        back: chamferSlab(faceOutline(-1, 0.1, stripHalf + 0.16), 0.036, 0.012),
        screen: roundedFace(screenOutline(-1), book ? 0 : 0, book ? 0.5 : 1, book ? 0 : 0, book ? 1 : 0.5),
      },
      coverScreen: roundedFace(
        roundedRectOutline(coverW, coverH, Math.max(0.05, rCover - 0.08), 0, 0, curveOpts),
        0,
        1,
        0,
        1
      ),
      coverSurround: roundedFace(
        roundedRectOutline(
          coverW + 0.36,
          coverH + 0.36,
          Math.max(0.06, rCover - 0.02),
          0,
          0,
          curveOpts
        ),
        0,
        1,
        0,
        1
      ),
      spine,
      caps,
      word: spineGeometry(R + 0.012, wordWidth / (2 * R), wordLength, 4, {
        vSegs: 1,
        caps: false,
        swapUV: true,
      }),
      wordLength,
      hingeLength,
      punch: new THREE.SphereGeometry(1, SEG.punch[0], SEG.punch[1]),
    };
  }, [model]);

  useEffect(
    () => () => {
      const list = [built.fixed, built.moving, built.spine, built.caps];
      list.forEach((set) => {
        if (Array.isArray(set)) set.forEach((g) => g.dispose?.());
        else if (set && typeof set === 'object') Object.values(set).forEach((g) => g.dispose?.());
      });
      built.coverScreen?.dispose?.();
      built.coverSurround?.dispose?.();
      built.word?.dispose?.();
      built.punch?.dispose?.();
    },
    [built]
  );

  return built;
}

/* ------------------------------------------------------------------ */
/*  small parts                                                       */
/* ------------------------------------------------------------------ */

function SideButtons({ mats, geo, edge, along, side }) {
  /* edge: distance from the centre line to the outer rail
     along: -1 for the moving half, +1 for the fixed half
     side: +1 / -1 which rail of the device (x for book, x for flip)          */
  const T = geo.T;
  const len = Math.min(1.85, geo.across * 0.13);
  const x = side * (edge - 0.045);
  const y0 = along * geo.across * 0.2;
  const sm = Math.max(2, Math.round(4 * SEG.smooth));
  const recess = (
    <RB
      args={[0.06, len * 2.35, T * 0.42]}
      radius={0.02}
      smoothness={sm}
      position={[side * (edge - 0.012), y0 - len * 0.75, 0]}
      material={mats.dark}
    />
  );
  return (
    <group>
      {recess}
      <RB args={[0.09, len, T * 0.5]} radius={0.042} smoothness={sm} position={[x, y0, 0]} material={mats.frame} castShadow />
      <RB
        args={[0.085, len * 0.62, T * 0.5]}
        radius={0.04}
        smoothness={sm}
        position={[x, y0 - len * 1.15, 0]}
        material={mats.frame}
        castShadow
      />
      {/* power / fingerprint key: flatter and longer */}
      <RB
        args={[0.075, len * 0.72, T * 0.56]}
        radius={0.036}
        smoothness={sm}
        position={[x - side * 0.004, y0 - len * 2.15, 0]}
        material={mats.ring}
        castShadow
      />
    </group>
  );
}

/** Thin dark antenna band across a frame rail. */
function Band({ mats, T, x, y, z = 0, w = 0.085, axis = 'y', h = 0 }) {
  const len = T * (h || 0.84);
  if (axis === 'y') {
    return (
      <mesh position={[x, y, z]} material={mats.dark}>
        <boxGeometry args={[w, 0.03, len]} />
      </mesh>
    );
  }
  return (
    <mesh position={[x, y, z]} material={mats.dark}>
      <boxGeometry args={[0.03, w, len]} />
    </mesh>
  );
}

function BottomEdge({ mats, T, cx, cy, width, flipAxis = false }) {
  /* cx, cy: centre of the edge in local coords; the edge runs along x */
  const holes = useMemo(() => {
    const arr = [];
    const n = 7;
    for (let i = 0; i < n; i += 1) arr.push(-0.42 + i * 0.135);
    return arr;
  }, []);
  const depth = 0.032;
  return (
    <group position={[cx, cy, 0]}>
      {/* USB-C port with its metal shell */}
      <RB
        args={[0.95, depth, T * 0.4]}
        radius={0.14}
        smoothness={Math.max(2, Math.round(4 * SEG.smooth))}
        position={[0, 0.002, 0]}
        material={mats.dark}
      />
      <RB
        args={[1.06, depth * 0.7, T * 0.47]}
        radius={0.15}
        smoothness={Math.max(2, Math.round(4 * SEG.smooth))}
        position={[0, -0.004, 0]}
        material={mats.ring}
      />
      {/* speaker grille */}
      <group position={[0.92, 0, 0]}>
        {holes.map((hx, i) => (
          <mesh key={i} position={[hx * 0.9, 0.001, 0]} material={mats.dark}>
            <cylinderGeometry args={[0.026, 0.026, depth, SEG.hole]} />
          </mesh>
        ))}
      </group>
      {/* mic pinhole */}
      <mesh position={[-0.78, 0, 0]} material={mats.dark}>
        <cylinderGeometry args={[0.03, 0.03, depth, SEG.mic]} />
      </mesh>
    </group>
  );
}

function Hinge({ mats, geo, form, spineRef, capRef, frameRef }) {
  const rot = form === 'flip' ? Math.PI / 2 : 0;
  return (
    <group position={[0, 0, geo.pivotZ]}>
      <group ref={frameRef}>
        <group rotation={[0, 0, rot]}>
          <mesh
            ref={spineRef}
            geometry={geo.spine[0]}
            material={mats.hinge}
            userData={{ dbg: 'hinge' }}
            castShadow
            receiveShadow
          />
          <mesh ref={capRef} geometry={geo.caps[0]} material={mats.dark} />
          <mesh geometry={geo.word} material={mats.word} position={[0, 0, 0]} renderOrder={3} />
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
  const spineRef = useRef();
  const frameRef = useRef();
  const capRef = useRef();
  const cur = useRef(Math.PI);
  const autoPhase = useRef(Math.PI / 2);

  const { T, half, across, dispW, dispH, pivotZ, gap } = geos;
  const form = model.form;
  const book = form === 'book';

  /* the wedge closes exactly to the free edge: the two halves touch there and
     stay `gap` apart at the spine, so they never pass through each other */
  const wedgeRad = gap > 0.09 ? Math.min(0.4, Math.asin(Math.min(0.5, Math.max(0.02, gap - 0.07) / model.half))) : 0;

  const screenZ = T / 2 + 0.016;
  const faceZ = T / 2 + 0.004;

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
    const a = open * (1 + wedgeRad / Math.PI);
    foldBus.deg = THREE.MathUtils.radToDeg(cur.current);

    if (movingRef.current) {
      if (book) movingRef.current.rotation.y = a;
      /* clamshell folds inwards, onto its own display side — rotating the other
         way sweeps the moving half straight through the fixed one */
      else movingRef.current.rotation.x = -a;
    }
    if (rootRef.current) {
      const k = (1 - Math.cos(a)) / 2;
      if (book) rootRef.current.position.x = -(half / 2) * k;
      else rootRef.current.position.y = -(half / 2) * k;
    }
    if (frameRef.current) {
      if (book) frameRef.current.rotation.y = a * 0.5;
      else frameRef.current.rotation.x = -a * 0.5;
    }
    if (spineRef.current && geos.spine.length > 1) {
      const t = clamp(a / Math.PI, 0, 1);
      const idx = Math.round(t * (geos.spine.length - 1));
      const want = geos.spine[idx];
      if (spineRef.current.geometry !== want) spineRef.current.geometry = want;
      if (capRef.current && geos.caps[idx] && capRef.current.geometry !== geos.caps[idx]) {
        capRef.current.geometry = geos.caps[idx];
      }
    }

    const on = s.screensOn ? 1 : 0.035;
    if (Math.abs(mats.inner.color.r - on) > 0.002) {
      const k2 = THREE.MathUtils.damp(mats.inner.color.r || 1, on, 9, d);
      mats.inner.color.setScalar(k2);
      mats.cover.color.setScalar(k2);
    }
  });

  const outerEdge = book ? half : across / 2;

  return (
    <group ref={rootRef} userData={{ dbg: 'device' }}>
      {/* ---------------- fixed half ---------------- */}
      <group userData={{ dbg: 'fixed' }}>
        <mesh geometry={geos.fixed.body} material={mats.frame} castShadow receiveShadow userData={{ dbg: 'fixedBody' }} />
        <mesh geometry={geos.fixed.front} material={mats.frontGlass} position={[0, 0, faceZ]} />
        <mesh geometry={geos.fixed.back} material={mats.back} position={[0, 0, -T / 2 - 0.0025 + 0.018]} />
        <mesh
          geometry={geos.fixed.screen}
          material={mats.inner}
          position={[0, 0, screenZ]}
          userData={{ dbg: 'fixedScreen' }}
        />

        {/* inner selfie camera */}
        {model.innerCam === 'punch' && (
          <mesh
            material={mats.bezel}
            position={book ? [dispW * 0.5 - 0.62, dispH / 2 - 0.44, screenZ - 0.044] : [0, dispH / 2 - 0.44, screenZ - 0.044]}
          >
            <sphereGeometry args={[0.072, SEG.punch[0], SEG.punch[1]]} />
          </mesh>
        )}
        {model.innerCam === 'udc' && (
          <mesh
            material={mats.bezel}
            position={book ? [dispW * 0.5 - 0.62, dispH / 2 - 0.44, screenZ + 0.004] : [0, dispH / 2 - 0.44, screenZ + 0.004]}
          >
            <circleGeometry args={[0.055, SEG.circle]} />
          </mesh>
        )}
        {model.innerCam === 'notch' && (
          <RB
            args={[2.6, 0.78, 0.05]}
            radius={0.32}
            smoothness={Math.max(2, Math.round(5 * SEG.smooth))}
            position={[dispW * 0.5 - 1.32, dispH / 2 - 0.4, screenZ + 0.004]}
            material={mats.bezelFlat}
          />
        )}

        {book && <CameraIsland model={model} mats={mats} zBack={-T / 2} T={T} />}

        {book ? (
          <>
            <SideButtons mats={mats} geo={geos} edge={half} along={1} side={1} />
            <BottomEdge mats={mats} T={T} cx={half / 2} cy={-across / 2 - 0.004} width={half} />
            <SimTray mats={mats} T={T} x={0.95} y={across / 2 + 0.004} />
            {/* antenna bands */}
            {[0.9, 4.6].map((bx) => (
              <Band key={`t${bx}`} mats={mats} T={T} x={bx} y={across / 2 + 0.002} />
            ))}
            {[0.9, 4.6].map((bx) => (
              <Band key={`b${bx}`} mats={mats} T={T} x={bx} y={-across / 2 - 0.002} />
            ))}
            <Band mats={mats} T={T} x={half + 0.002} y={-across * 0.3} axis="x" />
          </>
        ) : (
          <>
            <SimTray mats={mats} T={T} x={across * 0.46} y={half - 0.004} />
            {[-across * 0.34, across * 0.34].map((bx) => (
              <Band key={`t${bx}`} mats={mats} T={T} x={bx} y={half + 0.002} />
            ))}
          </>
        )}
      </group>

      {/* ---------------- moving half ---------------- */}
      <group ref={movingRef} position={[0, 0, pivotZ]} userData={{ dbg: 'moving' }}>
        <group position={[0, 0, -pivotZ]}>
          <mesh geometry={geos.moving.body} material={mats.frame} castShadow receiveShadow userData={{ dbg: 'movingBody' }} />
          <mesh geometry={geos.moving.front} material={mats.frontGlass} position={[0, 0, faceZ]} />
          <mesh geometry={geos.moving.back} material={mats.back} position={[0, 0, -T / 2 - 0.0025 + 0.018]} />
          <mesh
            geometry={geos.moving.screen}
            material={mats.inner}
            position={[0, 0, screenZ]}
            userData={{ dbg: 'movingScreen' }}
          />

          {book ? (
            <group position={[-half / 2, 0, -T / 2 - 0.014]} rotation={[0, Math.PI, 0]}>
              <mesh geometry={geos.coverSurround} material={mats.frontGlass} />
              <mesh geometry={geos.coverScreen} material={mats.cover} position={[0, 0, 0.006]} userData={{ dbg: 'coverScreen' }} />
            </group>
          ) : (
            <CoverCluster model={model} mats={mats} half={half} width={across} T={T} coverW={geos.coverW} coverH={geos.coverH} />
          )}

          {!book && <SideButtons mats={mats} geo={geos} form={form} edge={across / 2} along={-1} side={1} />}
          {!book && <BottomEdge mats={mats} T={T} cx={0} cy={-half - 0.004} width={across} />}
          {!book && <SimTray mats={mats} T={T} x={-across * 0.4} y={-half - 0.004} />}

          {book ? (
            <>
              {[-0.9, -4.6].map((bx) => (
                <Band key={`t${bx}`} mats={mats} T={T} x={bx} y={across / 2 + 0.002} />
              ))}
              {[-0.9, -4.6].map((bx) => (
                <Band key={`b${bx}`} mats={mats} T={T} x={bx} y={-across / 2 - 0.002} />
              ))}
              <Band mats={mats} T={T} x={-half - 0.002} y={across * 0.3} axis="x" />
            </>
          ) : null}
        </group>
      </group>

      {/* ---------------- hinge ---------------- */}
      <Hinge mats={mats} geo={geos} form={form} spineRef={spineRef} capRef={capRef} frameRef={frameRef} />
    </group>
  );
}

function SimTray({ mats, T, x, y }) {
  /* a flush tray outline: a dark slot with a bright lip, no protruding card */
  return (
    <group position={[x, y, 0]}>
      <RB
        args={[1.0, 0.008, T * 0.3]}
        radius={0.12}
        smoothness={Math.max(2, Math.round(4 * SEG.smooth))}
        material={mats.dark}
      />
      <RB
        args={[0.9, 0.005, T * 0.22]}
        radius={0.1}
        smoothness={Math.max(2, Math.round(4 * SEG.smooth))}
        position={[0, 0.001, 0]}
        material={mats.frame}
      />
      <mesh position={[0.36, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.dark}>
        <cylinderGeometry args={[0.026, 0.026, 0.02, SEG.mic]} />
      </mesh>
    </group>
  );
}
