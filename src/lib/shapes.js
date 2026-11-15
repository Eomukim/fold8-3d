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
 * Hinge spine shell — the curved armour-aluminium cover that wraps the fold.
 *
 * The section is an arc about the fold axis: the outer skin sits at `Ro`, the
 * inner skin `thick` below it, and the band spans `span` radians symmetric
 * about the outward (-z) direction, so its two ends land exactly on the two
 * back faces and the cover can never protrude past the body silhouette.
 * The band thins towards both ends (a cover tapers onto the glass) and carries
 * two machined parting grooves near its ends — the hinge caps.
 *
 * Local frame: fold axis = y through the origin, outward = -z.
 */
export function hingeShellGeometry(o) {
  const Ro = Math.max(0.02, o.Ro);
  const thick = Math.max(0.004, o.thick ?? 0.05);
  const span = Math.max(0.0008, o.span ?? 1);
  const len = Math.max(0.1, o.len);
  const segsU = Math.max(10, o.segsU ?? 48);
  const segsV = Math.max(2, o.segsV ?? 4);
  const capH = o.capH ?? 0.24; // distance of the parting groove from each end
  const groove = o.groove ?? 0.016;
  const grooveW = o.grooveW ?? 0.05;
  const endChamfer = o.endChamfer ?? 0.02;
  const taper = o.taper ?? 0.3; // how far in from each end the cover thins
  const minT = o.minT ?? 0.34; // end thickness as a share of `thick`

  /* thickness factor across the arc: full in the middle, thinner at the ends */
  const tf = (a) => {
    const e = Math.min(a + span / 2, span / 2 - a);
    const t = Math.min(1, e / Math.max(1e-4, taper * span * 0.5));
    const s = t * t * (3 - 2 * t);
    return minT + (1 - minT) * s;
  };

  /* outer radius along the axis: two narrow parting grooves + a chamfer at the
     very ends so the cover rolls off instead of ending on a sharp lip */
  const roAt = (y) => {
    let r = Ro;
    const dEnd = len / 2 - Math.abs(y);
    if (dEnd < endChamfer) {
      const t = 1 - dEnd / endChamfer;
      r -= endChamfer * 0.5 * t * t;
    }
    for (const cy of [-len / 2 + capH, len / 2 - capH]) {
      const d = Math.abs(y - cy) / grooveW;
      if (d < 1) r -= groove * (1 - d * d);
    }
    return r;
  };

  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  const push = (x, y, z, nx, ny, nz, u, v) => {
    pos.push(x, y, z);
    nor.push(nx, ny, nz);
    uv.push(u, v);
    return pos.length / 3 - 1;
  };
  const sinA = (a) => Math.sin(a);
  const cosA = (a) => -Math.cos(a);

  /* ---- outer skin ---- */
  const outer = [];
  for (let j = 0; j <= segsV; j += 1) {
    const v = j / segsV;
    const y = (v - 0.5) * len;
    const r = roAt(y);
    const row = [];
    for (let i = 0; i <= segsU; i += 1) {
      const t = i / segsU;
      const a = (t - 0.5) * span;
      row.push(push(r * sinA(a), y, r * cosA(a), sinA(a), 0, cosA(a), t, v));
    }
    outer.push(row);
  }
  for (let j = 0; j < segsV; j += 1) {
    for (let i = 0; i < segsU; i += 1) {
      const a = outer[j][i];
      const b = outer[j][i + 1];
      const c = outer[j + 1][i + 1];
      const d = outer[j + 1][i];
      idx.push(a, d, c, a, c, b);
    }
  }

  /* ---- inner skin (facing the fold axis) ---- */
  const inner = [];
  for (let j = 0; j <= segsV; j += 1) {
    const v = j / segsV;
    const y = (v - 0.5) * len;
    const ro = roAt(y);
    const row = [];
    for (let i = 0; i <= segsU; i += 1) {
      const t = i / segsU;
      const a = (t - 0.5) * span;
      const r = ro - thick * tf(a);
      row.push(push(r * sinA(a), y, r * cosA(a), -sinA(a), 0, -cosA(a), t, v));
    }
    inner.push(row);
  }
  for (let j = 0; j < segsV; j += 1) {
    for (let i = 0; i < segsU; i += 1) {
      const a = inner[j][i];
      const b = inner[j][i + 1];
      const c = inner[j + 1][i + 1];
      const d = inner[j + 1][i];
      idx.push(a, b, c, a, c, d);
    }
  }

  /* ---- side walls where the band leaves the two backs ---- */
  const wall = (side) => {
    const i = side < 0 ? 0 : segsU;
    const a = (side < 0 ? -0.5 : 0.5) * span;
    const nx = side * Math.cos(a);
    const nz = -side * Math.sin(a);
    for (let j = 0; j < segsV; j += 1) {
      const o0 = outer[j][i];
      const o1 = outer[j + 1][i];
      const i0 = inner[j][i];
      const i1 = inner[j + 1][i];
      void nx;
      void nz;
      if (side < 0) idx.push(o0, i0, i1, o0, i1, o1);
      else idx.push(o0, o1, i1, o0, i1, i0);
    }
  };
  wall(-1);
  wall(1);

  /* ---- the two rectangular end faces of the cover ---- */
  const cap = (j, sign) => {
    for (let i = 0; i < segsU; i += 1) {
      const o0 = outer[j][i];
      const o1 = outer[j][i + 1];
      const i0 = inner[j][i];
      const i1 = inner[j][i + 1];
      if (sign > 0) idx.push(o0, o1, i1, o0, i1, i0);
      else idx.push(o0, i0, i1, o0, i1, o1);
    }
  };
  cap(0, -1);
  cap(segsV, 1);

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

/* ------------------------------------------------------------------ */
/*  merge helper                                                      */
/* ------------------------------------------------------------------ */

function mergeGeos(list) {
  let vc = 0;
  let ic = 0;
  list.forEach((g) => {
    vc += g.attributes.position.count;
    ic += g.index ? g.index.count : g.attributes.position.count;
  });
  const pos = new Float32Array(vc * 3);
  const nor = new Float32Array(vc * 3);
  const uv = new Float32Array(vc * 2);
  const idx = vc > 65535 ? new Uint32Array(ic) : new Uint16Array(ic);
  let vo = 0;
  let io = 0;
  list.forEach((g) => {
    const p = g.attributes.position;
    const n = g.attributes.normal;
    const t = g.attributes.uv;
    pos.set(p.array, vo * 3);
    if (n) nor.set(n.array, vo * 3);
    if (t) uv.set(t.array, vo * 2);
    const gi = g.index;
    if (gi) {
      for (let i = 0; i < gi.count; i += 1) idx[io + i] = gi.array[i] + vo;
      io += gi.count;
    } else {
      for (let i = 0; i < p.count; i += 1) idx[io + i] = i + vo;
      io += p.count;
    }
    vo += p.count;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/* ------------------------------------------------------------------ */
/*  camera pad: a lifted plate with a soft shoulder                   */
/*                                                                    */
/*  The old plate used a hard 45° chamfer, whose flat bands lit up as */
/*  a bead chain along the rounded ends. This builds the same plate    */
/*  with a quarter-round shoulder and continuous normals, so the      */
/*  edge reads as one soft highlight exactly like the moulded glass   */
/*  of a real camera bump.                                            */
/* ------------------------------------------------------------------ */

export function padGeometry(outline, height, shoulder = 0.05, roundSteps = 4) {
  const n = outline.length;
  const h = Math.max(0.004, height);
  const r = Math.max(0.002, Math.min(shoulder, h * 1.6));
  const steps = Math.max(2, roundSteps);
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
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
  const vert = (x, y, z, nx, ny, nz) => {
    pos.push(x, y, z);
    nor.push(nx, ny, nz);
    uv.push((x - ux0) / uw, (y - uy0) / uh);
    return pos.length / 3 - 1;
  };

  /* top face (z = 0, outward), flat fan */
  let cx = 0;
  let cy = 0;
  outline.forEach((p) => {
    cx += p[0] / n;
    cy += p[1] / n;
  });
  const tc = vert(cx, cy, 0, 0, 0, 1);
  const ring0 = outline.map((p) => vert(p[0], p[1], 0, 0, 0, 1));
  for (let i = 0; i < n; i += 1) idx.push(tc, ring0[i], ring0[(i + 1) % n]);

  /* shoulder: quarter round from the top edge down to the wall */
  const rows = [];
  for (let s = 0; s <= steps; s += 1) {
    const phi = (s / steps) * (Math.PI / 2);
    const uIn = r * (1 - Math.cos(phi));
    const z = -r * Math.sin(phi) * (r > h ? h / r : 1);
    const row = outline.map((p) =>
      vert(
        p[0] - p[2] * uIn,
        p[1] - p[3] * uIn,
        z,
        p[2] * Math.sin(phi),
        p[3] * Math.sin(phi),
        Math.cos(phi)
      )
    );
    rows.push(row);
  }
  for (let s = 0; s < steps; s += 1) {
    for (let i = 0; i < n; i += 1) {
      const j = (i + 1) % n;
      idx.push(rows[s][i], rows[s][j], rows[s + 1][j], rows[s][i], rows[s + 1][j], rows[s + 1][i]);
    }
  }

  /* wall from the shoulder down to the glass */
  const wallTop = rows[rows.length - 1];
  const zWall = -Math.min(h, r);
  const wallBot = outline.map((p) =>
    vert(p[0] - p[2] * r, p[1] - p[3] * r, -h, p[2], p[3], 0)
  );
  if (h > r + 0.001) {
    for (let i = 0; i < n; i += 1) {
      const j = (i + 1) % n;
      idx.push(wallTop[i], wallTop[j], wallBot[j], wallTop[i], wallBot[j], wallBot[i]);
    }
    void zWall;
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

/* ------------------------------------------------------------------ */
/*  solid hinge block                                                 */
/*                                                                    */
/*  The cover is a solid sector of armour aluminium about the fold    */
/*  axis, not a shell: the outer arc is the visible skin, the two     */
/*  flat walls are the faces that meet the back panels, and the body  */
/*  runs deep towards the axis so its ends are never a knife edge.    */
/*  Both ends of the arc roll down onto the glass, so the cover meets */
/*  each panel flush instead of stopping on a lip.                    */
/*                                                                    */
/*  Local frame: fold axis = y through the origin, outward = -z.      */
/* ------------------------------------------------------------------ */

export function hingeBlockGeometry(o) {
  const Ro = Math.max(0.03, o.Ro);
  const Ri = Math.max(0.012, Math.min(o.Ri ?? Ro * 0.5, Ro - 0.02));
  const span = Math.max(0.0006, o.span ?? 1);
  const len = Math.max(0.08, o.len);
  const segsU = Math.max(6, o.segsU ?? 40);
  const segsV = Math.max(2, o.segsV ?? 6);
  const endRound = Math.max(0, Math.min(o.endRound ?? 0.05, len * 0.3));
  const Rland = Math.min(Ro - 0.002, o.Rland ?? Ro);
  const arcEdge = Math.max(0.001, Math.min(o.arcEdge ?? 0.06, span * 0.42));
  const crown = Math.max(0, Math.min(o.crown ?? 0.012, (Ro - Rland) * 0.9));
  const insetStart = o.insetStart ?? 0; // start of the local z recess (unused hook)
  const halfSpan = span / 2;

  const rOut = (y, a) => {
    /* a real hinge cover is a nearly flat plate with a gentle crown, not a
       cylinder: the radius of curvature is several times the fold radius */
    const u = Math.min(1, Math.abs(a) / Math.max(1e-5, halfSpan));
    let r = Ro - crown * u * u;
    if (endRound > 0.001) {
      const dEnd = len / 2 - Math.abs(y);
      if (dEnd < endRound) {
        const t = 1 - Math.max(0, dEnd) / endRound;
        r -= endRound * 0.55 * t * t;
      }
    }
    const da = halfSpan - Math.abs(a);
    if (da < arcEdge) {
      const t = 1 - da / arcEdge;
      const s = t * t * (3 - 2 * t);
      r += (Rland - r) * s;
    }
    void insetStart;
    return r;
  };

  /* outer arc skin */
  const outer = [];
  for (let j = 0; j <= segsV; j += 1) {
    const v = j / segsV;
    const y = (v - 0.5) * len;
    const row = [];
    for (let i = 0; i <= segsU; i += 1) {
      const t = i / segsU;
      const a = (t - 0.5) * span;
      const r = rOut(y, a);
      row.push([r * Math.sin(a), y, -r * Math.cos(a)]);
    }
    outer.push(row);
  }
  const oPos = [];
  const oIdx = [];
  const oUv = [];
  outer.forEach((row, j) => {
    row.forEach((p, i) => {
      oPos.push(p[0], p[1], p[2]);
      oUv.push(i / segsU, j / segsV);
    });
  });
  for (let j = 0; j < segsV; j += 1) {
    for (let i = 0; i < segsU; i += 1) {
      const a = j * (segsU + 1) + i;
      const b = a + 1;
      const c = a + segsU + 2;
      const d = a + segsU + 1;
      oIdx.push(a, d, c, a, c, b);
    }
  }
  const gOuter = new THREE.BufferGeometry();
  gOuter.setAttribute('position', new THREE.Float32BufferAttribute(oPos, 3));
  gOuter.setAttribute('uv', new THREE.Float32BufferAttribute(oUv, 2));
  gOuter.setIndex(oIdx);
  gOuter.computeVertexNormals();

  /* the two flat walls that meet the back panels */
  const wall = (side) => {
    const i = side < 0 ? 0 : segsU;
    const a = (side < 0 ? -0.5 : 0.5) * span;
    const nx = Math.sin(a);
    const nz = -Math.cos(a);
    const pos = [];
    const nor = [];
    const uv = [];
    const idx = [];
    for (let j = 0; j <= segsV; j += 1) {
      const v = j / segsV;
      const y = (v - 0.5) * len;
      const r = rOut(y, a);
      pos.push(r * nx, y, r * nz);
      nor.push(nx, 0, nz);
      uv.push(0, v);
      pos.push(Ri * nx, y, Ri * nz);
      nor.push(nx, 0, nz);
      uv.push(1, v);
    }
    for (let j = 0; j < segsV; j += 1) {
      const a0 = j * 2;
      const b0 = a0 + 2;
      if (side < 0) idx.push(a0, a0 + 1, b0 + 1, a0, b0 + 1, b0);
      else idx.push(a0, b0 + 1, a0 + 1, a0, b0, b0 + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  };

  /* inner arc, buried in the body */
  const iPos = [];
  const iNor = [];
  const iUv = [];
  const iIdx = [];
  for (let j = 0; j <= segsV; j += 1) {
    const y = (j / segsV - 0.5) * len;
    for (let i = 0; i <= segsU; i += 1) {
      const a = (i / segsU - 0.5) * span;
      iPos.push(Ri * Math.sin(a), y, -Ri * Math.cos(a));
      iNor.push(-Math.sin(a), 0, Math.cos(a));
      iUv.push(i / segsU, j / segsV);
    }
  }
  for (let j = 0; j < segsV; j += 1) {
    for (let i = 0; i < segsU; i += 1) {
      const a = j * (segsU + 1) + i;
      iIdx.push(a, a + 1, a + segsU + 2, a, a + segsU + 2, a + segsU + 1);
    }
  }
  const gInner = new THREE.BufferGeometry();
  gInner.setAttribute('position', new THREE.Float32BufferAttribute(iPos, 3));
  gInner.setAttribute('normal', new THREE.Float32BufferAttribute(iNor, 3));
  gInner.setAttribute('uv', new THREE.Float32BufferAttribute(iUv, 2));
  gInner.setIndex(iIdx);

  /* the two end faces of the block */
  const endFace = (sign) => {
    const y = sign * (len / 2);
    const pos = [];
    const nor = [];
    const uv = [];
    const idx = [];
    const r0 = rOut(y, -halfSpan);
    const r1 = rOut(y, halfSpan);
    pos.push(0, y, 0);
    nor.push(0, sign, 0);
    uv.push(0.5, 0.5);
    for (let i = 0; i <= segsU; i += 1) {
      const a = (i / segsU - 0.5) * span;
      const r = r0 + ((r1 - r0) * i) / segsU;
      pos.push(r * Math.sin(a), y, -r * Math.cos(a));
      nor.push(0, sign, 0);
      uv.push(i / segsU, 1);
    }
    for (let i = 0; i <= segsU; i += 1) {
      const a = (i / segsU - 0.5) * span;
      pos.push(Ri * Math.sin(a), y, -Ri * Math.cos(a));
      nor.push(0, sign, 0);
      uv.push(i / segsU, 0);
    }
    for (let i = 0; i < segsU; i += 1) {
      const a0 = 1 + i;
      const a1 = a0 + 1;
      const b0 = 1 + segsU + 1 + i;
      const b1 = b0 + 1;
      if (sign > 0) idx.push(a0, b0, b1, a0, b1, a1);
      else idx.push(a0, b1, b0, a0, a1, b1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  };

  return mergeGeos([gOuter, wall(-1), wall(1), gInner, endFace(-1), endFace(1)]);
}

/* ------------------------------------------------------------------ */
/*  lens dome: the convex sapphire window over a camera element       */
/*                                                                    */
/*  Planar UVs so the element's face reads straight on from outside,   */
/*  while the real curvature carries the specular highlight.          */
/* ------------------------------------------------------------------ */

export function lensDomeGeometry(R, sag = 0.12, segs = 28) {
  const radius = Math.max(0.01, R);
  const s = Math.max(0.002, Math.min(sag, radius * 0.6));
  const Rs = (radius * radius + s * s) / (2 * s);
  const zc = Rs - s; // sphere centre sits this far out (toward +z)
  const rings = Math.max(3, Math.round(segs * 0.5));
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  pos.push(0, 0, -s);
  nor.push(0, 0, -1);
  uv.push(0.5, 0.5);
  for (let r = 1; r <= rings; r += 1) {
    const rr = (r / rings) * radius;
    const z = -s + (Rs - Math.sqrt(Math.max(0, Rs * Rs - rr * rr)));
    for (let i = 0; i < segs; i += 1) {
      const a = (i / segs) * Math.PI * 2;
      const x = rr * Math.cos(a);
      const y = rr * Math.sin(a);
      pos.push(x, y, z);
      nor.push(x / Rs, y / Rs, (z - zc) / Rs);
      uv.push(0.5 + x / (2 * radius), 0.5 + y / (2 * radius));
    }
  }
  /* wound so the visible face points outward (-z) */
  for (let i = 0; i < segs; i += 1) idx.push(0, 1 + ((i + 1) % segs), 1 + i);
  for (let r = 1; r < rings; r += 1) {
    const o0 = 1 + (r - 1) * segs;
    const o1 = 1 + r * segs;
    for (let i = 0; i < segs; i += 1) {
      const j = (i + 1) % segs;
      idx.push(o0 + i, o1 + j, o1 + i, o0 + i, o0 + j, o1 + j);
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
