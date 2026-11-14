import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Lightformer, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, SMAA, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import Fold8Model from './Fold8Model';
import { CAMERA_PRESETS } from '../lib/dims';
import { useShowcase } from '../store';

/* ---------------- camera preset transitions ---------------- */

function CameraRig({ controls }) {
  const { camera, size } = useThree();
  const preset = useShowcase((s) => s.camera);
  const seq = useShowcase((s) => s.cameraSeq);

  const anim = useRef(null);

  // Pull the camera back on narrow (portrait) screens so the whole device fits.
  const fitScale = useMemo(() => {
    const aspect = size.width / Math.max(1, size.height);
    const fov = THREE.MathUtils.degToRad(camera.fov || 27);
    const tan = Math.tan(fov / 2);
    const needV = (10 * 1.18) / tan;
    const needH = (7.6 * 1.12) / (tan * aspect);
    const ov = CAMERA_PRESETS.overview;
    const base = Math.hypot(ov.pos[0] - ov.target[0], ov.pos[1] - ov.target[1], ov.pos[2] - ov.target[2]);
    return Math.min(2.6, Math.max(1, Math.max(needV, needH) / base));
  }, [size.width, size.height, camera.fov]);

  useEffect(() => {
    const p = CAMERA_PRESETS[preset] ?? CAMERA_PRESETS.overview;
    const target = new THREE.Vector3(...p.target);
    const pos = new THREE.Vector3(...p.pos);
    const dir = pos.clone().sub(target).multiplyScalar(fitScale);
    anim.current = {
      t: 0,
      fromPos: camera.position.clone(),
      fromTarget: controls ? controls.target.clone() : new THREE.Vector3(),
      toPos: target.clone().add(dir),
      toTarget: new THREE.Vector3(target.x, target.y * fitScale, target.z),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, seq, fitScale]);

  useEffect(() => {
    if (!controls) return undefined;
    const cancel = () => {
      anim.current = null;
    };
    controls.addEventListener('start', cancel);
    return () => controls.removeEventListener('start', cancel);
  }, [controls]);

  useFrame((_, dt) => {
    if (!anim.current || !controls) return;
    const a = anim.current;
    a.t = Math.min(1, a.t + dt / 1.15);
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

function Studio({ quality }) {
  return (
    <>
      <ambientLight intensity={0.22} />
      <directionalLight position={[9, 13, 11]} intensity={1.15} color="#ffffff" />
      <directionalLight position={[-8, 4, 6]} intensity={0.4} color="#a9c0ff" />
      <directionalLight position={[-14, 5, -9]} intensity={0.55} color="#d6deff" />
      <pointLight position={[-9, -4, 8]} intensity={22} color="#6c7bff" distance={40} decay={2} />

      <Environment resolution={quality === 'high' ? 256 : 128} frames={1}>
        <color attach="background" args={['#05060a']} />
        {/* key softbox, upper right */}
        <Lightformer form="rect" intensity={7} position={[9, 9, 9]} scale={[15, 15, 1]} target={[0, 0, 0]} />
        {/* long rim strips */}
        <Lightformer form="rect" intensity={4.2} position={[-14, 2, 2]} rotation={[0, Math.PI / 2, 0]} scale={[26, 3.4, 1]} />
        <Lightformer form="rect" intensity={3.4} position={[14, -1, -4]} rotation={[0, -Math.PI / 2, 0]} scale={[22, 2.8, 1]} />
        {/* overhead linear */}
        <Lightformer form="rect" intensity={4.4} position={[0, 15, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[18, 6, 1]} />
        {/* back fill */}
        <Lightformer form="rect" intensity={1.4} position={[0, 3, -15]} scale={[16, 16, 1]} />
        {/* front fill so the metal frame always catches a highlight */}
        <Lightformer form="rect" intensity={3} position={[-6, 3, 13]} scale={[9, 12, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2.2} position={[7, -5, 11]} scale={[7, 9, 1]} target={[0, 0, 0]} />
        {/* cool accent */}
        <Lightformer form="circle" intensity={2.2} position={[-8, -6, 6]} scale={[6, 6, 1]} color="#7c6cff" />
        <Lightformer form="circle" intensity={1.6} position={[7, 6, -8]} scale={[5, 5, 1]} color="#5eead4" />
      </Environment>
    </>
  );
}

/* ---------------- stage floor ---------------- */

function StageFloor() {
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

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10.16, 0]} receiveShadow>
        <circleGeometry args={[90, 64]} />
        <meshStandardMaterial color="#0a0b11" roughness={0.9} metalness={0.15} envMapIntensity={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10.14, 0]}>
        <planeGeometry args={[46, 46]} />
        <meshBasicMaterial map={glow} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.75} />
      </mesh>
      <ContactShadows
        position={[0, -10.1, 0]}
        scale={30}
        resolution={1024}
        blur={1.6}
        far={12}
        frames={1}
        opacity={0.55}
        color="#000206"
      />
    </group>
  );
}

/* ---------------- inner scene ---------------- */

function SceneContents() {
  const controls = useThree((s) => s.controls);
  const quality = useThree((s) => s.viewport.width < 720 ? 'low' : 'high');

  return (
    <>
      <fog attach="fog" args={['#05060a', 46, 96]} />
      <Studio quality={quality} />
      <StageFloor />
      <group position={[0, 0, 0]}>
        <Fold8Model />
      </group>
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.07}
        minDistance={8}
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

const fxOff =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('fx') === 'off';

export default function Stage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const dpr = useMemo(() => {
    if (typeof window === 'undefined') return [1, 1.6];
    return window.innerWidth < 720 ? [1, 1.6] : [1, 2];
  }, []);

  return (
    <Canvas
      shadows
      dpr={dpr}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.NoToneMapping,
        toneMappingExposure: 1.08,
      }}
      camera={{ position: CAMERA_PRESETS.overview.pos, fov: 27, near: 0.5, far: 300 }}
      onCreated={({ gl }) => {
        gl.setClearColor('#05060a');
        requestAnimationFrame(() => {
          requestAnimationFrame(() => window.dispatchEvent(new Event('fold8:ready')));
        });
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Suspense fallback={null}>
        {ready && <SceneContents />}
        {!fxOff && (
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
