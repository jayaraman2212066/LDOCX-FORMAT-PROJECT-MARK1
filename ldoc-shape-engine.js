/**
 * LDOC Unified Shape & Vector Graphics Engine
 * Provides native SVG vector shape generation, gradient manipulation,
 * path calculations, and DOM rendering for living documents.
 * Copyright (c) 2026 J-AI-ENTERPRISES. All Rights Reserved.
 * Licensed under Apache-2.0.
 */
(function (global) {
  'use strict';

  function escapeXml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  const LDocShapeEngine = {
    version: '3.0.0',

    SUPPORTED_SHAPES: [
      'rectangle',
      'rounded_rectangle',
      'circle',
      'ellipse',
      'triangle',
      'star',
      'polygon',
      'line',
      'arrow',
      'connector',
      'callout',
      'heart'
    ],

    /**
     * Creates a new structured Shape block for the LDOCX AST
     */
    createShape: function (shapeType, options) {
      options = options || {};
      const type = (shapeType || 'rectangle').toLowerCase();
      const id = options.id || ('shape_' + Math.random().toString(36).slice(2, 9));
      const width = typeof options.width === 'number' ? options.width : 160;
      const height = typeof options.height === 'number' ? options.height : 120;
      const x = typeof options.x === 'number' ? options.x : 100;
      const y = typeof options.y === 'number' ? options.y : 100;

      const style = Object.assign({
        fill: '#6366f1',
        stroke: '#818cf8',
        strokeWidth: 2,
        strokeDash: 'solid', // 'solid', 'dashed', 'dotted'
        cornerRadius: 8,
        opacity: 1.0,
        shadow: null, // { x: 0, y: 4, blur: 10, color: 'rgba(0,0,0,0.4)' }
        blur: 0,
        gradient: null // { type: 'linear'|'radial', angle: 90, stops: [{ offset: 0, color: '#...' }, { offset: 1, color: '#...' }] }
      }, options.style || {});

      // Direct overrides if passed in options
      if (options.fill !== undefined) style.fill = options.fill;
      if (options.stroke !== undefined) style.stroke = options.stroke;
      if (options.strokeWidth !== undefined) style.strokeWidth = options.strokeWidth;
      if (options.cornerRadius !== undefined) style.cornerRadius = options.cornerRadius;
      if (options.opacity !== undefined) style.opacity = options.opacity;
      if (options.gradient !== undefined) style.gradient = options.gradient;
      if (options.shadow !== undefined) style.shadow = options.shadow;

      return {
        id: id,
        type: 'shape',
        shape_type: type,
        x: x,
        y: y,
        width: width,
        height: height,
        rotation: typeof options.rotation === 'number' ? options.rotation : 0,
        style: style,
        label: options.label ? {
          text: options.label.text || '',
          fontSize: options.label.fontSize || 14,
          fontFamily: options.label.fontFamily || 'Plus Jakarta Sans',
          color: options.label.color || '#ffffff',
          fontWeight: options.label.fontWeight || '600',
          align: options.label.align || 'center'
        } : null,
        props: {
          points: options.points || (type === 'star' ? 5 : (type === 'polygon' ? 6 : null)),
          innerRadius: options.innerRadius || 0.45,
          pointerSide: options.pointerSide || 'bottom'
        }
      };
    },

    /**
     * Computes SVG path 'd' attribute for complex geometric shapes
     */
    computePathD: function (shapeType, w, h, options) {
      options = options || {};
      const type = (shapeType || 'rectangle').toLowerCase();
      const strokeW = (options.strokeWidth || 0);
      // Inset bounding box by half stroke width to avoid clipping stroke ends
      const pad = strokeW / 2;
      const innerW = Math.max(1, w - strokeW);
      const innerH = Math.max(1, h - strokeW);

      switch (type) {
        case 'triangle': {
          const topX = pad + innerW / 2;
          const topY = pad;
          const rightX = pad + innerW;
          const rightY = pad + innerH;
          const leftX = pad;
          const leftY = pad + innerH;
          return `M ${topX.toFixed(2)} ${topY.toFixed(2)} L ${rightX.toFixed(2)} ${rightY.toFixed(2)} L ${leftX.toFixed(2)} ${leftY.toFixed(2)} Z`;
        }

        case 'star': {
          const points = options.points || 5;
          const innerRatio = options.innerRadius || 0.45;
          const cx = pad + innerW / 2;
          const cy = pad + innerH / 2;
          const rx = innerW / 2;
          const ry = innerH / 2;
          let d = '';
          const totalAngle = Math.PI * 2;
          const step = totalAngle / (points * 2);
          const startAngle = -Math.PI / 2; // Point top

          for (let i = 0; i < points * 2; i++) {
            const isInner = i % 2 === 1;
            const rCurX = isInner ? rx * innerRatio : rx;
            const rCurY = isInner ? ry * innerRatio : ry;
            const angle = startAngle + i * step;
            const px = cx + rCurX * Math.cos(angle);
            const py = cy + rCurY * Math.sin(angle);
            d += (i === 0 ? `M ${px.toFixed(2)} ${py.toFixed(2)}` : ` L ${px.toFixed(2)} ${py.toFixed(2)}`);
          }
          return d + ' Z';
        }

        case 'polygon': {
          const sides = Math.max(3, options.points || 6);
          const cx = pad + innerW / 2;
          const cy = pad + innerH / 2;
          const rx = innerW / 2;
          const ry = innerH / 2;
          let d = '';
          const step = (Math.PI * 2) / sides;
          const startAngle = -Math.PI / 2;

          for (let i = 0; i < sides; i++) {
            const angle = startAngle + i * step;
            const px = cx + rx * Math.cos(angle);
            const py = cy + ry * Math.sin(angle);
            d += (i === 0 ? `M ${px.toFixed(2)} ${py.toFixed(2)}` : ` L ${px.toFixed(2)} ${py.toFixed(2)}`);
          }
          return d + ' Z';
        }

        case 'arrow': {
          // Block chevron arrow pointing right
          const stemH = innerH * 0.4;
          const headW = Math.min(innerW * 0.4, innerH * 0.8);
          const stemW = innerW - headW;
          const topStemY = pad + (innerH - stemH) / 2;
          const bottomStemY = topStemY + stemH;

          return `M ${pad.toFixed(2)} ${topStemY.toFixed(2)} ` +
                 `H ${(pad + stemW).toFixed(2)} ` +
                 `V ${pad.toFixed(2)} ` +
                 `L ${(pad + innerW).toFixed(2)} ${(pad + innerH / 2).toFixed(2)} ` +
                 `L ${(pad + stemW).toFixed(2)} ${(pad + innerH).toFixed(2)} ` +
                 `V ${bottomStemY.toFixed(2)} ` +
                 `H ${pad.toFixed(2)} Z`;
        }

        case 'line': {
          const yMid = pad + innerH / 2;
          return `M ${pad.toFixed(2)} ${yMid.toFixed(2)} L ${(pad + innerW).toFixed(2)} ${yMid.toFixed(2)}`;
        }

        case 'callout': {
          // Rounded chat bubble with speech tail
          const r = Math.min(options.cornerRadius || 12, innerW / 4, innerH / 4);
          const tailW = Math.min(18, innerW * 0.2);
          const tailH = Math.min(14, innerH * 0.25);
          const bubbleH = innerH - tailH;

          return `M ${(pad + r).toFixed(2)} ${pad.toFixed(2)} ` +
                 `H ${(pad + innerW - r).toFixed(2)} ` +
                 `A ${r} ${r} 0 0 1 ${(pad + innerW).toFixed(2)} ${(pad + r).toFixed(2)} ` +
                 `V ${(pad + bubbleH - r).toFixed(2)} ` +
                 `A ${r} ${r} 0 0 1 ${(pad + innerW - r).toFixed(2)} ${(pad + bubbleH).toFixed(2)} ` +
                 `H ${(pad + 36 + tailW).toFixed(2)} ` +
                 `L ${(pad + 24).toFixed(2)} ${(pad + innerH).toFixed(2)} ` +
                 `L ${(pad + 36).toFixed(2)} ${(pad + bubbleH).toFixed(2)} ` +
                 `H ${(pad + r).toFixed(2)} ` +
                 `A ${r} ${r} 0 0 1 ${pad.toFixed(2)} ${(pad + bubbleH - r).toFixed(2)} ` +
                 `V ${(pad + r).toFixed(2)} ` +
                 `A ${r} ${r} 0 0 1 ${(pad + r).toFixed(2)} ${pad.toFixed(2)} Z`;
        }

        case 'heart': {
          const cx = pad + innerW / 2;
          const topY = pad + innerH * 0.25;
          const botY = pad + innerH;
          const leftX = pad;
          const rightX = pad + innerW;
          return `M ${cx.toFixed(2)} ${(pad + innerH * 0.35).toFixed(2)} ` +
                 `C ${(cx - innerW * 0.15).toFixed(2)} ${topY.toFixed(2)}, ${leftX.toFixed(2)} ${topY.toFixed(2)}, ${leftX.toFixed(2)} ${(pad + innerH * 0.45).toFixed(2)} ` +
                 `C ${leftX.toFixed(2)} ${(pad + innerH * 0.7).toFixed(2)}, ${(cx - innerW * 0.2).toFixed(2)} ${(pad + innerH * 0.85).toFixed(2)}, ${cx.toFixed(2)} ${botY.toFixed(2)} ` +
                 `C ${(cx + innerW * 0.2).toFixed(2)} ${(pad + innerH * 0.85).toFixed(2)}, ${rightX.toFixed(2)} ${(pad + innerH * 0.7).toFixed(2)}, ${rightX.toFixed(2)} ${(pad + innerH * 0.45).toFixed(2)} ` +
                 `C ${rightX.toFixed(2)} ${topY.toFixed(2)}, ${(cx + innerW * 0.15).toFixed(2)} ${topY.toFixed(2)}, ${cx.toFixed(2)} ${(pad + innerH * 0.35).toFixed(2)} Z`;
        }

        default:
          return '';
      }
    },

    /**
     * Generates a complete standalone SVG markup string for a shape
     */
    generateSvgMarkup: function (shape) {
      if (!shape) return '';
      const w = Math.max(1, shape.width || 160);
      const h = Math.max(1, shape.height || 120);
      const style = shape.style || {};
      const strokeWidth = style.strokeWidth !== undefined ? style.strokeWidth : 2;
      const stroke = style.stroke || 'none';
      const strokeDash = style.strokeDash === 'dashed' ? 'stroke-dasharray="6 4"' : (style.strokeDash === 'dotted' ? 'stroke-dasharray="2 3"' : '');
      const opacity = style.opacity !== undefined ? style.opacity : 1.0;
      const fillOpacity = style.fillOpacity !== undefined ? style.fillOpacity : (style.fill_opacity !== undefined ? style.fill_opacity : 1.0);
      const strokeOpacity = style.strokeOpacity !== undefined ? style.strokeOpacity : (style.stroke_opacity !== undefined ? style.stroke_opacity : 1.0);
      const cornerRadius = style.cornerRadius || 0;
      let rawType = (shape.shape_type || shape.shape || 'rectangle').toLowerCase();
      if (rawType === 'rect') rawType = 'rectangle';
      if (rawType === 'rounded_rect') rawType = 'rounded_rectangle';
      if (rawType === 'polygon_hexagon' || rawType === 'hexagon') rawType = 'polygon';
      if (rawType === 'callout_speech' || rawType === 'callout_thought') rawType = 'callout';
      if (rawType === 'arrow_right' || rawType === 'arrow_double') rawType = 'arrow';
      const shapeType = rawType;

      // Defs for gradients & filters
      let defs = '';
      let fillAttr = style.fill || '#6366f1';

      if (style.gradient && style.gradient.stops && style.gradient.stops.length > 0) {
        const gradId = 'grad_' + shape.id;
        if (style.gradient.type === 'radial') {
          const cx = style.gradient.cx || '50%';
          const cy = style.gradient.cy || '50%';
          defs += `<radialGradient id="${gradId}" cx="${cx}" cy="${cy}" r="50%">`;
          style.gradient.stops.forEach(s => {
            defs += `<stop offset="${(s.offset * 100).toFixed(0)}%" stop-color="${escapeXml(s.color)}" stop-opacity="${s.opacity !== undefined ? s.opacity : 1}"/>`;
          });
          defs += `</radialGradient>`;
        } else {
          // Linear gradient
          const angle = style.gradient.angle || 90;
          const rad = (angle * Math.PI) / 180;
          const x1 = Math.round(50 - Math.cos(rad) * 50);
          const y1 = Math.round(50 - Math.sin(rad) * 50);
          const x2 = Math.round(50 + Math.cos(rad) * 50);
          const y2 = Math.round(50 + Math.sin(rad) * 50);
          defs += `<linearGradient id="${gradId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">`;
          style.gradient.stops.forEach(s => {
            defs += `<stop offset="${(s.offset * 100).toFixed(0)}%" stop-color="${escapeXml(s.color)}" stop-opacity="${s.opacity !== undefined ? s.opacity : 1}"/>`;
          });
          defs += `</linearGradient>`;
        }
        fillAttr = `url(#${gradId})`;
      }

      // Drop shadow filter
      let filterAttr = '';
      if (style.shadow) {
        const filtId = 'shadow_' + shape.id;
        const sh = style.shadow;
        defs += `<filter id="${filtId}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="${sh.x || 0}" dy="${sh.y || 4}" stdDeviation="${(sh.blur || 8) / 2}" flood-color="${escapeXml(sh.color || 'rgba(0,0,0,0.5)')}" />
        </filter>`;
        filterAttr = `filter="url(#${filtId})"`;
      }

      // Render shape element inside SVG
      let shapeElementHtml = '';
      const halfStroke = strokeWidth / 2;

      if (shapeType === 'rectangle') {
        shapeElementHtml = `<rect x="${halfStroke}" y="${halfStroke}" width="${w - strokeWidth}" height="${h - strokeWidth}" rx="${cornerRadius}" ry="${cornerRadius}" fill="${fillAttr}" fill-opacity="${fillOpacity}" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}" ${strokeDash} />`;
      } else if (shapeType === 'rounded_rectangle') {
        const r = cornerRadius || 12;
        shapeElementHtml = `<rect x="${halfStroke}" y="${halfStroke}" width="${w - strokeWidth}" height="${h - strokeWidth}" rx="${r}" ry="${r}" fill="${fillAttr}" fill-opacity="${fillOpacity}" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}" ${strokeDash} />`;
      } else if (shapeType === 'circle' || shapeType === 'ellipse') {
        const cx = w / 2;
        const cy = h / 2;
        const rx = Math.max(1, (w - strokeWidth) / 2);
        const ry = Math.max(1, (h - strokeWidth) / 2);
        shapeElementHtml = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fillAttr}" fill-opacity="${fillOpacity}" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}" ${strokeDash} />`;
      } else {
        const pathD = this.computePathD(shapeType, w, h, {
          strokeWidth: strokeWidth,
          cornerRadius: cornerRadius,
          points: (shape.props && shape.props.points),
          innerRadius: (shape.props && shape.props.innerRadius)
        });
        const fillRule = shapeType === 'line' ? 'fill="none"' : `fill="${fillAttr}" fill-opacity="${fillOpacity}"`;
        shapeElementHtml = `<path d="${pathD}" ${fillRule} stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}" ${strokeDash} stroke-linejoin="round" stroke-linecap="round" />`;
      }

      // Render text label if present
      let labelHtml = '';
      if (shape.label && shape.label.text) {
        const lbl = shape.label;
        const fontSize = lbl.fontSize || 14;
        const fontFamily = escapeXml(lbl.fontFamily || 'Plus Jakarta Sans, sans-serif');
        const color = escapeXml(lbl.color || '#ffffff');
        const fontWeight = lbl.fontWeight || '600';
        const align = lbl.align || 'center';

        let textX = w / 2;
        let anchor = 'middle';
        if (align === 'left') { textX = strokeWidth + 12; anchor = 'start'; }
        else if (align === 'right') { textX = w - strokeWidth - 12; anchor = 'end'; }
        const textY = (h / 2) + (fontSize * 0.35); // baseline centering

        labelHtml = `<text x="${textX.toFixed(1)}" y="${textY.toFixed(1)}" text-anchor="${anchor}" font-family="${fontFamily}" font-size="${fontSize}px" font-weight="${fontWeight}" fill="${color}" style="pointer-events:none; user-select:none;">${escapeXml(lbl.text)}</text>`;
      }

      const defsBlock = defs ? `<defs>${defs}</defs>` : '';
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="opacity:${opacity}; display:block; overflow:visible;" ${filterAttr}>${defsBlock}${shapeElementHtml}${labelHtml}</svg>`;
    },

    /**
     * Renders a shape into a parent container as an interactive canvas element
     */
    renderShapeElement: function (shape, parent, onSelect) {
      if (!parent || !shape) return null;
      const el = document.createElement('div');
      el.id = shape.id;
      el.className = 'ldoc-canvas-shape ldoc-selectable-item';
      el.dataset.objectId = shape.id;
      el.dataset.objectType = 'shape';

      const x = shape.x || 0;
      const y = shape.y || 0;
      const w = shape.width || 160;
      const h = shape.height || 120;
      const rot = shape.rotation || 0;

      el.style.cssText = `position:absolute; left:${x}px; top:${y}px; width:${w}px; height:${h}px; transform:rotate(${rot}deg); transform-origin:center center; cursor:move; user-select:none; z-index:${shape.zIndex || 10};`;
      el.innerHTML = this.generateSvgMarkup(shape);

      if (typeof onSelect === 'function') {
        el.addEventListener('mousedown', function (e) {
          e.stopPropagation();
          onSelect(shape.id, e.shiftKey || e.ctrlKey || e.metaKey);
        });
      }

      parent.appendChild(el);
      return el;
    }
  };

  // Attach globally and export for CommonJS/Node
  global.LDocShapeEngine = LDocShapeEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LDocShapeEngine;
    module.exports.LDocShapeEngine = LDocShapeEngine;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
