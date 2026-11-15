import * as THREE from 'three';
import { SEG } from './perf';

/**
 * Rounded rectangle centred on (cx, cy).
 * radii = [topLeft, topRight, bottomRight, bottomLeft]
 */
export function roundedRectShape(w, h, radii, cx = 0, cy = 0) {
  const [tl, tr, br, bl] = Array.isArray(radii) ? radii : [radii, radii, radii, radii];
  const hw = w / 2;
  const hh = h / 2;
  const x0 = cx - hw;
  const x1 = cx + hw;
  const y0 = cy - hh;
  const y1 = cy + hh;
  const s = new THREE.Shape();
  s.moveTo(x0 + bl, y0);
  s.lineTo(x1 - br, y0);
  if (br > 0.0001) s.absarc(x1 - br, y0 + br, br, -Math.PI / 2, 0, false);
  s.lineTo(x1, y1 - tr);
  if (tr > 0.0001) s.absarc(x1 - tr, y1 - tr, tr, 0, Math.PI / 2, false);
  s.lineTo(x0 + tl, y1);
  if (tl > 0.0001) s.absarc(x0 + tl, y1 - tl, tl, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + bl);
  if (bl > 0.0001) s.absarc(x0 + bl, y0 + bl, bl, Math.PI, Math.PI * 1.5, false);
  return s;
}

/* ------------------------------------------------------------------ */
/*  outline + chamfered slab                                          */
/* ------------------------------------------------------------------ */

/**
 * Counter-clockwise outline of a rounded rectangle as flat [x, y, nx, ny]
 * quads: position plus the outward plan normal.  Sides are subdivided so a
 * long edge never spans a whole face without a vertex in between.
 */
export function roundedRectOutline(w, h, radii, cx = 0, cy = 0, opts = {}) {
  const [tl, tr, br, bl] = (Array.isArray(radii) ? radii : [radii, radii, radii, radii]).map((r) =>
    Math.max(0, Math.min(r, Math.min(w, h) / 2 - 0.001))
  );
  const curveSegs = opts.curveSegs ?? SEG.curve;
  const step = opts.step ?? 1.35;
  const hw = w / 2;
  const hh = h / 2;
  const pts = [];
  const pushArc = (ox, oy, r, a0, a1) => {
    const n = Math.max(2, Math.round(curveSegs * Math.abs(a1 - a0) / (Math.PI / 2)));
    for (let i = 0; i <= n; i += 1) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push([cx + ox + r * Math.cos(a), cy + oy + r * Math.sin(a), Math.cos(a), Math.sin(a)]);
    }
  };
  const pushLine = (x0, y0, x1, y1, nx, ny) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.ceil(len / step));
    for (let i = 0; i <= n; i += 1) {
      const t = i / n;
      pts.push([cx + x0 + (x1 - x0) * t, cy + y0 + (y1 - y0) * t, nx, ny]);
    }
  };
  // bottom edge  ->  right  ->  top  ->  left   (counter-clockwise)
  if (bl > 0) pushArc(-hw + bl, -hh + bl, bl, Math.PI, Math.PI * 1.5);
  else pts.push([cx - hw, cy - hh, -1, 0]);
  pushLine(-hw + bl, -hh, hw - br, -hh, 0, -1);
  if (br > 0) pushArc(hw - br, -hh + br, br, -Math.PI / 2, 0);
  else pts.push([cx + hw, cy - hh, 1, 0]);
  pushLine(hw, -hh + br, hw, hh - tr, 1, 0);
  if (tr > 0) pushArc(hw - tr, hh - tr, tr, 0, Math.PI / 2);
  else pts.push([cx + hw, cy + hh, 0, 1]);
  pushLine(hw - tr, hh, -hw + tl, hh, 0, 1);
  if (tl > 0) pushArc(-hw + tl, hh - tl, tl, Math.PI / 2, Math.PI);
  else pts.push([cx - hw, cy + hh, 0, 1]);
  pushLine(-hw, hh - tl, -hw, -hh + bl, -1, 0);
  // drop the duplicated closing point
  const out = [];
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    if (i === pts.length - 1 && Math.hypot(p[0] - out[0][0], p[1] - out[0][1]) < 1e-6) break;
    if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-7) continue;
    out.push(p);
  }
  return out;
}

