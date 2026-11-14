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
