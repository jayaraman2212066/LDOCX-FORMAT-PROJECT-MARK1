/**
 * LDOC Visual Diagram Engine
 * Flowcharts, mind maps, architecture blueprints, and smart auto-routing connectors
 * with snap anchor points, arrowheads, and automatic orthogonal line routing.
 */
(function (global) {
  'use strict';

  const LDocDiagramEngine = {
    NODE_TYPES: {
      process: { label: 'Process', shape: 'rect', defaultColor: '#6366f1' },
      decision: { label: 'Decision', shape: 'diamond', defaultColor: '#f59e0b' },
      terminal: { label: 'Start / End', shape: 'rounded_rect', defaultColor: '#10b981' },
      io: { label: 'Input / Output', shape: 'parallelogram', defaultColor: '#38bdf8' },
      subroutine: { label: 'Subroutine', shape: 'rect_double', defaultColor: '#8b5cf6' },
      database: { label: 'Data Storage', shape: 'cylinder', defaultColor: '#ec4899' },
      mindmap_root: { label: 'Root Topic', shape: 'rounded_rect', defaultColor: '#7c3aed' },
      mindmap_node: { label: 'Subtopic', shape: 'pill', defaultColor: '#3b82f6' }
    },

    createDiagramBlock: function (title, preset = 'flowchart') {
      const id = 'diag_' + Math.random().toString(36).slice(2, 9);
      const nodes = [];
      const edges = [];

      if (preset === 'flowchart') {
        nodes.push({ id: 'n1', type: 'terminal', label: 'Start', x: 280, y: 30, width: 140, height: 44, color: '#10b981' });
        nodes.push({ id: 'n2', type: 'process', label: 'Execute Task', x: 270, y: 110, width: 160, height: 50, color: '#6366f1' });
        nodes.push({ id: 'n3', type: 'decision', label: 'Is Valid?', x: 280, y: 190, width: 140, height: 60, color: '#f59e0b' });
        nodes.push({ id: 'n4', type: 'terminal', label: 'Success', x: 280, y: 280, width: 140, height: 44, color: '#10b981' });

        edges.push({ id: 'e1', from: 'n1', to: 'n2', fromAnchor: 'bottom', toAnchor: 'top', label: '' });
        edges.push({ id: 'e2', from: 'n2', to: 'n3', fromAnchor: 'bottom', toAnchor: 'top', label: '' });
        edges.push({ id: 'e3', from: 'n3', to: 'n4', fromAnchor: 'bottom', toAnchor: 'top', label: 'Yes' });
      } else if (preset === 'mindmap') {
        nodes.push({ id: 'm1', type: 'mindmap_root', label: 'Central Idea', x: 260, y: 130, width: 160, height: 60, color: '#7c3aed' });
        nodes.push({ id: 'm2', type: 'mindmap_node', label: 'Architecture', x: 80, y: 60, width: 130, height: 40, color: '#3b82f6' });
        nodes.push({ id: 'm3', type: 'mindmap_node', label: 'Performance', x: 80, y: 200, width: 130, height: 40, color: '#3b82f6' });
        nodes.push({ id: 'm4', type: 'mindmap_node', label: 'Security', x: 480, y: 60, width: 130, height: 40, color: '#3b82f6' });
        nodes.push({ id: 'm5', type: 'mindmap_node', label: 'Ecosystem', x: 480, y: 200, width: 130, height: 40, color: '#3b82f6' });

        edges.push({ id: 'me1', from: 'm1', to: 'm2', fromAnchor: 'left', toAnchor: 'right', style: 'curved' });
        edges.push({ id: 'me2', from: 'm1', to: 'm3', fromAnchor: 'left', toAnchor: 'right', style: 'curved' });
        edges.push({ id: 'me3', from: 'm1', to: 'm4', fromAnchor: 'right', toAnchor: 'left', style: 'curved' });
        edges.push({ id: 'me4', from: 'm1', to: 'm5', fromAnchor: 'right', toAnchor: 'left', style: 'curved' });
      }

      return {
        id: id,
        type: 'diagram',
        preset: preset,
        title: title || 'System Flow Diagram',
        x: 40,
        y: 40,
        width: 720,
        height: 380,
        nodes: nodes,
        edges: edges
      };
    },

    /**
     * Computes exact connection anchor coordinate for a node.
     */
    getNodeAnchorCoord: function (node, anchor) {
      if (!node) return { x: 0, y: 0 };
      const cx = node.x + (node.width / 2);
      const cy = node.y + (node.height / 2);

      switch (anchor) {
        case 'top': return { x: cx, y: node.y };
        case 'bottom': return { x: cx, y: node.y + node.height };
        case 'left': return { x: node.x, y: cy };
        case 'right': return { x: node.x + node.width, y: cy };
        default: return { x: cx, y: cy };
      }
    },

    /**
     * Generates orthogonal or curved SVG path data for a connector between two anchors.
     */
    generateConnectorPath: function (fromCoord, toCoord, style = 'orthogonal') {
      if (style === 'curved') {
        const dx = (toCoord.x - fromCoord.x) / 2;
        return `M ${fromCoord.x} ${fromCoord.y} C ${fromCoord.x + dx} ${fromCoord.y}, ${toCoord.x - dx} ${toCoord.y}, ${toCoord.x} ${toCoord.y}`;
      }

      // Orthogonal Manhattan step routing
      const midY = (fromCoord.y + toCoord.y) / 2;
      return `M ${fromCoord.x} ${fromCoord.y} L ${fromCoord.x} ${midY} L ${toCoord.x} ${midY} L ${toCoord.x} ${toCoord.y}`;
    },

    /**
     * Renders a diagram block as an SVG markup string.
     */
    renderDiagramSvg: function (diagramBlock) {
      if (!diagramBlock || !Array.isArray(diagramBlock.nodes)) return '';
      const w = diagramBlock.width || 720;
      const h = diagramBlock.height || 380;
      const nodeMap = {};
      diagramBlock.nodes.forEach(n => { nodeMap[n.id] = n; });

      let svg = `<svg viewBox="0 0 ${w} ${h}" class="ldoc-diagram-svg" style="width:100%;height:100%;display:block;overflow:visible;">`;
      svg += `
        <defs>
          <marker id="diag-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
          </marker>
        </defs>
      `;

      // Render Edges
      (diagramBlock.edges || []).forEach(edge => {
        const fromNode = nodeMap[edge.from];
        const toNode = nodeMap[edge.to];
        if (!fromNode || !toNode) return;

        const p1 = this.getNodeAnchorCoord(fromNode, edge.fromAnchor || 'bottom');
        const p2 = this.getNodeAnchorCoord(toNode, edge.toAnchor || 'top');
        const pathD = this.generateConnectorPath(p1, p2, edge.style || 'orthogonal');

        svg += `<path d="${pathD}" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#diag-arrow)" />`;
        if (edge.label) {
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          svg += `<rect x="${midX - 16}" y="${midY - 9}" width="32" height="18" fill="#0f172a" rx="3" stroke="#334155" stroke-width="1" />`;
          svg += `<text x="${midX}" y="${midY + 4}" font-size="10" font-family="Plus Jakarta Sans, sans-serif" fill="#cbd5e1" text-anchor="middle">${edge.label}</text>`;
        }
      });

      // Render Nodes
      diagramBlock.nodes.forEach(node => {
        const color = node.color || '#6366f1';
        if (node.type === 'decision') {
          const cx = node.x + node.width / 2;
          const cy = node.y + node.height / 2;
          const d = `M ${cx} ${node.y} L ${node.x + node.width} ${cy} L ${cx} ${node.y + node.height} L ${node.x} ${cy} Z`;
          svg += `<path d="${d}" fill="#1e293b" stroke="${color}" stroke-width="2" />`;
        } else {
          const rx = node.type === 'terminal' || node.type === 'mindmap_node' ? 18 : 6;
          svg += `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${rx}" fill="#1e293b" stroke="${color}" stroke-width="2" />`;
        }

        const tx = node.x + node.width / 2;
        const ty = node.y + node.height / 2 + 4;
        svg += `<text x="${tx}" y="${ty}" font-size="12" font-weight="600" font-family="Plus Jakarta Sans, sans-serif" fill="#f8fafc" text-anchor="middle">${node.label}</text>`;
      });

      svg += `</svg>`;
      return svg;
    }
  };

  global.LDocDiagramEngine = LDocDiagramEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LDocDiagramEngine;
    module.exports.LDocDiagramEngine = LDocDiagramEngine;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
