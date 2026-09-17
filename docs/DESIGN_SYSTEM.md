# LDOCX Universal Design System & Creative Layout Specification

## 1. Architectural Philosophy

The **LDOCX Universal Design System** provides an exact, deterministic visual language and arithmetic layout foundation that bridges print precision, interactive web ergonomics, and executable computing surfaces. Unlike traditional web design systems that rely on unpredictable CSS cascades or canvas systems that treat text as unsearchable pixels, LDOCX adheres to:

1. **Pretext Arithmetic Layout**: Sub-pixel, bit-for-bit deterministic typography across all execution environments without browser-specific reflow or font metrics drift.
2. **WCAG 2.2 Level AA/AAA Color Mathematics**: Automated contrast calculation and algorithmic palette validation across all primary, secondary, surface, and semantic roles.
3. **Adaptive Canvas Geometries**: Strict aspect ratio preservation, bleed safety margins, modular grid systems, and multi-surface responsiveness (Print, Desktop, Mobile, Presentation).
4. **Physical Tactile Surface Rendering**: Real-time WebGL/Canvas micro-texture shaders simulating authentic physical paper stocks (rag, matte, vellum, satin, kraft).

---

## 2. Typography Hierarchies & Arithmetic Layout

### 2.1 The Pretext Arithmetic Layout Engine
Traditional browser text rendering computes line wraps based on runtime DOM measurements (`getBoundingClientRect`, `measureText`), leading to platform-specific layout variances between macOS CoreText, Windows DirectWrite, and Linux FreeType. 

LDOCX utilizes Pretext arithmetic layout:
$$\text{LineWrap}(w_{\text{available}}, S, F) \to \{(t_i, x_i, y_i, w_i, h_i)\}_{i=1}^N$$
where every character advance, kerning pair, and word boundary is calculated deterministically against normalized font metrics stored in the document bundle.

```
+-------------------------------------------------------------------------+
| Document AST String                                                     |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
| Pretext Normalized Font Metrics (x-height, cap-height, advance widths)   |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
| Deterministic Line Breaking & Hyphenation (Knuth-Plass algorithm)       |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
| Exact AST Coordinates: [{ x, y, width, height, baseline }]              |
+-------------------------------------------------------------------------+
```

### 2.2 Typographic Scale & Modular Ratios
LDOCX defines 6 primary typographic scales derived from classical geometric and musical proportions:

| Scale Name | Ratio ($r$) | Primary Application |
| :--- | :--- | :--- |
| **Minor Third** | $1.200$ | Technical documentation, datasheets, compact data tables |
| **Major Third** | $1.250$ | Default editorial, long-form reports, executive summaries |
| **Perfect Fourth** | $1.333$ | High-contrast marketing flyers, modern newsletters |
| **Augmented Fourth** | $1.414$ | Magazine spreads, portfolio showcases |
| **Perfect Fifth** | $1.500$ | Widescreen presentation decks, keynote headers |
| **Golden Ratio** | $1.618$ | Poster headlines, hero display callouts |

Given a base font size $f_0 = 16\text{px}$, any level $k$ is calculated as:
$$f_k = f_0 \cdot r^k, \quad h_k = \text{round}(f_k \cdot 1.4 \div 4) \cdot 4$$
All line heights are strictly snapped to a $4\text{px}$ vertical baseline grid.

### 2.3 Curated Typography Pairings
The engine contains 20 curated, self-hosted/web-safe typography pairings:

