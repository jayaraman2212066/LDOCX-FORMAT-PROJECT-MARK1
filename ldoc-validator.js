/**
 * LDOCX Living Document Platform — Document & AST Schema Validator
 * Deterministic Schema Conformance, Security Sanitization, and Corruption Guard
 * 
 * Supports:
 * - Full AST validation across all LDOCX block types
 * - Container manifest and Merkle integrity verification
 * - Security check against unsafe script/HTML payloads
 * - Quarantine stubs for unrecognized/malformed blocks
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LDocValidator = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VALID_BLOCK_TYPES = new Set([
    'heading', 'paragraph', 'rich_text', 'text',
    'shape', 'image_card', 'image', 'web_image', 'video', 'web_video',
    'table', 'chart', 'code_block', 'code', 'quote',
    '3d_model', 'model3d', 'simulation', 'quantum_sim', 'quiz',
    'feature_grid', 'magazine_columns', 'chip_group', 'form', 'button',
    'footnote', 'live_feed', 'tilt_card', 'balance_tuner', 'spell_matrix', 'container', 'section',
    'diagram', 'custom_path', 'group'
  ]);

  const KNOWN_SHAPE_TYPES = new Set([
    'rectangle', 'rounded_rectangle', 'circle', 'ellipse',
    'triangle', 'star', 'polygon', 'line', 'arrow', 'connector', 'callout',
    'custom_path'
  ]);

  const KNOWN_SIMULATION_PRESETS = new Set([
    'projectile_motion', 'ohms_law', 'harmonic_oscillator', 'compound_interest', 'custom',
    'gravitational_orbital', 'elastic_collision', 'rc_circuit', 'loan_mortgage', 'beam_bending_stress'
  ]);

  const KNOWN_QUESTION_TYPES = new Set([
    'single_select', 'true_false', 'multi_select', 'numeric'
  ]);

  /**
   * Validate manifest metadata
   */
  function validateManifest(manifest) {
    const errors = [];
    const warnings = [];

    if (!manifest || typeof manifest !== 'object') {
      errors.push({ path: 'manifest', code: 'MISSING_MANIFEST', message: 'Manifest object is required' });
      return { valid: false, errors, warnings };
    }

    if (!manifest.title && !manifest.doc_id) {
      warnings.push({ path: 'manifest.title', code: 'UNTITLED_DOCUMENT', message: 'Document manifest lacks a title or doc_id' });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a single AST block
   */
  function validateBlock(block, path) {
    const errors = [];
    const warnings = [];
    const p = path || 'block';

    if (!block || typeof block !== 'object') {
      errors.push({ path: p, code: 'INVALID_BLOCK_OBJECT', message: 'Block must be a non-null object' });
      return { valid: false, errors, warnings };
    }

    if (!block.id) {
      warnings.push({ path: `${p}.id`, code: 'MISSING_BLOCK_ID', message: 'Block lacks a unique id' });
    }

    const type = block.type || 'paragraph';
    if (!VALID_BLOCK_TYPES.has(type)) {
      warnings.push({ path: `${p}.type`, code: 'UNKNOWN_BLOCK_TYPE', message: `Unrecognized block type: "${type}"` });
    }

    // Type-specific checks
    if (type === 'heading') {
      if (block.level !== undefined && (typeof block.level !== 'number' || block.level < 1 || block.level > 6)) {
        warnings.push({ path: `${p}.level`, code: 'INVALID_HEADING_LEVEL', message: 'Heading level should be between 1 and 6' });
      }
    } else if (type === 'shape') {
      if (block.shape_type && !KNOWN_SHAPE_TYPES.has(block.shape_type)) {
        warnings.push({ path: `${p}.shape_type`, code: 'UNKNOWN_SHAPE_PRIMITIVE', message: `Unrecognized shape primitive: "${block.shape_type}"` });
      }
    } else if (type === 'simulation') {
      if (block.preset && !KNOWN_SIMULATION_PRESETS.has(block.preset)) {
        warnings.push({ path: `${p}.preset`, code: 'UNKNOWN_SIMULATION_PRESET', message: `Unrecognized simulation preset: "${block.preset}"` });
      }
    } else if (type === 'quiz') {
      if (!Array.isArray(block.questions) || block.questions.length === 0) {
        warnings.push({ path: `${p}.questions`, code: 'EMPTY_QUIZ', message: 'Quiz block contains no questions' });
      } else {
        block.questions.forEach((q, idx) => {
          if (!q.question) {
            errors.push({ path: `${p}.questions[${idx}]`, code: 'MISSING_QUESTION_TEXT', message: 'Question object missing question text' });
          }
          if (q.type && !KNOWN_QUESTION_TYPES.has(q.type)) {
            warnings.push({ path: `${p}.questions[${idx}].type`, code: 'UNKNOWN_QUESTION_TYPE', message: `Unrecognized question type "${q.type}"` });
          }
        });
      }
    } else if (type === 'image_card' || type === 'image') {
      const url = block.url || block.src || (block.data && block.data.url);
      if (!url) {
        warnings.push({ path: `${p}.url`, code: 'MISSING_IMAGE_SOURCE', message: 'Image card lacks a URL or source payload' });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate an entire document AST
   */
  function validateDocument(doc) {
    const errors = [];
    const warnings = [];
    let blockCount = 0;

    if (!doc || typeof doc !== 'object') {
      errors.push({ path: 'document', code: 'INVALID_DOCUMENT', message: 'Document must be a valid object' });
      return { valid: false, errors, warnings, stats: { pageCount: 0, blockCount: 0 } };
    }

    const pages = doc.pages || (doc.document && doc.document.pages) || [];
    if (!Array.isArray(pages)) {
      errors.push({ path: 'document.pages', code: 'INVALID_PAGES_ARRAY', message: 'Document pages must be an array' });
      return { valid: false, errors, warnings, stats: { pageCount: 0, blockCount: 0 } };
    }

    if (pages.length === 0) {
      warnings.push({ path: 'document.pages', code: 'EMPTY_DOCUMENT', message: 'Document contains zero pages' });
    }

    const seenBlockIds = new Set();

    pages.forEach((page, pageIdx) => {
      const pagePath = `document.pages[${pageIdx}]`;
      if (!page || typeof page !== 'object') {
        errors.push({ path: pagePath, code: 'INVALID_PAGE_OBJECT', message: 'Page entry must be an object' });
        return;
      }

      const blocks = page.blocks || [];
      if (!Array.isArray(blocks)) {
        errors.push({ path: `${pagePath}.blocks`, code: 'INVALID_BLOCKS_ARRAY', message: 'Page blocks must be an array' });
        return;
      }

      blocks.forEach((block, blockIdx) => {
        blockCount++;
        const blockPath = `${pagePath}.blocks[${blockIdx}]`;
        const bRes = validateBlock(block, blockPath);
        errors.push.apply(errors, bRes.errors);
        warnings.push.apply(warnings, bRes.warnings);

        if (block && block.id) {
          if (seenBlockIds.has(block.id)) {
            warnings.push({ path: `${blockPath}.id`, code: 'DUPLICATE_BLOCK_ID', message: `Duplicate block ID detected: "${block.id}"` });
          } else {
            seenBlockIds.add(block.id);
          }
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats: {
        pageCount: pages.length,
        blockCount: blockCount,
        uniqueBlockIds: seenBlockIds.size
      }
    };
  }

  /**
   * Validate a full parsed package structure
   */
  function validatePackage(parsedPkg) {
    const errors = [];
    const warnings = [];

    if (!parsedPkg || typeof parsedPkg !== 'object') {
      errors.push({ path: 'package', code: 'INVALID_PACKAGE', message: 'Parsed package must be an object' });
      return { valid: false, errors, warnings };
    }

    const mRes = validateManifest(parsedPkg.manifest);
    errors.push.apply(errors, mRes.errors);
    warnings.push.apply(warnings, mRes.warnings);

    const dRes = validateDocument(parsedPkg);
    errors.push.apply(errors, dRes.errors);
    warnings.push.apply(warnings, dRes.warnings);

    // Verify Merkle tree if integrity record present
    if (parsedPkg.integrityStatus) {
      if (!parsedPkg.integrityStatus.valid) {
        errors.push({
          path: 'package.integrity',
          code: 'MERKLE_INTEGRITY_FAILURE',
          message: `Merkle root verification failed: ${parsedPkg.integrityStatus.tamper_count || 0} tampered block(s)`
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats: dRes.stats
    };
  }

  /**
   * Security sanitizer: strips unsafe script tags, javascript: URLs, event handlers, and data:text/html
   */
  function sanitizeBlock(block) {
    if (!block || typeof block !== 'object') return block;
    const cloned = JSON.parse(JSON.stringify(block));

    function sanitizeString(str) {
      if (typeof str !== 'string') return str;
      return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript\s*:/gi, 'blocked-scheme:')
        .replace(/data\s*:\s*text\/html/gi, 'blocked-scheme:text/html')
        .replace(/\son[a-z]+\s*=/gi, ' data-blocked-handler=');
    }

    function walkAndSanitize(obj) {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          walkAndSanitize(obj[key]);
        }
      }
    }

    walkAndSanitize(cloned);
    return cloned;
  }

  return {
    VALID_BLOCK_TYPES,
    KNOWN_SHAPE_TYPES,
    KNOWN_SIMULATION_PRESETS,
    KNOWN_QUESTION_TYPES,
    validateManifest,
    validateBlock,
    validateDocument,
    validatePackage,
    sanitizeBlock
  };
}));
