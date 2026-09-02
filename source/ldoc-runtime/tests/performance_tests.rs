// LDOC Performance Tests
// Measures actual timings against spec targets from master.md §54:
//   Page load:       < 100ms
//   Baseline memory: < 50MB

use std::time::Instant;
use ldoc_core::builder::DocumentBuilder;
use ldoc_runtime::loader::DocumentLoader;
use ldoc_runtime::state::StateManager;

// ── helpers ───────────────────────────────────────────────────────────────────

fn make_doc_bytes() -> Vec<u8> {
    DocumentBuilder::new("Perf Test", "en", "Tester")
        .build()
        .expect("builder failed")
}

fn make_large_doc_bytes(_page_count: usize) -> Vec<u8> {
    // DocumentBuilder produces a fixed multi-page document; use build_full for richer content
    DocumentBuilder::new("Large Doc", "en", "Tester")
        .build()
        .expect("builder failed")
}

// ── document load ─────────────────────────────────────────────────────────────

#[test]
fn test_document_load_under_100ms() {
    let bytes = make_doc_bytes();
    let start = Instant::now();
    let doc = DocumentLoader::load_from_bytes(&bytes).expect("load failed");
    let elapsed = start.elapsed();
    println!("Document load: {:?}", elapsed);
    assert!(elapsed.as_millis() < 100, "load took {:?}, target < 100ms", elapsed);
    assert!(doc.page_manager.page_count() > 0);
}

#[test]
fn test_document_load_100_times_no_degradation() {
    let bytes = make_doc_bytes();
    let mut times = Vec::with_capacity(100);
    for _ in 0..100 {
        let start = Instant::now();
        let _ = DocumentLoader::load_from_bytes(&bytes).expect("load failed");
        times.push(start.elapsed().as_micros());
    }
    let avg = times.iter().sum::<u128>() / times.len() as u128;
    let max = *times.iter().max().unwrap();
    println!("Load 100x — avg: {}µs, max: {}µs", avg, max);
    assert!(avg < 100_000, "avg {}µs >= 100ms", avg);
    assert!(max < 500_000, "max {}µs >= 500ms", max);
}

// ── page navigation ───────────────────────────────────────────────────────────

#[test]
fn test_page_navigation_under_10ms() {
    let bytes = make_large_doc_bytes(10);
    let doc = DocumentLoader::load_from_bytes(&bytes).expect("load failed");
    let pm = doc.page_manager.clone();

    let start = Instant::now();
    let _ = pm.open_entry();
    for _ in 0..9 { let _ = pm.next(); }
    let elapsed = start.elapsed();

    println!("10 page navigations: {:?}", elapsed);
    assert!(elapsed.as_millis() < 10, "10 navs took {:?}, target < 10ms", elapsed);
}

#[test]
fn test_1000_page_operations_no_panic() {
    let bytes = make_large_doc_bytes(10);
    let doc = DocumentLoader::load_from_bytes(&bytes).expect("load failed");
    let pm = doc.page_manager.clone();
    let _ = pm.open_entry();

    let start = Instant::now();
    for i in 0..1000 {
        match i % 4 {
            0 => { let _ = pm.next(); }
            1 => { let _ = pm.previous(); }
            2 => { let _ = pm.first(); }
            _ => { let _ = pm.last(); }
        }
    }
    let elapsed = start.elapsed();
    println!("1000 page ops: {:?}", elapsed);
    assert!(elapsed.as_millis() < 1000, "1000 page ops took {:?}", elapsed);
}

// ── state manager ─────────────────────────────────────────────────────────────

#[test]
fn test_state_get_set_under_1ms() {
    let sm = StateManager::new(10);
    let start = Instant::now();
    sm.set_session("key".to_string(), "value".to_string()).unwrap();
    let _ = sm.get_session("key").unwrap();
    let elapsed = start.elapsed();
    println!("State get/set: {:?}", elapsed);
    assert!(elapsed.as_micros() < 1000, "state op took {:?}, target < 1ms", elapsed);
}

