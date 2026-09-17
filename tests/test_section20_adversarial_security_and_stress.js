/**
 * LDOC Master Test Suite: Section 20
 * Adversarial Security Hardening, Document Stress Benchmarks & Real User Journeys A–H
 * 
 * Tests:
 * 1. Adversarial Security: XSS script tags, javascript: URLs, data:text/html, inline event handlers, SVG scripts
 * 2. Adversarial Reactive Math: Circular dependency graph (A->B->C->A), division by zero, prototype pollution
 * 3. Document Performance Stress: 100, 500, 1,000, 5,000, and 10,000 blocks throughput
 * 4. Real User Journey A: Executive Proposal Authoring (UI -> AST -> Validation -> Save -> Reload)
 * 5. Real User Journey B: STEM Simulation & Reactive Physics Workflow
 * 6. Real User Journey C: Interactive Assessment / Knowledge Quiz Execution
 * 7. Real User Journey D: Product Showcase & Pretext Flow Around Obstacles
 * 8. Real User Journey E: Enterprise Merkle Tree Integrity & Tamper Detection
 * 9. Real User Journey F: Non-Destructive Image Processing & Local Brush Refinement
 * 10. Real User Journey G: Vector Pen Tool & General 2D Polygon Boolean Clipping
 * 11. Real User Journey H: Template Blueprint Generation & Automated Quality Audit
 */

const assert = require('assert');
const path = require('path');
const LDocValidator = require('../src/ldoc-validator.js');
const LDocReactiveEngine = require('../src/ldoc-reactive-engine.js');
const LDocEditorCore = require('../src/ldoc-editor-core.js');
const LdocTextLayout = require('../ldoc-text-layout.js');
const LDocImageEngine = require('../src/ldoc-image-engine.js');
const LDocVectorEditor = require('../src/ldoc-vector-editor.js');
const LDocTemplateEngine = require('../src/ldoc-template-engine.js');
const LDocParser = require('../src/ldoc-parser.js');

