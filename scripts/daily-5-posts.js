// scripts/daily-5-posts.js
// Generates 5 distinct high-impact daily posts for the Living Document (.ldocx) campaign
// Tailored for LinkedIn, Threads, Instagram, and Discord with unique, context-matched futuristic posters

const GITHUB_REPO_URL = "https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT";
const GITHUB_RELEASES_URL = "https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/tag/v2.5.0-free";
const LIVE_CREATOR_URL = "https://coderjay2003-svg.github.io/NEW-GEN-LIVING-DOCUMENT-FORMAT/creator.html";

// CDN Base for verified 200 OK assets
const CDN_BASE = "https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT";

const POSTERS = {
  DAY1_3D_CAD: CDN_BASE + "poster_day1_3d_cad.jpg",
  DAY2_SECURITY: CDN_BASE + "poster_day2_merkle_security.jpg",
  DAY3_CREATOR: CDN_BASE + "poster_day3_instant_creator.jpg",
  DAY4_AI_AST: CDN_BASE + "poster_day4_reactive_ast.jpg",
  DAY5_VIEWER: CDN_BASE + "poster_day5_native_viewer.jpg",
  DAY6_CONVERTER: CDN_BASE + "poster_day6_universal_converter.jpg",
  DAY7_CLEAN_PRINT: CDN_BASE + "poster_day7_clean_print.jpg",
  MASTER_AD1_FIRST_LOOK: CDN_BASE + "master_ad1_first_look.jpg",
  MASTER_AD2_DOCX_VS_LDOCX: CDN_BASE + "master_ad2_docx_vs_ldocx.jpg",
  MASTER_AD3_ZERO_LOGIN: CDN_BASE + "master_ad3_zero_login.jpg",
  MASTER_AD4_BUILT_DIFFERENT: CDN_BASE + "master_ad4_built_different.jpg",
  MASTER_AD5_PITCH_ALIVE: CDN_BASE + "master_ad5_pitch_alive.jpg",
  VIRAL_3D_CAR: CDN_BASE + "poster_viral_3d_car.jpg",
  CYBER_TABLET: CDN_BASE + "poster_cyberpunk_tablet.jpg"
};

function getDaySpecificPoster(dayNumber) {
  const map = {
    1: POSTERS.DAY1_3D_CAD,
    2: POSTERS.DAY2_SECURITY,
    3: POSTERS.DAY3_CREATOR,
    4: POSTERS.DAY4_AI_AST,
    5: POSTERS.DAY5_VIEWER,
    6: POSTERS.DAY6_CONVERTER,
    7: POSTERS.DAY7_CLEAN_PRINT
  };
  const idx = ((dayNumber - 1) % 7) + 1;
  return map[idx] || POSTERS.DAY1_3D_CAD;
}

