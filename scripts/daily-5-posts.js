// scripts/daily-5-posts.js
// Generates 5 distinct high-impact daily posts for the Living Document (.ldocx) campaign
// Tailored for LinkedIn, Threads, Instagram, and Discord

const GITHUB_REPO_URL = "https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT";
const GITHUB_RELEASES_URL = "https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/tag/v2.5.0-free";
const LIVE_CREATOR_URL = "https://coderjay2003-svg.github.io/NEW-GEN-LIVING-DOCUMENT-FORMAT/creator.html";
const VIRAL_POSTER_URL = "https://raw.githubusercontent.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/main/public/ldoc-viral-poster.jpg";
const PROMO_BANNER_URL = "https://raw.githubusercontent.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/main/public/ldoc-promo-banner.jpg";

function generateDaily5Posts(campaign, devtoUrl) {
  const articleUrl = devtoUrl || `${GITHUB_REPO_URL}#readme`;

  return [
    // Post 1: Morning Hook (09:00 AM) - The Industry Problem & Comparison
    {
      slot: "1/5 Morning Hook (09:00 AM)",
      angle: "Problem Statement & Industry Flaws",
      imageUrl: VIRAL_POSTER_URL,
      linkedin: `🚨 Stop sending 1993 printer files in 2026.\n\n${campaign.theme}:\n❌ Legacy Flaws:\n${campaign.comparison.legacyFlaws.map(f => '• ' + f).join('\n')}\n\n⚡ .ldocx Superpowers:\n${campaign.comparison.ldocxSuperpowers.map(s => '• ' + s).join('\n')}\n\nRead the full showdown:\n👉 ${articleUrl}\n\n#TechNews #OpenSource #WebDev #Engineering #Productivity`,
      threads: `Stop sending 1993 printer files in 2026. 🚨\n\n${campaign.theme}:\n❌ Old: ${campaign.comparison.legacyFlaws[0]}\n⚡ .ldocx: ${campaign.comparison.ldocxSuperpowers[0]}\n\n100% Free & Open-Source.\n👉 ${GITHUB_RELEASES_URL}\n\n#TechNews #OpenSource #3D`,
      instagram: `🚨 Stop sending 1993 printer files in 2026.\n\nWhy are we still sharing static, lifeless PDFs when modern devices can render full 3D interactive applications?\n\n${campaign.theme}:\n\n❌ Legacy Flaws:\n${campaign.comparison.legacyFlaws.map(f => '• ' + f).join('\n')}\n\n⚡ .ldocx Superpowers:\n${campaign.comparison.ldocxSuperpowers.map(s => '• ' + s).join('\n')}\n\n🌐 100% Free & Open-Source:\ngithub.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT\n\n#webdev #softwaredeveloper #programming #coding #opensource #techrevolution #futureoftech #javascript #typescript #softwarearchitecture`,
      discord: `🚨 **Stop sending 1993 printer files in 2026!**\n\n**${campaign.theme}**\n\n❌ **Legacy Document Flaws:**\n${campaign.comparison.legacyFlaws.map(f => '• ' + f).join('\n')}\n\n⚡ **.ldocx Superpowers:**\n${campaign.comparison.ldocxSuperpowers.map(s => '• ' + s).join('\n')}\n\n📖 **Full Showcase & Comparison**: ${articleUrl}\n🌐 **Official Repo**: https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT\n📦 **Install SDK**: \`npm install ldoc-sdk\``
    },

    // Post 2: Mid-day Deep Dive (12:30 PM) - Technical Architecture & Features
    {
      slot: "2/5 Mid-Day Deep Dive (12:30 PM)",
      angle: "3D WebGL & Interactive Architecture",
      imageUrl: PROMO_BANNER_URL,
      linkedin: `Why are documents still 2D? The Living Document Format (.ldocx) integrates real-time Three.js 3D WebGL models, reactive spreadsheets, and live charts directly inside a self-contained container.\n\nKey Capabilities:\n• Embedded 60 FPS 3D CAD & molecular models\n• Reactive AST calculations that update in real-time\n• Under 4MB standalone native viewer (Windows, Linux, iOS)\n• 100% offline-first execution with zero cloud telemetry\n\nDownload free native suite:\n👉 ${GITHUB_RELEASES_URL}\n\n#ThreeJS #WebGL #SoftwareArchitecture #Productivity`,
      threads: `Why are documents still 2D? 🧊\n\nLiving Documents (.ldocx) embed real-time Three.js 3D models and reactive charts inside single self-contained files.\n\n• 60 FPS 3D CAD orbit & zoom\n• 100% Offline execution\n• < 4MB Native viewer (Win/Linux/iOS)\n\nDownload free: ${GITHUB_RELEASES_URL}\n\n#ThreeJS #WebGL #OpenSource`,
      instagram: `Why are documents still stuck in 2D? 🧊✨\n\nThe Living Document Format (.ldocx) integrates real-time Three.js 3D WebGL models, reactive spreadsheets, and live charts directly inside a single self-contained container.\n\nKey Superpowers:\n🕹️ Embedded 60 FPS 3D CAD & molecular models with full orbital rotation\n📊 Reactive AST calculations that recalculate in real-time\n⚡ Standalone native viewer under 4MB (Windows, Linux, iOS)\n🔒 100% offline-first execution with zero cloud telemetry\n\nExplore the project:\ngithub.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT\n\n#threejs #webgl #3dgraphics #softwareengineering #developerlife #frontend #javascript #opensource #programminglife #techinnovation`,
      discord: `🧊 **Why are documents still 2D? Living Document (.ldocx) Technical Deep-Dive**\n\nThe Living Document Format integrates real-time Three.js 3D WebGL models and reactive calculations inside self-contained containers!\n\n✨ **Architecture Highlights:**\n• 🕹️ Embedded 60 FPS 3D CAD orbit, zoom, and cross-section inspection\n• 📊 Reactive AST formulas that update dynamically\n• ⚡ Standalone native viewer under 4MB\n• 🔒 100% Offline execution with zero telemetry\n\n💾 **Download Free Suite**: ${GITHUB_RELEASES_URL}\n🌐 **GitHub Repo**: https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT`
    },

    // Post 3: Afternoon Security (03:30 PM) - Cryptographic Merkle Verification
    {
      slot: "3/5 Afternoon Security (03:30 PM)",
      angle: "Cryptographic Tamper Detection",
      imageUrl: VIRAL_POSTER_URL,
      linkedin: `Did you know anyone can unzip a Microsoft Word (.docx), edit sensitive legal numbers in the XML, re-zip it, and Word will open it without warning? ⚠️\n\nThe Living Document Format (.ldocx) solves document forgery with mathematical precision:\n🔒 Every paragraph, table, and asset is hashed in a SHA-256 Merkle tree.\n🚨 Instant tamper detection upon file opening.\n🛡️ Zero macro exploits or arbitrary script vulnerabilities.\n\nVerify documents in 3 lines of code:\nconst { LDOCXParser } = require('ldoc-sdk');\nconst doc = await LDOCXParser.parse(buffer);\nconsole.log(doc.verifyIntegrity() ? 'Authentic' : 'Tampered');\n\nOpen-Source on GitHub:\n👉 ${GITHUB_REPO_URL}\n\n#CyberSecurity #InfoSec #Cryptography #LegalTech`,
      threads: `Did you know anyone can unzip a Word doc, alter legal text, and Word never warns you? ⚠️\n\n.ldocx uses SHA-256 Merkle trees to verify every block.\nInstant tamper alarm upon opening.\n\nVerify with:\nnpm install ldoc-sdk\nRepo: ${GITHUB_REPO_URL}\n\n#CyberSecurity #InfoSec #OpenSource`,
      instagram: `Did you know anyone can unzip a Word document, edit sensitive contracts in the XML, re-zip it, and Word opens it without warning? ⚠️\n\nThe Living Document Format (.ldocx) solves document forgery with mathematical precision:\n🛡️ Every paragraph, table, and asset is hashed in a SHA-256 Merkle tree.\n🔍 Instant tamper detection upon opening.\n🚫 Zero macro exploits or arbitrary script vulnerabilities.\n\nVerify any document in 3 lines:\nconst { LDOCXParser } = require('ldoc-sdk');\nconst doc = await LDOCXParser.parse(buffer);\nconsole.log(doc.verifyIntegrity() ? 'Authentic' : 'Tampered');\n\n🌐 GitHub: github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT\n\n#cybersecurity #infosec #cryptography #dataprotection #securityfirst #coding #developer #legaltech #opensource #programming`,
      discord: `🛡️ **Document Tampering is Solved: SHA-256 Merkle Tree Verification**\n\nAnyone can unzip a \`.docx\`, alter legal terms in XML, and Word will open it without warning.\n\n**.ldocx changes everything:**\n• 🔐 Every paragraph, table, and asset is hashed into a SHA-256 Merkle tree.\n• 🚨 Instant tamper detection upon file load.\n• 🛡️ Zero macro exploits or arbitrary code execution risks.\n\n\`\`\`javascript\nconst { LDOCXParser } = require('ldoc-sdk');\nconst doc = await LDOCXParser.parse(buffer);\nconsole.log(doc.verifyIntegrity() ? 'Authentic' : 'Tampered');\n\`\`\`\n\n🌐 **GitHub**: https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT\n📦 **SDK**: \`npm install ldoc-sdk\``
    },

    // Post 4: Evening Developer Angle (06:30 PM) - SDK & Open Ecosystem
    {
      slot: "4/5 Evening Developer Angle (06:30 PM)",
      angle: "Developer SDK & Open Standards",
      imageUrl: PROMO_BANNER_URL,
      linkedin: `Building document processing, RAG pipelines, or technical authoring tools? 🤖\n\nStop wrangling brittle PDF parsers and OCR hacks. The Living Document SDK (npm install ldoc-sdk) gives you a clean, typed JSON Abstract Syntax Tree (AST) with zero heuristic guessing.\n\n• Microsecond JSON parsing speed\n• 100% table and hierarchical schema fidelity\n• Pre-chunked AST nodes ready for vector embeddings\n• MIT / Apache 2.0 open standard\n\nInstall the SDK:\nnpm install ldoc-sdk\n\nGitHub Repo:\n👉 ${GITHUB_REPO_URL}\n\n#JavaScript #TypeScript #AI #RAG #WebDev`,
      threads: `Building RAG or doc pipelines? 🤖\n\nStop burning GPU bills on brittle PDF OCR.\n.ldocx provides clean JSON AST parsing in microseconds:\n\nnpm install ldoc-sdk\n\nGitHub: ${GITHUB_REPO_URL}\n\n#AI #WebDev #TypeScript #OpenSource`,
      instagram: `Building AI document pipelines or RAG search? 🤖📄\n\nStop burning GPU compute and wrangling brittle PDF parsers and OCR hacks.\nThe Living Document SDK gives you a clean, typed JSON Abstract Syntax Tree (AST) with zero heuristic guessing.\n\n⚡ Microsecond JSON parsing speed\n📐 100% table and hierarchical schema fidelity\n🧩 Pre-chunked AST nodes ready for vector embeddings\n📜 Open standard under MIT / Apache 2.0\n\nInstall now:\nnpm install ldoc-sdk\n\nExplore the repository:\ngithub.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT\n\n#artificialintelligence #rag #vectordatabase #machinelearning #typescript #javascript #npm #webdevelopment #codinglife #techstack`,
      discord: `🤖 **Attention AI & RAG Engineers: Stop wrangling brittle PDF OCR!**\n\nThe Living Document SDK (\`ldoc-sdk\`) provides microsecond JSON AST parsing with 100% schema fidelity:\n\n• ⚡ Microsecond JSON AST parsing speed\n• 📐 Perfect hierarchical table and heading structure\n• 🧩 Pre-chunked nodes ready for vector embedding pipelines\n• 📜 MIT / Apache 2.0 open standard\n\n📦 **Install via NPM**: \`npm install ldoc-sdk\`\n🌐 **Repo**: https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT`
    },

    // Post 5: Night Viral Curiosity (09:30 PM) - Zero-Install Web Creator
    {
      slot: "5/5 Night Viral Curiosity (09:30 PM)",
      angle: "Zero-Install Instant Web Creator",
      imageUrl: VIRAL_POSTER_URL,
      linkedin: `No installation required. Try creating your very first Living Document (.ldocx) right in your browser:\n\n👉 Open the Free Web Creator:\nhttps://coderjay2003-svg.github.io/NEW-GEN-LIVING-DOCUMENT-FORMAT/creator.html\n\nExperience what documents should feel like in 2026:\n• Drag & drop 3D GLTF models\n• Embed reactive data tables\n• Generate cryptographic signatures on export\n• 100% client-side privacy\n\nStar the repo on GitHub if you believe static PDFs are dead:\n⭐ ${GITHUB_REPO_URL}\n\n#FutureOfTech #WebDevelopment #OpenSource #TechCommunity`,
      threads: `Try creating a Living Document right in your browser with zero installation: ✨\n\n👉 ${LIVE_CREATOR_URL}\n\n• Drag & drop 3D models\n• Embed reactive tables\n• Cryptographic SHA-256 export\n\nStar on GitHub:\n⭐ ${GITHUB_REPO_URL}\n\n#WebDev #FutureOfTech #OpenSource`,
      instagram: `No installation required. Build your first 3D Living Document right in your browser! 🌐🚀\n\nTry the Free Web Creator:\ncoderjay2003-svg.github.io/NEW-GEN-LIVING-DOCUMENT-FORMAT/creator.html\n\nExperience next-generation documents:\n✨ Drag & drop 3D GLTF models\n📊 Embed dynamic tables & calculations\n🔐 Export with cryptographic SHA-256 signatures\n🛡️ 100% client-side privacy\n\nStar the repo on GitHub:\ngithub.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT\n\n#webdev #javascript #coding #frontend #webdesign #programming #opensource #futuretech #technews #buildinpublic`,
      discord: `🚀 **Zero-Install Instant Web Creator: Build your first Living Document now!**\n\nExperience what documents should feel like in 2026 directly in your browser:\n👉 **Try Web Creator**: https://coderjay2003-svg.github.io/NEW-GEN-LIVING-DOCUMENT-FORMAT/creator.html\n\n✨ Drag & drop 3D GLTF models\n📊 Embed reactive tables & live charts\n🔐 Cryptographic SHA-256 export\n🛡️ 100% Client-side privacy\n\n⭐ **Star the repo on GitHub**: https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT`
    }
  ];
}

module.exports = {
  generateDaily5Posts,
  GITHUB_REPO_URL,
  GITHUB_RELEASES_URL,
  LIVE_CREATOR_URL,
  VIRAL_POSTER_URL,
  PROMO_BANNER_URL
};
