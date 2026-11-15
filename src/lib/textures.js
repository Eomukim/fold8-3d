import * as THREE from 'three';
import { PERF } from './perf';

const FONT =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif';

/* ---------- small helpers ---------- */

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.arcTo(x + w, y, x + w, y + rad, rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
  ctx.lineTo(x + rad, y + h);
  ctx.arcTo(x, y + h, x, y + h - rad, rad);
  ctx.lineTo(x, y + rad);
  ctx.arcTo(x, y, x + rad, y, rad);
  ctx.closePath();
}

function hexAlpha(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function glow(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hexAlpha(color, alpha));
  g.addColorStop(0.45, hexAlpha(color, alpha * 0.42));
  g.addColorStop(1, hexAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function grain(ctx, w, h, amount = 2400, alpha = 0.02) {
  for (let i = 0; i < amount; i += 1) {
    const v = Math.random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.2, 1.2);
  }
}

function glyph(ctx, kind, cx, cy, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, s * 0.085);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (kind) {
    case 'call':
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.72);
      rr(ctx, -s * 0.11, -s * 0.29, s * 0.22, s * 0.58, s * 0.1);
      ctx.stroke();
      ctx.restore();
      break;
    case 'message':
      rr(ctx, cx - s * 0.34, cy - s * 0.28, s * 0.68, s * 0.48, s * 0.16);
      ctx.stroke();
      break;
    case 'camera':
      rr(ctx, cx - s * 0.34, cy - s * 0.22, s * 0.68, s * 0.46, s * 0.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + s * 0.01, s * 0.13, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'music': {
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.06, cy + s * 0.2);
      ctx.lineTo(cx - s * 0.06, cy - s * 0.26);
      ctx.lineTo(cx + s * 0.26, cy - s * 0.32);
      ctx.lineTo(cx + s * 0.26, cy + s * 0.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - s * 0.16, cy + s * 0.2, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'gall':
      rr(ctx, cx - s * 0.3, cy - s * 0.3, s * 0.6, s * 0.6, s * 0.14);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - s * 0.08, cy - s * 0.1, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      break;
  }
  ctx.restore();
}

function sun(ctx, x, y, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, r * 0.13);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82);
    ctx.lineTo(x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1);
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- status bar ---------- */