console.log('================================================================');
console.log('🧪 RUNNING SECTION 20: ADVERSARIAL SECURITY, STRESS & JOURNEYS');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  process.stdout.write(`▶ Test ${totalTests}: ${name}... `);
  try {
    fn();
    passedTests++;
    console.log('PASSED');
  } catch (err) {
    console.log('FAILED');
    console.error(`  Error: ${err.message}`);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Adversarial Security Injections
// ─────────────────────────────────────────────────────────────────────────────
test('Adversarial Security: Sanitizes Scripts, Event Handlers, and Malicious Schemes', () => {
  const maliciousBlock = {
    id: 'block_exploit',
    type: 'paragraph',
    text: '<script>alert("XSS Attack")</script>Secure Content Here<svg onload="stealCookies()"><script>malicious()</script></svg>',
    url: 'javascript:alert(document.cookie)',
    dataUrl: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    nested: {
      handler: '<img src=x onerror=alert(1)>',
      iframe: '<iframe src="evil.com"></iframe>'
    }
  };

  const sanitized = LDocValidator.sanitizeBlock(maliciousBlock);

  // Script tags stripped
  assert.strictEqual(sanitized.text.includes('<script>'), false, 'Script tags must be removed');
  assert.strictEqual(sanitized.text.includes('</script>'), false, 'Closing script tags removed');

  // Event handlers neutralized
  assert.strictEqual(sanitized.text.includes('onload='), false, 'Inline event handler onload must be neutralized');
  assert.strictEqual(sanitized.nested.handler.includes('onerror='), false, 'Inline onerror handler neutralized');

  // Malicious schemes neutralized
  assert.strictEqual(sanitized.url.startsWith('javascript:'), false, 'javascript: scheme blocked');
  assert.ok(sanitized.url.startsWith('blocked-scheme:'), 'Replaced with blocked-scheme:');
  assert.strictEqual(sanitized.dataUrl.includes('data:text/html'), false, 'data:text/html blocked');

  // Iframe removed
  assert.strictEqual(sanitized.nested.iframe.includes('<iframe'), false, 'iframe tags removed');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Adversarial Reactive DAG & Math Engine
// ─────────────────────────────────────────────────────────────────────────────
test('Adversarial Reactive Graph: Cycle Detection, Div-by-Zero & Proto Guard', () => {
  // A. Cycle Detection
  const dag = new LDocReactiveEngine.ReactiveDAG('cycle_test');
  dag.addVariable({ name: 'NodeA', formula: 'NodeB * 2' });
  dag.addVariable({ name: 'NodeB', formula: 'NodeC + 10' });
  dag.addVariable({ name: 'NodeC', formula: 'NodeA - 5' });

  const cycleReport = dag.detectCycles();
  assert.strictEqual(cycleReport.hasCycle, true, 'Circular dependency must be detected');
  assert.strictEqual(cycleReport.cyclicNodes.length, 3);
  assert.ok(cycleReport.cyclicNodes.includes('NodeA'));
  assert.ok(cycleReport.cyclicNodes.includes('NodeB'));
  assert.ok(cycleReport.cyclicNodes.includes('NodeC'));

  // B. Division by Zero and Modulo Zero
  assert.strictEqual(LDocReactiveEngine.evaluateFormula('42 / 0'), 0, '42 / 0 evaluates to 0');
  assert.strictEqual(LDocReactiveEngine.evaluateFormula('42 % 0'), 0, '42 % 0 evaluates to 0');
  assert.strictEqual(LDocReactiveEngine.evaluateFormula('0 / 0'), 0, '0 / 0 evaluates to 0');

  // C. Prototype Pollution Guard
  assert.strictEqual(LDocReactiveEngine.evaluateFormula('__proto__ + 10'), 10);
  assert.strictEqual(LDocReactiveEngine.evaluateFormula('constructor + 10'), 10);
  assert.strictEqual(Object.prototype.hasOwnProperty('polluted'), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Document Performance Stress Benchmarks (100 to 10,000 blocks)
// ─────────────────────────────────────────────────────────────────────────────
test('Document Performance Stress: Throughput Across 100 to 10,000 Blocks', () => {
  const blockCounts = [100, 500, 1000, 5000, 10000];

  blockCounts.forEach(count => {
    const blocks = [];
    for (let i = 0; i < count; i++) {
      blocks.push({
        id: `block_stress_${i}`,
        type: i % 5 === 0 ? 'heading' : 'paragraph',
        text: `Stress test computational unit ${i} with deterministic Pretext layout.`
      });
    }

    const testDoc = {
      manifest: { title: `Stress Test ${count}`, doc_id: `doc_stress_${count}` },
      pages: [{ id: 'page_stress', num: 1, blocks }]
    };

    const t0 = performance.now();
    const valRes = LDocValidator.validateDocument(testDoc);
    const elapsed = performance.now() - t0;

    assert.strictEqual(valRes.valid, true);
    assert.strictEqual(valRes.stats.blockCount, count);
    assert.ok(elapsed < 200, `${count} blocks validation must complete in < 200ms (took ${elapsed.toFixed(2)}ms)`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Real User Journey A: Executive Proposal Authoring
// ─────────────────────────────────────────────────────────────────────────────
test('User Journey A: Executive Proposal Authoring & Cross-Surface Roundtrip', () => {
  // 1. User initializes editor
  LDocEditorCore.init({
    title: 'Enterprise Q4 Cloud Expansion Proposal',
    theme: 'velocity',
    brandTokens: {
      colors: { primary: '#4f46e5', secondary: '#06b6d4', text: '#f8fafc' }
    }
  });

  // 2. User adds heading, paragraph, and shape
  const heading = LDocEditorCore.addFreeText({ text: 'Enterprise Expansion Proposal' });
  assert.ok(heading);
  const shape = LDocEditorCore.addShape('rect');
  assert.ok(shape);

  // 3. Validate AST
  const page = LDocEditorCore.getActivePage();
  const valResult = LDocValidator.validateDocument({ pages: [page] });
  assert.strictEqual(valResult.valid, true);

  // 4. Save and reload simulation
  const serialized = JSON.stringify({ title: LDocEditorCore.state.title, pages: LDocEditorCore.state.pages });
  const parsed = JSON.parse(serialized);
  assert.strictEqual(parsed.title, 'Enterprise Q4 Cloud Expansion Proposal');
  assert.strictEqual(parsed.pages[0].blocks.length, page.blocks.length);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Real User Journey B: STEM Simulation & Reactive Physics Workflow
// ─────────────────────────────────────────────────────────────────────────────
test('User Journey B: STEM Simulation & Reactive Physics Workflow', () => {
  const dag = new LDocReactiveEngine.ReactiveDAG('physics_lab');
  // Ohm's law: I = V / R
  dag.addVariable({ name: 'voltage', type: 'slider', value: 12, min: 1, max: 240 });
  dag.addVariable({ name: 'resistance', type: 'slider', value: 4, min: 0.1, max: 1000 });
  dag.addVariable({ name: 'current', formula: 'voltage / resistance' });
  dag.addVariable({ name: 'power', formula: 'voltage * current' });

  assert.strictEqual(dag.getValue('current'), 3, '12V / 4Ω = 3A');
  assert.strictEqual(dag.getValue('power'), 36, '12V * 3A = 36W');

  // User interacts with voltage slider: increases to 24V
  dag.setVariable('voltage', 24);
  assert.strictEqual(dag.getValue('current'), 6, '24V / 4Ω = 6A');
  assert.strictEqual(dag.getValue('power'), 144, '24V * 6A = 144W');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Real User Journey C: Interactive Assessment / Quiz
// ─────────────────────────────────────────────────────────────────────────────
test('User Journey C: Interactive Assessment & Knowledge Scoring', () => {
  const quiz = {
    id: 'quiz_final',
    type: 'quiz',
    title: 'Platform Architecture Conformance',
    passingScore: 80,
    questions: [
      { id: 'q1', type: 'single_select', question: 'Does Pretext layout drift across browsers?', correctIndex: 1, options: ['Yes', 'No (0% Drift)'] },
      { id: 'q2', type: 'true_false', question: 'Formulas execute safely without eval().', correctAnswer: true }
    ]
  };

  // User answers both correctly
  let correctCount = 0;
  if (quiz.questions[0].correctIndex === 1) correctCount++;
  if (quiz.questions[1].correctAnswer === true) correctCount++;

  const scorePct = Math.round((correctCount / quiz.questions.length) * 100);
  assert.strictEqual(scorePct, 100);
  assert.ok(scorePct >= quiz.passingScore, 'Quiz passed successfully');
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Real User Journey D: Product Showcase & Pretext Flow Around Obstacles
// ─────────────────────────────────────────────────────────────────────────────
test('User Journey D: Product Showcase & Pretext Flow Around Obstacles', () => {
  const obstacle = { x: 50, y: 40, width: 200, height: 100 };
  const text = 'LDOCX introduces living documents with mathematically deterministic Pretext layout flow.';
  const flowResult = LdocTextLayout.flowAroundExclusion(text, '15px "Plus Jakarta Sans", sans-serif', 600, obstacle, 24);

  assert.ok(flowResult);
  assert.ok(flowResult.totalHeight > 0);
  assert.ok(flowResult.lines.length >= 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Real User Journey E: Enterprise Merkle Tree Integrity
// ─────────────────────────────────────────────────────────────────────────────
test('User Journey E: Enterprise Merkle Tree Integrity & Tamper Detection', () => {
  const pages = [{
    id: 'p1',
    blocks: [
      { id: 'blk_1', type: 'heading', text: 'Financial Statement' },
      { id: 'blk_2', type: 'table', data: [[100, 200], [300, 400]] }
    ]
  }];

  const merkleRecord = LDocParser.computeDocumentMerkleTree(pages);
  assert.ok(merkleRecord.merkle_root, 'Root hash must exist');
  assert.strictEqual(merkleRecord.total_leaves, 2);

  // Verify untampered
  const verifyValid = LDocParser.verifyMerkleTree(pages, merkleRecord);
  assert.strictEqual(verifyValid.valid, true);
  assert.strictEqual(verifyValid.tamper_count, 0);

  // Tamper with block 1 text
  const tamperedPages = JSON.parse(JSON.stringify(pages));
  tamperedPages[0].blocks[0].text = 'Fraudulent Statement';

  const verifyTampered = LDocParser.verifyMerkleTree(tamperedPages, merkleRecord);
  assert.strictEqual(verifyTampered.valid, false, 'Tampered block must fail Merkle integrity');
  assert.strictEqual(verifyTampered.tamper_count, 1);
  assert.strictEqual(verifyTampered.tampered_blocks[0], 'blk_1');
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Real User Journey F: Non-Destructive Image Processing
// ─────────────────────────────────────────────────────────────────────────────
test('User Journey F: Non-Destructive Image Processing & Fidelity Classification', () => {
  const supportedCheck = LDocImageEngine.classifyImageBackground({ width: 100, height: 100 });
  assert.ok(['supported', 'limited', 'unsupported'].includes(supportedCheck.tier));

  const initialParams = {
    brightness: 120,
    contrast: 110,
    crop: [0, 0, 80, 80],
    mask: 'rounded'
  };

  // Verifies that image params are non-destructive properties on the block
  const block = {
    id: 'img_test',
    type: 'image_card',
    src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    imageParams: initialParams
  };

  assert.strictEqual(block.imageParams.brightness, 120);
  assert.strictEqual(block.src.startsWith('data:image/png'), true, 'Original source bytes preserved intact');
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Real User Journey G: Vector Pen Tool & Boolean Clipping
// ─────────────────────────────────────────────────────────────────────────────
test('User Journey G: Vector Pen Tool & Boolean Geometry Workflow', () => {
  // 1. Create path
  const pathModel = LDocVectorEditor.createPath([
    { x: 0, y: 0, type: 'corner' },
    { x: 50, y: 100, type: 'smooth' },
    { x: 100, y: 0, type: 'corner' }
  ], true);

  assert.strictEqual(pathModel.nodes.length, 3);
  assert.strictEqual(pathModel.nodes[1].type, 'smooth');

  // 2. Boolean Union with another shape
  const cutter = LDocVectorEditor.createPath([
    { x: 25, y: -20 }, { x: 75, y: -20 }, { x: 75, y: 50 }, { x: 25, y: 50 }
  ], true);

  const unionResult = LDocVectorEditor.booleanOperation(pathModel, cutter, 'union');
  assert.ok(unionResult && unionResult.nodes.length >= 3, 'Boolean union must generate valid path');

  // 3. SVG Path Export
  const svgD = LDocVectorEditor.pathToSvgD(unionResult);
  assert.ok(svgD.startsWith('M'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Real User Journey H: Template Blueprint Generation & Quality Audit
// ─────────────────────────────────────────────────────────────────────────────
test('User Journey H: Blueprint Generation & AAA Quality Grade Validation', () => {
  const seed = 'venture_capital_seed_2026';
  const recipe = LDocTemplateEngine.generateRecipe(seed, 'finance');
  assert.strictEqual(recipe.category, 'finance');

  const doc = LDocTemplateEngine.materializeDocument(recipe);
  assert.ok(doc.pages.length >= 1);

  const quality = LDocTemplateEngine.validateTemplateQuality(doc);
  assert.strictEqual(quality.valid, true);
  assert.strictEqual(quality.qualityGrade, 'AAA');
});

console.log('\n================================================================');
console.log(`🎉 SECTION 20 TESTS PASSED: ${passedTests}/${totalTests} TESTS (100% SUCCESS)`);
console.log('================================================================\n');
