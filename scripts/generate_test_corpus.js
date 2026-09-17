/**
 * LDOCX Living Document Platform — Permanent Test Document Corpus Generator
 * Generates all 14 standardized test fixtures in tests/fixtures/ldocx/:
 * 1. minimal.ldocx
 * 2. text.ldocx
 * 3. image.ldocx
 * 4. table.ldocx
 * 5. chart.ldocx
 * 6. animation.ldocx
 * 7. video.ldocx
 * 8. 3d.ldocx
 * 9. simulation.ldocx
 * 10. reactive.ldocx
 * 11. presentation.ldocx
 * 12. large.ldocx
 * 13. malformed.ldocx
 * 14. legacy.ldocx
 */

const fs = require('fs');
const path = require('path');
const LDocParser = require('../src/ldoc-parser');

async function generateCorpus() {
  const JSZip = await LDocParser.ensureJSZipReady();
  const corpusDir = path.resolve(__dirname, '..', 'tests', 'fixtures', 'ldocx');
  if (!fs.existsSync(corpusDir)) {
    fs.mkdirSync(corpusDir, { recursive: true });
  }

  console.log('▶ Generating Permanent Test Document Corpus in:', corpusDir);

  const fixtureDefs = [
    // 1. minimal.ldocx
    {
      filename: 'minimal.ldocx',
      doc: {
        id: 'doc_minimal',
        title: 'Minimal Valid LDOCX',
        pages: [{ id: 'p1', blocks: [{ id: 'b1', type: 'heading', level: 1, text: 'Minimal Document' }] }]
      }
    },
    // 2. text.ldocx
    {
      filename: 'text.ldocx',
      doc: {
        id: 'doc_text',
        title: 'Rich Pretext Typography Test',
        pages: [{
          id: 'p1',
          blocks: [
            { id: 'b_h1', type: 'heading', level: 1, text: 'Typography Baseline' },
            { id: 'b_p1', type: 'paragraph', text: 'Standard paragraph with deterministic Pretext arithmetic line breaks.' },
            { id: 'b_q1', type: 'quote', text: 'Design is not just what it looks like, design is how it works.', author: 'Steve Jobs' },
            { id: 'b_c1', type: 'code_block', language: 'javascript', code: 'const x = 42;' }
          ]
        }]
      }
    },
    // 3. image.ldocx
    {
      filename: 'image.ldocx',
      doc: {
        id: 'doc_image',
        title: 'Filtered Image Cards Test',
        pages: [{
          id: 'p1',
          blocks: [
            { id: 'b_img1', type: 'image_card', url: 'ai-brain.webp', filters: { brightness: 110, contrast: 120 }, borderRadius: 12 }
          ]
        }]
      }
    },
    // 4. table.ldocx
    {
      filename: 'table.ldocx',
      doc: {
        id: 'doc_table',
        title: 'Data Tables & Matrix Test',
        pages: [{
          id: 'p1',
          blocks: [
            { id: 'b_tbl', type: 'table', rows: [['Metric', 'Value'], ['Throughput', '120 fps'], ['Memory', '14.2 MB']] }
          ]
        }]
      }
    },
    // 5. chart.ldocx
    {
      filename: 'chart.ldocx',
      doc: {
        id: 'doc_chart',
        title: 'Data Visualization Test',
        pages: [{
          id: 'p1',
          blocks: [
            { id: 'b_cht', type: 'chart', chart_type: 'bar', title: 'Performance Benchmark', data: { labels: ['A', 'B'], datasets: [{ data: [10, 20] }] } }
          ]
        }]
      }
    },
    // 6. animation.ldocx
    {
      filename: 'animation.ldocx',
      doc: {
        id: 'doc_animation',
        title: 'Keyframe Animations Test',
        pages: [{
          id: 'p1',
          blocks: [
            { id: 'b_anim', type: 'shape', shape_type: 'circle', width: 100, height: 100, style: { fill: '#ec4899', animation: 'pulse 2s infinite' } }
          ]
        }]
      }
    },
    // 7. video.ldocx
    {
      filename: 'video.ldocx',
      doc: {
        id: 'doc_video',
        title: 'Embedded Video Media Test',
        pages: [{
          id: 'p1',
          blocks: [
            { id: 'b_vid', type: 'video', title: 'Demo Media', url: 'upscaled-videoad2.mp4', poster: 'video-poster.webp', width: 480, height: 270 }
          ]
        }]
      }
    },
    // 8. 3d.ldocx
    {
      filename: '3d.ldocx',
      doc: {
        id: 'doc_3d',
        title: 'Spatial 3D Model Test',
        pages: [{
          id: 'p1',
          blocks: [
            { id: 'b_3d', type: '3d_model', model_type: 'gltf', model_url: 'models/hypercar.gltf', width: 500, height: 300 }
          ]
        }]
      }
    },
    // 9. simulation.ldocx
    {
      filename: 'simulation.ldocx',
      doc: {
        id: 'doc_sim',
        title: 'Reactive Simulation Test',
        pages: [{
          id: 'p1',
          blocks: [
            { id: 'b_sim', type: 'simulation', preset: 'projectile_motion', title: 'Kinematics Lab' }
          ]
        }]
      }
    },
    // 10. reactive.ldocx
    {
      filename: 'reactive.ldocx',
      doc: {
        id: 'doc_reactive',
        title: 'Reactive Formula DAG Test',
        pages: [{
          id: 'p1',
          blocks: [
            { id: 'b_dag', type: 'simulation', preset: 'ohms_law', title: 'Ohm Circuit Calculator' }
          ]
        }]
      }
    },
    // 11. presentation.ldocx
    {
      filename: 'presentation.ldocx',
      doc: {
        id: 'doc_pres',
        title: 'Keynote Slide Presentation',
        pages: [
          { id: 'p1', title: 'Slide 1', blocks: [{ id: 'b1', type: 'heading', level: 1, text: 'Slide 1 Title' }] },
          { id: 'p2', title: 'Slide 2', blocks: [{ id: 'b2', type: 'heading', level: 2, text: 'Slide 2 Insights' }] }
        ]
      }
    },
    // 12. large.ldocx
    {
      filename: 'large.ldocx',
      doc: {
        id: 'doc_large',
        title: 'Large Multi-Block Stress Document',
        pages: Array.from({ length: 5 }, (_, pIdx) => ({
          id: `page_${pIdx + 1}`,
          title: `Stress Page ${pIdx + 1}`,
          blocks: Array.from({ length: 8 }, (_, bIdx) => ({
            id: `b_${pIdx + 1}_${bIdx + 1}`,
            type: bIdx % 2 === 0 ? 'heading' : 'paragraph',
            level: 2,
            text: `Document block content on page ${pIdx + 1} at position ${bIdx + 1}`
          }))
        }))
      }
    }
  ];

  // Compile standard fixtures (1 to 12)
  for (const f of fixtureDefs) {
    const compiled = await LDocParser.compileLdocxClientSide(f.doc);
    const buf = Buffer.from(await compiled.blob.arrayBuffer());
    const dest = path.join(corpusDir, f.filename);
    fs.writeFileSync(dest, buf);
    console.log(`  ✓ Created ${f.filename} (${buf.length} bytes, Merkle root: ${compiled.integrity.merkle_root.slice(0, 12)}...)`);
  }

  // 13. malformed.ldocx (contains damaged block to test quarantine healing)
  {
    const zip = new JSZip();
    const manifest = { ldoc_version: '3.0.0', id: 'doc_malformed', title: 'Malformed Document Quarantine Test', created_at: new Date().toISOString() };
    const pageDoc = {
      id: 'page_1',
      blocks: [
        { id: 'b_good', type: 'heading', text: 'Valid Title Block' },
        null, // Corrupted null block
        { not_a_valid_block: 123 }, // Missing type block
        { id: 'b_good2', type: 'paragraph', text: 'Valid Paragraph' }
      ]
    };
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('pages/page_001.json', JSON.stringify(pageDoc, null, 2));
    const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const dest = path.join(corpusDir, 'malformed.ldocx');
    fs.writeFileSync(dest, buf);
    console.log(`  ✓ Created malformed.ldocx (${buf.length} bytes, designed for quarantine healing)`);
  }

  // 14. legacy.ldocx (v1 container format with spec.json instead of document.json)
  {
    const zip = new JSZip();
    const manifest = { ldoc_version: '1.0.0', id: 'doc_legacy_v1', title: 'Legacy v1 Document Spec Test' };
    const spec = {
      title: 'Legacy v1 Living Document',
      pages: [
        {
          title: 'Legacy Page 1',
          blocks: [
            { id: 'b_leg_1', type: 'heading', text: 'Legacy v1 Heading' },
            { id: 'b_leg_2', type: 'paragraph', text: 'Legacy v1 paragraph content.' }
          ]
        }
      ]
    };
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('spec.json', JSON.stringify(spec, null, 2));
    const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const dest = path.join(corpusDir, 'legacy.ldocx');
    fs.writeFileSync(dest, buf);
    console.log(`  ✓ Created legacy.ldocx (${buf.length} bytes, legacy v1 spec.json container)`);
  }

  console.log('\n✅ All 14 test document fixtures successfully generated!');
  return true;
}

if (require.main === module) {
  generateCorpus().catch(err => {
    console.error('❌ Corpus Generation Failed:', err);
    process.exit(1);
  });
}

module.exports = generateCorpus;
