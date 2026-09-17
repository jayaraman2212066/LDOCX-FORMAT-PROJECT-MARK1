/**
 * LDOCX Living Document Platform — Production Safety & Reliability QA Suite
 * Section 14: Subsystem Error Boundaries, Schema Validation, Crash Recovery, and Corpus Audit
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const LDocValidator = require('../src/ldoc-validator');
const LDocEditorCore = require('../src/ldoc-editor-core');
const LDocParser = require('../src/ldoc-parser');

console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║   LDOCX SECTION 14: PRODUCTION SAFETY, QA & ERROR ISOLATION      ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

async function main() {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. STANDALONE SCHEMA & AST VALIDATOR TESTS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('▶ [1/5] Testing LDocValidator Schema Conformance & Security Sanitization...');

  runTest('Validator accepts compliant document AST', () => {
    const validDoc = {
      pages: [
        {
          id: 'p1',
          blocks: [
            { id: 'b1', type: 'heading', level: 1, text: 'Test Title' },
            { id: 'b2', type: 'paragraph', text: 'Valid body paragraph.' },
            { id: 'b3', type: 'shape', shape_type: 'rounded_rectangle', width: 200, height: 100 },
            { id: 'b4', type: 'simulation', preset: 'projectile_motion' }
          ]
        }
      ]
    };

    const res = LDocValidator.validateDocument(validDoc);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.errors.length, 0);
    assert.strictEqual(res.stats.pageCount, 1);
    assert.strictEqual(res.stats.blockCount, 4);
  });

  runTest('Validator detects unknown blocks, duplicate IDs, and invalid heading levels', () => {
    const invalidDoc = {
      pages: [
        {
          id: 'p1',
          blocks: [
            { id: 'dup_id', type: 'heading', level: 10, text: 'Invalid Level' },
            { id: 'dup_id', type: 'alien_unknown_block' },
            { id: 'b_quiz', type: 'quiz', questions: [{ type: 'unknown_q_type' }] }
          ]
        }
      ]
    };

    const res = LDocValidator.validateDocument(invalidDoc);
    const codes = res.warnings.concat(res.errors).map(w => w.code);
    assert.ok(codes.includes('INVALID_HEADING_LEVEL'));
    assert.ok(codes.includes('UNKNOWN_BLOCK_TYPE'));
    assert.ok(codes.includes('DUPLICATE_BLOCK_ID'));
  });

  runTest('Security Sanitizer neutralizes script tags, javascript: URLs, and event handlers', () => {
    const unsafeBlock = {
      id: 'bad_blk',
      type: 'paragraph',
      text: '<script>alert("pwned")</script>Hello safe text <img src="x" onerror="stealCookies()">',
      url: 'javascript:alert(1)'
    };

    const clean = LDocValidator.sanitizeBlock(unsafeBlock);
    assert.ok(!clean.text.includes('<script>'));
    assert.ok(!clean.text.includes('onerror='));
    assert.ok(!clean.url.includes('javascript:'));
    assert.ok(clean.url.includes('blocked-scheme:'));
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. SUBSYSTEM ERROR BOUNDARY & "NO WHITE SCREEN RULE"
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [2/5] Testing Subsystem Error Boundaries (No White Screen Rule)...');

  runTest('Error boundary executes healthy renderers cleanly', () => {
    const container = { appendChild: function () {} };
    const block = { id: 'b1', type: 'paragraph', text: 'Hello' };
    let rendered = false;

    LDocEditorCore.safeRenderBlock(block, container, (b, c) => {
      rendered = true;
      return true;
    });
    assert.strictEqual(rendered, true);
  });

  runTest('Error boundary isolates catastrophic block faults without crashing caller', () => {
    const container = {
      appended: [],
      appendChild: function (el) { this.appended.push(el); }
    };
    const faultyBlock = { id: 'b_faulty', type: '3d_model' };

    // Simulate fatal WebGL / 3D exception inside renderer
    const res = LDocEditorCore.safeRenderBlock(faultyBlock, container, () => {
      throw new Error('Fatal WebGL Context Creation Error: Shader compilation failed');
    });

    // Error must be caught; caller does not crash; error boundary card returned
    assert.ok(res !== null, 'Error boundary must return a fallback card rather than throwing');
    assert.ok(container.appended.length > 0, 'Container must receive fallback card');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. AUTOSAVE & CRASH RECOVERY
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [3/5] Testing Autosave, Dirty Tracking & Crash Recovery...');

  runTest('Dirty state tracking on mutation and clean on save', () => {
    LDocEditorCore.init();
    LDocEditorCore.markClean();
    assert.strictEqual(LDocEditorCore.hasUnsavedChanges(), false);

    LDocEditorCore.addShape('star');
    assert.strictEqual(LDocEditorCore.hasUnsavedChanges(), true, 'Mutation must set isDirty = true');

    LDocEditorCore.markClean();
    assert.strictEqual(LDocEditorCore.hasUnsavedChanges(), false);
  });

  await runAsyncTest('Durable Crash Recovery Snapshot & Restoration', async () => {
    LDocEditorCore.init();
    LDocEditorCore.state.title = 'Crucial Pitch Deck';
    LDocEditorCore.addShape('callout', { label: { text: 'Unsaved Mission Critical Data' } });

    // Save recovery snapshot
    LDocEditorCore.saveCrashRecoverySnapshot('ldoc_test_crash_recovery');

    // Retrieve and verify
    let recoveredData = null;
    await new Promise(resolve => {
      LDocEditorCore.loadSnapshotDurable('ldoc_test_crash_recovery', data => {
        recoveredData = typeof data === 'string' ? JSON.parse(data) : data;
        resolve();
      });
    });

    assert.ok(recoveredData !== null);
    assert.strictEqual(recoveredData.title, 'Crucial Pitch Deck');
    assert.ok(recoveredData.pages[0].blocks.some(b => b.type === 'shape'));

    LDocEditorCore.clearCrashRecoverySnapshot('ldoc_test_crash_recovery');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. PERMANENT TEST DOCUMENT CORPUS AUDIT (ALL 14 FIXTURES)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [4/5] Testing Permanent Test Document Corpus (14 Fixtures)...');

  const corpusDir = path.resolve(__dirname, 'fixtures', 'ldocx');
  const expectedFixtures = [
    'minimal.ldocx', 'text.ldocx', 'image.ldocx', 'table.ldocx',
    'chart.ldocx', 'animation.ldocx', 'video.ldocx', '3d.ldocx',
    'simulation.ldocx', 'reactive.ldocx', 'presentation.ldocx',
    'large.ldocx', 'malformed.ldocx', 'legacy.ldocx'
  ];

  for (const filename of expectedFixtures) {
    await runAsyncTest(`Corpus fixture: ${filename}`, async () => {
      const filePath = path.join(corpusDir, filename);
      assert.ok(fs.existsSync(filePath), `Fixture ${filename} must exist`);
      const fileBytes = fs.readFileSync(filePath);

      const parsed = await LDocParser.parseLdocxLenient(fileBytes);
      assert.ok(parsed.pages.length >= 1, `Parsed fixture ${filename} must contain at least 1 page`);

      if (filename === 'malformed.ldocx') {
        assert.ok(parsed.isRecovered, 'Malformed document must trigger recovery mode');
        assert.ok(parsed.quarantinedCount >= 1, 'Corrupted blocks must be safely quarantined');
        assert.strictEqual(parsed.pages[0].blocks.length, 4, 'All 4 block slots must be accounted for');
      }

      if (filename === 'legacy.ldocx') {
        assert.strictEqual(parsed.manifest.title, 'Legacy v1 Document Spec Test');
        assert.ok(parsed.pages[0].blocks.some(b => b.text === 'Legacy v1 Heading'));
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. FLAGSHIP 18-PAGE SHOWCASE END-TO-END VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [5/5] Testing 18-Page Flagship Showcase Package Integrity...');

  await runAsyncTest('Flagship all-features-showcase.ldocx Merkle verification', async () => {
    const showcasePath = path.resolve(__dirname, '..', 'all-features-showcase.ldocx');
    assert.ok(fs.existsSync(showcasePath), 'all-features-showcase.ldocx must exist in root');
    const bytes = fs.readFileSync(showcasePath);

    const parsed = await LDocParser.parseLdocxLenient(bytes);
    assert.strictEqual(parsed.pages.length, 18, 'Showcase must have exactly 18 pages');
    assert.strictEqual(parsed.integrityStatus.valid, true, 'Cryptographic Merkle tree must be valid');
    assert.strictEqual(parsed.integrityStatus.tamper_count, 0, 'Tampered block count must be zero');
    assert.strictEqual(parsed.integrityStatus.verified_count, 57, 'All 57 block leaves must be verified');
  });

  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`✓ ALL ${passedTests}/${totalTests} PRODUCTION SAFETY & RELIABILITY TESTS PASSED 100%!`);
  console.log('════════════════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ PRODUCTION SAFETY QA TEST FAILED:', err);
  process.exit(1);
});
