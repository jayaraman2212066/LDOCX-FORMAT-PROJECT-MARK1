# LDOCX Vector Engine: Bézier Mathematics, Pen Tool & Boolean Geometry

## 1. Architectural Overview

The **LDOCX Vector Engine** (`ldoc-vector-editor.js` & `ldoc-shape-engine.js`) equips the LDOCX format with professional illustration capabilities comparable to Figma and Illustrator, fully integrated into the document AST. 

Unlike raster drawing tools that pixelate at high print resolutions, all vector assets in LDOCX are preserved as mathematically exact vector node models that compile on demand to standard W3C SVG path strings (`d="..."`) or hardware-accelerated 2D Canvas render commands.

```
+─────────────────────────────────────────────────────────────+
| User Pen / Vector Tool Interaction                         |
| (Mouse / Pen / Stylus Pointer Events)                       |
+─────────────────────────────────────────────────────────────+
                               │
                               ▼
+─────────────────────────────────────────────────────────────+
| Node Model: [{ x, y, type, handleIn: {x,y}, handleOut: {x,y} }]
+─────────────────────────────────────────────────────────────+
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
+─────────────────────────────+ +─────────────────────────────+
| Boolean Geometry Operations | | Parametric Bézier Evaluator |
| Union, Subtract, Intersect  | | C(t) = (1-t)^3 P0 + ...     |
+─────────────────────────────+ +─────────────────────────────+
                               │
                               ▼
+─────────────────────────────────────────────────────────────+
| AST Serialization: { type: 'shape', shapeType: 'custom_path'}|
+─────────────────────────────────────────────────────────────+
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ Studio /     │       │ Headless     │       │ High-DPI     │
│ Canvas DOM   │       │ SVG Exporter │       │ PDF Print    │
└──────────────┘       └──────────────┘       └──────────────┘
```

---

## 2. Mathematical Foundation of Bézier Curves

### 2.1 Cubic Bézier Curve Formulation
Each smooth curve segment between node $P_0(x_0, y_0)$ and node $P_3(x_3, y_3)$ is evaluated parametrically for $t \in [0, 1]$ with two control points $P_1$ and $P_2$:

$$B(t) = (1 - t)^3 P_0 + 3(1 - t)^2 t P_1 + 3(1 - t) t^2 P_2 + t^3 P_3$$

where:
- $P_1 = P_0 + \vec{h}_{\text{out}}(P_0)$
- $P_2 = P_3 + \vec{h}_{\text{in}}(P_3)$

### 2.2 Continuity Conditions
The vector engine supports three node classification states:
1. **Corner Node ($C^0$ Continuity)**: Position is continuous, but tangent vectors $\vec{h}_{\text{in}}$ and $\vec{h}_{\text{out}}$ are independent in direction and magnitude, allowing sharp cusps.
2. **Smooth Node ($C^1$ Continuity)**: Tangent direction is continuous ($\vec{h}_{\text{in}} = -k \vec{h}_{\text{out}}, k > 0$), ensuring a continuous tangent line without a sharp corner.
3. **Symmetric Node ($C^2$ Continuity Approximation)**: Equal magnitude and opposite direction ($\vec{h}_{\text{in}} = -\vec{h}_{\text{out}}$).

```
   Handle In                Node (x,y)               Handle Out
     (O)────────────────────────(X)────────────────────────(O)
                   <─── Smooth / Symmetric Tangent ───>
```

---

## 3. Pen Tool Ergonomics & Path Compilation

### 3.1 Node Model Schema
```javascript
{
  type: 'custom_path',
  closed: true,
  nodes: [
    { id: 'node_01', x: 100, y: 150, type: 'corner', handleIn: null, handleOut: null },
    { id: 'node_02', x: 250, y: 80,  type: 'smooth', handleIn: { x: -30, y: -10 }, handleOut: { x: 30, y: 10 } },
    { id: 'node_03', x: 380, y: 220, type: 'corner', handleIn: null, handleOut: null }
  ],
  style: {
    fill: '#4f46e5',
    fillType: 'linear',
    stroke: '#ffffff',
    strokeWidth: 2,
    lineCap: 'round',
    lineJoin: 'round'
  }
}
```

