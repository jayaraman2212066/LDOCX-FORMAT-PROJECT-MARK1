# LDOCX Reactive Runtime & Mathematical Computation Architecture

## 1. Architectural Overview

The core premise of the **LDOCX Living Document Format** is that documents are not static page images or text dumps: **they are live, deterministic computational graphs**. An LDOCX document models state as a reactive Directed Acyclic Graph (DAG) of variables, user inputs (sliders, toggles, number steppers), arithmetic formulas, dynamic tables, live charts, and physics simulations.

```
                    ┌─────────────────────────┐
                    │     User UI Input       │
                    │ (Slider / Text / Toggle)│
                    └────────────┬────────────┘
                                 │ Event Mutation
                                 ▼
                    ┌─────────────────────────┐
                    │   Reactive State Store  │
                    │   (Variables & Values)  │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
      ┌────────────────────┐          ┌────────────────────┐
      │  Dependency Graph  │          │ Cycle Detection &  │
      │  (DAG & Adjacency) │          │ Topological Sorter │
      └──────────┬─────────┘          └────────────────────┘
                 │
                 ▼
      ┌──────────────────────────────────────────────┐
      │   Zero-Eval Mathematical Safe AST Evaluator   │
      │   (Tokenizer -> Recursive Descent Parser)    │
      └──────────────────┬───────────────────────────┘
                         │ Evaluated Values
       ┌─────────────────┼─────────────────┐
       ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Text Display │  │ Chart & Data │  │ 2D/3D Canvas │
│ Interpolation│  │ Visualizer   │  │ Simulations  │
└──────────────┘  └──────────────┘  └──────────────┘
```

Every update propagates down the graph in strict topological order in $< 1\text{ms}$, guaranteeing:
1. **Zero-Eval Security**: Absolute ban on JavaScript `eval()` and `new Function()`.
2. **Deterministic Consistency**: Predictable evaluation order without race conditions.
3. **Loop & Cycle Immunity**: Real-time detection and graceful degradation for circular dependencies.
4. **Offline Isolation**: Completely autonomous execution with zero external cloud round-trips.

---

## 2. Zero-Eval Safe Mathematical AST Evaluator

### 2.1 Lexical Analysis & Tokenizer
The expression tokenizer scans raw formula strings into typed token streams:
```javascript
// Tokens: NUMBER, IDENTIFIER, OPERATOR (+,-,*,/,^,%), PAREN_OPEN, PAREN_CLOSE, COMMA
tokenize("sin(angle * PI / 180) * velocity^2 / (2 * g)")
```

### 2.2 Operator Precedence & Grammar
Expressions follow standard algebraic order of operations:
1. **Primary**: Numbers, Variable Identifiers, Whitelisted Function Calls (`sin`, `cos`, `sqrt`, etc.), Parenthesized Expressions `(expr)`.
2. **Unary**: Negative/Positive signs (`-x`, `+5`).
3. **Exponentiation**: Right-associative power (`a ^ b`).
4. **Multiplication / Division / Modulo**: Left-associative (`*`, `/`, `%`).
5. **Addition / Subtraction**: Left-associative (`+`, `-`).
6. **Relational / Logical**: Comparison operators (`>`, `<`, `>=`, `<=`, `==`, `!=`, `&&`, `||`).

### 2.3 Built-in Math Whitelist
Only pure, side-effect-free mathematical functions and constants are permissible:
- **Trigonometry**: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`
- **Exponentials & Logarithms**: `sqrt`, `cbrt`, `exp`, `log`, `log10`, `log2`, `pow`
- **Rounding & Precision**: `abs`, `round`, `floor`, `ceil`, `trunc`
- **Aggregations**: `min`, `max`, `clamp(val, min, max)`
- **Constants**: `PI` ($\pi$), `E` ($e$), `LN2`, `LN10`, `SQRT2`

---

## 3. Reactive Dependency DAG & Topological Sorter

### 3.1 Directed Acyclic Graph (DAG) Construction
When variables and formula blocks are registered, `LDocReactiveEngine` parses all identifiers in each formula to construct inbound dependencies and outbound dependents:

```
Nodes: [velocity, angle, g, range_formula]
Edges:
  velocity      ──▶ range_formula
  angle         ──▶ range_formula
  g             ──▶ range_formula
```

### 3.2 Cycle Detection & Kahn's Topological Sorting
Before evaluating any change cascade, the engine computes in-degrees and applies Kahn's algorithm:
1. Identify all source nodes with in-degree 0 (raw inputs / constants).
2. Push into evaluation queue $Q$.
3. For each node $u \in Q$, remove incoming edges to dependents $v$. If in-degree of $v$ becomes 0, push $v$ into $Q$.
4. If the number of sorted nodes $< |V|$, a circular dependency exists. The engine halts evaluation of the cycle, marks offending variables with a `CYCLE_DETECTED` warning, and reports the exact path (e.g. `A -> B -> C -> A`).

---

## 4. Reactive Debugger & Inspection API

The reactive engine provides runtime introspection tools accessible via the Studio inspector or programmatic API:

```javascript
// 1. Trace full dependency tree for a variable
const trace = LDocReactiveEngine.traceDependencies('totalRevenue');
console.log(trace);
// {
//   variable: 'totalRevenue',
//   directDependencies: ['unitPrice', 'unitsSold', 'discountRate'],
//   deepDependencies: ['baseCost', 'markupPct', 'unitsSold', 'discountRate'],
//   dependents: ['grossProfit', 'taxDue']
// }