function statusBar(ctx, W, H, u, color, fs = 1) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `600 ${Math.round(30 * u * fs)}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('9:41', 48 * u, 60 * u);
  const bx = W - 48 * u;
  // battery
  ctx.strokeStyle = color;
  ctx.lineWidth = 4 * u;
  rr(ctx, bx - 46 * u, 42 * u, 44 * u, 22 * u, 6 * u);
  ctx.stroke();
  rr(ctx, bx - 41 * u, 46 * u, 26 * u, 14 * u, 3 * u);
  ctx.fill();
  rr(ctx, bx - 0.5 * u, 48 * u, 4 * u, 10 * u, 2 * u);
  ctx.fill();
  // wifi
  ctx.lineWidth = 5 * u;
  for (let i = 0; i < 2; i += 1) {
    ctx.beginPath();
    ctx.arc(bx - 108 * u, 58 * u, 8 * u + i * 9 * u, -Math.PI * 0.78, -Math.PI * 0.22);
    ctx.stroke();
  }
  // signal
  for (let i = 0; i < 4; i += 1) {
    const h = 8 * u + i * 4.5 * u;
    rr(ctx, bx - 168 * u + i * 12 * u, 62 * u - h, 8 * u, h, 2.5 * u);
    ctx.fill();
  }
  ctx.restore();
}

/* ---------- inner (main) display ---------- */

/* Display canvas resolution scale — phones don't need a 1400px canvas
   for a panel that is a few hundred CSS pixels wide on screen. */
const TEX_SCALE = PERF.tier === 'low' ? 0.66 : 1;

function drawInner(model) {
  const [rw, rh] = model.main.res;
  const W = Math.round(1400 * TEX_SCALE);
  const H = Math.round((W * rh) / rw);
  const u = W / 1400;
  // taller panels (clamshells) need a slightly larger type scale to stay legible
  const fs = Math.max(1, Math.min(1.4, H / W / 1.75));
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');

  // base
  const bg = ctx.createLinearGradient(0, H * 0.05, W * 0.2, H);
  bg.addColorStop(0, '#070a12');
  bg.addColorStop(0.42, '#05070d');
  bg.addColorStop(1, '#020308');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const top = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  top.addColorStop(0, 'rgba(58,72,140,0.22)');
  top.addColorStop(0.55, 'rgba(30,38,80,0.08)');
  top.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, H * 0.55);

  // light trail
  ctx.save();
  const trail = ctx.createLinearGradient(0, H * 0.3, W, H * 0.52);
  trail.addColorStop(0, 'rgba(150,170,255,0)');
  trail.addColorStop(0.28, 'rgba(168,190,255,0.42)');
  trail.addColorStop(0.52, 'rgba(120,235,225,0.5)');
  trail.addColorStop(0.78, 'rgba(150,170,255,0.16)');
  trail.addColorStop(1, 'rgba(150,170,255,0)');
  ctx.strokeStyle = trail;
  ctx.lineWidth = 3.2 * u;
  ctx.shadowColor = 'rgba(140,170,255,0.5)';
  ctx.shadowBlur = 26 * u;
  ctx.beginPath();
  ctx.moveTo(-40, H * 0.45);
  ctx.bezierCurveTo(W * 0.28, H * 0.3, W * 0.66, H * 0.54, W + 40, H * 0.35);
  ctx.stroke();
  ctx.restore();

  // aura
  const aura = ctx.createRadialGradient(W * 0.52, H * 1.02, 0, W * 0.52, H * 1.02, W * 0.78);
  aura.addColorStop(0, 'rgba(96,86,255,0.36)');
  aura.addColorStop(0.4, 'rgba(60,60,190,0.13)');
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.fillRect(0, H * 0.45, W, H * 0.55);
  glow(ctx, W * 0.9, H * 0.6, W * 0.42, '#14beb9', 0.13);

  grain(ctx, W, H, 3200, 0.016);

  // status bar (keep clear of the fold line and camera cut-outs)
  statusBar(ctx, W, H, u, 'rgba(255,255,255,0.94)', fs);

  // clock
  const clockY = H * 0.29;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  ctx.font = `200 ${Math.round(300 * u * fs)}px ${FONT}`;
  ctx.fillText('9:41', 72 * u, clockY);
  ctx.fillStyle = 'rgba(226,232,255,0.6)';
  ctx.font = `400 ${Math.round(48 * u * fs)}px ${FONT}`;
  ctx.fillText('Saturday, November 14', 80 * u, clockY + 76 * u);
  ctx.restore();

  // weather chip
  const chipY = clockY + 116 * u;
  ctx.save();
  rr(ctx, 80 * u, chipY, 420 * u, 118 * u, 59 * u);
  ctx.fillStyle = 'rgba(255,255,255,0.075)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();
  sun(ctx, 146 * u, chipY + 59 * u, 26 * u, '#ffd479');
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `300 ${Math.round(56 * u * fs)}px ${FONT}`;
  ctx.fillText('18°', 208 * u, chipY + 74 * u);
  ctx.fillStyle = 'rgba(226,232,255,0.55)';
  ctx.font = `400 ${Math.round(30 * u * fs)}px ${FONT}`;
  ctx.fillText('Clear · Gangnam', 208 * u, chipY + 108 * u);
  ctx.restore();

  // agenda card
  const cardY = chipY + 168 * u;
  const cardH = 380 * u;
  ctx.save();
  rr(ctx, 72 * u, cardY, W - 144 * u, cardH, 50 * u);
  const cg = ctx.createLinearGradient(72 * u, cardY, W - 72 * u, cardY + cardH);
  cg.addColorStop(0, 'rgba(255,255,255,0.07)');
  cg.addColorStop(1, 'rgba(255,255,255,0.028)');
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.13)';
  ctx.lineWidth = 2;
  ctx.stroke();

  rr(ctx, 126 * u, cardY + 52 * u, 8 * u, 46 * u, 4 * u);
  ctx.fillStyle = '#8b7bff';
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = `600 ${Math.round(30 * u * fs)}px ${FONT}`;
  ctx.fillText('UP NEXT', 154 * u, cardY + 88 * u);

  const rows = [
    ['18:30', "Grandparents' house", 'Family', '#8b7bff'],
    ['21:00', 'Unfold & compare', 'Foldable', '#3ddad7'],
  ];
  rows.forEach((row, i) => {
    const y = cardY + 150 * u + i * 118 * u;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = `500 ${Math.round(42 * u * fs)}px ${FONT}`;
    ctx.fillText(row[0], 130 * u, y + 46 * u);
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.font = `400 ${Math.round(38 * u * fs)}px ${FONT}`;
    ctx.fillText(row[1], 300 * u, y + 12 * u);
    ctx.fillStyle = hexAlpha(row[3], 0.85);
    ctx.font = `400 ${Math.round(30 * u * fs)}px ${FONT}`;
    ctx.fillText(row[2], 300 * u, y + 56 * u);
    if (i === 0) {
      ctx.beginPath();
      ctx.moveTo(130 * u, y + 80 * u);
      ctx.lineTo(W - 130 * u, y + 80 * u);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
  ctx.restore();

  // dock
  const dockH = 170 * u;
  const dockY = H - dockH - 92 * u;
  ctx.save();
  rr(ctx, 90 * u, dockY, W - 180 * u, dockH, 56 * u);
  ctx.fillStyle = 'rgba(255,255,255,0.055)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const icons = [
    ['call', '#2ac66b', '#0f8b46'],
    ['message', '#3a8bff', '#1b4fd8'],
    ['camera', '#9498a3', '#4a4f5c'],
    ['gall', '#ff8a3d', '#d1472a'],
  ];
  const iconSize = dockH * 0.52;
  const gap = dockH * 0.3;
  const rowW = iconSize * 4 + gap * 3;
  const x0 = (W - rowW) / 2;
  icons.forEach((ic, i) => {
    const x = x0 + i * (iconSize + gap);
    const y = dockY + (dockH - iconSize) / 2;
    const g = ctx.createLinearGradient(x, y, x + iconSize, y + iconSize);
    g.addColorStop(0, ic[1]);
    g.addColorStop(1, ic[2]);
    rr(ctx, x, y, iconSize, iconSize, iconSize * 0.27);
    ctx.fillStyle = g;
    ctx.fill();
    glyph(ctx, ic[0], x + iconSize / 2, y + iconSize / 2, iconSize * 0.62, 'rgba(255,255,255,0.95)');
  });

  // page dots
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(W / 2 + (i - 1) * 30 * u, H - 56 * u, i === 0 ? 6 * u : 4.5 * u, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.2)';
    ctx.fill();
  }
  ctx.restore();

  // crease
  const cw = W * (0.055 + model.crease.width * 0.05);
  const d = model.crease.depth;
  ctx.save();
  const cg2 = ctx.createLinearGradient(W / 2 - cw, 0, W / 2 + cw, 0);
  cg2.addColorStop(0, 'rgba(0,0,0,0)');
  cg2.addColorStop(0.4, `rgba(0,0,0,${0.1 * d})`);
  cg2.addColorStop(0.48, `rgba(150,168,220,${0.09 * d})`);
  cg2.addColorStop(0.52, `rgba(150,168,220,${0.09 * d})`);
  cg2.addColorStop(0.6, `rgba(0,0,0,${0.1 * d})`);
  cg2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cg2;
  ctx.fillRect(W / 2 - cw, 0, cw * 2, H);
  ctx.fillStyle = `rgba(196,214,255,${0.05 * d})`;
  ctx.fillRect(W / 2 - 1.5, 0, 3, H);
  ctx.restore();

  // glass sheen
  ctx.save();
  const sheen = ctx.createLinearGradient(0, 0, W * 0.9, H * 0.75);
  sheen.addColorStop(0, 'rgba(255,255,255,0.045)');
  sheen.addColorStop(0.35, 'rgba(255,255,255,0.016)');
  sheen.addColorStop(0.62, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  return c;
}

/* ---------- cover display ---------- */

function drawCover(model) {
  const kind = model.cover.kind;
  const [rw, rh] = model.cover.res;
  const W = Math.round(700 * TEX_SCALE);
  const H = Math.round((W * rh) / rw);
  const u = Math.min(W, H) / 700;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, W * 0.2, H);
  bg.addColorStop(0, '#080b14');
  bg.addColorStop(0.45, '#0b1120');
  bg.addColorStop(1, '#05070d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  glow(ctx, W * 0.12, H * 0.18, W * 1.05, '#5b4bff', 0.36);
  glow(ctx, W * 0.95, H * 0.62, W * 0.85, '#14b8a6', 0.2);
  glow(ctx, W * 0.5, H * 0.98, W * 0.95, '#4338ff', 0.22);
  grain(ctx, W, H, 2200, 0.02);

  /* --- 1.1" pill: clock + level only --- */
  if (kind === 'pill') {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.font = `300 ${Math.round(150 * u)}px ${FONT}`;
    ctx.fillText('9:41', W / 2, H * 0.46);
    ctx.fillStyle = 'rgba(226,232,255,0.6)';
    ctx.font = `500 ${Math.round(70 * u)}px ${FONT}`;
    ctx.fillText('SAT 14', W / 2, H * 0.62);
    // battery arc
    ctx.strokeStyle = 'rgba(140,255,200,0.75)';
    ctx.lineWidth = 12 * u;
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.82, W * 0.17, Math.PI * 0.72, Math.PI * 0.72 + Math.PI * 1.4);
    ctx.stroke();
    ctx.restore();
    return c;
  }

  /* --- 1.9" landscape strip --- */
  if (kind === 'strip') {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = `300 ${Math.round(150 * u)}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('9:41', W * 0.1, H * 0.56);
    ctx.fillStyle = 'rgba(226,232,255,0.62)';
    ctx.font = `500 ${Math.round(52 * u)}px ${FONT}`;
    ctx.fillText('SAT · NOV 14', W * 0.1, H * 0.8);
    sun(ctx, W * 0.78, H * 0.4, 44 * u, '#ffd479');
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `300 ${Math.round(66 * u)}px ${FONT}`;
    ctx.fillText('18°', W * 0.68, H * 0.85);
    // notification dot
    ctx.beginPath();
    ctx.arc(W * 0.92, H * 0.22, 12 * u, 0, Math.PI * 2);
    ctx.fillStyle = '#8b7bff';
    ctx.fill();
    ctx.restore();
    return c;
  }

  /* --- big panels: lock screen / widgets --- */
  const ins = W * 0.075;
  ctx.save();
  statusBar(ctx, W, H, Math.min(u, 1.1), 'rgba(255,255,255,0.9)', 1);
  ctx.restore();

  const clockSize = kind === 'folder' ? 200 : kind === 'full' ? 210 : 210;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  ctx.font = `200 ${Math.round(clockSize * u)}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('9:41', ins, H * 0.3);
  ctx.fillStyle = 'rgba(226,232,255,0.6)';
  ctx.font = `400 ${Math.round(46 * u)}px ${FONT}`;
  ctx.fillText('Sat, Nov 14', ins + 4 * u, H * 0.365);
  ctx.restore();

  // weather row
  ctx.save();
  sun(ctx, ins + 22 * u, H * 0.435, 26 * u, '#ffd479');
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `300 ${Math.round(48 * u)}px ${FONT}`;
  ctx.fillText('18°   Clear', ins + 66 * u, H * 0.45);
  ctx.restore();

  if (kind === 'tall' || kind === 'normal' || kind === 'wide') {
    const notes = [
      ['message', '#3a8bff', 'Mina', 'See you at 6:30!'],
      ['call', '#2ac66b', 'Mom', 'Missed call · 12 min'],
    ];
    notes.forEach((n, i) => {
      const y = H * 0.53 + i * H * 0.1;
      ctx.save();
      rr(ctx, ins, y, W - ins * 2, H * 0.086, 30 * u);
      ctx.fillStyle = 'rgba(255,255,255,0.085)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      ctx.stroke();
      const s = H * 0.05;
      const g = ctx.createLinearGradient(ins + 22 * u, y + 12 * u, ins + 22 * u + s, y + 12 * u + s);
      g.addColorStop(0, n[1]);
      g.addColorStop(1, hexAlpha(n[1], 0.45));
      rr(ctx, ins + 22 * u, y + (H * 0.086 - s) / 2, s, s, s * 0.3);
      ctx.fillStyle = g;
      ctx.fill();
      glyph(ctx, n[0], ins + 22 * u + s / 2, y + H * 0.043, s * 0.6, 'rgba(255,255,255,0.95)');
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = `600 ${Math.round(32 * u)}px ${FONT}`;
      ctx.fillText(n[2], ins + 34 * u + s, y + H * 0.038);
      ctx.fillStyle = 'rgba(226,232,255,0.58)';
      ctx.font = `400 ${Math.round(27 * u)}px ${FONT}`;
      ctx.fillText(n[3], ins + 34 * u + s, y + H * 0.066);
      ctx.restore();
    });
  }

  if (kind === 'folder') {
    // compact widget tiles
    const tiles = [
      ['Music', 'Night Drive', '#8b7bff'],
      ['Steps', '6,204', '#3ddad7'],
    ];
    tiles.forEach((t, i) => {
      const y = H * 0.5 + i * H * 0.115;
      ctx.save();
      rr(ctx, ins, y, W - ins * 2, H * 0.1, 30 * u);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.11)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = hexAlpha(t[2], 0.95);
      ctx.beginPath();
      ctx.arc(ins + 46 * u, y + H * 0.05, 14 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `500 ${Math.round(30 * u)}px ${FONT}`;
      ctx.fillText(t[1], ins + 74 * u, y + H * 0.062);
      ctx.fillStyle = 'rgba(226,232,255,0.5)';
      ctx.font = `400 ${Math.round(24 * u)}px ${FONT}`;
      ctx.fillText(t[0], ins + 74 * u, y + H * 0.086);
      ctx.restore();
    });
  }

  if (kind === 'full') {
    // Now Brief card
    const y = H * 0.52;
    ctx.save();
    rr(ctx, ins, y, W - ins * 2, H * 0.17, 34 * u);
    const g = ctx.createLinearGradient(ins, y, W - ins, y + H * 0.17);
    g.addColorStop(0, 'rgba(139,123,255,0.22)');
    g.addColorStop(1, 'rgba(61,218,215,0.1)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = `600 ${Math.round(26 * u)}px ${FONT}`;
    ctx.fillText('NOW BRIEF', ins + 28 * u, y + H * 0.045);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = `400 ${Math.round(32 * u)}px ${FONT}`;
    ctx.fillText('Grandparents at 18:30', ins + 28 * u, y + H * 0.09);
    ctx.fillStyle = 'rgba(226,232,255,0.6)';
    ctx.font = `400 ${Math.round(27 * u)}px ${FONT}`;
    ctx.fillText('Leave by 17:50 · 24 min', ins + 28 * u, y + H * 0.128);
    ctx.restore();
  }

  // quick shortcuts on round covers
  if (kind === 'folder' || kind === 'full') {
    const sh = ['call', 'message', 'camera', 'music'];
    const y = H - 120 * u;
    sh.forEach((kindOf, i) => {
      const x = ins + 52 * u + i * ((W - ins * 2 - 104 * u) / 3);
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, 40 * u, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fill();
      glyph(ctx, kindOf, x, y, 40 * u, 'rgba(255,255,255,0.9)');
      ctx.restore();
    });
  }

  // glass sheen
  ctx.save();
  const sheen = ctx.createLinearGradient(0, 0, W, H * 0.6);
  sheen.addColorStop(0, 'rgba(255,255,255,0.06)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.012)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  return c;
}

/* ---------- engraved wordmark ---------- */

function drawEngrave(text) {
  const W = 1024;
  const H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.translate(W, 0);
  ctx.scale(-1, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  let size = 92;
  do {
    ctx.font = `500 ${size}px ${FONT}`;
    size -= 4;
  } while (ctx.measureText(text).width > W * 0.82 && size > 30);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '12px';
  ctx.fillText(text, W / 2, H / 2);
  return c;
}

function drawWordmark(text) {
  const W = 2048;
  const H = 128;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.translate(W, 0);
  ctx.scale(-1, 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 84px ${FONT}`;
  const base = ctx.measureText(text).width;
  if (ctx.letterSpacing !== undefined) {
    ctx.letterSpacing = `${Math.max(0, (W * 0.88 - base) / Math.max(1, text.length - 1))}px`;
  }
  /* engraved: a dark cut with a lit lower lip */
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(text, W / 2, H / 2 + 3);
  ctx.fillStyle = 'rgba(12,16,22,0.82)';
  ctx.fillText(text, W / 2, H / 2);
  return c;
}

