/**
 * LDOCX Living Document Runtime — Comprehensive Master Test Suite
 * Tests Phase 2: Reactive DAG, Safe Math Evaluator, Simulation Presets, 3D Inspector, and Quiz Engine
 */

const assert = require('assert');
const path = require('path');
const LDocReactiveEngine = require('../src/ldoc-reactive-engine');
const LDoc3DInspector = require('../src/ldoc-3d-inspector');
const LDocQuizEngine = require('../src/ldoc-quiz-engine');
const LDocParser = require('../src/ldoc-parser');
const LDocEditorCore = require('../src/ldoc-editor-core');

console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║   LDOCX PHASE 2: LIVING DOCUMENT RUNTIME & 3D TEST SUITE         ║');
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

// ─────────────────────────────────────────────────────────────────────────────
// 1. SAFE MATH TOKENIZER & EXPRESSION PARSER
// ─────────────────────────────────────────────────────────────────────────────
console.log('▶ [1/6] Testing Safe Math Evaluator & AST Parser (Zero Eval)...');

runTest('Basic Arithmetic & Order of Operations', () => {
  const res1 = LDocReactiveEngine.evaluateFormula('2 + 3 * 4');
  assert.strictEqual(res1, 14);

  const res2 = LDocReactiveEngine.evaluateFormula('(2 + 3) * 4');
  assert.strictEqual(res2, 20);

  const res3 = LDocReactiveEngine.evaluateFormula('2^3');
  assert.strictEqual(res3, 8);

  const res4 = LDocReactiveEngine.evaluateFormula('10 % 3');
  assert.strictEqual(res4, 1);
});

runTest('Math Functions (sin, cos, sqrt, pow, clamp, deg2rad)', () => {
  const sqrtVal = LDocReactiveEngine.evaluateFormula('sqrt(16)');
  assert.strictEqual(sqrtVal, 4);

  const clampVal = LDocReactiveEngine.evaluateFormula('clamp(150, 0, 100)');
  assert.strictEqual(clampVal, 100);

  const degVal = LDocReactiveEngine.evaluateFormula('deg2rad(180)');
  assert.strictEqual(Math.round(degVal * 1000) / 1000, 3.142);

  const sinVal = LDocReactiveEngine.evaluateFormula('sin(deg2rad(90))');
  assert.strictEqual(Math.round(sinVal), 1);
});

runTest('Ternary Conditional & Comparison Operators', () => {
  const resTrue = LDocReactiveEngine.evaluateFormula('velocity > 20 ? 100 : 0', { velocity: 25 });
  assert.strictEqual(resTrue, 100);

  const resFalse = LDocReactiveEngine.evaluateFormula('velocity > 20 ? 100 : 0', { velocity: 15 });
  assert.strictEqual(resFalse, 0);

  const ifVal = LDocReactiveEngine.evaluateFormula('IF(score >= 70, 1, 0)', { score: 85 });
  assert.strictEqual(ifVal, 1);
});

