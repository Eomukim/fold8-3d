import * as THREE from 'three';

const FONT =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif';

/* ---------- small helpers ---------- */

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
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

function glow(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hexAlpha(color, alpha));
  g.addColorStop(0.45, hexAlpha(color, alpha * 0.42));
  g.addColorStop(1, hexAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function hexAlpha(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

function grain(ctx, w, h, amount = 2400, alpha = 0.022) {
  for (let i = 0; i < amount; i += 1) {
    const v = Math.random();
    ctx.fillStyle = `rgba(${v > 0.5 ? 255 : 0},${v > 0.5 ? 255 : 0},${v > 0.5 ? 255 : 0},${alpha})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.2, 1.2);
  }
}

/* ---------- glyphs ---------- */

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
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.12, cy + s * 0.2);
      ctx.lineTo(cx - s * 0.14, cy + s * 0.34);
      ctx.lineTo(cx + s * 0.04, cy + s * 0.2);
      ctx.stroke();
      break;
    case 'camera':
      rr(ctx, cx - s * 0.34, cy - s * 0.22, s * 0.68, s * 0.46, s * 0.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + s * 0.01, s * 0.13, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'wallet':
      rr(ctx, cx - s * 0.33, cy - s * 0.22, s * 0.66, s * 0.44, s * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.33, cy - s * 0.02);
      ctx.lineTo(cx + s * 0.1, cy - s * 0.02);
      ctx.stroke();
      break;
    case 'music':
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
    case 'map':
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.06, s * 0.2, Math.PI, Math.PI * 2.15);
      ctx.lineTo(cx, cy + s * 0.32);
      ctx.closePath();
      ctx.stroke();
      break;
    case 'gear':
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.14, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * s * 0.18, cy + Math.sin(a) * s * 0.18);
        ctx.lineTo(cx + Math.cos(a) * s * 0.3, cy + Math.sin(a) * s * 0.3);
        ctx.stroke();
      }
      break;
    case 'gall':
      rr(ctx, cx - s * 0.3, cy - s * 0.3, s * 0.6, s * 0.6, s * 0.14);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - s * 0.08, cy - s * 0.1, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.2, cy + s * 0.2);
      ctx.lineTo(cx - s * 0.02, cy - s * 0.02);
      ctx.lineTo(cx + s * 0.16, cy + s * 0.2);
      ctx.stroke();
      break;
    default:
      break;
  }
  ctx.restore();
}

/* ---------- inner (main) display ---------- */

function drawInnerDisplay() {
  const W = 1680;
  const H = 2240;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');

  // base — deep AMOLED black with a cool lift toward the top
  const bg = ctx.createLinearGradient(0, H * 0.05, W * 0.2, H);
  bg.addColorStop(0, '#070a12');
  bg.addColorStop(0.4, '#05070d');
  bg.addColorStop(1, '#020308');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const top = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  top.addColorStop(0, 'rgba(58,72,140,0.22)');
  top.addColorStop(0.55, 'rgba(30,38,80,0.08)');
  top.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, H * 0.55);

  // a single, crisp light trail across the panel
  ctx.save();
  const trail = ctx.createLinearGradient(0, H * 0.3, W, H * 0.52);
  trail.addColorStop(0, 'rgba(150,170,255,0)');
  trail.addColorStop(0.28, 'rgba(168,190,255,0.5)');
  trail.addColorStop(0.52, 'rgba(120,235,225,0.55)');
  trail.addColorStop(0.78, 'rgba(150,170,255,0.18)');
  trail.addColorStop(1, 'rgba(150,170,255,0)');
  ctx.strokeStyle = trail;
  ctx.lineWidth = 3.2;
  ctx.shadowColor = 'rgba(140,170,255,0.55)';
  ctx.shadowBlur = 26;
  ctx.beginPath();
  ctx.moveTo(-40, H * 0.47);
  ctx.bezierCurveTo(W * 0.28, H * 0.3, W * 0.66, H * 0.56, W + 40, H * 0.36);
  ctx.stroke();
  ctx.restore();

  // soft aura in the lower third, kept away from the clock
  ctx.save();
  const aura = ctx.createRadialGradient(W * 0.52, H * 1.02, 0, W * 0.52, H * 1.02, W * 0.78);
  aura.addColorStop(0, 'rgba(96,86,255,0.40)');
  aura.addColorStop(0.4, 'rgba(60,60,190,0.14)');
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.fillRect(0, H * 0.45, W, H * 0.55);
  const aura2 = ctx.createRadialGradient(W * 0.9, H * 0.62, 0, W * 0.9, H * 0.62, W * 0.42);
  aura2.addColorStop(0, 'rgba(20,190,185,0.14)');
  aura2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura2;
  ctx.fillRect(0, H * 0.3, W, H * 0.7);
  ctx.restore();

  // faint hairline grid
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i += 1) {
    ctx.beginPath();
    ctx.moveTo(0, (H / 6) * i);
    ctx.lineTo(W, (H / 6) * i);
    ctx.stroke();
  }
  ctx.restore();

  grain(ctx, W, H, 4200, 0.018);
  grain(ctx, W, H, 5200, 0.02);

  /* --- status bar --- */
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.font = `600 46px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('9:41', 76, 96);
  ctx.textAlign = 'right';
  // signal bars
  for (let i = 0; i < 4; i += 1) {
    const h = 12 + i * 7;
    rr(ctx, W - 300 + i * 17, 96 - h, 11, h, 3);
    ctx.fill();
  }
  // wifi
  ctx.strokeStyle = 'rgba(255,255,255,0.94)';
  ctx.lineWidth = 7;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(W - 200, 100, 10 + i * 11, -Math.PI * 0.78, -Math.PI * 0.22);
    ctx.stroke();
  }
  // battery
  ctx.lineWidth = 5;
  rr(ctx, W - 150, 66, 66, 34, 9);
  ctx.stroke();
  rr(ctx, W - 144, 72, 44, 22, 5);
  ctx.fill();
  rr(ctx, W - 80, 76, 6, 14, 3);
  ctx.fill();
  ctx.restore();

  /* --- clock widget --- */
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  ctx.font = `200 340px ${FONT}`;
  ctx.fillText('9:41', 74, 700);

  ctx.fillStyle = 'rgba(226,232,255,0.62)';
  ctx.font = `400 54px ${FONT}`;
  ctx.fillText('Saturday, November 14', 84, 800);

  // weather chip
  const chipY = 860;
  rr(ctx, 84, chipY, 470, 132, 66);
  ctx.fillStyle = 'rgba(255,255,255,0.075)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // sun
  ctx.save();
  ctx.translate(160, chipY + 66);
  ctx.fillStyle = '#ffd479';
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 33, Math.sin(a) * 33);
    ctx.lineTo(Math.cos(a) * 44, Math.sin(a) * 44);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ffd479';
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `300 62px ${FONT}`;
  ctx.fillText('18°', 232, chipY + 84);
  ctx.fillStyle = 'rgba(226,232,255,0.55)';
  ctx.font = `400 34px ${FONT}`;
  ctx.fillText('Clear · Gangnam-gu', 232, chipY + 122);
  ctx.restore();

  /* --- agenda card --- */
  const cardY = 1090;
  const cardH = 430;
  ctx.save();
  rr(ctx, 74, cardY, W - 148, cardH, 54);
  const cg = ctx.createLinearGradient(74, cardY, W - 74, cardY + cardH);
  cg.addColorStop(0, 'rgba(255,255,255,0.07)');
  cg.addColorStop(1, 'rgba(255,255,255,0.028)');
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.13)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // accent bar
  rr(ctx, 74 + 54, cardY + 60, 9, 52, 5);
  ctx.fillStyle = '#8b7bff';
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText('UP NEXT', 74 + 84, cardY + 100);

  const rows = [
    ['18:30', "Grandparents' house", 'Family', '#8b7bff'],
    ['21:00', 'Flex mode test', 'Fold 8', '#3ddad7'],
  ];
  rows.forEach((row, i) => {
    const y = cardY + 170 + i * 130;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = `500 46px ${FONT}`;
    ctx.fillText(row[0], 140, y + 52);
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.font = `400 44px ${FONT}`;
    ctx.fillText(row[1], 330, y + 14);
    ctx.fillStyle = hexAlpha(row[3], 0.85);
    ctx.font = `400 34px ${FONT}`;
    ctx.fillText(row[2], 330, y + 62);
    if (i === 0) {
      ctx.beginPath();
      ctx.moveTo(140, y + 86);
      ctx.lineTo(W - 140, y + 86);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
  ctx.restore();

  /* --- dock --- */
  const dockY = H - 300;
  ctx.save();
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(W / 2 + (i - 1) * 34, dockY - 58, i === 0 ? 7 : 5, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.22)';
    ctx.fill();
  }
  rr(ctx, 90, dockY, W - 180, 190, 60);
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
  const iconSize = 96;
  const gap = 54;
  const rowW = iconSize * 4 + gap * 3;
  const x0 = (W - rowW) / 2;
  icons.forEach((ic, i) => {
    const x = x0 + i * (iconSize + gap);
    const y = dockY + 47;
    const g = ctx.createLinearGradient(x, y, x + iconSize, y + iconSize);
    g.addColorStop(0, ic[1]);
    g.addColorStop(1, ic[2]);
    rr(ctx, x, y, iconSize, iconSize, 26);
    ctx.fillStyle = g;
    ctx.fill();
    glyph(ctx, ic[0], x + iconSize / 2, y + iconSize / 2, iconSize * 0.62, 'rgba(255,255,255,0.95)');
  });
  ctx.restore();

  /* --- fold crease --- */
  ctx.save();
  const cw = 150;
  const cg2 = ctx.createLinearGradient(W / 2 - cw, 0, W / 2 + cw, 0);
  cg2.addColorStop(0, 'rgba(0,0,0,0)');
  cg2.addColorStop(0.42, 'rgba(0,0,0,0.06)');
  cg2.addColorStop(0.5, 'rgba(120,140,190,0.05)');
  cg2.addColorStop(0.58, 'rgba(0,0,0,0.06)');
  cg2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cg2;
  ctx.fillRect(W / 2 - cw, 0, cw * 2, H);
  ctx.fillStyle = 'rgba(190,215,255,0.03)';
  ctx.fillRect(W / 2 - 1, 0, 2, H);
  ctx.restore();

  /* --- glass sheen --- */
  ctx.save();
  const sheen = ctx.createLinearGradient(0, 0, W * 0.9, H * 0.75);
  sheen.addColorStop(0, 'rgba(255,255,255,0.045)');
  sheen.addColorStop(0.35, 'rgba(255,255,255,0.018)');
  sheen.addColorStop(0.62, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  return c;
}

/* ---------- cover display ---------- */

function drawCoverDisplay() {
  const W = 760;
  const H = 2000;
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

  glow(ctx, W * 0.1, H * 0.22, W * 1.0, '#5b4bff', 0.36);
  glow(ctx, W * 0.95, H * 0.62, W * 0.8, '#14b8a6', 0.2);
  glow(ctx, W * 0.5, H * 0.98, W * 0.9, '#4338ff', 0.22);

  ctx.save();
  ctx.strokeStyle = hexAlpha('#a78bfa', 0.16);
  ctx.lineWidth = 10;
  ctx.shadowColor = hexAlpha('#a78bfa', 0.4);
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.moveTo(-40, H * 0.55);
  ctx.bezierCurveTo(W * 0.5, H * 0.32, W * 0.4, H * 0.78, W + 40, H * 0.5);
  ctx.stroke();
  ctx.restore();

  grain(ctx, W, H, 2600, 0.02);

  // status bar
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText('9:41', 54, 82);
  ctx.textAlign = 'right';
  for (let i = 0; i < 4; i += 1) {
    const h = 8 + i * 5;
    rr(ctx, W - 160 + i * 12, 82 - h, 8, h, 2);
    ctx.fill();
  }
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  rr(ctx, W - 78, 60, 44, 24, 7);
  ctx.stroke();
  rr(ctx, W - 74, 64, 28, 16, 4);
  ctx.fill();
  ctx.restore();

  // punch-hole camera
  ctx.save();
  ctx.beginPath();
  ctx.arc(W / 2, 140, 15, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W / 2 - 3, 136, 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(90,120,200,0.5)';
  ctx.fill();
  ctx.restore();

  // lock screen clock
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  ctx.font = `200 210px ${FONT}`;
  ctx.fillText('9:41', 46, 430);
  ctx.fillStyle = 'rgba(226,232,255,0.6)';
  ctx.font = `400 40px ${FONT}`;
  ctx.fillText('Sat, Nov 14', 52, 495);

  // weather row
  ctx.save();
  ctx.translate(58, 570);
  ctx.fillStyle = '#ffd479';
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 22);
    ctx.lineTo(Math.cos(a) * 29, Math.sin(a) * 29);
    ctx.strokeStyle = '#ffd479';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `300 44px ${FONT}`;
  ctx.fillText('18°   Clear', 106, 588);
  ctx.restore();

  // notification cards
  const notes = [
    ['message', '#3a8bff', 'Mina', 'See you at 6:30 — bring the fold!'],
    ['call', '#2ac66b', 'Mom', 'Missed call · 12 min ago'],
  ];
  notes.forEach((n, i) => {
    const y = 700 + i * 190;
    ctx.save();
    rr(ctx, 40, y, W - 80, 158, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.085)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const g = ctx.createLinearGradient(70, y + 40, 130, y + 100);
    g.addColorStop(0, n[1]);
    g.addColorStop(1, hexAlpha(n[1], 0.45));
    rr(ctx, 70, y + 38, 58, 58, 18);
    ctx.fillStyle = g;
    ctx.fill();
    glyph(ctx, n[0], 99, y + 67, 34, 'rgba(255,255,255,0.95)');

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `600 34px ${FONT}`;
    ctx.fillText(n[2], 146, y + 66);
    ctx.fillStyle = 'rgba(226,232,255,0.6)';
    ctx.font = `400 30px ${FONT}`;
    ctx.fillText(n[3], 146, y + 108);
    ctx.restore();
  });

  // now bar
  ctx.save();
  rr(ctx, 60, H - 640, W - 120, 96, 48);
  ctx.fillStyle = 'rgba(255,255,255,0.09)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = hexAlpha('#8b7bff', 0.9);
  ctx.beginPath();
  ctx.arc(112, H - 592, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `500 30px ${FONT}`;
  ctx.fillText('Now playing · Night Drive', 150, H - 580);
  ctx.restore();

  // shortcuts
  const sh = [
    ['call', 120],
    ['message', 300],
    ['camera', 480],
    ['wallet', 640],
  ];
  sh.forEach((s) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(s[1], H - 300, 46, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fill();
    glyph(ctx, s[0], s[1], H - 300, 46, 'rgba(255,255,255,0.9)');
    ctx.restore();
  });

  // swipe hint
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = `400 26px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('Swipe up to unlock', W / 2, H - 180);
  rr(ctx, W / 2 - 60, H - 140, 120, 6, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  ctx.restore();

  // crease highlight not needed here (cover panel is one flat pane)
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

/* ---------- engraved wordmark (drawn mirrored: it lives on the back face) ---------- */

function drawEngrave(text) {
  const W = 1024;
  const H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.translate(W, 0);
  ctx.scale(-1, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.font = `500 92px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '14px';
  ctx.fillText(text, W / 2, H / 2);
  return c;
}

/* ---------- material maps ---------- */

function drawBrushedRough(size = 512) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c9c9c9';
  ctx.fillRect(0, 0, size, size);
  // long soft streaks along y (brushed along the phone's length)
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

function drawMicroNoise(size = 256) {
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

/* ---------- public API ---------- */

const cache = {};

function tex(canvas, { srgb = true, repeat = null, aniso = 8 } = {}) {
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

export function innerDisplayTexture() {
  if (!cache.inner) cache.inner = tex(drawInnerDisplay(), { aniso: 8 });
  return cache.inner;
}

export function coverDisplayTexture() {
  if (!cache.cover) cache.cover = tex(drawCoverDisplay(), { aniso: 8 });
  return cache.cover;
}

export function engraveTexture(text = 'GALAXY Z FOLD 8') {
  if (!cache.engrave) cache.engrave = tex(drawEngrave(text), { aniso: 4 });
  return cache.engrave;
}

export function brushedRoughnessTexture() {
  if (!cache.brushed)
    cache.brushed = tex(drawBrushedRough(), { srgb: false, repeat: [2, 3], aniso: 4 });
  return cache.brushed;
}

export function microRoughnessTexture() {
  if (!cache.micro)
    cache.micro = tex(drawMicroNoise(), { srgb: false, repeat: [4, 4], aniso: 4 });
  return cache.micro;
}
