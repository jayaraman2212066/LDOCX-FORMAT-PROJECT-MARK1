/**
 * @ldoc/sdk — Decoupled Living Document (.ldocx) Parser & Serializer
 * Copyright (c) 2026 Jayaraman K. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at: http://www.apache.org/licenses/LICENSE-2.0
 * Trademarks "LDOC", "LDOCX", and "Living Document Format" are proprietary to Jayaraman K.
 */
const crypto = require('crypto');

let JSZip = null;
try {
  JSZip = require('jszip');
} catch (e) {
  try {
    JSZip = require('../../jszip.min.js');
  } catch (e2) {
    if (typeof window !== 'undefined' && window.JSZip) {
      JSZip = window.JSZip;
    }
  }
}

const SCHEMA_VERSION = '2.5.0';

function validate(ast) {
  const errors = [];
  if (!ast || typeof ast !== 'object') return { valid: false, errors: ['AST must be an object'] };
  if (!ast.title) errors.push('Document title is required');
  if (!Array.isArray(ast.pages) || ast.pages.length === 0) errors.push('Document must contain pages array');
  return { valid: errors.length === 0, schema_version: SCHEMA_VERSION, errors };
}

function calculateChecksum(data) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function parse(fileInput) {
  if (typeof fileInput === 'string' && fileInput.trim().startsWith('{')) {
    return JSON.parse(fileInput);
  }
  if (!JSZip) throw new Error('JSZip dependency required to parse .ldocx');
  const zip = await JSZip.loadAsync(fileInput);
  const docFile = zip.file('document.json') || zip.file('document.jsonld');
  if (!docFile) throw new Error('Missing document.json in .ldocx container');
  const text = await docFile.async('text');
  return JSON.parse(text);
}

async function serialize(ast, assetsMap = {}) {
  const val = validate(ast);
  if (!val.valid) throw new Error('Invalid AST: ' + val.errors.join(', '));
  if (!JSZip) throw new Error('JSZip required to serialize .ldocx');

  const zip = new JSZip();
  const manifest = { format: 'ldocx', schema_version: SCHEMA_VERSION, title: ast.title, created_at: new Date().toISOString() };
  const docJsonStr = JSON.stringify(ast, null, 2);
  const manifestStr = JSON.stringify(manifest, null, 2);

  zip.file('manifest.json', manifestStr);
  zip.file('document.json', docJsonStr);

  for (const [k, v] of Object.entries(assetsMap)) {
    zip.file(k, v);
  }

  const checksum = `manifest.json: ${calculateChecksum(manifestStr)}\ndocument.json: ${calculateChecksum(docJsonStr)}\n`;
  zip.file('checksum.sha256', checksum);

  if (typeof window === 'undefined') {
    return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  } else {
    return await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  }
}

module.exports = { parse, serialize, validate, calculateChecksum, SCHEMA_VERSION };