function generateDaily5Posts(campaign, devtoUrl) {
  const articleUrl = devtoUrl || `${GITHUB_REPO_URL}#readme`;
  const dayNumber = campaign.dayNumber || 1;

  return [
    // Post 1: Morning Hook (09:00 AM) - The Industry Problem & Comparison
    // Attached: The Day's specific feature breakthrough poster
    {
      slot: "1/5 Morning Hook (09:00 AM)",
      angle: "Problem Statement & Industry Flaws",
      imageUrl: getDaySpecificPoster(dayNumber),
      linkedin: `🚨 Stop sending 1993 printer files in 2026.

${campaign.theme}:
❌ Legacy Flaws:
${campaign.comparison.legacyFlaws.map(f => '• ' + f).join('\n')}

⚡ .ldocx Superpowers:
${campaign.comparison.ldocxSuperpowers.map(s => '• ' + s).join('\n')}

Read the full showdown:
👉 ${articleUrl}

#TechNews #OpenSource #WebDev #Engineering #Productivity`,
      threads: `Stop sending 1993 printer files in 2026. 🚨

${campaign.theme}:
❌ Old: ${campaign.comparison.legacyFlaws[0]}
⚡ .ldocx: ${campaign.comparison.ldocxSuperpowers[0]}

100% Free & Open-Source.
👉 ${GITHUB_RELEASES_URL}

#TechNews #OpenSource #3D`,
      instagram: `🚨 Stop sending 1993 printer files in 2026.

Why are we still sharing static, lifeless PDFs when modern devices can render full 3D interactive applications?

${campaign.theme}:

❌ Legacy Flaws:
${campaign.comparison.legacyFlaws.map(f => '• ' + f).join('\n')}

⚡ .ldocx Superpowers:
${campaign.comparison.ldocxSuperpowers.map(s => '• ' + s).join('\n')}

🌐 100% Free & Open-Source:
github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT

#webdev #softwaredeveloper #programming #coding #opensource #techrevolution #futureoftech #javascript #typescript #softwarearchitecture`,
      discord: `🚨 **Stop sending 1993 printer files in 2026!**

**${campaign.theme}**

❌ **Legacy Document Flaws:**
${campaign.comparison.legacyFlaws.map(f => '• ' + f).join('\n')}

⚡ **.ldocx Superpowers:**
${campaign.comparison.ldocxSuperpowers.map(s => '• ' + s).join('\n')}

📖 **Full Showcase & Comparison**: ${articleUrl}
🌐 **Official Repo**: https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT
📦 **Install SDK**: \`npm install ldoc-sdk\``
    },

    // Post 2: Mid-day Deep Dive (12:30 PM) - Technical Architecture & 3D WebGL
    // Attached: 3D Holographic CAD Wireframe Car Poster
    {
      slot: "2/5 Mid-Day Deep Dive (12:30 PM)",
      angle: "3D WebGL & Interactive Architecture",
      imageUrl: (dayNumber % 2 === 1) ? POSTERS.MASTER_AD1_FIRST_LOOK : POSTERS.VIRAL_3D_CAR,
      linkedin: `Why are documents still 2D? The Living Document Format (.ldocx) integrates real-time Three.js 3D WebGL models, reactive spreadsheets, and live charts directly inside a self-contained container.

Key Capabilities:
• Embedded 60 FPS 3D CAD & molecular models
• Reactive AST calculations that update in real-time
• Under 4MB standalone native viewer (Windows, Linux, iOS)
• 100% offline-first execution with zero cloud telemetry

Download free native suite:
👉 ${GITHUB_RELEASES_URL}

#ThreeJS #WebGL #SoftwareArchitecture #Productivity`,
      threads: `Why are documents still 2D? 🧊

Living Documents (.ldocx) embed real-time Three.js 3D models and reactive charts inside single self-contained files.

• 60 FPS 3D CAD orbit & zoom
• 100% Offline execution
• < 4MB Native viewer (Win/Linux/iOS)

Download free: ${GITHUB_RELEASES_URL}

#ThreeJS #WebGL #OpenSource`,
      instagram: `Why are documents still stuck in 2D? 🧊✨

The Living Document Format (.ldocx) integrates real-time Three.js 3D WebGL models, reactive spreadsheets, and live charts directly inside a single self-contained container.

Key Superpowers:
🕹️ Embedded 60 FPS 3D CAD & molecular models with full orbital rotation
📊 Reactive AST calculations that recalculate in real-time
⚡ Standalone native viewer under 4MB (Windows, Linux, iOS)
🔒 100% offline-first execution with zero cloud telemetry

Explore the project:
github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT

#threejs #webgl #3dgraphics #softwareengineering #developerlife #frontend #javascript #opensource #programminglife #techinnovation`,
      discord: `🧊 **Why are documents still 2D? Living Document (.ldocx) Technical Deep-Dive**

The Living Document Format integrates real-time Three.js 3D WebGL models and reactive calculations inside self-contained containers!

✨ **Architecture Highlights:**
• 🕹️ Embedded 60 FPS 3D CAD orbit, zoom, and cross-section inspection
• 📊 Reactive AST formulas that update dynamically
• ⚡ Standalone native viewer under 4MB
• 🔒 100% Offline execution with zero telemetry

💾 **Download Free Suite**: ${GITHUB_RELEASES_URL}
🌐 **GitHub Repo**: https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT`
    },

    // Post 3: Afternoon Security (03:30 PM) - Cryptographic Merkle Verification
    // Attached: SHA-256 Merkle Security & Biometric Smart Contract Poster
    {
      slot: "3/5 Afternoon Security (03:30 PM)",
      angle: "Cryptographic Tamper Detection",
      imageUrl: (dayNumber % 2 === 1) ? POSTERS.DAY2_SECURITY : POSTERS.MASTER_AD2_DOCX_VS_LDOCX,
      linkedin: `Did you know anyone can unzip a Microsoft Word (.docx), edit sensitive legal numbers in the XML, re-zip it, and Word will open it without warning? ⚠️

The Living Document Format (.ldocx) solves document forgery with mathematical precision:
🔒 Every paragraph, table, and asset is hashed in a SHA-256 Merkle tree.
🚨 Instant tamper detection upon file opening.
🛡️ Zero macro exploits or arbitrary script vulnerabilities.

Verify documents in 3 lines of code:
const { LDOCXParser } = require('ldoc-sdk');
const doc = await LDOCXParser.parse(buffer);
console.log(doc.verifyIntegrity() ? 'Authentic' : 'Tampered');

Open-Source on GitHub:
👉 ${GITHUB_REPO_URL}

#CyberSecurity #InfoSec #Cryptography #LegalTech`,
      threads: `Did you know anyone can unzip a Word doc, alter legal text, and Word never warns you? ⚠️

.ldocx uses SHA-256 Merkle trees to verify every block.
Instant tamper alarm upon opening.

Verify with:
npm install ldoc-sdk
Repo: ${GITHUB_REPO_URL}

#CyberSecurity #InfoSec #OpenSource`,
      instagram: `Did you know anyone can unzip a Word document, edit sensitive contracts in the XML, re-zip it, and Word opens it without warning? ⚠️

The Living Document Format (.ldocx) solves document forgery with mathematical precision:
🛡️ Every paragraph, table, and asset is hashed in a SHA-256 Merkle tree.
🔍 Instant tamper detection upon opening.
🚫 Zero macro exploits or arbitrary script vulnerabilities.

Verify any document in 3 lines:
const { LDOCXParser } = require('ldoc-sdk');
const doc = await LDOCXParser.parse(buffer);
console.log(doc.verifyIntegrity() ? 'Authentic' : 'Tampered');

🌐 GitHub: github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT

#cybersecurity #infosec #cryptography #dataprotection #securityfirst #coding #developer #legaltech #opensource #programming`,
      discord: `🛡️ **Document Tampering is Solved: SHA-256 Merkle Tree Verification**

Anyone can unzip a \`.docx\`, alter legal terms in XML, and Word will open it without warning.

**.ldocx changes everything:**
• 🔐 Every paragraph, table, and asset is hashed into a SHA-256 Merkle tree.
• 🚨 Instant tamper detection upon file load.
• 🛡️ Zero macro exploits or arbitrary code execution risks.

\`\`\`javascript
const { LDOCXParser } = require('ldoc-sdk');
const doc = await LDOCXParser.parse(buffer);
console.log(doc.verifyIntegrity() ? 'Authentic' : 'Tampered');
\`\`\`

🌐 **GitHub**: https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT
📦 **SDK**: \`npm install ldoc-sdk\``
    },

    // Post 4: Evening Developer Angle (06:30 PM) - AI RAG & AST Syntax Engine
    // Attached: AI Neural Brain & Reactive AST Poster
    {
      slot: "4/5 Evening Developer Angle (06:30 PM)",
      angle: "Developer SDK & Open Standards",
      imageUrl: (dayNumber % 2 === 1) ? POSTERS.MASTER_AD4_BUILT_DIFFERENT : POSTERS.DAY4_AI_AST,
      linkedin: `Building document processing, RAG pipelines, or technical authoring tools? 🤖

Stop wrangling brittle PDF parsers and OCR hacks. The Living Document SDK (npm install ldoc-sdk) gives you a clean, typed JSON Abstract Syntax Tree (AST) with zero heuristic guessing.

• Microsecond JSON parsing speed
• 100% table and hierarchical schema fidelity
• Pre-chunked AST nodes ready for vector embeddings
• MIT / Apache 2.0 open standard

Install the SDK:
npm install ldoc-sdk

GitHub Repo:
👉 ${GITHUB_REPO_URL}

#JavaScript #TypeScript #AI #RAG #WebDev`,
      threads: `Building RAG or doc pipelines? 🤖

Stop burning GPU bills on brittle PDF OCR.
.ldocx provides clean JSON AST parsing in microseconds:

npm install ldoc-sdk

GitHub: ${GITHUB_REPO_URL}

#AI #WebDev #TypeScript #OpenSource`,
      instagram: `Building AI document pipelines or RAG search? 🤖📄

Stop burning GPU compute and wrangling brittle PDF parsers and OCR hacks.
The Living Document SDK gives you a clean, typed JSON Abstract Syntax Tree (AST) with zero heuristic guessing.

⚡ Microsecond JSON parsing speed
📐 100% table and hierarchical schema fidelity
🧩 Pre-chunked AST nodes ready for vector embeddings
📜 Open standard under MIT / Apache 2.0

Install now:
npm install ldoc-sdk

Explore the repository:
github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT

#artificialintelligence #rag #vectordatabase #machinelearning #typescript #javascript #npm #webdevelopment #codinglife #techstack`,
      discord: `🤖 **Attention AI & RAG Engineers: Stop wrangling brittle PDF OCR!**

The Living Document SDK (\`ldoc-sdk\`) provides microsecond JSON AST parsing with 100% schema fidelity:

• ⚡ Microsecond JSON AST parsing speed
• 📐 Perfect hierarchical table and heading structure
• 🧩 Pre-chunked nodes ready for vector embedding pipelines
• 📜 MIT / Apache 2.0 open standard

📦 **Install via NPM**: \`npm install ldoc-sdk\`
🌐 **Repo**: https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT`
    },

    // Post 5: Night Viral Curiosity (09:30 PM) - Zero-Install Web Creator
    // Attached: Holographic Glass Web Creator Studio Poster
    {
      slot: "5/5 Night Viral Curiosity (09:30 PM)",
      angle: "Zero-Install Instant Web Creator",
      imageUrl: (dayNumber % 3 === 1) ? POSTERS.MASTER_AD3_ZERO_LOGIN : ((dayNumber % 3 === 2) ? POSTERS.MASTER_AD5_PITCH_ALIVE : POSTERS.DAY3_CREATOR),
      linkedin: `No installation required. Try creating your very first Living Document (.ldocx) right in your browser:

👉 Open the Free Web Creator:
https://coderjay2003-svg.github.io/NEW-GEN-LIVING-DOCUMENT-FORMAT/creator.html

Experience what documents should feel like in 2026:
• Drag & drop 3D GLTF models
• Embed reactive data tables
• Generate cryptographic signatures on export
• 100% client-side privacy

Star the repo on GitHub if you believe static PDFs are dead:
⭐ ${GITHUB_REPO_URL}

#FutureOfTech #WebDevelopment #OpenSource #TechCommunity`,
      threads: `Try creating a Living Document right in your browser with zero installation: ✨

👉 ${LIVE_CREATOR_URL}

• Drag & drop 3D models
• Embed reactive tables
• Cryptographic SHA-256 export

Star on GitHub:
⭐ ${GITHUB_REPO_URL}

#WebDev #FutureOfTech #OpenSource`,
      instagram: `No installation required. Build your first 3D Living Document right in your browser! 🌐🚀

Try the Free Web Creator:
coderjay2003-svg.github.io/NEW-GEN-LIVING-DOCUMENT-FORMAT/creator.html

Experience next-generation documents:
✨ Drag & drop 3D GLTF models
📊 Embed dynamic tables & calculations
🔐 Export with cryptographic SHA-256 signatures
🛡️ 100% client-side privacy

Star the repo on GitHub:
github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT

#webdev #javascript #coding #frontend #webdesign #programming #opensource #futuretech #technews #buildinpublic`,
      discord: `🚀 **Zero-Install Instant Web Creator: Build your first Living Document now!**

Experience what documents should feel like in 2026 directly in your browser:
👉 **Try Web Creator**: https://coderjay2003-svg.github.io/NEW-GEN-LIVING-DOCUMENT-FORMAT/creator.html

✨ Drag & drop 3D GLTF models
📊 Embed reactive tables & live charts
🔐 Cryptographic SHA-256 export
🛡️ 100% Client-side privacy

⭐ **Star the repo on GitHub**: https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT`
    }
  ];
}

module.exports = {
  generateDaily5Posts,
  POSTERS,
  getDaySpecificPoster,
  GITHUB_REPO_URL,
  GITHUB_RELEASES_URL,
  LIVE_CREATOR_URL
};
