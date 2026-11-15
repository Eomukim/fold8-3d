import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Lightformer, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, SMAA, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import DeviceModel from './DeviceModel';
import { CAMERA_PRESETS } from '../lib/models';
import { PERF } from '../lib/perf';
import { useShowcase } from '../store';

/* ---------------- helpers ---------------- */

function useModel() {
  const series = useShowcase((s) => s.series);
  const modelId = useShowcase((s) => s.modelId);
  return useShowcase.getState().model();
}

function metrics(model) {
  const vHalf = model.form === 'book' ? model.across / 2 : model.half;
  const vFull = Math.max(model.form === 'book' ? model.across : model.half * 2);
  const wFull = Math.max(model.form === 'book' ? model.half * 2 : model.across);
  return { vHalf, vFull, wFull, size: Math.max(vFull, wFull) };
}

function presetTarget(preset, model) {
  const T = model.dims.tOpen / 2;
  const { vHalf } = metrics(model);
  if (preset === 'hinge') return new THREE.Vector3(0, 0, -T * 0.2);
  if (preset === 'camera') {
    return model.form === 'book'
      ? new THREE.Vector3(model.cam.x, model.cam.y - vHalf * 0.06, -T)
      : new THREE.Vector3(model.cover.w * 0.22, model.half * 0.12, -T);
  }
  if (preset === 'cover') {
    if (model.form === 'book') return new THREE.Vector3(-model.half / 2, 0, -T);
    const closed = useShowcase.getState().foldTarget < 45;
    return new THREE.Vector3(0, 0, closed ? T : -T);
  }
  return new THREE.Vector3(0, -vHalf * 0.30, 0);
}

/* ---------------- camera preset transitions ---------------- */

function CameraRig({ controls }) {
  const { camera, size } = useThree();
  const preset = useShowcase((s) => s.camera);
  const seq = useShowcase((s) => s.cameraSeq);
  const model = useModel();
  const anim = useRef(null);

  const fit = useMemo(() => {
    const { size: modelSize } = metrics(model);
    const aspect = size.width / Math.max(1, size.height);
    const boost = aspect < 1.35 ? Math.min(1.75, 1.35 / aspect) : 1;
    return (modelSize / 14.2) * boost;
  }, [model, size.width, size.height]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.__freezeCam) return;
    const isFlipFront = model.form === 'flip' && preset === 'cover';
    const p = (isFlipFront ? CAMERA_PRESETS.coverFront : CAMERA_PRESETS[preset]) ?? CAMERA_PRESETS.overview;
    const target = presetTarget(preset, model);
    const pos = target.clone().add(new THREE.Vector3(...p.offset).multiplyScalar(fit));
    anim.current = {
      t: 0,
      fromPos: camera.position.clone(),
      fromTarget: controls ? controls.target.clone() : new THREE.Vector3(),
      toPos: pos,
      toTarget: target,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, seq, fit, model.id]);

  useEffect(() => {
    if (!controls) return undefined;
    const cancel = () => {
      anim.current = null;
    };
    controls.addEventListener('start', cancel);
    return () => controls.removeEventListener('start', cancel);
  }, [controls]);

  useFrame((_, dt) => {
    if (typeof window !== 'undefined' && window.__freezeCam) return;
    if (!anim.current || !controls) return;
    const a = anim.current;
    a.t = typeof window !== 'undefined' && window.__snap ? 1 : Math.min(1, a.t + dt / 1.15);
    const e = a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2;
    camera.position.lerpVectors(a.fromPos, a.toPos, e);
    controls.target.lerpVectors(a.fromTarget, a.toTarget, e);
    controls.update();
    if (a.t >= 1) anim.current = null;
  });

  return null;
}

/* ---------------- auto showcase ---------------- */

function AutoOrbit({ controls }) {
  const auto = useShowcase((s) => s.auto);
  useEffect(() => {
    if (!controls) return undefined;
    controls.autoRotate = auto;
    controls.autoRotateSpeed = 0.9;
    return () => {
      controls.autoRotate = false;
    };
  }, [auto, controls]);
  return null;
}

/* ---------------- studio environment ---------------- */