/* ---------- material maps ---------- */

function drawBrushedRough(size = PERF.tier === 'low' ? 256 : 512) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c9c9c9';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i += 1) {
    const x = Math.random() * size;
    const v = 150 + Math.random() * 90;
    ctx.strokeStyle = `rgba(${v},${v},${v},${0.05 + Math.random() * 0.1})`;
    ctx.lineWidth = Math.random() * 2.2 + 0.3;
    ctx.beginPath();
    ctx.moveTo(x, -10);
    ctx.bezierCurveTo(x + 4, size * 0.3, x - 4, size * 0.7, x, size + 10);
    ctx.stroke();
  }
  return c;
}

function drawMicroNoise(size = PERF.tier === 'low' ? 128 : 256) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i += 1) {
    const r = 176 + Math.random() * 62;
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = r;
    img.data[i * 4 + 2] = r;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function drawConcentric(size = PERF.tier === 'low' ? 128 : 256) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  for (let r = 4; r < size * 0.72; r += 3) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = r % 6 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  return c;
}

/* ---------- public API ---------- */

const cache = new Map();

function tex(canvas, { srgb = true, repeat = null, aniso = PERF.aniso } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

function memo(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

export function innerDisplayTexture(model) {
  return memo(`inner:${model.id}`, () => tex(drawInner(model)));
}

export function coverDisplayTexture(model) {
  return memo(`cover:${model.id}`, () => tex(drawCover(model)));
}

export function engraveTexture(text) {
  return memo(`etch:${text}`, () => tex(drawEngrave(text), { aniso: Math.min(4, PERF.aniso) }));
}

export function wordmarkTexture(text) {
  return memo(`word:${text}`, () => tex(drawWordmark(text), { aniso: Math.min(4, PERF.aniso) }));
}

/* ---------- spine wordmark: drawn along the device height ---------- */

function drawSpineWordmark(text) {
  /* u runs across the letters (their height), v runs along the word */
  const W = 160;
  const H = 2048;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.translate(W / 2, H / 2);
  /* letters read from the bottom of the spine towards the top */
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(W * 0.46)}px ${FONT}`;
  const base = ctx.measureText(text).width;
  if (ctx.letterSpacing !== undefined) {
    ctx.letterSpacing = `${Math.max(0, (H * 0.72 - base) / Math.max(1, text.length - 1))}px`;
  }
  /* engraved: a soft lit lower lip under a dark cut */
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(text, 1.8, 0);
  ctx.fillStyle = 'rgba(6,8,12,0.94)';
  ctx.fillText(text, 0, 0);
  return c;
}

export function spineWordmarkTexture(text) {
  return memo(`spineword:${text}`, () => tex(drawSpineWordmark(text), { aniso: Math.min(4, PERF.aniso) }));
}

export function brushedRoughnessTexture() {
  return memo('brushed', () =>
    tex(drawBrushedRough(), { srgb: false, repeat: [2, 3], aniso: Math.min(4, PERF.aniso) })
  );
}

export function microRoughnessTexture() {
  return memo('micro', () =>
    tex(drawMicroNoise(), { srgb: false, repeat: [4, 4], aniso: Math.min(4, PERF.aniso) })
  );
}

export function concentricTexture() {
  return memo('concentric', () => tex(drawConcentric(), { srgb: false, aniso: Math.min(4, PERF.aniso) }));
}