```javascript
const TYPOGRAPHY_PAIRINGS = [
  { id: 'modern_sans', heading: 'Inter', body: 'system-ui, -apple-system, sans-serif', scale: 1.25 },
  { id: 'editorial_serif', heading: 'Playfair Display', body: 'Georgia, serif', scale: 1.333 },
  { id: 'technical_mono', heading: 'JetBrains Mono', body: 'Fira Code, monospace', scale: 1.2 },
  { id: 'brutalist_grotesk', heading: 'Space Grotesk', body: 'Space Mono, monospace', scale: 1.414 },
  { id: 'academic_classic', heading: 'Merriweather', body: 'Source Serif Pro, serif', scale: 1.25 },
  { id: 'swiss_clean', heading: 'Helvetica Neue', body: 'Arial, sans-serif', scale: 1.25 },
  { id: 'geometric_display', heading: 'Montserrat', body: 'Open Sans, sans-serif', scale: 1.333 },
  { id: 'luxury_minimal', heading: 'Cormorant Garamond', body: 'Proxima Nova, sans-serif', scale: 1.5 },
  { id: 'condensed_news', heading: 'Oswald', body: 'Roboto, sans-serif', scale: 1.25 },
  { id: 'humanist_warm', heading: 'Lora', body: 'Lato, sans-serif', scale: 1.25 }
  // + 10 additional procedural pairings in ldoc-template-engine.js
];
```

---

## 3. Responsive Canvas Geometries & Aspect Ratios

LDOCX documents support dynamic canvas geometries with physical millimeter-to-pixel conversions (defaulting to standard $96\text{ DPI}$ or print-grade $300\text{ DPI}$):

```
+───────────────────────────────────────────────────────────────+
| Canvas Bounding Box (e.g. 1920 x 1080 / A4 794 x 1123)        |
|  +─────────────────────────────────────────────────────────+  |
|  | Bleed Margin (e.g. 3mm / ~11px)                         |  |
|  |  +───────────────────────────────────────────────────+  |  |
|  |  | Safe Content Zone (Print / UI boundary)           |  |  |
|  |  |   [ 12-Column Responsive Layout Grid ]             |  |  |
|  |  |   Columns: 12 | Gutters: 16px | Margins: 32px     |  |  |
|  |  +───────────────────────────────────────────────────+  |  |
|  +─────────────────────────────────────────────────────────+  |
+───────────────────────────────────────────────────────────────+
```

### Standard Dimensions

| Format ID | Aspect Ratio | Dimensions (96 DPI) | Dimensions (300 DPI Print) | Common Usage |
| :--- | :--- | :--- | :--- | :--- |
| `a4_portrait` | $1:\sqrt{2}$ | $794 \times 1123\text{ px}$ | $2480 \times 3508\text{ px}$ | Formal business documents, contracts, reports |
| `a4_landscape` | $\sqrt{2}:1$ | $1123 \times 794\text{ px}$ | $3508 \times 2480\text{ px}$ | Financial spreadsheets, data tables |
| `us_letter` | $1:1.294$ | $816 \times 1056\text{ px}$ | $2550 \times 3300\text{ px}$ | North American standard office documentation |
| `presentation_16_9` | $16:9$ | $1920 \times 1080\text{ px}$ | $3840 \times 2160\text{ px}$ | Keynotes, interactive presentations, video ads |
| `mobile_story` | $9:16$ | $1080 \times 1920\text{ px}$ | — | Vertical phone content, social executive summaries |
| `square_social` | $1:1$ | $1080 \times 1080\text{ px}$ | — | Square briefs, social badges, certificates |
| `infinite_whiteboard`| Free | Dynamic / Unbounded | — | Architecture diagrams, mind maps |

---

## 4. Color Systems & WCAG 2.2 Contrast Calculus

### 4.1 Contrast Math
For any text or graphical element rendered against a background, LDOCX calculates the relative luminance $L$ according to IEC 61966-2-1:

$$R_{\text{lin}} = \begin{cases} \frac{R_{\text{srgb}}}{12.92} & R_{\text{srgb}} \le 0.04045 \\ \left(\frac{R_{\text{srgb}} + 0.055}{1.055}\right)^{2.4} & R_{\text{srgb}} > 0.04045 \end{cases}$$

$$L = 0.2126 \cdot R_{\text{lin}} + 0.7152 \cdot G_{\text{lin}} + 0.0722 \cdot B_{\text{lin}}$$