function Studio() {
  return (
    <>
      <ambientLight intensity={0.22} />
      <directionalLight
        position={[9, 13, 11]}
        intensity={1.15}
        color="#ffffff"
        castShadow
        shadow-mapSize={[PERF.tier === 'low' ? 512 : 1024, PERF.tier === 'low' ? 512 : 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={70}
      />
      <directionalLight position={[-8, 4, 6]} intensity={0.4} color="#a9c0ff" />
      <directionalLight position={[-14, 5, -9]} intensity={0.55} color="#d6deff" />
      <pointLight position={[-9, -4, 8]} intensity={22} color="#6c7bff" distance={40} decay={2} />

      <Environment resolution={PERF.envRes} frames={1}>
        <color attach="background" args={['#05060a']} />
        <Lightformer form="rect" intensity={7} position={[9, 9, 9]} scale={[15, 15, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={4.2} position={[-14, 2, 2]} rotation={[0, Math.PI / 2, 0]} scale={[26, 3.4, 1]} />
        <Lightformer form="rect" intensity={3.4} position={[14, -1, -4]} rotation={[0, -Math.PI / 2, 0]} scale={[22, 2.8, 1]} />
        <Lightformer form="rect" intensity={4.4} position={[0, 15, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[18, 6, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[0, 3, -15]} scale={[16, 16, 1]} />
        <Lightformer form="rect" intensity={3} position={[-6, 3, 13]} scale={[9, 12, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2.2} position={[7, -5, 11]} scale={[7, 9, 1]} target={[0, 0, 0]} />
        <Lightformer form="circle" intensity={2.2} position={[-8, -6, 6]} scale={[6, 6, 1]} color="#7c6cff" />
        <Lightformer form="circle" intensity={1.6} position={[7, 6, -8]} scale={[5, 5, 1]} color="#5eead4" />
      </Environment>
    </>
  );
}

/* ---------------- stage floor ---------------- */

function StageFloor({ y }) {
  const glow = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    g.addColorStop(0, 'rgba(150,175,255,0.55)');
    g.addColorStop(0.32, 'rgba(90,110,190,0.22)');
    g.addColorStop(0.62, 'rgba(40,50,90,0.07)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  // soft-edged floor: fades out before its own far edge so no horizon line shows
  const floorAlpha = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.92)');
    g.addColorStop(0.72, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    return t;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial
          color="#0a0b11"
          roughness={0.9}
          metalness={0.15}
          envMapIntensity={0.35}
          transparent
          alphaMap={floorAlpha}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y + 0.02, 0]}>
        <planeGeometry args={[46, 46]} />
        <meshBasicMaterial map={glow} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.75} />
      </mesh>
      {PERF.contactShadow && (
        <ContactShadows
          position={[0, y + 0.04, 0]}
          scale={30}
          resolution={PERF.shadowRes}
          blur={1.6}
          far={12}
          frames={1}
          opacity={0.55}
          color="#000206"
        />
      )}
    </group>
  );
}

/* ---------------- inner scene ---------------- */

function SceneContents() {
  const controls = useThree((s) => s.controls);
  useEffect(() => {
    if (typeof window !== 'undefined') window.__controls = controls;
  }, [controls]);
  const model = useModel();
  const { vHalf } = metrics(model);
  const floorY = -vHalf - 0.1;

  return (
    <>
      <Studio />
      <StageFloor y={floorY} />
      <group position={[0, 0, 0]}>
        <DeviceModel key={model.id} model={model} />
      </group>
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.07}
        minDistance={3}
        maxDistance={160}
        minPolarAngle={Math.PI * 0.12}
        maxPolarAngle={Math.PI * 0.62}
        target={[0, 0.5, 0]}
      />
      <CameraRig controls={controls} />
      <AutoOrbit controls={controls} />
    </>
  );
}

export default function Stage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const dpr = PERF.dpr;

  return (
    <Canvas
      shadows
      dpr={dpr}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        // with the composer the tone mapping happens in a final pass;
        // without it (phones) the renderer applies ACES directly
        toneMapping: PERF.postFx ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.08,
      }}
      camera={{ position: [26, 9, 48], fov: 27, near: 0.5, far: 300 }}
      onCreated={({ gl, scene, camera }) => {
        gl.setClearColor('#05060a');
        window.__scene = scene;
        window.__cam = camera;
        window.__gl = gl;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => window.dispatchEvent(new Event('foldable:ready')));
        });
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Suspense fallback={null}>
        {ready && <SceneContents />}
        {PERF.postFx && (
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <SMAA />
            <Bloom intensity={0.42} luminanceThreshold={0.9} luminanceSmoothing={0.12} mipmapBlur radius={0.28} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}
