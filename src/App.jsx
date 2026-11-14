import { useEffect, useState } from 'react';
import Stage from './scene/Stage';
import HUD from './ui/HUD';

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch (e) {
    return false;
  }
}

export default function App() {
  const [webgl, setWebgl] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setWebgl(supportsWebGL());
    const onReady = () => setReady(true);
    window.addEventListener('fold8:ready', onReady);
    const fallback = setTimeout(onReady, 4500);
    return () => {
      window.removeEventListener('fold8:ready', onReady);
      clearTimeout(fallback);
    };
  }, []);

  return (
    <div className="app">
      <div className="aura" aria-hidden="true" />
      <div className="canvas-layer">
        {webgl ? (
          <Stage />
        ) : (
          <div className="no-webgl">
            이 브라우저에서는 3D(WebGL)를 표시할 수 없습니다.
            <br />
            Chrome·Edge·Safari 최신 버전에서 다시 열어 주세요.
          </div>
        )}
      </div>
      <div className="vignette" aria-hidden="true" />
      <HUD />
      <div className={`loader ${ready ? 'done' : ''}`} aria-hidden={ready}>
        <div className="loader-inner">
          <div className="loader-mark" />
          <span className="loader-text">GALAXY Z FOLD 8</span>
        </div>
      </div>
    </div>
  );
}