// 2. Check document for circular dependencies
const cycles = LDocReactiveEngine.detectCycles();
if (cycles.hasCycles) {
  console.error('Circular dependency detected:', cycles.cyclePaths);
}

// 3. Freeze a variable (prevent automated recalculation during what-if tests)
LDocReactiveEngine.freezeVariable('taxRate', true);

// 4. Register mutation listeners
LDocReactiveEngine.on('variableChange', ({ name, oldValue, newValue }) => {
  console.log(`[Reactive] ${name}: ${oldValue} -> ${newValue}`);
});
```

---

## 5. The 9 Built-In STEM Simulation Presets

LDOCX bundles 9 pre-configured interactive STEM simulation engines combining state variables, reactive formulas, and WebGL/Canvas visualizers:

| Preset ID | Domain | Primary Formula | Interactive Variables |
| :--- | :--- | :--- | :--- |
| `pendulum` | Classical Mechanics | $\theta''(t) + \frac{b}{m}\theta'(t) + \frac{g}{L}\sin\theta = 0$ | `length`, `gravity`, `damping`, `angle` |
| `projectile` | Kinematics | $x = v_0 \cos\theta \cdot t, \quad y = v_0 \sin\theta \cdot t - \frac{1}{2}gt^2$ | `velocity`, `angle`, `gravity`, `initialHeight` |
| `orbit` | Astrophysics | $F_g = G \frac{M m}{r^2}, \quad v_{\text{orbital}} = \sqrt{\frac{GM}{r}}$ | `massStar`, `massPlanet`, `orbitalRadius` |
| `spring` | Harmonic Motion | $m x'' + c x' + k x = 0$ | `springConstant`, `mass`, `damping`, `displacement` |
| `wave` | Wave Physics | $y(x,t) = A \sin\left(\frac{2\pi}{\lambda}x - 2\pi f t + \phi\right)$ | `amplitude`, `frequency`, `waveSpeed`, `phase` |
| `thermodynamics` | Ideal Gas Law | $P V = n R T \implies P = \frac{n R T}{V}$ | `temperature`, `volume`, `moles`, `gasConstant` |
| `electric_circuit` | Electronics | $I = \frac{V}{R}, \quad P = V \cdot I = \frac{V^2}{R}$ | `voltage`, `resistance`, `capacitance`, `frequency` |
| `chemical_kinetics` | Physical Chemistry | $-\frac{d[A]}{dt} = k [A]^n, \quad t_{1/2} = \frac{\ln 2}{k}$ | `concentrationA`, `rateConstant`, `reactionOrder` |
| `optics_refraction` | Wave Optics / Snell's Law | $n_1 \sin\theta_1 = n_2 \sin\theta_2$ | `n1`, `n2`, `incidentAngle` |

### Simulation Block AST Schema
```json
{
  "id": "sim_projectile_01",
  "type": "simulation",
  "preset": "projectile",
  "x": 80,
  "y": 200,
  "width": 640,
  "height": 420,
  "variables": {
    "velocity": { "value": 35, "min": 0, "max": 100, "step": 1, "unit": "m/s" },
    "angle": { "value": 45, "min": 0, "max": 90, "step": 1, "unit": "deg" },
    "gravity": { "value": 9.81, "min": 1.62, "max": 24.79, "unit": "m/s²" }
  },
  "computed": {
    "maxHeight": "velocity^2 * sin(angle * PI / 180)^2 / (2 * gravity)",
    "flightTime": "2 * velocity * sin(angle * PI / 180) / gravity",
    "totalRange": "velocity^2 * sin(2 * angle * PI / 180) / gravity"
  },
  "visualizer": {
    "mode": "canvas2d",
    "showTrajectory": true,
    "showVectors": true,
    "grid": true
  }
}
```

---

## 6. Document Integration & Presentation

### 6.1 In Studio (`studio.html`)
The Studio inspector displays all reactive variables in the right panel with live sliders. Moving any slider mutates the variable in the reactive engine, triggering sub-millisecond updates across all bound texts, tables, and charts on the canvas.

### 6.2 In Creator (`creator.html`)
The slide creator embeds STEM presets as presentation cards with interactive presenter controls, allowing keynotes where data points dynamically animate based on speaker inputs.

### 6.3 In Viewer (`viewer.html`)
The standalone viewer loads the reactive graph in a zero-dependency sandbox. Readers can manipulate sliders, inspect data tables, and run physics simulations without installing software or requiring active internet access.