runTest('Extract Variables from Formula', () => {
  const vars = LDocReactiveEngine.extractVariables('v0 * sin(deg2rad(angle)) * t - 0.5 * g * t^2');
  assert.ok(vars.includes('v0'));
  assert.ok(vars.includes('angle'));
  assert.ok(vars.includes('t'));
  assert.ok(vars.includes('g'));
  assert.ok(!vars.includes('sin'));
  assert.ok(!vars.includes('deg2rad'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. TOPOLOGICAL REACTIVE DEPENDENCY DAG & SIMULATIONS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [2/6] Testing Topological Reactive Dependency DAG...');

runTest('Reactive DAG Node Resolution & Propagation', () => {
  const dag = new LDocReactiveEngine.ReactiveDAG('test_dag');
  dag.addVariable({ name: 'width', type: 'slider', value: 10 });
  dag.addVariable({ name: 'height', type: 'slider', value: 5 });
  dag.addVariable({ name: 'area', type: 'formula', formula: 'width * height' });
  dag.addVariable({ name: 'perimeter', type: 'formula', formula: '2 * (width + height)' });

  assert.strictEqual(dag.getValue('area'), 50);
  assert.strictEqual(dag.getValue('perimeter'), 30);

  let notified = false;
  dag.subscribe((triggerVar, vals) => {
    notified = true;
    assert.strictEqual(triggerVar, 'width');
    assert.strictEqual(vals.width, 20);
    assert.strictEqual(vals.area, 100);
  });

  dag.setVariable('width', 20);
  assert.ok(notified, 'Subscriber should be notified on variable update');
  assert.strictEqual(dag.getValue('area'), 100);
  assert.strictEqual(dag.getValue('perimeter'), 50);
});

runTest('Cycle Detection Graceful Handling', () => {
  const dag = new LDocReactiveEngine.ReactiveDAG('cycle_dag');
  dag.addVariable({ name: 'a', type: 'formula', formula: 'b + 1' });
  dag.addVariable({ name: 'b', type: 'formula', formula: 'a + 1' });

  // Evaluation must complete without throwing uncaught stack overflow
  dag.evaluate();
  const nodeA = dag.getNode('a');
  const nodeB = dag.getNode('b');
  assert.ok(nodeA.error || nodeB.error, 'Cyclic dependency must be flagged on node');
});

runTest('Preset: Projectile Motion', () => {
  const dag = LDocReactiveEngine.SIMULATION_PRESETS.projectile_motion();
  const vals = dag.getAllValues();
  assert.ok(vals.time_of_flight > 0, 'Flight time must be positive');
  assert.ok(vals.max_height > 0, 'Apex must be positive');
  assert.ok(vals.range > 0, 'Range must be positive');

  const pts = dag.getTrajectoryPoints(30);
  assert.strictEqual(pts.length, 31);
  assert.strictEqual(pts[0].x, 0);
  assert.ok(pts[pts.length - 1].x > 0);
});

runTest('Preset: Ohm\'s Law', () => {
  const dag = LDocReactiveEngine.SIMULATION_PRESETS.ohms_law({ voltage: 24, resistance: 6 });
  assert.strictEqual(dag.getValue('current'), 4);
  assert.strictEqual(dag.getValue('power'), 96);
});

runTest('Preset: Compound Interest', () => {
  const dag = LDocReactiveEngine.SIMULATION_PRESETS.compound_interest({
    principal: 1000,
    annual_rate: 10,
    compounds_per_yr: 1,
    years: 2
  });
  // 1000 * (1.1)^2 = 1210
  assert.strictEqual(Math.round(dag.getValue('future_value')), 1210);
  assert.strictEqual(Math.round(dag.getValue('total_interest')), 210);
});

runTest('Simulation Card HTML/SVG Generator', () => {
  const cardHtml = LDocReactiveEngine.generateSimulationCard({
    type: 'simulation',
    preset: 'projectile_motion',
    title: 'Ballistics Flight Simulator'
  });
  assert.ok(cardHtml.includes('Ballistics Flight Simulator'));
  assert.ok(cardHtml.includes('REACTIVE DAG'));
  assert.ok(cardHtml.includes('<svg'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. 3D SCENE INSPECTOR & EXPLODED VIEWS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [3/6] Testing 3D Scene Inspector & Exploded Views...');

runTest('Exploded View Controller Parametric Displacement', () => {
  // Mock Three.js Object3D hierarchy
  const mockMesh1 = {
    uuid: 'm1',
    name: 'Engine_Piston_Left',
    isMesh: true,
    position: { x: -10, y: 0, z: 0 },
    traverse: function (cb) { cb(this); }
  };
  const mockMesh2 = {
    uuid: 'm2',
    name: 'Engine_Piston_Right',
    isMesh: true,
    position: { x: 10, y: 0, z: 0 },
    traverse: function (cb) { cb(this); }
  };
  const mockRoot = {
    uuid: 'root_engine',
    name: 'V8_Engine',
    children: [mockMesh1, mockMesh2],
    traverse: function (cb) {
      cb(this);
      cb(mockMesh1);
      cb(mockMesh2);
    }
  };

  const controller = new LDoc3DInspector.ExplodedViewController(mockRoot, { multiplier: 2.0 });
  assert.strictEqual(controller.getFactor(), 0.0);

  // Set 50% explosion
  controller.setFactor(0.5);
  assert.strictEqual(controller.getFactor(), 0.5);
  assert.ok(mockMesh1.position.x < -10, 'Left piston should displace further left');
  assert.ok(mockMesh2.position.x > 10, 'Right piston should displace further right');

  // Reset
  controller.reset();
  assert.strictEqual(controller.getFactor(), 0.0);
  assert.strictEqual(mockMesh1.position.x, -10);
  assert.strictEqual(mockMesh2.position.x, 10);
});

runTest('Scene Hierarchy Inspector Tree Extraction', () => {
  const mockChild = { uuid: 'c1', name: 'Wheel', type: 'Mesh', isMesh: true, children: [] };
  const mockParent = { uuid: 'p1', name: 'Chassis', type: 'Group', children: [mockChild] };

  const tree = LDoc3DInspector.getSceneHierarchy(mockParent);
  assert.strictEqual(tree.name, 'Chassis');
  assert.strictEqual(tree.children.length, 1);
  assert.strictEqual(tree.children[0].name, 'Wheel');
  assert.strictEqual(tree.children[0].isMesh, true);
});

runTest('Part Isolation & Reset', () => {
  const m1 = { uuid: 'part_a', name: 'Exhaust', isMesh: true, visible: true };
  const m2 = { uuid: 'part_b', name: 'Turbocharger', isMesh: true, visible: true };
  const root = {
    uuid: 'root',
    visible: true,
    traverse: function (cb) { cb(this); cb(m1); cb(m2); }
  };

  // Isolate Turbocharger
  const isolated = LDoc3DInspector.isolatePart(root, 'part_b');
  assert.ok(isolated);
  assert.strictEqual(m1.visible, false, 'Exhaust should be hidden');
  assert.strictEqual(m2.visible, true, 'Turbocharger should remain visible');

  // Reset
  LDoc3DInspector.resetIsolation(root);
  assert.strictEqual(m1.visible, true);
  assert.strictEqual(m2.visible, true);
});

runTest('3D Annotation Pins & Screen Projection', () => {
  const manager = new LDoc3DInspector.AnnotationManager();
  const pin = manager.addPin({
    title: 'Twin Turbos',
    description: 'Bespoke ceramic ball bearing turbochargers',
    position: { x: 5, y: 10, z: 2 },
    color: '#f59e0b'
  });

  assert.strictEqual(pin.title, 'Twin Turbos');
  assert.strictEqual(manager.getPins().length, 1);

  // Screen projection fallback test
  const screenPos = manager.projectToScreen(pin.position, null, 800, 600);
  assert.ok(typeof screenPos.x === 'number');
  assert.ok(typeof screenPos.y === 'number');
  assert.ok(screenPos.visible);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. INTERACTIVE QUIZ & DIAGNOSTIC ENGINE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [4/6] Testing Interactive Quiz & Diagnostic Engine...');

runTest('Question Evaluation (Single Choice, True/False, Numeric)', () => {
  // Single choice
  const qSingle = { id: 'q1', type: 'single_select', correctIndex: 2 };
  assert.strictEqual(LDocQuizEngine.evaluateQuestion(qSingle, 2).isCorrect, true);
  assert.strictEqual(LDocQuizEngine.evaluateQuestion(qSingle, 1).isCorrect, false);

  // True/False
  const qTF = { id: 'q2', type: 'true_false', correctAnswer: true };
  assert.strictEqual(LDocQuizEngine.evaluateQuestion(qTF, true).isCorrect, true);
  assert.strictEqual(LDocQuizEngine.evaluateQuestion(qTF, false).isCorrect, false);

  // Numeric with tolerance
  const qNum = { id: 'q3', type: 'numeric', correctValue: 9.81, tolerance: 0.05 };
  assert.strictEqual(LDocQuizEngine.evaluateQuestion(qNum, '9.82').isCorrect, true);
  assert.strictEqual(LDocQuizEngine.evaluateQuestion(qNum, '10.5').isCorrect, false);
});

runTest('Entire Quiz Evaluation & Scoring Summary', () => {
  const quizBlock = {
    id: 'quiz_mastery',
    passingScore: 65,
    questions: [
      { id: 'q1', type: 'single_select', correctIndex: 0 },
      { id: 'q2', type: 'true_false', correctAnswer: false },
      { id: 'q3', type: 'numeric', correctValue: 42, tolerance: 0.1 }
    ]
  };

  const answers = { q1: 0, q2: false, q3: 42 };
  const res = LDocQuizEngine.evaluateQuiz(quizBlock, answers);
  assert.strictEqual(res.totalScore, 3);
  assert.strictEqual(res.percentage, 100);
  assert.strictEqual(res.passed, true);
});

runTest('Quiz Card HTML Generator', () => {
  const cardHtml = LDocQuizEngine.generateQuizCard({
    id: 'q_demo',
    title: 'Aerodynamics Final Exam',
    questions: [
      { id: 'q1', type: 'single_select', question: 'What generates lift?', options: ['Bernoulli & Newton', 'Magic'], correctIndex: 0, hint: 'Pressure differential' }
    ]
  });
  assert.ok(cardHtml.includes('Aerodynamics Final Exam'));
  assert.ok(cardHtml.includes('What generates lift?'));
  assert.ok(cardHtml.includes('Need a hint?'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. PARSER ARCHIVAL FALLBACK HTML GENERATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [5/6] Testing 20-Year Archival Longevity HTML Generation...');

runTest('Parser renders simulation and quiz in archival fallback HTML', () => {
  const doc = {
    manifest: { doc_id: 'doc_sim_quiz', title: 'Living STEM Document', author: 'LDOC Team' },
    document: {
      pages: [
        {
          id: 'p1',
          blocks: [
            { type: 'heading', level: 1, text: 'Living Simulations' },
            { type: 'simulation', preset: 'projectile_motion', title: 'Kinematics Lab' },
            { type: 'quiz', title: 'Knowledge Diagnostic', questions: [{ id: 'q1', question: 'Test Q', options: ['A', 'B'] }] }
          ]
        }
      ]
    }
  };

  const html = LDocParser.renderFallbackHtml(doc);
  assert.ok(html.includes('Kinematics Lab'));
  assert.ok(html.includes('Knowledge Diagnostic'));
  assert.ok(html.includes('<!DOCTYPE html>'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. EDITOR CORE EXTENSIONS & LAYER RECONSTRUCTION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [6/6] Testing Editor Core Living Extensions & Layer Reconstruction...');

runTest('EditorCore adds Simulation and Quiz blocks', () => {
  LDocEditorCore.init();
  const sim = LDocEditorCore.addSimulation('ohms_law', { title: 'Circuit Analysis' });
  assert.strictEqual(sim.type, 'simulation');
  assert.strictEqual(sim.preset, 'ohms_law');

  const quiz = LDocEditorCore.addQuiz('Physics Mastery');
  assert.strictEqual(quiz.type, 'quiz');
  assert.strictEqual(quiz.title, 'Physics Mastery');
});

runTest('Canvas Settings: Grid and Rulers Toggle', () => {
  LDocEditorCore.init();
  const gridState = LDocEditorCore.toggleGrid(true);
  assert.strictEqual(gridState, true);

  const rulerState = LDocEditorCore.toggleRulers(true);
  assert.strictEqual(rulerState, true);

  LDocEditorCore.setSnapToGrid(true, 16);
  assert.strictEqual(LDocEditorCore.state.canvasSettings.gridSize, 16);
});

runTest('LDOC Layers Reconstruction (Flattened to Structured AST)', () => {
  LDocEditorCore.init();
  const analysis = {
    elements: [
      { type: 'background_panel', x: 0, y: 0, width: 800, height: 600, fill: '#0f172a' },
      { type: 'heading', level: 1, text: 'Quantum Teleportation' },
      { type: 'paragraph', text: 'Entangled photon pairs mediate quantum state exchange.' },
      { type: 'image', url: 'quantum_lab.png', width: 400, height: 250 }
    ]
  };

  const reconstructed = LDocEditorCore.reconstructLayersFromImage(analysis);
  assert.strictEqual(reconstructed.blocks.length, 4);
  assert.strictEqual(reconstructed.blocks[0].type, 'shape');
  assert.strictEqual(reconstructed.blocks[1].type, 'heading');
  assert.strictEqual(reconstructed.blocks[2].type, 'paragraph');
  assert.strictEqual(reconstructed.blocks[3].type, 'image_card');
});

console.log('\n════════════════════════════════════════════════════════════════════');
console.log(`✓ ALL ${passedTests}/${totalTests} LIVING DOCUMENT RUNTIME TESTS PASSED 100%!`);
console.log('════════════════════════════════════════════════════════════════════\n');
