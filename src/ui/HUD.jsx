import { useEffect, useRef, useState } from 'react';
import { useShowcase } from '../store';
import { CATALOG, SERIES_META } from '../lib/models';
import { foldBus } from '../lib/foldBus';

const CAMS = [
  { id: 'overview', label: '개요' },
  { id: 'hinge', label: '힌지' },
  { id: 'camera', label: '카메라' },
  { id: 'cover', label: '커버' },
];

export default function HUD() {
  const series = useShowcase((s) => s.series);
  const modelId = useShowcase((s) => s.modelId);
  const setSeries = useShowcase((s) => s.setSeries);
  const setModel = useShowcase((s) => s.setModel);
  const foldTarget = useShowcase((s) => s.foldTarget);
  const setFold = useShowcase((s) => s.setFold);
  const colorway = useShowcase((s) => s.colorway);
  const setColorway = useShowcase((s) => s.setColorway);
  const camera = useShowcase((s) => s.camera);
  const setCamera = useShowcase((s) => s.setCamera);
  const auto = useShowcase((s) => s.auto);
  const toggleAuto = useShowcase((s) => s.toggleAuto);
  const screensOn = useShowcase((s) => s.screensOn);
  const toggleScreens = useShowcase((s) => s.toggleScreens);
  const hintDismissed = useShowcase((s) => s.hintDismissed);
  const dismissHint = useShowcase((s) => s.dismissHint);

  const model = useShowcase.getState().model();
  const list = CATALOG[series];

  const readoutRef = useRef(null);
  const sliderRef = useRef(null);
  const dragging = useRef(false);
  const [liveDeg, setLiveDeg] = useState(180);

  useEffect(() => {
    let raf;
    let last = -1;
    const tick = () => {
      const d = foldBus.deg;
      if (Math.abs(d - last) > 0.4) {
        last = d;
        if (readoutRef.current) readoutRef.current.textContent = `${Math.round(d)}°`;
        if (sliderRef.current && !dragging.current) sliderRef.current.value = String(Math.round(d));
        setLiveDeg(d);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' && e.key !== ' ') return;
      if (e.key === 'ArrowLeft') setFold(useShowcase.getState().foldTarget - 5);
      else if (e.key === 'ArrowRight') setFold(useShowcase.getState().foldTarget + 5);
      else if (e.key === ' ') {
        e.preventDefault();
        toggleAuto();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setFold, toggleAuto]);

  useEffect(() => {
    const t = setTimeout(dismissHint, 7000);
    return () => clearTimeout(t);
  }, [dismissHint]);

  const presets = [
    { label: '펼치기', angle: 180, meta: '180°' },
    { label: '플렉스', angle: model.flex, meta: `${model.flex}°` },
    { label: '접기', angle: 0, meta: '0°' },
  ];

  const modeLabel = auto ? '자동 쇼케이스 재생 중' : screensOn ? '디스플레이 켜짐' : '디스플레이 꺼짐';

  return (
    <div className={`hud ${hintDismissed ? 'hint-off' : ''}`} data-build={typeof __BUILD_STAMP__ !== 'undefined' ? __BUILD_STAMP__ : 'dev'}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-text">
            <b>FOLDABLE SIMULATOR</b>
            <i>FOLD · FLIP</i>
          </span>
        </div>
        <nav className="nav" aria-label="카메라 프리셋">
          {CAMS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={camera === c.id ? 'active' : ''}
              onClick={() => setCamera(c.id)}
            >
              {c.label}
            </button>
          ))}
        </nav>
      </header>

      <aside className="specs">
        <p className="eyebrow">
          {SERIES_META[series].label} {model.gen} · {model.year}
        </p>
        <h1>{model.name}</h1>
        <p className="lede">{model.lede}</p>
        <ul className="spec-list">
          <li>
            <span>접힌 두께</span>
            <b>{model.spec.folded}</b>
          </li>
          <li>
            <span>펼친 두께</span>
            <b>{model.spec.unfolded}</b>
          </li>
          <li>
            <span>커버 디스플레이</span>
            <b>{model.spec.cover}</b>
          </li>
          <li>
            <span>메인 디스플레이</span>
            <b>{model.spec.main}</b>
          </li>
          <li>
            <span>힌지</span>
            <b>{model.spec.hinge}</b>
          </li>
          <li>
            <span>주름</span>
            <b>{model.spec.crease}</b>
          </li>
        </ul>
      </aside>

      <div className="dock">
        <div className="series-bar">
          <div className="series-tabs" role="tablist" aria-label="시리즈">
            {Object.values(SERIES_META).map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={series === s.id}
                className={series === s.id ? 'active' : ''}
                onClick={() => setSeries(s.id)}
              >
                <b>{s.label}</b>
                <em>{s.ko}</em>
              </button>
            ))}
          </div>
          <div className="chips" role="tablist" aria-label="세대 선택">
            {list.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={modelId === m.id}
                aria-label={`${m.name} ${m.year}`}
                className={`chip ${modelId === m.id ? 'active' : ''}`}
                onClick={() => setModel(m.id)}
              >
                {m.chip}
                <span>{m.year}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="dock-main">
          <div className="dock-fold">
            <div className="fold-head">
              <span className="fold-label">FOLD ANGLE</span>
              <span className="fold-value">
                <b ref={readoutRef}>180°</b>
                <em>{modeLabel}</em>
              </span>
            </div>
            <div className="slider-wrap">
              <input
                ref={sliderRef}
                className="slider"
                type="range"
                min="0"
                max="180"
                step="1"
                defaultValue={foldTarget}
                aria-label="접힘 각도"
                onPointerDown={() => {
                  dragging.current = true;
                }}
                onPointerUp={() => {
                  dragging.current = false;
                }}
                onChange={(e) => {
                  dragging.current = true;
                  setFold(Number(e.target.value));
                }}
                style={{ '--pct': `${(liveDeg / 180) * 100}%` }}
              />
              <div className="slider-ticks" aria-hidden="true">
                <span>0°</span>
                <span>{model.flex}°</span>
                <span>180°</span>
              </div>
            </div>
            <div className="preset-row">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={`pill ${Math.abs(foldTarget - p.angle) < 1 && !auto ? 'active' : ''}`}
                  onClick={() => setFold(p.angle)}
                >
                  {p.label}
                  <em>{p.meta}</em>
                </button>
              ))}
              <button
                type="button"
                className={`pill auto ${auto ? 'active' : ''}`}
                onClick={toggleAuto}
                aria-pressed={auto}
              >
                <span className="rec" aria-hidden="true" />
                자동 쇼케이스
              </button>
            </div>
          </div>

          <div className="dock-side">
            <div className="swatch-block">
              <span className="micro-label">컬러</span>
              <div className="swatches">
                {model.colors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.name}
                    aria-label={c.name}
                    className={`swatch ${colorway === c.id ? 'active' : ''}`}
                    style={{ '--sw': c.frame, '--sw2': c.back }}
                    onClick={() => setColorway(c.id)}
                  />
                ))}
              </div>
              <span className="swatch-name">{model.colors.find((c) => c.id === colorway)?.name}</span>
            </div>
            <button
              type="button"
              className={`power ${screensOn ? '' : 'off'}`}
              onClick={toggleScreens}
              aria-pressed={screensOn}
            >
              <span className="power-dot" aria-hidden="true" />
              {screensOn ? '화면 끄기' : '화면 켜기'}
            </button>
          </div>
        </div>
      </div>

      <p className="hint">
        <span className="hint-dot" aria-hidden="true" />
        드래그로 회전 · 스크롤로 확대 · ←/→ 로 접기 · Space 로 자동 쇼케이스
      </p>
    </div>
  );
}
