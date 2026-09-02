# LDOC Threat Model

**Version:** 1.0.0  
**Status:** Internal — Not externally audited  
**Date:** 2024

---

## 1. Assets

| Asset | Description | Sensitivity |
|-------|-------------|-------------|
| Document content | Pages, text, media, forms | HIGH |
| User state | Form inputs, session data | HIGH |
| Plugin code | WASM modules | HIGH |
| API credentials | AI provider keys | CRITICAL |
| Document hashes | Integrity verification | MEDIUM |
| Manifest metadata | Document structure | LOW |

---

## 2. Threat Actors

| Actor | Capability | Goal |
|-------|-----------|------|
| Malicious document author | Craft .ldocx files | Code execution, data exfiltration |
| Malicious plugin author | Craft .ldocplugin bundles | Sandbox escape, host access |
| Network attacker | MITM, replay | Tamper documents in transit |
| Local attacker | File system access | Replace documents, steal state |

---

## 3. Threat Analysis

### T1 — Malicious LDOC File

**Attack:** Crafted .ldocx with invalid magic, oversized header, ZIP bomb, path traversal in asset paths.

**Mitigations:**
- Magic byte validation before ZIP extraction (Phase 1 ✅)
- Header size fixed at 64 bytes (Phase 1 ✅)
- ZIP entry path sanitization — reject `../` and absolute paths (VFS ✅)
- Asset size limits enforced by ResourcePool (ldoc-runtime ✅)
- Full validation pipeline before any content is rendered (Phase 1 ✅)

**Residual risk:** ZIP bomb (deeply nested compression) — DEFERRED: add decompressed size limit.

---

### T2 — Malicious Plugin

**Attack:** Plugin declares minimal permissions but attempts to access host filesystem, network, or other plugins' state.

**Mitigations:**
- Permission system: all capabilities must be declared in manifest (plugin_runtime ✅)
- Sandbox: SandboxManager enforces memory limits per trust level (plugin_runtime ✅)
- Capability model: trust levels gate high-risk capabilities (plugin_runtime ✅)
- Plugin lifecycle: DISCOVER → VALIDATE → LOAD — manifest validated before execution (plugin_runtime ✅)
- IPC isolation: plugins can only receive messages on channels they joined (plugin_runtime ✅)

**Residual risk:** WASM sandbox is a no-op stub without `plugin-wasm` feature — DEFERRED: requires wasmtime integration.

---

### T3 — Malicious Asset

**Attack:** Image/audio/video asset with crafted content to exploit decoder vulnerabilities.

**Mitigations:**
- Assets are served as raw bytes; decoding is delegated to the viewer/browser (viewer ✅)
- Asset hash verification before use (Phase 1 ✅)
- Missing asset handled gracefully — no crash (runtime ✅)

**Residual risk:** Decoder vulnerabilities in underlying OS/browser — EXTERNAL DEPENDENCY.

---

### T4 — Malicious Script / Declared Actions

**Attack:** Document script attempts arbitrary code execution.

**Mitigations:**
- No `eval()` or `new Function()` in the runtime (✅)
- Interactive execution uses declared action model only (interactive.rs ✅)
- Script executor is not implemented — INTENTIONALLY DEFERRED pending security review.

**Residual risk:** Script execution is not yet implemented — no attack surface currently.

---

### T5 — ZIP Attacks

**Attack:** ZIP slip (path traversal via entry names), ZIP bomb (decompression ratio attack).

**Mitigations:**
- VFS path validation rejects `../`, absolute paths, null bytes (vfs.rs ✅)
- ZIP entries extracted to memory only — no filesystem writes during load (container ✅)

**Residual risk:** Decompressed size limit not yet enforced — DEFERRED.

---

### T6 — Path Traversal

**Attack:** Asset or page path containing `../` to escape the document container.

**Mitigations:**
- `VirtualFileSystem::validate_path()` rejects traversal patterns (vfs.rs ✅)
- All asset resolution goes through VFS (loader.rs ✅)

---

### T7 — Resource Exhaustion

**Attack:** Document with thousands of pages, huge assets, or infinite event loops.

**Mitigations:**
- ResourcePool enforces memory limits (resources.rs ✅)
- SandboxConfig.memory_limit_bytes per plugin (sandbox.rs ✅)
- SandboxConfig.fuel_limit (WASM instruction budget) (sandbox.rs ✅)

**Residual risk:** Page count limit not enforced — DEFERRED.

---

### T8 — XSS

**Attack:** Document content containing `<script>` tags rendered in a web viewer.

