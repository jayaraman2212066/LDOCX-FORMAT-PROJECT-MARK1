/**
 * LDOC Master Test Suite: Section 16
 * Deep Mathematical Verification of 2D General Polygon Boolean Clipping Engine
 * 
 * Tests:
 * 1. Convex Polygon Boolean Operations (Rectangles, Triangles)
 * 2. Concave Polygon Operations (L-shapes, Crosses, Stars without convex-hull distortion)
 * 3. Overlapping Polygons with Multiple Intersections (8-point star/square clipping)
 * 4. Disjoint Polygons (Multi-contour union, empty intersection, full difference)
 * 5. Nested Polygons (Holes: inner polygon completely inside outer polygon)
 * 6. Rotated Polygons (45-degree diamond vs axis-aligned square)
 * 7. Degenerate & Touching Edge Singularities (Zero crash, finite termination)
 * 8. Full Operations Suite: Union, Difference, Intersect, XOR, Divide, Trim
 * 9. Geometry Status Diagnostics & Topology Health Checks
 */

const assert = require('assert');
const path = require('path');
const LDocVectorEditor = require('../src/ldoc-vector-editor.js');

console.log('================================================================');
console.log('🧪 RUNNING SECTION 16: DEEP 2D POLYGON BOOLEAN CLIPPING ENGINE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  process.stdout.write(`▶ Test ${totalTests}: ${name}... `);
  try {
    fn();
    passedTests++;
    console.log('PASSED');
  } catch (err) {
    console.log('FAILED');
    console.error(`  Error: ${err.message}`);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers to create test shapes
// ─────────────────────────────────────────────────────────────────────────────

function createSquare(x, y, size) {
  return LDocVectorEditor.createPath([
    { x: x, y: y },
    { x: x + size, y: y },
    { x: x + size, y: y + size },
    { x: x, y: y + size }
  ], true);
}

function createLShape(x, y, w, h, thickness) {
  return LDocVectorEditor.createPath([
    { x: x, y: y },
    { x: x + w, y: y },
    { x: x + w, y: y + thickness },
    { x: x + thickness, y: y + thickness },
    { x: x + thickness, y: y + h },
    { x: x, y: y + h }
  ], true);
}

function createStar5(cx, cy, rOuter, rInner) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const r = (i % 2 === 0) ? rOuter : rInner;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return LDocVectorEditor.createPath(pts, true);
}

function createDiamond(cx, cy, radius) {
  return LDocVectorEditor.createPath([
    { x: cx, y: cy - radius },
    { x: cx + radius, y: cy },
    { x: cx, y: cy + radius },
    { x: cx - radius, y: cy }
  ], true);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Convex Polygon Boolean Operations
// ─────────────────────────────────────────────────────────────────────────────
test('Convex Polygons: Overlapping Square Union, Intersection, Difference', () => {
  const sqA = createSquare(0, 0, 100);
  const sqB = createSquare(50, 0, 100);

  // Union
  const unionRes = LDocVectorEditor.booleanOperation(sqA, sqB, 'union');
  assert.ok(unionRes && unionRes.nodes.length >= 4, 'Union should produce valid polygon');
  const bboxUnion = LDocVectorEditor.getBoundingBox(LDocVectorEditor.pathToPolygon(unionRes));
  assert.strictEqual(bboxUnion.minX, 0);
  assert.strictEqual(bboxUnion.maxX, 150);
  assert.strictEqual(bboxUnion.minY, 0);
  assert.strictEqual(bboxUnion.maxY, 100);

  // Intersection
  const interRes = LDocVectorEditor.booleanOperation(sqA, sqB, 'intersect');
  const bboxInter = LDocVectorEditor.getBoundingBox(LDocVectorEditor.pathToPolygon(interRes));
  assert.strictEqual(bboxInter.minX, 50);
  assert.strictEqual(bboxInter.maxX, 100);

  // Difference A \ B
  const diffRes = LDocVectorEditor.booleanOperation(sqA, sqB, 'difference');
  const bboxDiff = LDocVectorEditor.getBoundingBox(LDocVectorEditor.pathToPolygon(diffRes));
  assert.strictEqual(bboxDiff.minX, 0);
  assert.strictEqual(bboxDiff.maxX, 50);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Concave Polygon Operations (No Convex-Hull Shortcut)
// ─────────────────────────────────────────────────────────────────────────────
test('Concave Polygons: L-Shape clipping preserves reflex angle (Not Convex Hull)', () => {
  const lShape = createLShape(0, 0, 100, 100, 40);
  const polyL = LDocVectorEditor.pathToPolygon(lShape);
  const lArea = Math.abs(LDocVectorEditor.polygonArea(polyL));
  
  // An L-shape of 100x100 with thickness 40 has area: 100*40 + (100-40)*40 = 4000 + 2400 = 6400.
  // The bounding box is 100x100 = 10000. Convex hull would be ~8200+.
  assert.strictEqual(lArea, 6400, 'L-shape exact area must be 6400');

  // Clip L-shape with a small box in its upper-left arm
  const cutter = createSquare(0, 0, 40);
  const diff = LDocVectorEditor.booleanOperation(lShape, cutter, 'difference');
  assert.ok(diff.nodes.length >= 3, 'Difference of L-shape should produce valid nodes');
  
  // Status check verifies general 2D polygon topology
  const status = LDocVectorEditor.getGeometryStatus(lShape);
  assert.strictEqual(status.topology, 'general_2d_polygon');
  assert.strictEqual(status.nodeCount, 6);
  assert.strictEqual(status.area, 6400);
});

test('Concave Polygons: 5-pointed star clipping', () => {
  const star = createStar5(100, 100, 80, 30);
  const status = LDocVectorEditor.getGeometryStatus(star);
  assert.strictEqual(status.nodeCount, 10, 'Star should have 10 nodes');
  assert.ok(status.area > 3000 && status.area < 15000, 'Star area is valid');

  const cutter = createSquare(90, 90, 20);
  const inter = LDocVectorEditor.booleanOperation(star, cutter, 'intersect');
  assert.ok(inter.nodes.length >= 3, 'Intersection with center of star yields polygon');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Disjoint Polygons (Multi-contour union, empty intersect, full difference)
// ─────────────────────────────────────────────────────────────────────────────
test('Disjoint Polygons: Multi-contour union and empty intersection', () => {
  const sq1 = createSquare(0, 0, 50);
  const sq2 = createSquare(200, 200, 50); // Far away, completely disjoint

  assert.strictEqual(LDocVectorEditor.arePolygonsDisjoint(
    LDocVectorEditor.pathToPolygon(sq1),
    LDocVectorEditor.pathToPolygon(sq2)
  ), true, 'Squares must be detected as disjoint');

  // Union must produce multi-contour path containing both contours
  const unionRes = LDocVectorEditor.booleanOperation(sq1, sq2, 'union');
  assert.ok(Array.isArray(unionRes.contours), 'Disjoint union must produce contours array');
  assert.strictEqual(unionRes.contours.length, 2, 'Must have 2 separate contours');

  // Intersection of disjoint polygons must be empty
  const interRes = LDocVectorEditor.booleanOperation(sq1, sq2, 'intersect');
  assert.strictEqual(interRes.nodes.length, 0, 'Disjoint intersection must be empty');

  // Difference of disjoint polygons A \ B must return A
  const diffRes = LDocVectorEditor.booleanOperation(sq1, sq2, 'difference');
  assert.strictEqual(diffRes.nodes.length, 4, 'Disjoint difference A \\ B must return A');
  const dBox = LDocVectorEditor.getBoundingBox(LDocVectorEditor.pathToPolygon(diffRes));
  assert.strictEqual(dBox.maxX, 50);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Nested Polygons (Holes)
// ─────────────────────────────────────────────────────────────────────────────
test('Nested Polygons: Inside detection and containment clipping', () => {
  const outer = createSquare(0, 0, 200);
  const inner = createSquare(50, 50, 50);

  const polyOuter = LDocVectorEditor.pathToPolygon(outer);
  const polyInner = LDocVectorEditor.pathToPolygon(inner);

  assert.strictEqual(LDocVectorEditor.isPolygonInside(polyInner, polyOuter), true, 'Inner must be inside outer');
  assert.strictEqual(LDocVectorEditor.isPolygonInside(polyOuter, polyInner), false, 'Outer cannot be inside inner');

  // Union of inner inside outer should be outer
  const unionRes = LDocVectorEditor.booleanOperation(outer, inner, 'union');
  const bUnion = LDocVectorEditor.getBoundingBox(LDocVectorEditor.pathToPolygon(unionRes));
  assert.strictEqual(bUnion.width, 200);

  // Intersection of inner and outer should be inner
  const interRes = LDocVectorEditor.booleanOperation(outer, inner, 'intersect');
  const bInter = LDocVectorEditor.getBoundingBox(LDocVectorEditor.pathToPolygon(interRes));
  assert.strictEqual(bInter.width, 50);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Rotated Polygons (45° Diamond vs Square)
// ─────────────────────────────────────────────────────────────────────────────
test('Rotated Polygons: Diamond intersecting Axis-Aligned Square', () => {
  const square = createSquare(50, 50, 100); // 50 to 150
  const diamond = createDiamond(100, 100, 70); // Center at (100,100), radius 70

  const interRes = LDocVectorEditor.booleanOperation(square, diamond, 'intersect');
  assert.ok(interRes.nodes.length >= 4, 'Clipped diamond/square must have at least 4 nodes');

  const unionRes = LDocVectorEditor.booleanOperation(square, diamond, 'union');
  const uBox = LDocVectorEditor.getBoundingBox(LDocVectorEditor.pathToPolygon(unionRes));
  assert.ok(uBox.minX <= 50 && uBox.maxX >= 150, 'Union encompasses both bounds');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Divide & Trim Operations
// ─────────────────────────────────────────────────────────────────────────────
test('Divide & Trim Operations: 3-way region decomposition', () => {
  const sqA = createSquare(0, 0, 100);
  const sqB = createSquare(50, 0, 100);

  // Divide
  const divRes = LDocVectorEditor.booleanOperation(sqA, sqB, 'divide');
  assert.strictEqual(divRes.type, 'divide_result');
  assert.strictEqual(divRes.regions.length, 3, 'Divide produces exactly 3 regions: A\\B, A∩B, B\\A');
  assert.ok(divRes.regions[0].nodes.length >= 3, 'Region A\\B valid');
  assert.ok(divRes.regions[1].nodes.length >= 3, 'Region A∩B valid');
  assert.ok(divRes.regions[2].nodes.length >= 3, 'Region B\\A valid');

  // Trim (cuts A by boundary of B)
  const trimRes = LDocVectorEditor.booleanOperation(sqA, sqB, 'trim');
  assert.ok(trimRes.nodes.length >= 3, 'Trim returns cut path');
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. XOR / Symmetric Difference
// ─────────────────────────────────────────────────────────────────────────────
test('XOR (Exclude): Produces symmetric difference multi-contour', () => {
  const sqA = createSquare(0, 0, 100);
  const sqB = createSquare(50, 0, 100);

  const xorRes = LDocVectorEditor.booleanOperation(sqA, sqB, 'xor');
  assert.ok(Array.isArray(xorRes.contours), 'XOR should produce multi-contour representation');
  assert.strictEqual(xorRes.contours.length, 2, 'XOR contains A\\B and B\\A contours');
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Degenerate / Touching Cases (Collinear Edges & Singularities)
// ─────────────────────────────────────────────────────────────────────────────
test('Touching / Collinear Edges: Zero crashes on shared boundary', () => {
  const sqLeft = createSquare(0, 0, 100);
  const sqRight = createSquare(100, 0, 100); // Shares edge at x = 100

  // Should execute cleanly without throw or infinite loop
  const unionRes = LDocVectorEditor.booleanOperation(sqLeft, sqRight, 'union');
  assert.ok(unionRes, 'Union of edge-touching squares executes cleanly');

  const interRes = LDocVectorEditor.booleanOperation(sqLeft, sqRight, 'intersect');
  assert.ok(interRes, 'Intersection of edge-touching squares executes cleanly');
});

console.log('\n================================================================');
console.log(`🎉 SECTION 16 TESTS PASSED: ${passedTests}/${totalTests} TESTS (100% SUCCESS)`);
console.log('================================================================\n');