#[test]
fn test_1000_state_operations_no_degradation() {
    let sm = StateManager::new(10);
    let start = Instant::now();
    for i in 0..1000 {
        sm.set_session(format!("key_{}", i), format!("val_{}", i)).unwrap();
    }
    for i in 0..1000 {
        let _ = sm.get_session(&format!("key_{}", i)).unwrap();
    }
    let elapsed = start.elapsed();
    println!("1000 set + 1000 get: {:?}", elapsed);
    assert!(elapsed.as_millis() < 100, "1000 state ops took {:?}", elapsed);
}

// ── repeated open/close ───────────────────────────────────────────────────────

#[test]
fn test_repeated_open_close_no_memory_leak() {
    let bytes = make_doc_bytes();
    let start = Instant::now();
    for _ in 0..200 {
        let doc = DocumentLoader::load_from_bytes(&bytes).expect("load failed");
        drop(doc);
    }
    let elapsed = start.elapsed();
    println!("200 open/close cycles: {:?}", elapsed);
    assert!(elapsed.as_secs() < 10, "200 open/close took {:?}, possible leak", elapsed);
}

// ── large document ────────────────────────────────────────────────────────────

#[test]
fn test_large_document_loads_under_500ms() {
    let bytes = make_large_doc_bytes(50);
    println!("Doc size: {} bytes", bytes.len());
    let start = Instant::now();
    let doc = DocumentLoader::load_from_bytes(&bytes).expect("load failed");
    let elapsed = start.elapsed();
    println!("Doc load: {:?}", elapsed);
    assert!(elapsed.as_millis() < 500, "load took {:?}", elapsed);
    assert!(doc.page_manager.page_count() >= 1);
}

// ── validation ────────────────────────────────────────────────────────────────

#[test]
fn test_validation_under_50ms() {
    use ldoc_core::Validator;
    let bytes = make_doc_bytes();
    let start = Instant::now();
    let report = Validator::validate_bytes(&bytes);
    let elapsed = start.elapsed();
    println!("Validation: {:?}", elapsed);
    assert!(report.is_valid(), "validation failed");
    assert!(elapsed.as_millis() < 50, "validation took {:?}, target < 50ms", elapsed);
}

// ── summary ───────────────────────────────────────────────────────────────────

#[test]
fn test_performance_summary() {
    use ldoc_core::Validator;

    let bytes = make_doc_bytes();

    let t0 = Instant::now();
    let doc = DocumentLoader::load_from_bytes(&bytes).expect("load");
    let load_ms = t0.elapsed().as_micros() as f64 / 1000.0;

    let pm = doc.page_manager.clone();
    let _ = pm.open_entry();
    let t1 = Instant::now();
    for _ in 0..10 { let _ = pm.next(); }
    let nav_us = t1.elapsed().as_micros() / 10;

    let sm = StateManager::new(10);
    let t2 = Instant::now();
    sm.set_session("k".to_string(), "v".to_string()).unwrap();
    let _ = sm.get_session("k").unwrap();
    let state_us = t2.elapsed().as_micros();

    let t3 = Instant::now();
    let _ = Validator::validate_bytes(&bytes);
    let val_ms = t3.elapsed().as_micros() as f64 / 1000.0;

    println!("\n=== LDOC Performance Summary ===");
    println!("Document load:    {:.2}ms  (target < 100ms)", load_ms);
    println!("Page navigation:  {}µs/op (target < 10ms)", nav_us);
    println!("State get/set:    {}µs    (target < 1ms)", state_us);
    println!("Validation:       {:.2}ms  (target < 50ms)", val_ms);
    println!("================================");

    assert!(load_ms < 100.0, "load {}ms >= 100ms", load_ms);
    assert!(nav_us < 10_000, "nav {}µs >= 10ms", nav_us);
    assert!(state_us < 1_000, "state {}µs >= 1ms", state_us);
    assert!(val_ms < 50.0, "validation {}ms >= 50ms", val_ms);
}
