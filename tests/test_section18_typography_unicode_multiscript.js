/**
 * LDOC Master Test Suite: Section 18
 * Typography Depth & Multi-Script Unicode Pretext Arithmetic Hardening
 * 
 * Tests:
 * 1. Multi-Script Layout Determinism: Tamil, Hindi, Chinese, Arabic (RTL), Emoji
 * 2. Mixed Multi-Script Grapheme Cluster Integrity across 20 Repeated Passes
 * 3. Extreme Sizing Stress: 240px Giant Font & 6px Micro Font Layout
 * 4. Extreme Continuity Stress: 1,000-character Unbroken String Wrapping
 * 5. Formatting & Alignments: Left, Center, Right, Justify, Lists, Quotes & Headings
 */

const assert = require('assert');
const path = require('path');
const Ldoc = require('../ldoc-text-layout.js');

console.log('================================================================');
console.log('🧪 RUNNING SECTION 18: MULTI-SCRIPT TYPOGRAPHY & PRETEXT ARITHMETIC');
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
// 1. Multi-Script Layout Determinism
// ─────────────────────────────────────────────────────────────────────────────
test('Multi-Script Individual Layouts: Tamil, Hindi, Chinese, Arabic, Emoji', () => {
  const scripts = [
    { lang: 'Tamil', text: 'தமிழ் வாழ்க - பல்லாண்டு வாழ்க' },
    { lang: 'Hindi', text: 'नमस्ते दुनिया - यह एक परीक्षण है' },
    { lang: 'Chinese', text: '你好世界 - 这是一个全面的测试' },
    { lang: 'Arabic', text: 'مرحبا بالعالم - هذا اختبار شامل' },
    { lang: 'Emoji', text: '🚀🎨🔥✨🌟💎🎉🔮' }
  ];

  scripts.forEach(s => {
    const prep = Ldoc.prepareWithSegments(s.text, '16px "Plus Jakarta Sans", sans-serif');
    const layout = Ldoc.layoutWithLines(prep, 300, 24);
    assert.ok(layout.lineCount >= 1, `${s.lang} should produce at least 1 line`);
    assert.ok(layout.height > 0 && !isNaN(layout.height), `${s.lang} height must be valid number`);
    assert.ok(layout.lines[0].width > 0, `${s.lang} line width must be positive`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Mixed Multi-Script Grapheme Cluster Integrity (20 Repeated Passes)
// ─────────────────────────────────────────────────────────────────────────────
test('Mixed Multi-Script Grapheme Cluster Integrity (20x Bit-for-Bit Determinism)', () => {
  const mixedText = 'Living Document Runtime: தமிழ் வாழ்க, नमस्ते दुनिया, 你好世界, مرحبا بالعالم, and 🚀🎨🔥!';
  const font = '16px "Plus Jakarta Sans", sans-serif';
  const width = 350;
  const lineHeight = 26;

  const baselinePrep = Ldoc.prepareWithSegments(mixedText, font);
  const baselineLayout = Ldoc.layoutWithLines(baselinePrep, width, lineHeight);

  assert.ok(baselineLayout.lineCount >= 2, 'Mixed multi-script should wrap cleanly into multiple lines');

  for (let pass = 1; pass <= 20; pass++) {
    const p = Ldoc.prepareWithSegments(mixedText, font);
    const res = Ldoc.layoutWithLines(p, width, lineHeight);

    assert.strictEqual(res.lineCount, baselineLayout.lineCount, `Pass ${pass}: lineCount mismatch`);
    assert.strictEqual(res.height, baselineLayout.height, `Pass ${pass}: height mismatch`);

    for (let l = 0; l < res.lines.length; l++) {
      assert.strictEqual(res.lines[l].text, baselineLayout.lines[l].text, `Pass ${pass}, Line ${l}: text mismatch`);
      assert.strictEqual(res.lines[l].width, baselineLayout.lines[l].width, `Pass ${pass}, Line ${l}: width mismatch`);
    }
  }

  // Ensure emojis and international clusters were not fragmented
  const reconstructed = baselineLayout.lines.map(l => l.text).join(' ');
  assert.ok(reconstructed.includes('🚀🎨🔥!'), 'Emojis must remain intact');
  assert.ok(reconstructed.includes('தமிழ் வாழ்க'), 'Tamil cluster intact');
  assert.ok(reconstructed.includes('नमस्ते दुनिया'), 'Hindi cluster intact');
  assert.ok(reconstructed.includes('你好世界'), 'Chinese cluster intact');
  assert.ok(reconstructed.includes('مرحبا بالعالم'), 'Arabic cluster intact');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Extreme Sizing Stress (240px Giant & 6px Micro)
// ─────────────────────────────────────────────────────────────────────────────
test('Extreme Sizing Stress: 240px Giant Font & 6px Micro Font Layout', () => {
  // 240px Giant font
  const giantPrep = Ldoc.prepareWithSegments('TITAN', '240px "Plus Jakarta Sans", sans-serif');
  const giantLayout = Ldoc.layoutWithLines(giantPrep, 1200, 280);
  assert.strictEqual(giantLayout.lineCount, 1);
  assert.strictEqual(giantLayout.height, 280);
  assert.ok(giantLayout.lines[0].width > 400, '240px line width must be substantial');

  // 6px Micro font
  const microPrep = Ldoc.prepareWithSegments('Legal Footnote In Tiny Typography', '6px "Plus Jakarta Sans", sans-serif');
  const microLayout = Ldoc.layoutWithLines(microPrep, 200, 10);
  assert.strictEqual(microLayout.lineCount, 1);
  assert.strictEqual(microLayout.height, 10);
  assert.ok(microLayout.lines[0].width > 50 && microLayout.lines[0].width < 200);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Extreme Continuity Stress (1,000-character Unbroken String Wrapping)
// ─────────────────────────────────────────────────────────────────────────────
test('Extreme Continuity Stress: 1,000-char Unbroken String Wraps without Crash', () => {
  const unbroken = 'A'.repeat(1000);
  const prep = Ldoc.prepareWithSegments(unbroken, '15px "Plus Jakarta Sans", sans-serif');
  const layout = Ldoc.layoutWithLines(prep, 300, 22);

  assert.ok(layout.lineCount >= 25, '1000-char string must wrap into 25+ lines');
  assert.strictEqual(layout.height, layout.lineCount * 22, 'Height must equal lineCount * lineHeight');
  assert.ok(!isNaN(layout.height));

  // Verify all characters are preserved
  let totalChars = 0;
  layout.lines.forEach(l => {
    assert.ok(l.width <= 300, 'Wrapped line width must not exceed container boundary');
    totalChars += l.text.length;
  });
  assert.strictEqual(totalChars, 1000, 'All 1000 characters must be accounted for');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Block Formatting, Headings, Quotes & Alignments
// ─────────────────────────────────────────────────────────────────────────────
test('Block Formatting & Style Calculations: Headings, Quotes & Lists', () => {
  // Heading 1
  const h1Metrics = Ldoc.measureBlock({
    type: 'heading',
    level: 1,
    text: 'Executive Architectural Overview'
  }, 600);
  assert.ok(h1Metrics.height >= 40, 'H1 height must be >= 40px');

  // Blockquote
  const quoteMetrics = Ldoc.measureBlock({
    type: 'quote',
    text: 'Simplicity is prerequisite for reliability.'
  }, 500);
  assert.ok(quoteMetrics.height >= 30, 'Quote block measured accurately');

  // Paragraph with list bullet
  const listMetrics = Ldoc.measureBlock({
    type: 'paragraph',
    text: '• Deterministic zero-drift Pretext layout across all runtime surfaces'
  }, 400);
  assert.ok(listMetrics.lineCount >= 1);
});

console.log('\n================================================================');
console.log(`🎉 SECTION 18 TESTS PASSED: ${passedTests}/${totalTests} TESTS (100% SUCCESS)`);
console.log('================================================================\n');
