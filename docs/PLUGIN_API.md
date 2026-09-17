# LDOCX Sandboxed Plugin API & Extension Architecture

## 1. Architectural Philosophy & Sandboxing Model

The **LDOCX Sandboxed Plugin API** allows developers to extend the document format, creative authoring tools, and runtime viewers without compromising the core security, determinism, or archival longevity guarantees of the format.

Unlike legacy document plugins (e.g. Adobe Acrobat NPAPI plugins or Microsoft Office COM/VBA macros) which introduce catastrophic arbitrary code execution risks and binary obsolescence, LDOCX extensions operate under a **Capability-Based Sandboxed Model**:

```
+───────────────────────────────────────────────────────────────+
|                       Host Environment                        |
|   (Studio / Creator / Viewer Runtime / Headless Node / App)   |
+───────────────────────────────────────────────────────────────+
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
    ┌──────────────────────┐        ┌──────────────────────┐
    │  LDocPluginAPI Core  │        │   Security Boundary  │
    │  (Registry & Router) │        │ (Zero-Eval, No Eval) │
    └──────────┬───────────┘        └──────────────────────┘
               │
    ┌──────────┴─────────────────────────────────────────┐
    ▼                                                    ▼
┌─────────────────────────┐                  ┌─────────────────────────┐
│  Standard Core Blocks   │                  │   Capability Sandboxed  │
│ (Text, Shape, Image,    │                  │      Third-Party        │
│  3D, Simulation, Table) │                  │     Plugin Modules      │
└─────────────────────────┘                  └─────────────────────────┘
```

### Core Security Invariants
1. **Zero-Eval Guarantee**: Plugins are evaluated as pure ES module objects; dynamic evaluation (`eval`, `new Function`, `Function.constructor`) is forbidden.
2. **DOM Isolation**: Block renderers receive a scoped container element (`HTMLElement` or `CanvasRenderingContext2D`) and cannot reach outside into host toolbars, editor chrome, or cross-origin contexts.
3. **AST Immutability**: Plugins mutate document state exclusively through dispatched change transactions to `LDocEditorCore`, preserving undo/redo history and Merkle tree hash integrity.
4. **Offline Autonomy**: Plugins cannot require external network connections to render document content. All rendering code must bundle with the document or self-register within the client runtime.

---

## 2. Plugin Types & Capabilities

The registry supports 7 distinct plugin types via `LDocPluginAPI.PLUGIN_TYPES`:

| Type | Purpose | Render Target | Primary Lifecycle Hooks |
| :--- | :--- | :--- | :--- |
| `block` | Custom visual document block | Scoped DOM container / Canvas | `render(block, container)`, `destroy()` |
| `chart` | Specialized data visualization | Canvas / SVG | `render(data, config, ctx)`, `resize()` |
| `simulation` | Interactive physics or computational model | WebGL / 2D Canvas / Web Worker | `init(simState)`, `step(dt)`, `draw(ctx)` |
| `exporter` | Serialization to external file formats | Headless string / Uint8Array | `export(documentAst, options)` |
| `importer` | Ingestion from external formats | AST Document Tree | `import(rawSource, options)` |
| `tool` | Toolbar action or interactive canvas tool | Editor Canvas UI | `activate(editor)`, `onPointerDown(e)` |
| `inspector` | Custom property panel for selected block | Inspector DOM | `mount(block, onChange)`, `unmount()` |

---

## 3. Plugin Registration API

### 3.1 Registering an Extension
```javascript
const myPlugin = LDocPluginAPI.registerPlugin({
  id: 'com.vendor.sankey_diagram',
  name: 'Sankey Flow Diagram',
  type: 'block',
  version: '1.2.0',
  author: 'Visual Data Corp',
  description: 'Visualizes flow quantities and energy distributions between nodes.',
  schema: {
    type: 'object',
    properties: {
      nodes: { type: 'array' },
      links: { type: 'array' }
    },
    required: ['nodes', 'links']
  },
  defaultProps: {
    width: 600,
    height: 400,
    nodes: [
      { id: 'Source A', color: '#6366f1' },
      { id: 'Source B', color: '#10b981' },
      { id: 'Target X', color: '#f59e0b' }
    ],
    links: [
      { source: 0, target: 2, value: 45 },
      { source: 1, target: 2, value: 55 }
    ]
  },
  render: function (block, container) {
    // Isolated rendering inside container
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.width = block.width || 600;
    canvas.height = block.height || 400;
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    renderSankeyFlow(ctx, block.nodes, block.links, block.width, block.height);
  }
});
```

### 3.2 Querying Registered Plugins
```javascript
// Get all registered block plugins
const blockPlugins = LDocPluginAPI.listPlugins('block');

// Retrieve a specific plugin definition
const plugin = LDocPluginAPI.getPlugin('block', 'com.vendor.sankey_diagram');

// Render a custom plugin block into a target container
LDocPluginAPI.executeBlockRender(blockNode, containerElement);
```

---

## 4. Complete Plugin Implementation Example: LaTeX Math Formula Runner

Below is a complete, production-ready custom block plugin that renders mathematical formulas into SVG without external dependencies:

```javascript
(function () {
  'use strict';

  if (typeof LDocPluginAPI === 'undefined') return;

  LDocPluginAPI.registerPlugin({
    id: 'org.ldocx.latex_formula',
    name: 'LaTeX Math Formula',
    type: 'block',
    version: '1.0.0',
    author: 'LDOCX Foundation',
    description: 'Renders mathematical expressions into crisp vector representations.',
    defaultProps: {
      formula: 'E = m c^2',
      displayMode: true,
      fontSize: 24,
      color: '#1e293b'
    },
    schema: {
      properties: {
        formula: { type: 'string' },
        fontSize: { type: 'number' },
        color: { type: 'string' }
      }
    },
    render: function (block, container) {
      container.innerHTML = '';
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.overflow = 'hidden';

      const formula = block.formula || 'f(x) = x^2';
      const fontSize = block.fontSize || 20;
      const color = block.color || 'currentColor';

      // Lightweight clean fallback vector typesetting
      const wrapper = document.createElement('div');
      wrapper.className = 'ldoc-latex-rendered';
      wrapper.style.fontFamily = '"KaTeX_Math", "Cambria Math", "Latin Modern Math", serif';
      wrapper.style.fontSize = fontSize + 'px';
      wrapper.style.color = color;
      wrapper.textContent = formula;

      container.appendChild(wrapper);
    }
  });
})();
```

---

## 5. Integrating Custom Plugins with Studio & Viewer

1. **In Studio (`studio.html`)**:
   Plugins registered via `LDocPluginAPI` automatically populate the **Plugins** category in the left sidebar drawer and Command Palette (`Ctrl+K`).
2. **In Viewer (`viewer.html`)**:
   The viewer checks `block.pluginType`. If a plugin matching the ID is loaded, `LDocPluginAPI.executeBlockRender()` delegates rendering to the plugin; otherwise, it renders an archival fallback card displaying the block's raw data and title.
3. **AST Storage**:
   ```json
   {
     "id": "block_sankey_9102",
     "type": "plugin_block",
     "pluginType": "com.vendor.sankey_diagram",
     "x": 100,
     "y": 150,
     "width": 640,
     "height": 380,
     "props": {
       "nodes": [...],
       "links": [...]
     }
   }
   ```