### 3.2 Compiling to SVG Path Data (`d="..."`)
The `LDocVectorEditor.pathToSvgD` method serializes node arrays into normalized W3C path strings:
- Starts with move command `M x0 y0`.
- For straight segments (no handles), appends line command `L xi yi`.
- For curved segments, calculates absolute control coordinates:
  $$CP_{1x} = P_{\text{prev}.x} + h_{\text{out}.x}, \quad CP_{1y} = P_{\text{prev}.y} + h_{\text{out}.y}$$
  $$CP_{2x} = P_{\text{curr}.x} + h_{\text{in}.x}, \quad CP_{2y} = P_{\text{curr}.y} + h_{\text{in}.y}$$
  and appends cubic command `C CP1x CP1y, CP2x CP2y, xi yi`.
- If `closed: true`, appends `Z`.

---

## 4. Boolean Path Geometry Operations

The vector engine provides constructive 2D solid geometry operations between any two vector shapes:

```
  Shape A       Shape B       Union (A ∪ B)     Subtract (A - B)   Intersect (A ∩ B)    Exclude (XOR)
  ┌───┐         ┌───┐          ┌─────┐              ┌─┐                ┌─┐              ┌─┐   ┌─┐
  │ A │         │ B │          │ A+B │              │A│                │ ├──┐           │ │   │ │
  │   └───┐ ─▶  └───┤    ─▶    │     └───┐   ─▶     │ └───┐     ─▶     │ │B │    ─▶     │ └───┘ │
  └───┘   │         │          └─────────┘          └───┘              └─┴──┘           └───┬─┬───┘
          └───┘                                                                         └─┘
```

### 4.1 Union (`union`)
Merges the envelopes of Shape A and Shape B:
- Employs the **Monotone Chain Algorithm** (Andrew's variant of Graham Scan) to compute the combined convex hull in $O(n \log n)$ time.
- Sorts point sets lexicographically by $x$, then $y$, building upper and lower hulls using 2D cross-product orientation tests:
  $$\vec{u} \times \vec{v} = (x_B - x_A)(y_C - y_A) - (y_B - y_A)(x_C - x_A)$$

### 4.2 Intersection (`intersect`)
Extracts the overlapping region between Shape A and Shape B:
- Implements the **Sutherland-Hodgman Polygon Clipping Algorithm**.
- Clips subject polygon edges against each infinite boundary line of the clip polygon, computing exact parametric line segment intersections:
  $$t = \frac{(x_1 - x_3)(y_3 - y_4) - (y_1 - y_3)(x_3 - x_4)}{(x_1 - x_2)(y_3 - y_4) - (y_1 - y_2)(x_3 - x_4)}$$

### 4.3 Difference (`subtract`)
Carves Shape B out of Shape A:
- Employs **Jordan Curve Theorem ray-casting** to test point containment inside the polygon boundary:
  $$\text{inside} = \bigoplus_{i=0}^{n-1} \left( (y_i > y) \ne (y_{i+1} > y) \land \left( x < \frac{x_{i+1} - x_i}{y_{i+1} - y_i} (y - y_i) + x_i \right) \right)$$
- Retains exterior points of A while inverting overlapping sub-regions.

### 4.4 Exclude / XOR (`exclude`)
Calculates the symmetric difference:
$$\text{Exclude}(A, B) = (A \setminus B) \cup (B \setminus A)$$

---

## 5. Advanced Fills & Stroke Rendering

1. **Gradients**:
   - **Linear Gradient**: Angle $\theta$, color stop offsets $o_i \in [0, 1]$.
   - **Radial Gradient**: Focal point $(cx, cy)$, radius $r$.
   - **Conic / Angular Gradient**: Sweep angle $\phi \in [0, 360^\circ]$ around center.
2. **Stroke Profiles**:
   - `lineCap`: `round`, `butt`, `square`.
   - `lineJoin`: `round`, `miter` (with miter limit), `bevel`.
   - `strokeDash`: Array $[d_1, d_2, \dots]$ for dashed and dotted borders.
3. **Typographic Integration**: Embedded center-aligned or path-following text labels with automatic vertical baseline centering.