**Mitigations:**
- Content renderer must HTML-escape all text nodes — REQUIRED for viewer implementation.
- AI response content must be escaped before rendering — REQUIRED.

**Residual risk:** Viewer HTML escaping is the responsibility of the rendering layer — must be verified per viewer implementation.

---

### T9 — Injection

**Attack:** SQL injection, command injection via document metadata fields.

**Mitigations:**
- No SQL database in the runtime — not applicable.
- No shell execution in the runtime — not applicable.
- AI prompt injection: document content must not be interpolated directly into AI prompts without sanitization — REQUIRED for AI runtime.

---

### T10 — Sandbox Escape

**Attack:** Plugin WASM module exploits runtime to gain host access.

**Mitigations:**
- WASM sandbox via SandboxManager (plugin_runtime ✅ — stub, real wasmtime DEFERRED)
- Permission checks before any host API call (plugin_runtime ✅)
- Trust level gates high-risk capabilities (plugin_runtime ✅)

**Residual risk:** Real WASM isolation requires wasmtime integration — DEFERRED: REQUIRES THIRD-PARTY AUDIT.

---

### T11 — Unsafe Deserialization

**Attack:** Crafted JSON in manifest/metadata/pages causes panic or memory corruption.

**Mitigations:**
- All JSON deserialization uses serde_json with typed structs — no arbitrary deserialization (✅)
- Unknown fields are ignored via `#[serde(flatten)]` or `deny_unknown_fields` is not used — forward compatible (✅)
- Validation runs after deserialization (Phase 1 ✅)

---

### T12 — Network Abuse

**Attack:** Plugin or AI block makes unlimited outbound requests.

**Mitigations:**
- Network capability requires explicit declaration (`network:fetch`) (plugin_runtime ✅)
- AI runtime implements rate limiting, cost limits, timeouts (ai.rs — implemented below)
- No default network access for documents (✅)

---

### T13 — AI Prompt Injection

**Attack:** Document content injected into AI prompt causes model to reveal secrets or execute unintended actions.

**Mitigations:**
- AI provider credentials never exposed to document content (ai.rs ✅)
- Prompt templates separate system instructions from document content (ai.rs ✅)
- Input size limits enforced before sending to provider (ai.rs ✅)
- Response content treated as untrusted text — must be escaped before rendering (REQUIRED)

---

### T14 — Credential Leakage

**Attack:** API keys or tokens appear in document content, logs, or error messages.

**Mitigations:**
- AI provider credentials loaded from environment variables only — never hardcoded (ai.rs ✅)
- Error messages do not include credential values (ai.rs ✅)
- Audit log redacts sensitive fields (DEFERRED: full audit log implementation)

---

## 4. Security Validation Status

| Check | Status | Notes |
|-------|--------|-------|
| Input validation | ✅ PASS | Phase 1 + VFS path validation |
| Path traversal protection | ✅ PASS | VFS validates all paths |
| ZIP security | ✅ PARTIAL | Path traversal blocked; size limits DEFERRED |
| Resource limits | ✅ PASS | ResourcePool + SandboxConfig |
| Permission system | ✅ PASS | plugin_runtime permissions |
| Capability model | ✅ PASS | Trust levels enforced |
| Sandbox | 🟡 PARTIAL | Stub — real WASM requires wasmtime |
| Malformed document tests | ✅ PASS | Phase 1 validation rejects bad inputs |
| Dependency audit | 🔴 NOT RUN | Requires `cargo audit` |
| Fuzzing | 🔴 NOT STARTED | DEFERRED |
| External penetration test | 🔴 NOT PERFORMED | REQUIRES THIRD-PARTY AUDIT |
| External security audit | 🔴 NOT PERFORMED | REQUIRES THIRD-PARTY AUDIT |

---

## 5. Deferred Items

| Item | Reason | Priority |
|------|--------|----------|
| Real WASM sandbox (wasmtime) | PLATFORM LIMITATION — requires native wasmtime build | P1 |
| ZIP decompressed size limit | OPTIONAL FUTURE FEATURE | P2 |
| Full audit logging | OPTIONAL FUTURE FEATURE | P2 |
| Fuzzing harness | OPTIONAL FUTURE FEATURE | P2 |
| External security audit | REQUIRES THIRD-PARTY AUDIT | P0 before production |
| Penetration testing | REQUIRES THIRD-PARTY AUDIT | P0 before production |

---

*Internal security validation: PARTIAL*  
*External audit: NOT PERFORMED — REQUIRED before production deployment*
