# LDOC Testing

## Test Summary

| Suite | Count | Result |
|-------|-------|--------|
| ldoc-core unit | 68 | ✅ PASS |
| ldoc-core phase1 integration | 61 | ✅ PASS |
| ldoc-runtime unit | 288 | ✅ PASS |
| ldoc-sdk unit | 7 | ✅ PASS |
| ldoc-sdk plugin integration | 18 | ✅ PASS |
| ldoc-sdk SDK integration | 20 | ✅ PASS |
| ldoc-sdk security/malformed | 25 | ✅ PASS |
| **TOTAL** | **487** | **✅ 0 FAILURES** |

## Run All Tests

```
cargo test --release
```

## Run by Crate

```
cargo test --release -p ldoc-core
cargo test --release -p ldoc-runtime
cargo test --release -p ldoc-sdk
```

## Run Specific Suite

```
cargo test --release -p ldoc-sdk --test security_tests
cargo test --release -p ldoc-sdk --test plugin_tests
cargo test --release -p ldoc-sdk --test sdk_tests
cargo test --release -p ldoc-core --test phase1_tests
```

## Test Categories

### Unit Tests

Located in `src/` files as `#[cfg(test)] mod tests`.

Cover:
- Header encode/decode
- Container read/write
- Manifest/metadata parsing
- Validation pipeline
- Runtime kernel lifecycle
- Page manager navigation
- State manager operations
- Event dispatcher routing
- Plugin lifecycle and permissions
- AI runtime caching and cost tracking
- VFS path validation
- Cache LRU eviction
- All 30+ content node types

### Phase 1 Integration Tests

`ldoc-core/tests/phase1/phase1_tests.rs` — 61 tests

Cover the full Phase 1 pipeline:
- Create document → pack → validate → inspect
- Magic bytes, header, ZIP structure
- Manifest, metadata, pages, assets
- Hash verification
- Feature flags
- Compression (stored vs deflated)

### SDK Integration Tests

`ldoc-sdk/tests/sdk_tests.rs` — 20 tests

Cover:
- LdocDocument load, validate, inspect
- LdocSession interactive operations
- LdocApi multi-document registry
- Error handling for invalid input

### Plugin Integration Tests

`ldoc-sdk/tests/plugin_tests.rs` — 18 tests

Cover:
- Plugin load/unload lifecycle
- Permission enforcement (declared vs undeclared)
- Capability checks (storage, document, ai, filesystem)
- Duplicate load rejection
- Invalid plugin type rejection
- Call after unload failure

### Security / Malformed Document Tests

`ldoc-sdk/tests/security_tests.rs` — 25 tests

Cover:
- Empty bytes rejected without panic
- Single byte rejected without panic
- Bad magic rejected without panic
- Truncated header rejected without panic
- All-zeros rejected without panic
- All-ones rejected without panic
- Random garbage rejected without panic
- Valid magic + invalid ZIP rejected without panic
- Tampered content detected (hash mismatch)
- Large garbage (1 MB) rejected without panic
- Repeated load (100×) — no memory leak
- Repeated validate (100×) — no panic
- API rejects all invalid inputs
- Session rejects all invalid inputs

## Performance Measurements

Measured on Windows x86_64 release build:

| Operation | Measured | Target |
|-----------|---------|--------|
| Document load | < 5ms | < 100ms ✅ |
| Validation pipeline | < 15ms | — |
| Page navigation | < 1ms | < 10ms ✅ |
| State get/set | < 0.1ms | < 1ms ✅ |
| Plugin load/unload | < 1ms | — |
| Baseline memory | ~8MB | < 50MB ✅ |

## Dependency Audit

```
cargo audit
```

Result: **0 vulnerabilities** in 145 dependencies.

## Deferred Tests

| Test Type | Reason |
|-----------|--------|
| E2E browser tests | PLATFORM LIMITATION — no browser in Rust test env |
| Fuzzing harness | OPTIONAL FUTURE FEATURE |
| Load / stress tests | OPTIONAL FUTURE FEATURE |
| External penetration tests | REQUIRES THIRD-PARTY |

## Note on Debug Build

The `target/debug/build` directory may have Windows file-locking issues if a previous build was interrupted. Use `cargo test --release` to avoid this. The release build and tests are fully functional.