The contrast ratio $CR$ between foreground luminance $L_1$ and background luminance $L_2$ ($L_1 > L_2$) is:
$$CR = \frac{L_1 + 0.05}{L_2 + 0.05}$$

- **WCAG AA Minimum**: $CR \ge 4.5:1$ (normal text), $CR \ge 3.0:1$ (large text $\ge 18\text{pt}$ / $24\text{px}$ or UI controls).
- **WCAG AAA Enhanced**: $CR \ge 7.0:1$ (normal text), $CR \ge 4.5:1$ (large text).

### 4.2 Semantic Design Tokens
Each LDOCX palette exposes 8 semantic color slots guaranteed to pass WCAG AA/AAA:
- `primary`: Core brand action, active highlights, key vector fills.
- `primaryVariant`: Hover states, active borders, secondary accents.
- `secondary`: Sub-headings, metadata labels, tertiary accents.
- `background`: Canvas fill (tactile paper or dark surface).
- `surface`: Card containers, elevated modals, sidebar panels.
- `text`: Dominant text color (contrasted against `background`).
- `textMuted`: Secondary labels, captions, footnotes ($CR \ge 4.5:1$).
- `border`: Separators, bounding outlines, grid guides.

---

## 5. Grid Matrixes & Magnetic Snap Rules

The canvas layout engine implements a multi-tier magnetic snap detector during mouse/touch drag:

```
          [Target Block]
                 │
                 ├── Center-X Snap  ───▶ Matches Page Midpoint (X = 540)
                 ├── Left-Edge Snap ───▶ Matches Block B Left (X = 120)
                 ├── Right-Edge Snap───▶ Matches Block C Right (X = 960)
                 └── Equidistant    ───▶ Gap(A, B) == Gap(B, Target)
```

1. **Threshold**: Snap activates when edge/center delta $|\Delta| \le 5\text{px}$.
2. **Visual Feedback**: Real-time magenta alignment guides (`#e11d48`) rendered on overlay canvas with coordinate callouts.
3. **Keyboard Fine-Nudging**: Arrow keys nudge selected blocks by $1\text{px}$; holding `Shift` nudges by $10\text{px}$.

---

## 6. Tactile Paper Physical Shaders

LDOCX documents can be rendered with physical paper materials using an embedded WebGL fragment shader or high-precision 2D canvas procedural noise pass:

### Procedural Paper Micro-Texture Shader
```glsl
precision highp float;
uniform vec2 u_resolution;
uniform float u_roughness;
uniform float u_fiber_density;
uniform vec4 u_paper_color;

// Hash PRNG for fiber generation
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float grain = noise(uv * 600.0) * u_roughness;
    float fibers = step(1.0 - u_fiber_density * 0.05, hash(uv * 1200.0)) * 0.04;
    
    vec3 baseColor = u_paper_color.rgb;
    vec3 finalColor = baseColor - vec3(grain * 0.06) + vec3(fibers);
    gl_FragColor = vec4(finalColor, u_paper_color.a);
}
```

Available tactile paper profiles:
1. `smooth_bond`: Pure clean 80gsm copy paper, zero fiber noise, sharp vector edges.
2. `linen_rag`: 120gsm woven texture, subtle cross-hatch fiber bump.
3. `recycled_kraft`: Earthy warm tone, organic fleck noise, matte sheen.
4. `architectural_vellum`: Semi-translucent drafting paper with faint blueprint grid.

---

## 7. Dark Mode & Adaptive Surface Theming

The design system provides instantaneous bidirectional theme adaptation without document re-layout:
- Document styles support `@media (prefers-color-scheme: dark)` and manual `.ldoc-theme-dark` overrides.
- In Dark Mode, paper surfaces invert to deep carbon tones (`#121214`, `#1a1a1e`), contrast calculations re-evaluate luminance against `#ffffff`, and SVG vector strokes adapt automatically.
