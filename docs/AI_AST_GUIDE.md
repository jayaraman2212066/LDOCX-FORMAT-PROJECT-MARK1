# LDOCX AI AST Generation, Streaming Parser & Prompt Architecture

## 1. Architectural Overview: LLMs as Document Co-Creators

Traditional document formats (PDF, DOCX) are hostile to Large Language Models:
- **PDF** is an imperative sequence of postscript drawing coordinates with lost structural semantics, making it nearly impossible for an LLM to generate or edit reliably without layout corruption.
- **DOCX** is an intricate XML maze of hundreds of interrelated files in OpenXML format, leading to frequent ZIP corruptions and schema invalidations.

**LDOCX was engineered from the ground up for the AI Era**:
1. **Canonical JSON AST**: Every document is a strictly typed, human-readable, machine-verifiable Abstract Syntax Tree.
2. **Deterministic Schema Validation**: Every generated block must pass `LDocValidator.validateDocument()` before runtime ingestion.
3. **Streaming AST Ingestion**: Supports incremental JSON parsing, allowing the canvas to materialize blocks in real time as tokens arrive from the LLM.
4. **Living Prompt Templates**: AI models can generate not just static copy, but live formulas, reactive variables, interactive sliders, and physics simulations.

```
┌─────────────────────────────────────────────────────────────┐
│                      Prompt / User Goal                     │
│ "Create a 3-page SaaS Investor Pitch Deck with MRR Slider" │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               LLM (Gemini 2.5 / Claude 3.5 / GPT)           │
│        Streams JSON AST Tokens via Server-Sent Events       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                Streaming JSON AST Parser                    │
│   Accumulates Partial AST & Emits Complete Block Nodes      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           LDocValidator & Security Sanitizer                │
│    Zero-Eval Enforcement, Script Neutralization & Types     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            LDocEditorCore / Studio Live Canvas              │
│       Renders Slides, Graphs, and Sliders Progressively     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Canonical Document AST Schema

An LDOCX document AST conforms to the following master schema:

```json
{
  "ldocVersion": "3.0.0",
  "meta": {
    "title": "Series A Growth Strategy & Financial Model",
    "author": "AI Co-Pilot & Executive Team",
    "created": 1773780000000,
    "canvas": {
      "width": 1920,
      "height": 1080,
      "theme": "dark",
      "palette": "electric_indigo"
    }
  },
  "variables": {
    "arpu": { "value": 120, "min": 50, "max": 500, "step": 10, "unit": "$" },
    "customers": { "value": 2400, "min": 100, "max": 10000, "step": 100 },
    "churnRate": { "value": 0.02, "min": 0.005, "max": 0.1, "step": 0.005, "unit": "%" }
  },
  "formulas": {
    "mrr": "arpu * customers",
    "arr": "mrr * 12",
    "netNewMrr": "mrr * (1 - churnRate)"
  },
  "pages": [
    {
      "id": "page_1",
      "name": "Executive Summary & Dynamic ARR",
      "blocks": [
        {
          "id": "blk_hero_bg",
          "type": "shape",
          "shape_type": "rounded_rectangle",
          "x": 40,
          "y": 40,
          "width": 1840,
          "height": 1000,
          "style": { "fill": "#0f172a", "stroke": "#334155", "strokeWidth": 1.5, "cornerRadius": 24 }
        },
        {
          "id": "blk_headline",
          "type": "heading",
          "level": 1,
          "text": "Scalable B2B Enterprise Engine",
          "x": 120,
          "y": 140,
          "width": 1000,
          "isFloating": true,
          "fontSize": 48,
          "fontWeight": "800",
          "color": "#f8fafc"
        },
        {
          "id": "blk_sim_card",
          "type": "simulation",
          "preset": "compound_interest",
          "x": 120,
          "y": 280,
          "width": 800,
          "height": 450,
          "variables": {
            "initialCapital": { "value": 500000 },
            "monthlyContribution": { "value": 25000 },
            "annualRate": { "value": 18 }
          }
        },
        {
          "id": "blk_chart",
          "type": "chart",
          "chartType": "area",
          "x": 980,
          "y": 280,
          "width": 820,
          "height": 450,
          "data": {
            "labels": ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"],
            "datasets": [
              { "label": "Projected MRR ($)", "data": [120000, 185000, 290000, 440000, 680000, 1020000], "color": "#6366f1" }
            ]
          }
        }
      ]
    }
  ]
}
```

---

## 3. Streaming AST Ingestion Engine

When generating large documents, waiting for the complete LLM completion causes high time-to-first-paint latency. LDOCX provides an incremental streaming AST parser:

```javascript
class LDocStreamingAstParser {
  constructor(editorCore) {
    this.editor = editorCore;
    this.buffer = '';
    this.parsedBlockIds = new Set();
  }

