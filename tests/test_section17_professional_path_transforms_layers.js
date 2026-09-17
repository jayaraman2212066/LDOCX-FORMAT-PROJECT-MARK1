/**
 * LDOC Master Test Suite: Section 17
 * Professional Path Editing, Precision Transforms & Bidirectional Layer Sync
 * 
 * Tests:
 * 1. Bézier Node Continuity (C0 Corner, C1 Smooth, C2 Symmetric)
 * 2. Path Editing Operations (addNode, deleteNode, convertSegment, reversePath, joinPaths, pathToSvgD)
 * 3. Precision Transforms (Aspect lock, normalized rotation, scale, opacity, resetTransform, nudgeSelected)
 * 4. Multi-Object Alignment Engine (6-way align, equalWidth, equalHeight, equalSpacing)
 * 5. Smart Magnetic Guides (Page center snap, neighbor edge alignment)
 * 6. Bidirectional Layer Tree Synchronization (getLayers, reorderLayer, renameBlock, setBlockLocked, setBlockHidden, searchLayers)
 */

const assert = require('assert');
const path = require('path');
const LDocVectorEditor = require('../src/ldoc-vector-editor.js');
const LDocEditorCore = require('../src/ldoc-editor-core.js');

console.log('================================================================');
console.log('🧪 RUNNING SECTION 17: PATH EDITING, TRANSFORMS & LAYER SYNC');
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
// 1. Bézier Node Continuity (C0, C1, C2)
// ─────────────────────────────────────────────────────────────────────────────
test('Bézier Node Continuity: C0 Corner, C1 Smooth, C2 Symmetric', () => {
  const pathModel = LDocVectorEditor.createPath([
    { x: 0, y: 0, type: 'corner' },
    { x: 100, y: 50, type: 'corner' },
    { x: 200, y: 0, type: 'corner' }
  ], false);

  const node = pathModel.nodes[1];
  assert.strictEqual(node.type, 'corner');
  assert.strictEqual(node.handleIn, null);
  assert.strictEqual(node.handleOut, null);

  // Switch to C1 Smooth: opposite direction handles
  LDocVectorEditor.setNodeType(node, 'smooth');
  assert.strictEqual(node.type, 'smooth');
  assert.ok(node.handleIn && node.handleOut, 'Smooth node must have both handles');
  assert.strictEqual(node.handleIn.x, -node.handleOut.x || 0);
  assert.strictEqual(node.handleIn.y, -node.handleOut.y || 0);

  // Switch to C2 Symmetric: collinear with strictly equal lengths
  node.handleOut = { x: 30, y: 40 };
  LDocVectorEditor.setNodeType(node, 'symmetric');
  assert.strictEqual(node.type, 'symmetric');
  assert.strictEqual(node.handleIn.x, -30);
  assert.strictEqual(node.handleIn.y, -40);

  // Switch back to C0 Corner: handles reset to null
  LDocVectorEditor.setNodeType(node, 'corner');
  assert.strictEqual(node.type, 'corner');
  assert.strictEqual(node.handleIn, null);
  assert.strictEqual(node.handleOut, null);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Path Editing Operations
// ─────────────────────────────────────────────────────────────────────────────
test('Path Operations: addNode, deleteNode, convertSegment, reversePath, joinPaths', () => {
  const pathModel = LDocVectorEditor.createPath([
    { x: 0, y: 0 },
    { x: 100, y: 100 }
  ], false);

  // addNode
  const added = LDocVectorEditor.addNode(pathModel, 50, 50, 1);
  assert.strictEqual(pathModel.nodes.length, 3);
  assert.strictEqual(pathModel.nodes[1].x, 50);

  // convertSegment to curve
  LDocVectorEditor.convertSegment(pathModel, 0, 'curve');
  assert.ok(pathModel.nodes[0].handleOut !== null, 'Segment converted to curve has handleOut');
  assert.ok(pathModel.nodes[1].handleIn !== null, 'Next node has handleIn');

  // convertSegment back to line
  LDocVectorEditor.convertSegment(pathModel, 0, 'line');
  assert.strictEqual(pathModel.nodes[0].handleOut, null);
  assert.strictEqual(pathModel.nodes[1].handleIn, null);

  // deleteNode
  const delRes = LDocVectorEditor.deleteNode(pathModel, added.id);
  assert.strictEqual(delRes, true);
  assert.strictEqual(pathModel.nodes.length, 2);

  // reversePath
  pathModel.nodes[0].handleOut = { x: 10, y: 0 };
  LDocVectorEditor.reversePath(pathModel);
  assert.strictEqual(pathModel.nodes[0].x, 100);
  assert.strictEqual(pathModel.nodes[1].x, 0);
  assert.deepStrictEqual(pathModel.nodes[1].handleIn, { x: 10, y: 0 });

  // joinPaths
  const pathB = LDocVectorEditor.createPath([
    { x: 0, y: 0 },
    { x: -50, y: -50 }
  ], false);
  const joined = LDocVectorEditor.joinPaths(pathModel, pathB);
  assert.strictEqual(joined.nodes.length, 4);

  // pathToSvgD
  const svgD = LDocVectorEditor.pathToSvgD(joined);
  assert.ok(svgD.startsWith('M 100 100'), 'SVG path data starts with initial M');
  assert.ok(svgD.includes('L') || svgD.includes('C'), 'Contains line or curve commands');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Precision Transforms & Aspect Lock
// ─────────────────────────────────────────────────────────────────────────────
test('Precision Transforms: Aspect Ratio Lock, Normalization & Nudge', () => {
  LDocEditorCore.init({
    title: 'Transform Test',
    pages: [{
      id: 'p1',
      num: 1,
      blocks: [{
        id: 'block_t1',
        type: 'shape',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        rotation: 0,
        scale: 1,
        opacity: 1
      }]
    }]
  });

  // Aspect ratio locked: changing width from 200 to 400 must double height to 200
  LDocEditorCore.setObjectTransform('block_t1', {
    aspectRatioLocked: true,
    width: 400
  });
  const obj = LDocEditorCore.findObject('block_t1').item;
  assert.strictEqual(obj.width, 400);
  assert.strictEqual(obj.height, 200, 'Height must scale proportionally with locked aspect ratio');

  // Rotation normalization
  LDocEditorCore.setObjectTransform('block_t1', { rotation: 450 });
  assert.strictEqual(obj.rotation, 90, 'Rotation 450 deg normalized to 90 deg');

  // Scale and opacity clamp
  LDocEditorCore.setObjectTransform('block_t1', { scale: 1.5, opacity: 0.75 });
  assert.strictEqual(obj.scale, 1.5);
  assert.strictEqual(obj.opacity, 0.75);

  // Nudge selected: 1px and 10px
  LDocEditorCore.selectObject('block_t1');
  LDocEditorCore.nudgeSelected(1, 0); // 1px right
  assert.strictEqual(obj.x, 101);
  LDocEditorCore.nudgeSelected(0, 10); // 10px down
  assert.strictEqual(obj.y, 110);

  // Reset transform
  LDocEditorCore.resetTransform('block_t1');
  assert.strictEqual(obj.rotation, 0);
  assert.strictEqual(obj.scale, 1);
  assert.strictEqual(obj.opacity, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Multi-Object Alignment & Equalization
// ─────────────────────────────────────────────────────────────────────────────
test('Multi-Object Alignment: 6-way Align, Equal Width/Height, and Spacing', () => {
  LDocEditorCore.init({
    title: 'Alignment Test',
    pages: [{
      id: 'p1',
      num: 1,
      blocks: [
        { id: 'b1', type: 'shape', x: 10, y: 50, width: 80, height: 40 },
        { id: 'b2', type: 'shape', x: 150, y: 20, width: 120, height: 60 },
        { id: 'b3', type: 'shape', x: 300, y: 100, width: 60, height: 30 }
      ]
    }]
  });

  // Select all 3 objects
  LDocEditorCore.selectObject('b1', true);
  LDocEditorCore.selectObject('b2', true);
  LDocEditorCore.selectObject('b3', true);
  assert.strictEqual(LDocEditorCore.state.selectedObjectIds.length, 3);

  // 1. Equal Width (sets all to first item width = 80)
  LDocEditorCore.equalWidth();
  const b1 = LDocEditorCore.findObject('b1').item;
  const b2 = LDocEditorCore.findObject('b2').item;
  const b3 = LDocEditorCore.findObject('b3').item;
  assert.strictEqual(b1.width, 80);
  assert.strictEqual(b2.width, 80);
  assert.strictEqual(b3.width, 80);

  // 2. Equal Height (sets all to first item height = 40)
  LDocEditorCore.equalHeight();
  assert.strictEqual(b1.height, 40);
  assert.strictEqual(b2.height, 40);
  assert.strictEqual(b3.height, 40);

  // 3. Align Top (all tops align to min y = 20)
  LDocEditorCore.alignSelected('top');
  assert.strictEqual(b1.y, 20);
  assert.strictEqual(b2.y, 20);
  assert.strictEqual(b3.y, 20);

  // 4. Equal Spacing (Horizontal distribution)
  LDocEditorCore.equalSpacing('horizontal');
  // First item at x=10, last item ends at x=380 (startX=10, endX=380)
  // Total object width = 80*3 = 240, remaining space = 380 - 10 - 240 = 130
  // Gap = 130 / 2 = 65.
  // b1.x = 10, b2.x = 10 + 80 + 65 = 155, b3.x = 155 + 80 + 65 = 300
  assert.strictEqual(b1.x, 10);
  assert.strictEqual(b2.x, 155);
  assert.strictEqual(b3.x, 300);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Smart Magnetic Guides
// ─────────────────────────────────────────────────────────────────────────────
test('Smart Magnetic Guides: Canvas center & neighbor edge snapping', () => {
  LDocEditorCore.init({
    title: 'Snap Guide Test',
    pages: [{
      id: 'p1',
      num: 1,
      blocks: [
        { id: 'anchor', type: 'shape', x: 500, y: 300, width: 100, height: 100 }
      ]
    }]
  });

  // Candidate near page center (1920 / 2 = 960)
  const snapCenter = LDocEditorCore.computeSmartGuides('dragged', 958, 400, 5);
  assert.strictEqual(snapCenter.x, 960, 'Should snap to page center X = 960');
  assert.ok(snapCenter.guides.some(g => g.label === 'Page Center X'));

  // Candidate near anchor left (x = 500)
  const snapNeighbor = LDocEditorCore.computeSmartGuides('dragged', 503, 400, 5);
  assert.strictEqual(snapNeighbor.x, 500, 'Should snap to anchor left = 500');
  assert.ok(snapNeighbor.guides.some(g => g.label === 'Left Align'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Bidirectional Layer Tree Synchronization
// ─────────────────────────────────────────────────────────────────────────────
test('Bidirectional Layer Synchronization: getLayers, reorder, lock, hide, rename, search', () => {
  LDocEditorCore.init({
    title: 'Layers Sync Test',
    pages: [{
      id: 'p1',
      num: 1,
      blocks: [
        { id: 'layer_hero', type: 'heading', title: 'Hero Header' },
        { id: 'layer_card', type: 'image_card', title: 'Product Image' },
        { id: 'layer_footer', type: 'paragraph', title: 'Footer Note' }
      ]
    }]
  });

  // Canvas selection syncs to layers
  LDocEditorCore.selectObject('layer_card');
  const layers = LDocEditorCore.getLayers();
  assert.strictEqual(layers.length, 3);
  assert.strictEqual(layers[1].id, 'layer_card');
  assert.strictEqual(layers[1].isSelected, true, 'Layer must report selected state in sync with canvas');
  assert.strictEqual(layers[0].isSelected, false);

  // Lock layer
  LDocEditorCore.setBlockLocked('layer_hero', true);
  assert.strictEqual(LDocEditorCore.getLayers()[0].locked, true);

  // Hide layer
  LDocEditorCore.setBlockHidden('layer_footer', true);
  assert.strictEqual(LDocEditorCore.getLayers()[2].hidden, true);

  // Rename layer
  LDocEditorCore.renameBlock('layer_card', 'Showcase Banner');
  assert.strictEqual(LDocEditorCore.getLayers()[1].name, 'Showcase Banner');

  // Search layers
  const searchRes = LDocEditorCore.searchLayers('Banner');
  assert.strictEqual(searchRes.length, 1);
  assert.strictEqual(searchRes[0].id, 'layer_card');

  // Reorder layer (move index 0 to index 2)
  LDocEditorCore.reorderLayer('layer_hero', 2);
  const reordered = LDocEditorCore.getLayers();
  assert.strictEqual(reordered[2].id, 'layer_hero');
});

console.log('\n================================================================');
console.log(`🎉 SECTION 17 TESTS PASSED: ${passedTests}/${totalTests} TESTS (100% SUCCESS)`);
console.log('================================================================\n');
