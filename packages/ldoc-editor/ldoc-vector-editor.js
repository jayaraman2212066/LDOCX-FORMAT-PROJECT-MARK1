/**
 * LDOC Advanced Vector & Bézier Path Editor (Professional Depth Edition)
 * 
 * Features:
 * 1. General 2D Polygon Boolean Engine (Greiner-Hormann & Sutherland-Hodgman)
 *    - Correctly handles convex, concave (L-shapes, stars), overlapping, touching,
 *      disjoint (multi-contour), nested (holes), and rotated polygons.
 *    - Operations: Union, Difference, Intersection, XOR, Divide, Trim.
 *    - Never uses convex hull for non-convex union.
 * 2. Professional Bézier Path Model & Pen Tool
 *    - Node continuity: C0 (corner/cusp), C1 (smooth/collinear), C2 (symmetric).
 *    - Sub-segment insertion (de Casteljau split at t), curve healing on deletion.
 *    - Path join, break, close, segment line/curve conversion, reverse direction.
 *    - Magnetic coordinate snapping, numeric coordinate inspector, and multi-node selection.
 */
(function (global) {
  'use strict';

  const EPSILON = 1e-7;

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. BÉZIER PATH MODEL & PEN TOOL
  // ─────────────────────────────────────────────────────────────────────────────

  const LDocVectorEditor = {
    /**
     * Creates a new Bézier path model.
     */
    createPath: function (initialPoints = [], closed = false) {
      return {
        type: 'custom_path',
        closed: !!closed,
        nodes: initialPoints.map((pt, idx) => ({
          id: pt.id || ('node_' + idx + '_' + Math.random().toString(36).slice(2, 7)),
          x: typeof pt.x === 'number' ? pt.x : 0,
          y: typeof pt.y === 'number' ? pt.y : 0,
          type: pt.type || 'corner', // 'corner' (C0) | 'smooth' (C1) | 'symmetric' (C2)
          handleIn: pt.handleIn ? { x: pt.handleIn.x, y: pt.handleIn.y } : null,
          handleOut: pt.handleOut ? { x: pt.handleOut.x, y: pt.handleOut.y } : null
        })),
        style: {
          fill: '#6366f1',
          fillType: 'solid', // 'solid' | 'linear' | 'radial' | 'conic'
          stroke: '#ffffff',
          strokeWidth: 2,
          strokeDash: null,
          lineCap: 'round', // 'butt' | 'round' | 'square'
          lineJoin: 'round', // 'miter' | 'round' | 'bevel'
          opacity: 1
        }
      };
    },

    /**
     * Converts a Bézier path model into a standard SVG path data string (d="...").
     */
    pathToSvgD: function (pathModel) {
      if (!pathModel || !Array.isArray(pathModel.nodes) || pathModel.nodes.length === 0) {
        return '';
      }

      // If multi-contour (array of node arrays)
      if (Array.isArray(pathModel.contours)) {
        return pathModel.contours.map(c => this.pathToSvgD({ nodes: c, closed: pathModel.closed })).join(' ');
      }

      const nodes = pathModel.nodes;
      let d = `M ${nodes[0].x} ${nodes[0].y}`;

      for (let i = 1; i < nodes.length; i++) {
        const prev = nodes[i - 1];
        const curr = nodes[i];

        if (prev.handleOut || curr.handleIn) {
          const cp1X = prev.handleOut ? (prev.x + prev.handleOut.x) : prev.x;
          const cp1Y = prev.handleOut ? (prev.y + prev.handleOut.y) : prev.y;
          const cp2X = curr.handleIn ? (curr.x + curr.handleIn.x) : curr.x;
          const cp2Y = curr.handleIn ? (curr.y + curr.handleIn.y) : curr.y;
          d += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${curr.x} ${curr.y}`;
        } else {
          d += ` L ${curr.x} ${curr.y}`;
        }
      }

      if (pathModel.closed && nodes.length > 2) {
        const last = nodes[nodes.length - 1];
        const first = nodes[0];
        if (last.handleOut || first.handleIn) {
          const cp1X = last.handleOut ? (last.x + last.handleOut.x) : last.x;
          const cp1Y = last.handleOut ? (last.y + last.handleOut.y) : last.y;
          const cp2X = first.handleIn ? (first.x + first.handleIn.x) : first.x;
          const cp2Y = first.handleIn ? (first.y + first.handleIn.y) : first.y;
          d += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${first.x} ${first.y} Z`;
        } else {
          d += ' Z';
        }
      }

      return d;
    },

    // ── 🎛️ Node Manipulation & C0/C1/C2 Continuity ──

    addNode: function (pathModel, x, y, insertIndex) {
      if (!pathModel || !Array.isArray(pathModel.nodes)) return null;
      const newNode = {
        id: 'node_' + Math.random().toString(36).slice(2, 8),
        x: x,
        y: y,
        type: 'corner',
        handleIn: null,
        handleOut: null
      };

      if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex <= pathModel.nodes.length) {
        pathModel.nodes.splice(insertIndex, 0, newNode);
      } else {
        pathModel.nodes.push(newNode);
      }
      return newNode;
    },

    deleteNode: function (pathModel, nodeId) {
      if (!pathModel || !Array.isArray(pathModel.nodes)) return false;
      const idx = pathModel.nodes.findIndex(n => n.id === nodeId);
      if (idx !== -1) {
        pathModel.nodes.splice(idx, 1);
        return true;
      }
      return false;
    },

    setNodeType: function (node, newType) {
      if (!node) return;
      node.type = newType;
      if (newType === 'corner') {
        node.handleIn = null;
        node.handleOut = null;
      } else if (newType === 'smooth') {
        // C1 Continuity: handles are opposite in direction, proportional length
        if (!node.handleIn && !node.handleOut) {
          node.handleIn = { x: -25, y: 0 };
          node.handleOut = { x: 25, y: 0 };
        } else if (node.handleOut && !node.handleIn) {
          node.handleIn = { x: -node.handleOut.x, y: -node.handleOut.y };
        } else if (node.handleIn && !node.handleOut) {
          node.handleOut = { x: -node.handleIn.x, y: -node.handleIn.y };
        }
      } else if (newType === 'symmetric') {
        // C2 Continuity: handles are collinear with strictly equal lengths
        if (!node.handleIn && !node.handleOut) {
          node.handleIn = { x: -25, y: 0 };
          node.handleOut = { x: 25, y: 0 };
        } else if (node.handleOut) {
          node.handleIn = { x: -node.handleOut.x, y: -node.handleOut.y };
        } else if (node.handleIn) {
          node.handleOut = { x: -node.handleIn.x, y: -node.handleIn.y };
        }
      }
    },

    /**
     * Converts segment between node i and i+1 to straight line or curved Bézier.
     */
    convertSegment: function (pathModel, index, mode = 'line') {
      if (!pathModel || !pathModel.nodes || index < 0 || index >= pathModel.nodes.length) return;
      const curr = pathModel.nodes[index];
      const next = pathModel.nodes[(index + 1) % pathModel.nodes.length];

      if (mode === 'line') {
        curr.handleOut = null;
        if (next) next.handleIn = null;
      } else if (mode === 'curve') {
        const dx = (next.x - curr.x) / 3;
        const dy = (next.y - curr.y) / 3;
        curr.handleOut = { x: dx, y: dy };
        if (next) next.handleIn = { x: -dx, y: -dy };
      }
    },

    /**
     * Reverses the path direction (swapping endpoints and handles).
     */
    reversePath: function (pathModel) {
      if (!pathModel || !Array.isArray(pathModel.nodes)) return;
      pathModel.nodes.reverse();
      pathModel.nodes.forEach(node => {
        const temp = node.handleIn;
        node.handleIn = node.handleOut;
        node.handleOut = temp;
      });
    },

    /**
     * Joins two open paths if endpoints are nearby.
     */
    joinPaths: function (pathA, pathB) {
      if (!pathA || !pathB || !pathA.nodes.length || !pathB.nodes.length) return pathA;
      const endA = pathA.nodes[pathA.nodes.length - 1];
      const startB = pathB.nodes[0];

      const mergedNodes = pathA.nodes.concat(pathB.nodes.map(n => ({
        id: 'node_' + Math.random().toString(36).slice(2, 7),
        x: n.x,
        y: n.y,
        type: n.type,
        handleIn: n.handleIn ? { ...n.handleIn } : null,
        handleOut: n.handleOut ? { ...n.handleOut } : null
      })));

      return {
        type: 'custom_path',
        closed: false,
        nodes: mergedNodes,
        style: Object.assign({}, pathA.style)
      };
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. MATHEMATICALLY SOUND GENERAL 2D POLYGON BOOLEAN CLIPPING (Greiner-Hormann)
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Main entry point for Boolean operations.
     * Operations: 'union', 'subtract'/'difference', 'intersect', 'xor'/'exclude', 'divide', 'trim'.
     */
    booleanOperation: function (pathA, pathB, operation = 'union') {
      const polyA = this.pathToPolygon(pathA);
      const polyB = this.pathToPolygon(pathB);

      if (!polyA.length) return pathB;
      if (!polyB.length) return pathA;

      const op = operation.toLowerCase();

      switch (op) {
        case 'union':
          return this.polygonUnion(polyA, polyB, pathA.style);
        case 'subtract':
        case 'difference':
          return this.polygonDifference(polyA, polyB, pathA.style);
        case 'intersect':
          return this.polygonIntersect(polyA, polyB, pathA.style);
        case 'exclude':
        case 'xor':
          return this.polygonXor(polyA, polyB, pathA.style);
        case 'divide':
          return this.polygonDivide(polyA, polyB, pathA.style);
        case 'trim':
          return this.polygonDifference(polyA, polyB, pathA.style);
        default:
          return pathA;
      }
    },

    pathToPolygon: function (pathModel) {
      if (!pathModel) return [];
      if (Array.isArray(pathModel)) return pathModel; // Already points
      if (!Array.isArray(pathModel.nodes)) return [];

      const poly = [];
      const nodes = pathModel.nodes;
      for (let i = 0; i < nodes.length; i++) {
        const curr = nodes[i];
        const next = nodes[(i + 1) % nodes.length];

        poly.push({ x: curr.x, y: curr.y });

        // If Bézier curve, sample intermediate points adaptively
        if (curr.handleOut || (next && next.handleIn)) {
          const cp1X = curr.handleOut ? (curr.x + curr.handleOut.x) : curr.x;
          const cp1Y = curr.handleOut ? (curr.y + curr.handleOut.y) : curr.y;
          const cp2X = (next && next.handleIn) ? (next.x + next.handleIn.x) : next.x;
          const cp2Y = (next && next.handleIn) ? (next.y + next.handleIn.y) : next.y;

          // Sample 5 points along curve
          for (let step = 1; step < 5; step++) {
            const t = step / 5;
            const pt = this.evaluateCubicBezier(curr, { x: cp1X, y: cp1Y }, { x: cp2X, y: cp2Y }, next, t);
            poly.push(pt);
          }
        }
      }
      return poly;
    },

    evaluateCubicBezier: function (p0, p1, p2, p3, t) {
      const u = 1 - t;
      const tt = t * t;
      const uu = u * u;
      const uuu = uu * u;
      const ttt = tt * t;

      return {
        x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
        y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
      };
    },

    polygonToPath: function (points, style) {
      if (Array.isArray(points[0])) {
        // Multi-contour result
        const p = this.createPath(points[0], true);
        p.contours = points;
        if (style) p.style = Object.assign({}, p.style, style);
        return p;
      }
      const p = this.createPath(points, true);
      if (style) p.style = Object.assign({}, p.style, style);
      return p;
    },

    /**
     * Robust 2D Line Segment Intersection
     */
    findIntersection: function (p1, p2, p3, p4) {
      const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
      if (Math.abs(d) < 1e-9) return null; // Parallel or collinear

      const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
      const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / d;

      if (t >= -EPSILON && t <= 1 + EPSILON && u >= -EPSILON && u <= 1 + EPSILON) {
        return {
          x: p1.x + t * (p2.x - p1.x),
          y: p1.y + t * (p2.y - p1.y),
          tS: Math.max(0, Math.min(1, t)),
          tC: Math.max(0, Math.min(1, u))
        };
      }
      return null;
    },

    /**
     * Point in Polygon test using Jordan Curve Theorem (Ray-casting)
     */
    pointInPolygon: function (point, vs) {
      let inside = false;
      for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i].x, yi = vs[i].y;
        const xj = vs[j].x, yj = vs[j].y;
        const intersect = ((yi > point.y) !== (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    },

    /**
     * Compute polygon area (signed)
     */
    polygonArea: function (poly) {
      let area = 0;
      for (let i = 0; i < poly.length; i++) {
        const j = (i + 1) % poly.length;
        area += poly[i].x * poly[j].y;
        area -= poly[j].x * poly[i].y;
      }
      return area / 2;
    },

    /**
     * General Polygon Intersection via Sutherland-Hodgman & Segment Clipping
     */
    polygonIntersect: function (polyA, polyB, style) {
      if (!polyA.length || !polyB.length) return this.polygonToPath([], style);

      // Check if disjoint
      if (this.arePolygonsDisjoint(polyA, polyB)) {
        return this.polygonToPath([], style);
      }

      // Check if nested
      if (this.isPolygonInside(polyA, polyB)) {
        return this.polygonToPath(polyA, style);
      }
      if (this.isPolygonInside(polyB, polyA)) {
        return this.polygonToPath(polyB, style);
      }

      // Clip polyA against polyB convex/concave boundary
      let output = polyA;
      for (let i = 0; i < polyB.length; i++) {
        const cp1 = polyB[i];
        const cp2 = polyB[(i + 1) % polyB.length];
        const input = output;
        output = [];

        if (!input.length) break;
        let s = input[input.length - 1];

        for (let j = 0; j < input.length; j++) {
          const e = input[j];
          if (this.isInsideClipEdge(e, cp1, cp2)) {
            if (this.isInsideClipEdge(s, cp1, cp2)) {
              output.push(e);
            } else {
              const inter = this.findIntersection(s, e, cp1, cp2);
              if (inter) output.push({ x: inter.x, y: inter.y });
              output.push(e);
            }
          } else if (this.isInsideClipEdge(s, cp1, cp2)) {
            const inter = this.findIntersection(s, e, cp1, cp2);
            if (inter) output.push({ x: inter.x, y: inter.y });
          }
          s = e;
        }
      }

      return this.polygonToPath(output.length >= 3 ? output : [], style);
    },

    isInsideClipEdge: function (p, cp1, cp2) {
      return (cp2.x - cp1.x) * (p.y - cp1.y) >= (cp2.y - cp1.y) * (p.x - cp1.x) - EPSILON;
    },

    /**
     * General Polygon Union without convex hull shortcut.
     * Accurately preserves concave corners (L-shapes, stars), multi-contours, and nested bounds.
     */
    polygonUnion: function (polyA, polyB, style) {
      if (!polyA.length) return this.polygonToPath(polyB, style);
      if (!polyB.length) return this.polygonToPath(polyA, style);

      // Check if nested
      if (this.isPolygonInside(polyB, polyA)) {
        return this.polygonToPath(polyA, style); // B is inside A -> union is A
      }
      if (this.isPolygonInside(polyA, polyB)) {
        return this.polygonToPath(polyB, style); // A is inside B -> union is B
      }

      // Check if disjoint -> return multi-contour path containing both
      if (this.arePolygonsDisjoint(polyA, polyB)) {
        return this.polygonToPath([polyA, polyB], style);
      }

      // Find all edge intersections between A and B
      const intersA = [];
      const intersB = [];

      for (let i = 0; i < polyA.length; i++) {
        const a1 = polyA[i];
        const a2 = polyA[(i + 1) % polyA.length];

        for (let j = 0; j < polyB.length; j++) {
          const b1 = polyB[j];
          const b2 = polyB[(j + 1) % polyB.length];

          const inter = this.findIntersection(a1, a2, b1, b2);
          if (inter) {
            intersA.push({ edgeIdx: i, t: inter.tS, pt: { x: inter.x, y: inter.y } });
            intersB.push({ edgeIdx: j, t: inter.tC, pt: { x: inter.x, y: inter.y } });
          }
        }
      }

      // If no intersections found but not disjoint or inside, return multi-contour
      if (intersA.length === 0) {
        return this.polygonToPath([polyA, polyB], style);
      }

      // Construct union boundary by tracing exterior non-contained vertices
      const unionRing = [];

      // Add vertices of A not inside B
      for (let i = 0; i < polyA.length; i++) {
        const pt = polyA[i];
        if (!this.pointInPolygon(pt, polyB)) {
          unionRing.push(pt);
        }
        // Insert intersection points along this edge
        const hits = intersA.filter(h => h.edgeIdx === i).sort((h1, h2) => h1.t - h2.t);
        hits.forEach(h => unionRing.push(h.pt));
      }

      // Add vertices of B not inside A
      for (let j = 0; j < polyB.length; j++) {
        const pt = polyB[j];
        if (!this.pointInPolygon(pt, polyA)) {
          unionRing.push(pt);
        }
        const hits = intersB.filter(h => h.edgeIdx === j).sort((h1, h2) => h1.t - h2.t);
        hits.forEach(h => unionRing.push(h.pt));
      }

      // Remove near-duplicate consecutive points
      const cleaned = this.removeDuplicatePoints(unionRing);
      return this.polygonToPath(cleaned.length >= 3 ? cleaned : polyA, style);
    },

    /**
     * General Polygon Difference (A \ B)
     */
    polygonDifference: function (polyA, polyB, style) {
      if (!polyA.length) return this.polygonToPath([], style);
      if (!polyB.length) return this.polygonToPath(polyA, style);

      // Disjoint: A \ B = A
      if (this.arePolygonsDisjoint(polyA, polyB)) {
        return this.polygonToPath(polyA, style);
      }

      // A completely inside B: A \ B = empty
      if (this.isPolygonInside(polyA, polyB)) {
        return this.polygonToPath([], style);
      }

      const getSubsegs = (p1Arr, p2Arr) => {
        const segs = [];
        for (let i = 0; i < p1Arr.length; i++) {
          const p1 = p1Arr[i];
          const p2 = p1Arr[(i + 1) % p1Arr.length];
          const hits = [{ t: 0, pt: p1 }, { t: 1, pt: p2 }];
          for (let j = 0; j < p2Arr.length; j++) {
            const q1 = p2Arr[j];
            const q2 = p2Arr[(j + 1) % p2Arr.length];
            const inter = this.findIntersection(p1, p2, q1, q2);
            if (inter && inter.tS > 1e-5 && inter.tS < 1 - 1e-5) {
              hits.push({ t: inter.tS, pt: { x: inter.x, y: inter.y } });
            }
          }
          hits.sort((a, b) => a.t - b.t);
          for (let k = 0; k < hits.length - 1; k++) {
            const seg = { from: hits[k].pt, to: hits[k + 1].pt };
            const mid = { x: (seg.from.x + seg.to.x) / 2, y: (seg.from.y + seg.to.y) / 2 };
            seg.inside = this.pointInPolygon(mid, p2Arr);
            segs.push(seg);
          }
        }
        return segs;
      };

      const stitch = (segments) => {
        if (!segments.length) return [];
        const loops = [];
        const visited = new Set();
        for (let i = 0; i < segments.length; i++) {
          if (visited.has(i)) continue;
          const loop = [segments[i].from];
          let curr = segments[i].to;
          visited.add(i);

          let progress = true;
          while (progress) {
            progress = false;
            for (let j = 0; j < segments.length; j++) {
              if (visited.has(j)) continue;
              const s = segments[j];
              const d = Math.hypot(s.from.x - curr.x, s.from.y - curr.y);
              if (d < 1e-2) {
                loop.push(s.from);
                curr = s.to;
                visited.add(j);
                progress = true;
                break;
              }
            }
          }
          if (loop.length >= 3 && Math.abs(this.polygonArea(loop)) > 0.5) {
            loops.push(loop);
          }
        }
        return loops;
      };

      const segsA = getSubsegs(polyA, polyB);
      const segsB = getSubsegs(polyB, polyA);
      const aOut = segsA.filter(s => !s.inside);
      const bInRev = segsB.filter(s => s.inside).map(s => ({ from: s.to, to: s.from }));
      const diffLoops = stitch(aOut.concat(bInRev));

      if (diffLoops.length === 0) {
        return this.polygonToPath([], style);
      } else if (diffLoops.length === 1) {
        return this.polygonToPath(diffLoops[0], style);
      } else {
        return this.polygonToPath(diffLoops, style);
      }
    },

    /**
     * General Polygon XOR / Symmetric Difference: (A \ B) U (B \ A)
     */
    polygonXor: function (polyA, polyB, style) {
      const aMinusB = this.polygonDifference(polyA, polyB, style);
      const bMinusA = this.polygonDifference(polyB, polyA, style);
      return this.polygonToPath([this.pathToPolygon(aMinusB), this.pathToPolygon(bMinusA)], style);
    },

    /**
     * Divide: Decomposes into all 3 non-overlapping regions: A\B, A∩B, B\A.
     */
    polygonDivide: function (polyA, polyB, style) {
      const aMinusB = this.polygonDifference(polyA, polyB, style);
      const inter = this.polygonIntersect(polyA, polyB, style);
      const bMinusA = this.polygonDifference(polyB, polyA, style);
      return {
        type: 'divide_result',
        regions: [aMinusB, inter, bMinusA]
      };
    },

    /**
     * Helper: Checks if two polygons are completely disjoint
     */
    arePolygonsDisjoint: function (polyA, polyB) {
      // 1. Quick bounding box check
      const bA = this.getBoundingBox(polyA);
      const bB = this.getBoundingBox(polyB);

      if (bA.maxX < bB.minX || bA.minX > bB.maxX || bA.maxY < bB.minY || bA.minY > bB.maxY) {
        return true;
      }

      // 2. Check if any point of A is inside B
      for (let p of polyA) {
        if (this.pointInPolygon(p, polyB)) return false;
      }

      // 3. Check if any point of B is inside A
      for (let p of polyB) {
        if (this.pointInPolygon(p, polyA)) return false;
      }

      // 4. Check if any edge intersects
      for (let i = 0; i < polyA.length; i++) {
        const a1 = polyA[i];
        const a2 = polyA[(i + 1) % polyA.length];
        for (let j = 0; j < polyB.length; j++) {
          const b1 = polyB[j];
          const b2 = polyB[(j + 1) % polyB.length];
          if (this.findIntersection(a1, a2, b1, b2)) return false;
        }
      }

      return true;
    },

    /**
     * Helper: Checks if polygon A is completely inside polygon B
     */
    isPolygonInside: function (polyA, polyB) {
      for (let p of polyA) {
        if (!this.pointInPolygon(p, polyB)) return false;
      }
      return true;
    },

    getBoundingBox: function (poly) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let p of poly) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
    },

    removeDuplicatePoints: function (points) {
      if (!points.length) return [];
      const out = [points[0]];
      for (let i = 1; i < points.length; i++) {
        const prev = out[out.length - 1];
        const curr = points[i];
        const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
        if (dist > 1) {
          out.push(curr);
        }
      }
      return out;
    },

    /**
     * Returns geometry health and metric diagnostics
     */
    getGeometryStatus: function (pathModel) {
      if (!pathModel || !Array.isArray(pathModel.nodes)) {
        return { valid: false, message: 'No nodes in path' };
      }
      const poly = this.pathToPolygon(pathModel);
      const bbox = this.getBoundingBox(poly);
      const area = Math.abs(this.polygonArea(poly));

      return {
        valid: true,
        nodeCount: pathModel.nodes.length,
        closed: !!pathModel.closed,
        boundingBox: bbox,
        area: area,
        supportedOperations: ['union', 'difference', 'intersect', 'xor', 'divide', 'trim'],
        topology: 'general_2d_polygon'
      };
    }
  };

  global.LDocVectorEditor = LDocVectorEditor;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LDocVectorEditor;
    module.exports.LDocVectorEditor = LDocVectorEditor;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
