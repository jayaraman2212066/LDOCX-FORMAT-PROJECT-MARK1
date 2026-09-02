# LDOC Known Limitations

This document honestly describes what is not yet implemented or not production-ready.

## Deferred Items

| Item | Status | Reason |
|------|--------|--------|
| JavaScript/TypeScript SDK | 🔴 NOT STARTED | PLATFORM LIMITATION — requires separate npm package |
| Python SDK | 🔴 NOT STARTED | PLATFORM LIMITATION — requires separate pyproject |
| WebSocket state_changed / page_changed events | 🟡 PARTIAL | Server broadcasts document_loaded and validation_completed; page/state events require session integration |
| Real WASM sandbox (wasmtime) | 🟡 PARTIAL | Pure-Rust permission enforcement in place; wasmtime isolation DEFERRED — REQUIRES THIRD-PARTY AUDIT |
| External security audit | 🔴 NOT PERFORMED | REQUIRES THIRD-PARTY AUDIT before production deployment |
| External penetration test | 🔴 NOT PERFORMED | REQUIRES THIRD-PARTY AUDIT before production deployment |
| E2E browser tests | 🔴 NOT STARTED | PLATFORM LIMITATION — no browser automation in Rust test environment |
| Fuzzing harness (cargo-fuzz) | 🔴 NOT STARTED | OPTIONAL FUTURE FEATURE |
| Load / stress tests | 🔴 NOT STARTED | OPTIONAL FUTURE FEATURE |
| Plugin marketplace | 🔴 NOT STARTED | OPTIONAL FUTURE FEATURE |
| Collaboration / real-time sync | 🔴 NOT STARTED | OPTIONAL FUTURE FEATURE — requires distributed infrastructure |
| Cloud sync | 🔴 NOT STARTED | OPTIONAL FUTURE FEATURE — requires cloud provider integration |
| 3D rendering | 🔴 NOT STARTED | OPTIONAL FUTURE FEATURE — requires 3D engine integration |
| ZIP decompressed size limit in core validator | 🟡 PARTIAL | Enforced in VirtualFileSystem (runtime); not yet in ldoc-core validator |
| Auto-update mechanism | 🔴 NOT STARTED | OPTIONAL FUTURE FEATURE |
| Package manager integration (brew, apt, winget) | 🔴 NOT STARTED | OPTIONAL FUTURE FEATURE |
| CDN distribution | 🔴 NOT STARTED | OPTIONAL FUTURE FEATURE |

## Feature Flag vs Runtime Support

The showcase document declares all 14 feature flags. Actual runtime support:

| Feature | Flag | Runtime Support |
|---------|------|----------------|
| Scripts | ✓ | Declared-action model only — no eval() |
| AI | ✓ | MockAiProvider implemented; real providers need API keys |
| Plugins | ✓ | Full lifecycle + permissions implemented |
| Encryption | ✓ | Metadata declared; decryption not implemented |
| Digital Signature | ✓ | Metadata declared; verification not implemented |
| Annotations | ✓ | Metadata declared; annotation UI not implemented |
| Collaboration | ✓ | Metadata declared; real-time sync not implemented |
| Cloud Sync | ✓ | Metadata declared; cloud provider not implemented |
| 3D | ✓ | Metadata declared; 3D renderer not implemented |
| Video | ✓ | Metadata declared; terminal viewer shows `[Video: src]` |
| Audio | ✓ | Metadata declared; terminal viewer shows `[Audio: src]` |
| Forms | ✓ | Full form state and interaction implemented |
| Version History | ✓ | Metadata declared; history UI not implemented |
| Readonly | ✗ | Not set in showcase; enforcement implemented in validator |

## Production Readiness

```
Phase 1 (Core Format):          PRODUCTION READY ✅
Runtime (P0):                   FUNCTIONALLY COMPLETE ✅
Viewer (P0):                    FUNCTIONALLY COMPLETE ✅
Interactive Execution (P0):     FUNCTIONALLY COMPLETE ✅
Editor (P1):                    FUNCTIONALLY COMPLETE ✅
SDK/API (P1):                   FUNCTIONALLY COMPLETE ✅
Plugins (P1):                   FUNCTIONALLY COMPLETE ✅
Security (P1):                  FUNCTIONALLY COMPLETE (internal) ✅
                                External audit: NOT PERFORMED ⚠️
AI (P1):                        FUNCTIONALLY COMPLETE (mock) ✅
                                Real provider: requires API key
Packaging (P2):                 PARTIAL ✅
Collaboration (P2):             NOT STARTED 🔴
Cloud Sync (P2):                NOT STARTED 🔴
3D (P2):                        NOT STARTED 🔴
```

**External security audit: NOT PERFORMED — REQUIRED before production deployment.**