/** Offset an outline inwards by `d` along its plan normals (shrink for a chamfer). */
export function insetOutline(pts, d) {
  return pts.map(([x, y, nx, ny]) => [x - nx * d, y - ny * d, nx, ny]);
}

/**
 * Slab built from an outline, with a crisp 45° chamfer on both faces.
 * The silhouette at mid thickness is exactly `outline`, so part dimensions
 * are exact instead of being grown by the bevel.
 */
export function chamferSlab(outline, thickness, chamfer = 0.04) {
  const c = Math.max(0.004, Math.min(chamfer, thickness * 0.35));
  const n = outline.length;
  const inner = outline.map(([x, y, nx, ny]) => [x - nx * c, y - ny * c, nx, ny]);
  const zB = -thickness / 2;
  const zT = thickness / 2;
  let ux0 = Infinity;
  let ux1 = -Infinity;
  let uy0 = Infinity;
  let uy1 = -Infinity;
  outline.forEach(([x, y]) => {
    ux0 = Math.min(ux0, x);
    ux1 = Math.max(ux1, x);
    uy0 = Math.min(uy0, y);
    uy1 = Math.max(uy1, y);
  });
  const uw = Math.max(1e-4, ux1 - ux0);
  const uh = Math.max(1e-4, uy1 - uy0);
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  const inv = 1 / Math.SQRT2;

  const vert = (p, z, nx, ny, nz) => {
    pos.push(p[0], p[1], z);
    nor.push(nx, ny, nz);
    uv.push((p[0] - ux0) / uw, (p[1] - uy0) / uh);
    return pos.length / 3 - 1;
  };

  /* --- bottom cap (fan, normal -z) --- */
  let cx0 = 0;
  let cy0 = 0;
  inner.forEach((p) => {
    cx0 += p[0] / n;
    cy0 += p[1] / n;
  });
  const bc = vert([cx0, cy0], zB, 0, 0, -1);
  const bring = inner.map((p) => vert(p, zB, 0, 0, -1));
  for (let i = 0; i < n; i += 1) {
    idx.push(bc, bring[(i + 1) % n], bring[i]);
  }

  /* --- chamfer band bottom --- */
  const lB = inner.map((p) => vert(p, zB, p[2] * inv, p[3] * inv, -inv));
  const uB = outline.map((p) => vert(p, zB + c, p[2], p[3], 0));
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    idx.push(lB[i], lB[j], uB[j], lB[i], uB[j], uB[i]);
  }

  /* --- side band --- */
  const uT = outline.map((p) => vert(p, zT - c, p[2], p[3], 0));
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    idx.push(uB[i], uB[j], uT[j], uB[i], uT[j], uT[i]);
  }

  /* --- chamfer band top --- */
  const lT = inner.map((p) => vert(p, zT, p[2] * inv, p[3] * inv, inv));
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    idx.push(uT[i], uT[j], lT[j], uT[i], lT[j], lT[i]);
  }

  /* --- top cap --- */
  const tc = vert([cx0, cy0], zT, 0, 0, 1);
  const tring = inner.map((p) => vert(p, zT, 0, 0, 1));
  for (let i = 0; i < n; i += 1) {
    idx.push(tc, tring[i], tring[(i + 1) % n]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Flat rounded-rectangle face (screen, glass, plates) with a linear UV window
 * so a half of a split display keeps its share of the texture.
 */
export function roundedFace(outline, uFrom, uTo, vFrom, vTo, flip = false) {
  const n = outline.length;
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  const minX = Math.min(...outline.map((p) => p[0]));
  const maxX = Math.max(...outline.map((p) => p[0]));
  const minY = Math.min(...outline.map((p) => p[1]));
  const maxY = Math.max(...outline.map((p) => p[1]));
  let cx = 0;
  let cy = 0;
  outline.forEach((p) => {
    cx += p[0] / n;
    cy += p[1] / n;
  });
  const U = (x) => uFrom + ((x - minX) / (maxX - minX)) * (uTo - uFrom);
  const V = (y) => vFrom + ((y - minY) / (maxY - minY)) * (vTo - vFrom);
  const push = (x, y) => {
    pos.push(x, y, 0);
    nor.push(0, 0, 1);
    const u = U(x);
    const v = V(y);
    uv.push(flip ? 1 - u : u, v);
    return pos.length / 3 - 1;
  };
  const c = push(cx, cy);
  const ring = outline.map((p) => push(p[0], p[1]));
  for (let i = 0; i < n; i += 1) {
    idx.push(c, ring[i], ring[(i + 1) % n]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeBoundingBox();
  return geo;
}

/**
 * Arc strip around the fold axis: a cylindrical surface of radius `radius`
 * spanning `span` radians symmetric about the outward (-z) direction, running
 * `length` along the fold axis (local y before the mesh is rotated).
 * `profile(t)` lets a generation taper the radius at the very ends.
 */
export function arcStrip(radius, span, length, segsU, segsV, profile = null) {
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  for (let j = 0; j <= segsV; j += 1) {
    const v = j / segsV;
    const y = (v - 0.5) * length;
    const k = profile ? profile(v) : 1;
    for (let i = 0; i <= segsU; i += 1) {
      const t = i / segsU;
      const a = (t - 0.5) * span;
      const r = radius * k;
      const nx = Math.sin(a) * k;
      const ny = -Math.cos(a) * k;
      pos.push(r * Math.sin(a), y, -r * Math.cos(a));
      nor.push(nx, 0, ny);
      uv.push(t, v);
    }
  }
  const row = segsU + 1;
  for (let j = 0; j < segsV; j += 1) {
    for (let i = 0; i < segsU; i += 1) {
      const a = j * row + i;
      idx.push(a, a + row + 1, a + 1, a, a + row, a + row + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Hinge spine: an arc of `radius` around the fold axis (±halfSpan about the
 * outward -z direction) running `length` along the fold axis, closed at both
 * ends by a solid sector face — the hinge end caps.
 */
export function spineGeometry(radius, halfSpan, length, segsU, opts = {}) {
  const segsV = opts.vSegs ?? 1;
  const ribs = opts.ribs ?? 0;
  const ribDepth = opts.ribDepth ?? 0.02;
  const ribWidth = opts.ribWidth ?? 0.05;
  const swapUV = opts.swapUV ?? false;
  const caps = opts.caps ?? true;
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  const n = Math.max(6, segsU);
  /* groove profile along the fold axis */
  const groove = (y) => {
    if (!ribs) return 0;
    let g = 0;
    for (let i = 1; i <= ribs; i += 1) {
      const c = (i / (ribs + 1) - 0.5) * length;
      const d = Math.abs(y - c) / ribWidth;
      g = Math.max(g, Math.max(0, 1 - d * d));
    }
    return g;
  };
  for (let j = 0; j <= segsV; j += 1) {
    const v = j / segsV;
    const y = (v - 0.5) * length;
    const r = radius - ribDepth * groove(y);
    for (let i = 0; i <= n; i += 1) {
      const a = (i / n - 0.5) * 2 * halfSpan;
      pos.push(r * Math.sin(a), y, -r * Math.cos(a));
      nor.push(Math.sin(a), 0, -Math.cos(a));
      if (swapUV) uv.push(v, i / n);
      else uv.push(i / n, v);
    }
  }
  const row = n + 1;
  for (let j = 0; j < segsV; j += 1) {
    for (let i = 0; i < n; i += 1) {
      const a = j * row + i;
      idx.push(a, a + row + 1, a + 1, a, a + row, a + row + 1);
    }
  }
  if (caps) addSpineCaps({ pos, nor, uv, idx, n, radius, halfSpan, length });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function addSpineCaps({ pos, nor, uv, idx, n, radius, halfSpan, length }) {
  [-length / 2, length / 2].forEach((y, k) => {
    const base = pos.length / 3;
    const sign = k === 0 ? -1 : 1;
    pos.push(0, y, 0);
    nor.push(0, sign, 0);
    uv.push(0.5, 0.5);
    for (let i = 0; i <= n; i += 1) {
      const a = (i / n - 0.5) * 2 * halfSpan;
      pos.push(radius * Math.sin(a), y, -radius * Math.cos(a));
      nor.push(0, sign, 0);
      uv.push(i / n, 0.5);
    }
    for (let i = 0; i < n; i += 1) {
      if (sign > 0) idx.push(base, base + 2 + i, base + 1 + i);
      else idx.push(base, base + 1 + i, base + 2 + i);
    }
  });
}

/**
 * Hinge cover plate: a flat rounded rectangle with a fine machined chamfer on
 * its outer face. Built so the outer face sits at z = 0 and the plate fills
 * z = [-thickness, 0] — the hinge frame then places it on the chord between
 * the two back faces.
 */
export function hingePlateGeometry(width, length, thickness, radius = 0.08, bevel = 0.016, curveSegs = SEG.curve) {
  const w = Math.max(0.02, width);
  const l = Math.max(0.02, length);
  const r = Math.max(0.004, Math.min(radius, Math.min(w, l) / 2 - 0.002));
  const t = Math.max(0.006, thickness);
  const bev = Math.max(0.002, Math.min(bevel, t * 0.34, r * 0.6));
  const depth = Math.max(0.002, t - 2 * bev);
  const shape = roundedRectShape(w, l, r, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bev,
    bevelSize: bev,
    bevelSegments: 2,
    curveSegments: Math.max(3, Math.round(curveSegs * 0.8)),
    steps: 1,
  });
  geo.translate(0, 0, -depth / 2 - t / 2);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  return geo;
}

/** Only the two solid end faces of the spine (hinge end caps). */
export function spineCaps(radius, halfSpan, length, segsU) {
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  addSpineCaps({ pos, nor, uv, idx, n: Math.max(6, segsU), radius, halfSpan, length });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/** Extruded, chamfered slab from a 2D shape, centred on z as well. */
export function extrudeChamfered(shape, thickness, bevel = 0.05, curveSegments = SEG.curve) {
  const depth = Math.max(0.001, thickness - 2 * bevel);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments,
    steps: 1,
  });
  geo.translate(0, 0, -(depth / 2));
  geo.computeVertexNormals();
  return geo;
}

/** Thin frame ring (rounded rect with a rounded hole) for bezels and lips. */
export function frameGeometry(w, h, radiusOuter, inset, depth, cx = 0, cy = 0) {
  const outer = roundedRectShape(w, h, radiusOuter, cx, cy);
  const inner = roundedRectShape(
    Math.max(0.01, w - inset * 2),
    Math.max(0.01, h - inset * 2),
    Math.max(0.005, radiusOuter - inset),
    cx,
    cy
  );
  const pts = inner.getPoints(SEG.frame * 3);
  const hole = new THREE.Path();
  hole.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) hole.lineTo(pts[i].x, pts[i].y);
  hole.closePath();
  outer.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(outer, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: SEG.frame,
    steps: 1,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

/** A plane whose UVs are a sub-rectangle of the full 0..1 texture space. */
export function splitScreenPlane(w, h, uFrom, uTo, vFrom = 0, vTo = 1) {
  const geo = new THREE.PlaneGeometry(w, h, SEG.screen, 1);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    uv.setXY(i, uFrom + (uTo - uFrom) * u, vFrom + (vTo - vFrom) * v);
  }
  uv.needsUpdate = true;
  return geo;
}
