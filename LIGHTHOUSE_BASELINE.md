# Lighthouse Baseline Report — LDOC Studio

**Audited URL:** https://ldoc-studios.vercel.app/  
**Fetch Time:** 2026-09-20T06:45:56.107Z  
**Lighthouse Version:** 13.4.1  
**Form Factor:** Desktop  
**Channel:** lr (Lightrider)  

---

## 1. Summary Scores

| Category | Score | Status |
| :--- | :---: | :--- |
| **Performance** | **53** / 100 | ⚠️ Needs Improvement (TBT / CLS) |
| **Accessibility** | **95** / 100 | 🟢 High |
| **Best Practices** | **96** / 100 | 🟢 High |
| **SEO** | **100** / 100 | 🏆 Perfect |
| **Agentic Browsing** | **1 / 2** | Informative |

---

## 2. Core Web Vitals & Performance Metrics

| Metric | Measured Value | Rating |
| :--- | :---: | :--- |
| **First Contentful Paint (FCP)** | 0.9 s | 🟢 Good |
| **Largest Contentful Paint (LCP)** | 1.1 s | 🟢 Good |
| **Speed Index** | 1.4 s | 🟡 Moderate |
| **Total Blocking Time (TBT)** | 930 ms | 🔴 Poor |
| **Cumulative Layout Shift (CLS)** | 0.305 | 🔴 Poor |
| **Interaction to Next Paint (INP)** | N/A | Informative |

---

## 3. Network & Resource Payloads

* **Total Transfer Size:** 705.3 KB (10 requests)
* **Image Payload:** 283.6 KB (2 requests)
* **Script Payload:** 278.8 KB (3 requests)
* **Font Payload:** 81.4 KB (2 requests)
* **Document Payload:** 59.7 KB (1 request)
* **Stylesheet Payload:** 1.8 KB (1 request)
* **Third-Party Payload:** 209.2 KB (5 requests)

---

## 4. Failing & Sub-Optimal Audits Identified

### Performance & Core Web Vitals
1. **Total Blocking Time (930 ms) & Long Tasks:**
   - 6 long tasks on the main thread (longest: 948 ms).
   - Total main-thread work: 3.7 s.
   - Script evaluation and parsing: 439 ms.
2. **Duplicated JavaScript (`duplicated-javascript-insight`):**
   - Three.js is loaded three times synchronously in `<head>`:
     - `/three.min.js`
     - `three.min.js`
     - `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`
3. **Cumulative Layout Shift (0.305):**
   - Hero video and embedded container shift.
   - Web font load swap shift.
4. **Image Delivery (`image-delivery-insight`):**
   - `/ldoc_logo.png`: 210.7 KB (497×502 px) displayed at 28×28 px (210.5 KB wasted).
   - `/video-poster.webp`: 71.9 KB (2560×1440 px) displayed at 593×333 px (68 KB wasted).

### Accessibility
1. **Heading Order (`heading-order` - Score: 0):**
   - Failing element: `div.container > div.footer-grid > div.footer-col > h5` (`<h5>Product</h5>`, `<h5>Specification</h5>`, etc.).
   - Skips `<h4>` level from `<h3>`.
2. **Video Captions (`video-caption`):**
   - Failing element: `video#hero-marketing-video`.
   - Missing `<track kind="captions">` element.

### Best Practices
1. **Origin Isolation (`origin-isolation`):**
   - Missing `Cross-Origin-Opener-Policy` (COOP) header.
