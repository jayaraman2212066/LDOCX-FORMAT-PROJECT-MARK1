# LDOC Security

## Security Model

LDOC follows a defence-in-depth model. Every layer validates its inputs independently.

## Implemented Controls

### Format-Level

| Control | Implementation | Status |
|---------|---------------|--------|
| Magic byte validation | `header::validate()` — rejects non-LDOC bytes | ✅ |
| Header CRC-32 | Bytes 0..12 verified against bytes 12..16 | ✅ |
| Version check | Unsupported versions rejected | ✅ |
| ZIP integrity | ZIP structure validated before any entry read | ✅ |
| Hash verification | SHA-256 hashes in `security/hashes.json` verified | ✅ |

### Runtime-Level

| Control | Implementation | Status |
|---------|---------------|--------|
| Path traversal | `VirtualFileSystem::validate_path()` blocks `..`, `/`, `\0`, `//` | ✅ |
| ZIP bomb protection | 64 MB per-entry decompressed size limit | ✅ |
| No eval() | Declared-action model only — no dynamic code execution | ✅ |
| No shell execution | No `std::process::Command` in document execution path | ✅ |
| No arbitrary filesystem | VFS only — no host filesystem access from documents | ✅ |
| No hardcoded credentials | All secrets via environment variables | ✅ |

### Plugin-Level

| Control | Implementation | Status |
|---------|---------------|--------|
| Capability declarations | Plugins must declare all capabilities in manifest | ✅ |
| Permission enforcement | Every call checked against declared + granted capabilities | ✅ |
| Trust levels | Untrusted / Sandboxed / Trusted / System | ✅ |
| Storage isolation | Per-plugin isolated key-value store | ✅ |
| IPC isolation | Named channels — no cross-plugin memory access | ✅ |

### AI-Level

| Control | Implementation | Status |
|---------|---------------|--------|
| No hardcoded API keys | Environment variables only | ✅ |
| Input size limits | Configurable max input tokens | ✅ |
| Output size limits | Configurable max output tokens | ✅ |
| Rate limiting | Configurable requests per minute | ✅ |
| Cost limits | Configurable max cost per session | ✅ |
| Timeouts | Configurable per-request timeout | ✅ |
| Response caching | Deterministic requests cached to reduce exposure | ✅ |

## Malformed Document Tests

25 security tests verify safe failure on malformed input:

| Test | Expected Behaviour |
|------|--------------------|
| Empty bytes | Rejected — no panic |
| Single byte | Rejected — no panic |
| Bad magic | Rejected — no panic |
| Truncated header | Rejected — no panic |
| All zeros | Rejected — no panic |
| All ones | Rejected — no panic |
| Random garbage | Rejected — no panic |
| Valid magic + invalid ZIP | Rejected — no panic |
| Tampered content | Hash mismatch detected |
| Large garbage (1 MB) | Rejected — no panic |
| Repeated load (100×) | No memory leak |
| Repeated validate (100×) | No panic |

All 25 tests pass.

## Dependency Audit

```
cargo audit
```

Result: **0 vulnerabilities** in 145 crate dependencies (last run: current session).

## Threat Model

See `docs/THREAT_MODEL.md` for full threat analysis covering:

- Malicious LDOC files
- Malicious plugins
- Malicious assets
- ZIP attacks
- Path traversal
- Resource exhaustion
- XSS / injection
- Sandbox escape
- AI prompt injection
- Credential leakage

## Deferred

| Item | Reason |
|------|--------|
| Real WASM sandbox (wasmtime) | REQUIRES THIRD-PARTY AUDIT before production |
| External penetration test | REQUIRES THIRD-PARTY AUDIT |
| External security audit | REQUIRES THIRD-PARTY AUDIT |
| Fuzzing harness (cargo-fuzz) | OPTIONAL FUTURE FEATURE |

## Important Distinction

```
Internal security validation:  PASS
External security audit:        NOT PERFORMED — REQUIRED before production deployment
```

Never claim an external audit occurred unless one actually occurred.