  feedToken(tokenChunk) {
    this.buffer += tokenChunk;
    this.scanForCompleteBlocks();
  }

  scanForCompleteBlocks() {
    // Matches complete block JSON structures inside "blocks": [ ... ]
    const blockRegex = /\{\s*"id"\s*:\s*"([^"]+)"[\s\S]*?"type"\s*:\s*"([^"]+)"[\s\S]*?\}(?=\s*,\s*\{|\s*\])/g;
    let match;

    while ((match = blockRegex.exec(this.buffer)) !== null) {
      const blockId = match[1];
      if (!this.parsedBlockIds.has(blockId)) {
        try {
          const blockObj = JSON.parse(match[0]);
          // Validate block against schema
          if (LDocValidator.validateBlock(blockObj)) {
            this.parsedBlockIds.add(blockId);
            this.editor.addBlock(blockObj);
          }
        } catch (e) {
          // Incomplete fragment, continue buffering
        }
      }
    }
  }
}
```

---

## 4. System Prompt Pattern for LLM Generation

To instruct an AI model to generate valid, interactive LDOCX documents, provide the following structured system prompt:

```markdown
You are an expert LDOCX Living Document Architect.
Your task is to generate a valid, self-contained LDOCX JSON Abstract Syntax Tree.

CRITICAL RULES:
1. OUTPUT FORMAT: Respond ONLY with valid JSON conforming to the LDOCX v3.0.0 specification.
2. ZERO EVAL: Formulas must use standard arithmetic and whitelisted math functions: sin, cos, sqrt, pow, min, max. Never use javascript code or eval.
3. PRECISE COORDINATES: Every block must contain explicit "x", "y", "width", "height" coordinates within a 1920x1080 or A4 (794x1123) canvas.
4. LIVING COMPUTATION: Include at least one reactive variable (in "variables") and a dynamic formula (in "formulas") or STEM simulation block ("type": "simulation").
5. WCAG AA ACCESSIBILITY: Ensure text color contrasts with container backgrounds with contrast ratio >= 4.5:1.
6. VALID BLOCK TYPES: "heading", "paragraph", "shape", "image_card", "chart", "table", "simulation", "diagram", "quiz", "custom_path".
```

---

## 5. Security Sanitization & Validation Pipeline

Before any AI-generated AST is rendered or committed to disk:
1. **Schema Check (`LDocValidator.validateDocument(doc)`)**:
   - Confirms root keys (`ldocVersion`, `meta`, `pages`).
   - Ensures unique block IDs across all pages.
   - Verifies coordinate bounds ($x \ge 0, y \ge 0, w > 0, h > 0$).
2. **HTML Sanitization (`LDocValidator.sanitizeDocument(doc)`)**:
   - Neutralizes `<script>` tags in text strings.
   - Strips `javascript:`, `vbscript:`, and `data:text/html` URI protocols.
   - Strips inline DOM event attributes (`onload`, `onclick`, `onerror`).
3. **Formula Whitelisting**:
   - Formula expressions are parsed into the safe AST tree without invoking native JavaScript runtime compilers.
