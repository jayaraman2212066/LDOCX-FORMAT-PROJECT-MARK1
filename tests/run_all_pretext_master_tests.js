/**
 * LDOC × Pretext Integration: Master Test Runner
 * Executes all 10 sections of the Master Test Prompt sequentially:
 * - Section 1: Core module unit tests (LdocTextLayout)
 * - Section 2: Cross-surface consistency (Editor vs Viewer vs PDF Flattener)
 * - Section 3: Runtime / mount performance & layout thrashing audit
 * - Section 4: Editor-specific tests (Free Text, auto-grow, multi-line centering, 3D exclusion)
 * - Section 5 & 6: Viewer visual verification & Print/PDF export pagination
 * - Section 7: Cross-platform & cross-browser conformance (Chrome, Edge, Safari soft-hyphen, packages)
 * - Section 8: Architecture conformance (@chenglou/pretext encapsulation & pinning)
 * - Section 9: Regression sweep against prior bug list (B1–B9)
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('================================================================');
console.log('🚀 LDOC × PRETEXT INTEGRATION: MASTER TEST SUITE RUNNER');
console.log('================================================================\n');

const testSuites = [
  { section: 'Section 1', name: 'Core Module Unit Tests', script: 'test_section1_unit.js' },
  { section: 'Section 2', name: 'Cross-Surface Consistency (Zero Drift)', script: 'test_section2_cross_surface.js' },
  { section: 'Section 3', name: 'Runtime & Mount Performance Audit', script: 'test_section3_performance.js' },
  { section: 'Section 4', name: 'Editor-Specific Tests', script: 'test_section4_editor.js' },
  { section: 'Section 5 & 6', name: 'Viewer & PDF Visual Verification', script: 'test_section5_and_6_viewer_pdf.js' },
  { section: 'Section 7', name: 'Cross-Platform & Cross-Browser Tests', script: 'test_section7_cross_platform.js' },
  { section: 'Section 8', name: 'Architecture Conformance', script: 'test_section8_arch.js' },
  { section: 'Section 9', name: 'Regression Sweep (B1–B9)', script: 'test_section9_regression.js' },
  { section: 'Section 10', name: 'Pretext UI/UX 8 Master Features', script: 'test_pretext_ui_ux.js' },
  { section: 'Section 11', name: 'Multi-User Concurrency & Integrity', script: 'test_section11_multi_user_load_integrity.js' },
  { section: 'Section 12', name: 'Canva Pro Creative Engine & Vector Shapes', script: 'test_canva_pro_features.js' },
  { section: 'Section 13', name: 'Living Document Runtime (Reactive DAG, 3D & Quiz)', script: 'test_living_document_runtime.js' },
  { section: 'Section 14', name: 'Production Safety, QA & Corpus Verification', script: 'test_production_safety_qa.js' },
  { section: 'Section 15', name: 'Creative Runtime, Blueprints & Vector Geometry', script: 'test_section15_creative_runtime_and_blueprints.js' },
  { section: 'Section 16', name: 'Deep 2D Polygon Boolean Clipping Engine', script: 'test_section16_boolean_geometry_deep.js' },
  { section: 'Section 17', name: 'Path Editing, Precision Transforms & Layer Sync', script: 'test_section17_professional_path_transforms_layers.js' },
  { section: 'Section 18', name: 'Multi-Script Typography & Pretext Hardening', script: 'test_section18_typography_unicode_multiscript.js' },
  { section: 'Section 19', name: 'Template Quality Validator & Virtual Catalog Scale', script: 'test_section19_template_validator_and_scale.js' },
  { section: 'Section 20', name: 'Adversarial Security, Stress & User Journeys A–H', script: 'test_section20_adversarial_security_and_stress.js' }
];

const results = [];
let overallPass = true;

for (const suite of testSuites) {
  const scriptPath = path.join(__dirname, suite.script);
  console.log(`\n────────────────────────────────────────────────────────────────`);
  console.log(`▶ Running [${suite.section}] ${suite.name}...`);
  console.log(`  Script: tests/${suite.script}`);
  console.log(`────────────────────────────────────────────────────────────────\n`);

  const tStart = Date.now();
  try {
    execSync(`node "${scriptPath}"`, {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit'
    });
    const duration = Date.now() - tStart;
    results.push({ ...suite, status: 'PASS', duration });
    console.log(`\n✅ [${suite.section}] PASSED (${duration}ms)`);
  } catch (err) {
    const duration = Date.now() - tStart;
    results.push({ ...suite, status: 'FAIL', duration, error: err.message });
    overallPass = false;
    console.error(`\n❌ [${suite.section}] FAILED (${duration}ms)`);
    break;
  }
}

console.log('\n================================================================');
console.log('📊 CONSOLIDATED TEST EXECUTION SUMMARY');
console.log('================================================================');
results.forEach(r => {
  const icon = r.status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${r.section}] ${r.name.padEnd(45)}: ${r.status} (${r.duration}ms)`);
});
console.log('================================================================');

if (!overallPass) {
  console.error('\n❌ MASTER TEST SUITE COMPLETED WITH FAILURES.\n');
  process.exit(1);
} else {
  console.log('\n🎉 ALL MASTER TEST SUITES COMPLETED WITH 100% PASS RATE!\n');
}
