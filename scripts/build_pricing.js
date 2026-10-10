const fs = require('fs');
const path = require('path');

const content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LDOC Studio Editions &amp; Transparent Pricing — LDOC Studio</title>
  <meta name="description" content="Simple, transparent, local-first pricing for LDOC Studio Pro. Own the offline workstation suite for $19 lifetime, or explore free sandbox mode. Zero cloud lock-in.">
  <link rel="icon" type="image/png" href="/ldoc_logo.png">
  <link rel="shortcut icon" href="/app.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/design-system.css">
  <style>
    :root {
      --bg: #08090d;
      --bg-alt: #0c0e14;
      --bg-subtle: #121620;
      --card-bg: rgba(14, 17, 25, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover: rgba(255, 255, 255, 0.16);
      --primary: #f59e0b;
      --primary-light: #fbbf24;
      --primary-glow: rgba(245, 158, 11, 0.2);
      --cobalt: #3b82f6;
      --azure: #38bdf8;
      --cyan: #0ea5e9;
      --amber: #f59e0b;
      --emerald: #10b981;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --text-sub: #64748b;
      --font-main: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-display: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
      --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-main);
      line-height: 1.6;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    .ambient-bg {
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      pointer-events: none;
      z-index: 0;
      background: 
        radial-gradient(circle at 15% 20%, rgba(56, 189, 248, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 85% 60%, rgba(6, 182, 212, 0.06) 0%, transparent 45%),
        radial-gradient(circle at 50% 90%, rgba(245, 158, 11, 0.05) 0%, transparent 50%);
    }

    .page-wrap {
      position: relative;
      z-index: 1;
    }

    .container {
      max-width: 1240px;
      margin: 0 auto;
      padding: 0 24px;
    }

    /* Hero Section */
    .pricing-hero {
      padding: 72px 0 40px;
      text-align: center;
    }
    .hero-tag {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 14px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 99px;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #fbbf24;
      margin-bottom: 20px;
    }
    .pricing-hero-title {
      font-family: var(--font-display);
      font-size: clamp(2.4rem, 5vw, 3.8rem);
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.03em;
      color: #ffffff;
      max-width: 900px;
      margin: 0 auto 18px;
    }
    .pricing-hero-title span {
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #38bdf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .pricing-hero-sub {
      font-size: clamp(1rem, 1.8vw, 1.15rem);
      color: var(--text-muted);
      max-width: 700px;
      margin: 0 auto 36px;
      line-height: 1.6;
    }

    /* Billing Frequency Toggle */
    .pricing-billing-toggle-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 44px;
    }
    .pricing-billing-toggle {
      display: inline-flex;
      align-items: center;
      background: rgba(18, 22, 34, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 99px;
      padding: 4px;
      gap: 4px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }
    .pricing-toggle-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 600;
      padding: 8px 18px;
      border-radius: 99px;
      cursor: pointer;
      transition: all 0.2s var(--ease-spring);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .pricing-toggle-btn:hover {
      color: #ffffff;
    }
    .pricing-toggle-btn.active {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }
    .pricing-toggle-btn .save-badge {
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 99px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* 4-Tier Pricing Grid */
    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 64px;
      align-items: stretch;
    }
    .pricing-card {
      background: rgba(13, 17, 26, 0.8);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 32px 24px 26px;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: transform 0.25s var(--ease-spring), border-color 0.25s ease, box-shadow 0.25s ease;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .pricing-card:hover {
      transform: translateY(-4px);
      border-color: rgba(255, 255, 255, 0.2);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
    }
    .pricing-card.featured {
      background: linear-gradient(180deg, rgba(28, 24, 18, 0.9) 0%, rgba(13, 17, 26, 0.95) 100%);
      border: 1.5px solid #f59e0b;
      box-shadow: 0 0 35px rgba(245, 158, 11, 0.2), 0 16px 40px rgba(0, 0, 0, 0.6);
    }
    .pricing-card.featured-cloud {
      background: linear-gradient(180deg, rgba(16, 28, 45, 0.9) 0%, rgba(13, 17, 26, 0.95) 100%);
      border: 1.5px solid #38bdf8;
      box-shadow: 0 0 35px rgba(56, 189, 248, 0.2), 0 16px 40px rgba(0, 0, 0, 0.6);
    }
    .featured-badge {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(90deg, #f59e0b, #ea580c);
      color: #000;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 4px 14px;
      border-radius: 99px;
      white-space: nowrap;
      z-index: 10;
      box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);
    }
    .featured-badge.badge-cloud {
      background: linear-gradient(90deg, #38bdf8, #0ea5e9);
      color: #051626;
      box-shadow: 0 4px 14px rgba(56, 189, 248, 0.4);
    }
    .featured-badge.badge-enterprise {
      background: linear-gradient(90deg, #3b82f6, #6366f1);
      color: #fff;
      box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
    }

    .plan-name {
      font-family: var(--font-display);
      font-size: 1.3rem;
      font-weight: 800;
      color: #fff;
      margin-bottom: 6px;
      letter-spacing: -0.01em;
    }
    .plan-sub {
      font-size: 0.85rem;
      color: var(--text-muted);
      line-height: 1.45;
      min-height: 52px;
      margin-bottom: 16px;
    }
    .plan-price-wrap {
      min-height: 80px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      margin-bottom: 22px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .plan-price {
      display: flex;
      align-items: baseline;
      gap: 6px;
      flex-wrap: wrap;
    }
    .price-num {
      font-family: var(--font-display);
      font-size: 2.75rem;
      font-weight: 800;
      color: #ffffff;
      line-height: 1;
      letter-spacing: -0.03em;
    }
    .price-unit {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .price-billing-sub {
      font-size: 0.75rem;
      color: var(--text-sub);
      margin-top: 4px;
    }

    .card-features-zone {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
    }
    .plan-features {
      list-style: none;
      margin: 0 0 24px 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .plan-features li {
      font-size: 0.85rem;
      color: #cbd5e1;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      line-height: 1.35;
    }
    .plan-features li .chk-icon {
      flex-shrink: 0;
      margin-top: 2px;
      color: var(--emerald);
    }
    .card-cta-zone {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .btn-plan {
      width: 100%;
      padding: 12px 18px;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 700;
      text-align: center;
      text-decoration: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: 1px solid transparent;
      transition: all 0.2s var(--ease-spring);
    }
    .btn-plan:active {
      transform: scale(0.985);
    }
    .btn-plan-primary {
      background: linear-gradient(135deg, #f59e0b, #ea580c);
      color: #08090d;
      font-weight: 800;
      box-shadow: 0 4px 18px rgba(245, 158, 11, 0.35);
    }
    .btn-plan-primary:hover {
      filter: brightness(1.1);
      box-shadow: 0 6px 24px rgba(245, 158, 11, 0.5);
    }
    .btn-plan-cloud {
      background: linear-gradient(135deg, #38bdf8, #0ea5e9);
      color: #061524;
      font-weight: 800;
      box-shadow: 0 4px 18px rgba(56, 189, 248, 0.35);
    }
    .btn-plan-cloud:hover {
      filter: brightness(1.1);
      box-shadow: 0 6px 24px rgba(56, 189, 248, 0.5);
    }
    .btn-plan-enterprise {
      background: linear-gradient(135deg, #3b82f6, #4f46e5);
      color: #fff;
      font-weight: 800;
      box-shadow: 0 4px 18px rgba(59, 130, 246, 0.35);
    }
    .btn-plan-enterprise:hover {
      filter: brightness(1.1);
      box-shadow: 0 6px 24px rgba(59, 130, 246, 0.5);
    }
    .btn-plan-secondary {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.14);
      color: #f1f5f9;
    }
    .btn-plan-secondary:hover {
      background: rgba(255, 255, 255, 0.14);
      color: #ffffff;
    }
    .btn-plan-sublink {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 500;
      padding: 6px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: color 0.15s;
    }
    .btn-plan-sublink:hover {
      color: var(--text);
    }

    /* Trust & Security 4-Card Band */
    .trust-band {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 72px;
    }
    .trust-card {
      background: rgba(14, 18, 27, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 14px;
      padding: 20px 18px;
      display: flex;
      gap: 14px;
      align-items: flex-start;
    }
    .trust-card-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: #fbbf24;
    }
    .trust-card-title {
      font-family: var(--font-display);
      font-size: 13.5px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 3px;
    }
    .trust-card-desc {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.4;
    }

    /* Section Headings */
    .section-head {
      text-align: center;
      margin-bottom: 36px;
    }
    .section-tag {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
      display: inline-block;
    }
    .section-title {
      font-family: var(--font-display);
      font-size: clamp(1.8rem, 3.5vw, 2.5rem);
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #ffffff;
      margin-bottom: 10px;
    }
    .section-sub {
      font-size: 1rem;
      color: var(--text-muted);
      max-width: 640px;
      margin: 0 auto;
    }

    /* Comparison Matrix */
    .matrix-section {
      margin-bottom: 80px;
    }
    .matrix-filter-bar {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .matrix-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-muted);
      padding: 7px 16px;
      border-radius: 99px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s var(--ease-spring);
    }
    .matrix-pill:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }
    .matrix-pill.active {
      background: rgba(56, 189, 248, 0.15);
      border-color: #38bdf8;
      color: #38bdf8;
    }
    .matrix-table-wrap {
      overflow-x: auto;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      background: rgba(12, 16, 25, 0.85);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
    }
    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13.5px;
    }
    .matrix-table th, .matrix-table td {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .matrix-table th {
      background: rgba(18, 23, 36, 0.95);
      font-family: var(--font-display);
      font-size: 13px;
      font-weight: 700;
      color: #cbd5e1;
      letter-spacing: 0.02em;
    }
    .matrix-table th.col-ldocx {
      background: rgba(245, 158, 11, 0.12);
      color: #fbbf24;
      border-left: 1px solid rgba(245, 158, 11, 0.25);
      border-right: 1px solid rgba(245, 158, 11, 0.25);
    }
    .matrix-table td.col-ldocx {
      background: rgba(245, 158, 11, 0.04);
      color: #ffffff;
      font-weight: 600;
      border-left: 1px solid rgba(245, 158, 11, 0.18);
      border-right: 1px solid rgba(245, 158, 11, 0.18);
    }
    .matrix-check {
      color: #34d399;
      font-weight: 800;
      margin-right: 6px;
    }
    .matrix-cross {
      color: #f87171;
      font-weight: 800;
      margin-right: 6px;
    }

    /* License Key Stepper Station */
    .license-station {
      background: linear-gradient(180deg, rgba(18, 23, 36, 0.9) 0%, rgba(11, 14, 22, 0.95) 100%);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 20px;
      padding: 36px 32px;
      margin-bottom: 80px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
    }
    .stepper-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin: 28px 0 32px;
    }
    .step-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 20px;
      position: relative;
    }
    .step-number {
      font-family: var(--font-display);
      font-size: 12px;
      font-weight: 800;
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      padding: 2px 8px;
      border-radius: 6px;
      display: inline-block;
      margin-bottom: 12px;
    }
    .step-title {
      font-family: var(--font-display);
      font-size: 15px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 6px;
    }
    .step-desc {
      font-size: 12.5px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    /* Multi-Platform Pro Download Suite */
    .download-suite-section {
      margin-bottom: 80px;
    }
    .download-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 18px;
      margin-top: 24px;
    }
    .download-card {
      background: rgba(14, 18, 27, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 24px 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.25s var(--ease-spring);
    }
    .download-card:hover {
      border-color: rgba(255, 255, 255, 0.22);
      transform: translateY(-3px);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
    }
    .download-card.featured {
      border-color: rgba(56, 189, 248, 0.4);
      background: linear-gradient(180deg, rgba(16, 26, 42, 0.85) 0%, rgba(14, 18, 27, 0.95) 100%);
    }
    .download-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .download-platform-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .download-title span {
      display: block;
      font-family: var(--font-display);
      font-size: 15px;
      font-weight: 700;
      color: #ffffff;
    }
    .download-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      display: inline-block;
      margin-top: 3px;
    }
    .badge-win { background: rgba(0, 120, 212, 0.2); color: #60a5fa; border: 1px solid rgba(0, 120, 212, 0.4); }
    .badge-linux { background: rgba(234, 179, 8, 0.2); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.4); }
    .badge-ios { background: rgba(241, 245, 249, 0.15); color: #e2e8f0; border: 1px solid rgba(255, 255, 255, 0.25); }
    .badge-android { background: rgba(61, 220, 132, 0.2); color: #4ade80; border: 1px solid rgba(61, 220, 132, 0.4); }

    .download-features-list {
      list-style: none;
      margin: 0 0 20px 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .download-features-list li {
      font-size: 12px;
      color: #94a3b8;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      line-height: 1.4;
    }
    .download-features-list li span {
      color: #34d399;
      font-weight: 700;
      flex-shrink: 0;
    }
    .btn-download-action {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.14);
      color: #ffffff;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 600;
      text-decoration: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.18s ease;
    }
    .btn-download-action:hover {
      background: rgba(255, 255, 255, 0.14);
      border-color: rgba(255, 255, 255, 0.25);
    }
    .btn-download-action.featured-dl {
      background: linear-gradient(135deg, #0284c7, #2563eb);
      border-color: transparent;
      color: #ffffff;
      font-weight: 700;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
    }
    .btn-download-action.featured-dl:hover {
      filter: brightness(1.1);
    }

    /* FAQ Section */
    .faq-section {
      margin-bottom: 80px;
    }
    .faq-container {
      max-width: 900px;
      margin: 0 auto;
    }
    .faq-search-wrapper {
      position: relative;
      margin-bottom: 24px;
    }
    .faq-search-icon {
      position: absolute;
      left: 18px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 15px;
      pointer-events: none;
    }
    .faq-search-input {
      width: 100%;
      padding: 14px 44px 14px 48px;
      background: rgba(18, 24, 38, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 99px;
      color: #f8fafc;
      font-size: 0.95rem;
      outline: none;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .faq-search-input:focus {
      border-color: #f59e0b;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
    }
    .faq-clear-btn {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 50%;
      color: #cbd5e1;
      width: 24px;
      height: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
    }
    .faq-filter-pills {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
      margin-bottom: 32px;
    }
    .faq-pill {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: 99px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.18s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .faq-pill:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }
    .faq-pill.active {
      background: rgba(245, 158, 11, 0.15);
      border-color: #f59e0b;
      color: #fbbf24;
    }
    .pill-count {
      background: rgba(255, 255, 255, 0.1);
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 10px;
    }
    .faq-item {
      background: rgba(14, 18, 28, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      margin-bottom: 12px;
      overflow: hidden;
      transition: border-color 0.2s ease;
    }
    .faq-item:hover {
      border-color: rgba(255, 255, 255, 0.18);
    }
    .faq-item.active {
      border-color: rgba(245, 158, 11, 0.4);
      background: rgba(18, 24, 38, 0.85);
    }
    .faq-question {
      width: 100%;
      text-align: left;
      background: none;
      border: none;
      padding: 18px 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      cursor: pointer;
      color: #f8fafc;
      font-family: var(--font-display);
      font-size: 1rem;
      font-weight: 700;
      outline: none;
    }
    .faq-q-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }
    .faq-cat-badge {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 2px 7px;
      border-radius: 4px;
      white-space: nowrap;
    }
    .badge-showcase { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
    .badge-zerodrift { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-security { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .badge-ai { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
    .badge-ownership { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }

    .faq-chevron {
      color: #94a3b8;
      transition: transform 0.25s var(--ease-spring);
      flex-shrink: 0;
    }
    .faq-item.active .faq-chevron {
      transform: rotate(180deg);
      color: #f59e0b;
    }
    .faq-answer {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .faq-item.active .faq-answer {
      max-height: 500px;
    }
    .faq-answer-inner {
      padding: 0 22px 20px;
      color: #cbd5e1;
      font-size: 0.92rem;
      line-height: 1.65;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      margin-top: 4px;
      padding-top: 14px;
    }
    .faq-answer-inner code {
      background: rgba(255, 255, 255, 0.08);
      color: #38bdf8;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 0.88em;
      font-family: var(--font-mono);
    }

    /* Contextual Call to Action */
    .pricing-cta-card {
      background: linear-gradient(135deg, rgba(24, 30, 48, 0.85) 0%, rgba(12, 16, 26, 0.95) 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 48px 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 32px;
      margin-bottom: 80px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
    }
    .cta-content-title {
      font-family: var(--font-display);
      font-size: 1.8rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    .cta-content-desc {
      font-size: 0.95rem;
      color: var(--text-muted);
      max-width: 620px;
    }

    /* Responsive */
    @media (max-width: 1080px) {
      .pricing-grid { grid-template-columns: repeat(2, 1fr); }
      .trust-band { grid-template-columns: repeat(2, 1fr); }
      .download-grid { grid-template-columns: repeat(2, 1fr); }
      .stepper-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 720px) {
      .pricing-grid { grid-template-columns: 1fr; }
      .trust-band { grid-template-columns: 1fr; }
      .download-grid { grid-template-columns: 1fr; }
      .pricing-cta-card { flex-direction: column; text-align: center; }
      .faq-q-left { flex-direction: column; align-items: flex-start; gap: 6px; }
    }
  </style>
</head>
<body>
  <div class="ambient-bg"></div>

  <div class="page-wrap">
    <!-- Top Dismissible Pill Banner -->
    <div class="ldoc-pill-banner" id="ldoc-pill-banner">
      <span class="ldoc-pill-tag">SPEC v2.5.0</span>
      <span>Living Document Format (.ldocx) open architecture released.</span>
      <a href="/format">Explore Open Spec &rarr;</a>
      <button class="ldoc-pill-close" onclick="dismissPillBanner()" aria-label="Dismiss banner">&times;</button>
    </div>

    <!-- Sticky Glass Navbar -->
    <nav class="ldoc-navbar" id="ldoc-navbar">
      <div class="ldoc-navbar-inner">
        <div class="ldoc-nav-left">
          <a href="/" class="ldoc-nav-logo">
            <img src="/ldoc_logo.png" alt="LDOC Studio Logo" width="28" height="28" />
            <span>LDOC STUDIO</span>
            <span class="ldoc-nav-badge">.ldocx</span>
          </a>
          <div class="ldoc-nav-links">
            <a href="/format" class="ldoc-nav-link">Format</a>
            <a href="/features" class="ldoc-nav-link">Features</a>
            <a href="/live-studio" class="ldoc-nav-link">Live Studio</a>
            <a href="/models" class="ldoc-nav-link">Models Hub</a>
            <a href="/pricing" class="ldoc-nav-link active">Pricing</a>
            <a href="/docs" class="ldoc-nav-link">Docs</a>
            <a href="/changelog" class="ldoc-nav-link">Changelog</a>
          </div>
        </div>
        <div class="ldoc-nav-right">
          <button class="ldoc-nav-search-btn" onclick="openCmdPalette()" title="Command Palette (Ctrl+K)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <span>Search...</span>
            <kbd class="ldoc-kbd">Ctrl K</kbd>
          </button>
          <button class="ldoc-theme-btn" id="theme-toggle-btn" onclick="toggleTheme()" aria-label="Toggle light/dark theme" title="Toggle theme">
            <svg class="sun-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg class="moon-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
          <button class="ldoc-btn ldoc-btn-ghost" style="padding: 6px 12px; font-size: 0.8rem;" id="header-auth-btn" onclick="showAuthModal()">Sign In</button>
          <a href="/live-studio" class="ldoc-btn ldoc-btn-primary" style="padding: 7px 14px; font-size: 0.82rem;">Launch Studio &rarr;</a>
          <button class="ldoc-hamburger" id="ldoc-hamburger" onclick="toggleMobileMenu()" aria-label="Open mobile navigation">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
      </div>
    </nav>

    <!-- Mobile Drawer -->
    <div class="ldoc-mobile-drawer" id="ldoc-mobile-drawer">
      <div class="ldoc-drawer-links">
        <a href="/format" class="ldoc-drawer-link">Format Spec</a>
        <a href="/features" class="ldoc-drawer-link">Features</a>
        <a href="/live-studio" class="ldoc-drawer-link">Live Studio IDE</a>
        <a href="/models" class="ldoc-drawer-link">Models Hub</a>
        <a href="/pricing" class="ldoc-drawer-link active">Pricing</a>
        <a href="/docs" class="ldoc-drawer-link">Documentation</a>
        <a href="/changelog" class="ldoc-drawer-link">Changelog</a>
      </div>
      <div class="ldoc-drawer-actions">
        <a href="/live-studio" class="ldoc-btn ldoc-btn-primary" style="width:100%; justify-content:center;">Launch Studio</a>
        <button class="ldoc-btn ldoc-btn-secondary" style="width:100%; justify-content:center;" onclick="showAuthModal()">Sign In</button>
      </div>
    </div>

    <!-- MAIN CONTENT -->
    <main id="main-content">
      <!-- HERO -->
      <section class="pricing-hero">
        <div class="container">
          <div class="hero-tag">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>Local-First • Zero Telemetry</span>
          </div>
          <h1 class="pricing-hero-title">
            Simple, Transparent Pricing. <span>No Cloud Hostage.</span>
          </h1>
          <p class="pricing-hero-sub">
            Own the standalone offline workstation suite for $19 lifetime, or deploy an enterprise organization cluster. Zero recurring fees for Studio Pro, free open SDK forever.
          </p>

          <!-- Frequency Toggle -->
          <div class="pricing-billing-toggle-wrap">
            <div class="pricing-billing-toggle" role="group" aria-label="Billing frequency">
              <button type="button" class="pricing-toggle-btn" data-cycle="monthly" onclick="setBillingCycle('monthly')">
                <span>Monthly</span>
              </button>
              <button type="button" class="pricing-toggle-btn active" data-cycle="annually" onclick="setBillingCycle('annually')">
                <span>Annually</span>
                <span class="save-badge">Save 20%</span>
              </button>
              <button type="button" class="pricing-toggle-btn" data-cycle="lifetime" onclick="setBillingCycle('lifetime')">
                <span>Lifetime Access</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 4-TIER PRICING GRID -->
      <section id="pricing" class="container">
        <div class="pricing-grid">
          <!-- 1. Community (Free $0) -->
          <div class="pricing-card" id="card-tier-community">
            <div class="card-header-zone">
              <h3 class="plan-name">Community</h3>
              <p class="plan-sub">Free living document viewer &amp; basic editor for researchers, students &amp; readers.</p>
              <div class="plan-price-wrap">
                <div class="plan-price">
                  <span class="price-num">$0</span>
                  <span class="price-unit">/ forever</span>
                </div>
                <div class="price-billing-sub">Free open-source specification</div>
              </div>
            </div>
            <div class="card-features-zone">
              <ul class="plan-features">
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Full Open .ldocx Core SDK &amp; CLI</span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Web &amp; Desktop Offline Viewer</span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Live Studio Browser Sandbox</span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Interactive Formulas &amp; Reactive Math</span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Markdown, Text &amp; Standard PDF Export</span>
                </li>
              </ul>
            </div>
            <div class="card-cta-zone">
              <a href="/live-studio" class="btn-plan btn-plan-secondary">Launch Free Viewer</a>
              <a href="/format" class="btn-plan-sublink">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                <span>Explore Open Spec &amp; AST</span>
              </a>
            </div>
          </div>

          <!-- 2. Studio Pro Suite ($19 Lifetime) -->
          <div class="pricing-card featured" id="card-tier-pro">
            <div class="featured-badge">MOST POPULAR • LIFETIME ACCESS</div>
            <div class="card-header-zone">
              <h3 class="plan-name">Studio Pro Suite</h3>
              <p class="plan-sub">Air-gapped desktop workstation for Windows, Linux, Android &amp; macOS.</p>
              <div class="plan-price-wrap">
                <div class="plan-price">
                  <span class="price-num">$19</span>
                  <span class="price-unit">/ lifetime license</span>
                </div>
                <div class="price-billing-sub">One-time payment • Zero subscriptions</div>
              </div>
            </div>
            <div class="card-features-zone">
              <ul class="plan-features">
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Everything in Community</strong></span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>100% Air-Gapped Workstation</strong> <small style="color:#94a3b8">(Win, Linux, Android, macOS)</small></span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Discrete GPU Hardware Engine</strong> <small style="color:#94a3b8">(Unbounded VRAM, 120Hz)</small></span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Direct OS File I/O</strong> <small style="color:#94a3b8">(Unlimited document size)</small></span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Lossless Universal Converters</strong> <small style="color:#94a3b8">(DOCX, PDF, 3D CAD)</small></span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Vector-Crisp PDF Flattener</strong> &amp; Print Engine</span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Merkle SHA-256 &amp; Ed25519</strong> Cryptographic Signing</span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Commercial Rights</strong> &amp; Lifetime Updates</span>
                </li>
              </ul>
            </div>
            <div class="card-cta-zone">
              <a href="https://jay-app.lemonsqueezy.com/checkout/buy/16851c1c-6dfb-4607-bf8b-81c3427594d1" target="_blank" class="lemonsqueezy-button btn-plan btn-plan-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>Buy Pro License ($19) &rarr;</span>
              </a>
              <a href="#download" class="btn-plan-sublink">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Download Workstation Suite</span>
              </a>
            </div>
          </div>

          <!-- 3. LDOC Cloud Workspace ($79/year) -->
          <div class="pricing-card" id="card-tier-cloud">
            <div class="featured-badge badge-cloud">CLOUD COLLABORATION • AI COPILOT</div>
            <div class="card-header-zone">
              <h3 class="plan-name">Cloud Workspace</h3>
              <p class="plan-sub">Multi-device cloud sync, real-time team collaboration &amp; AI Document Copilot.</p>
              <div class="plan-price-wrap">
                <div class="plan-price">
                  <span class="price-num" id="price-val-cloud">$6.50</span>
                  <span class="price-unit" id="price-unit-cloud">/ month</span>
                </div>
                <div class="price-billing-sub" id="price-sub-cloud">Billed annually ($79/year — Save 20%)</div>
              </div>
            </div>
            <div class="card-features-zone">
              <ul class="plan-features">
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Multi-Device Cloud Sync</strong> <small style="color:#94a3b8">(Desktop, Mobile &amp; Web)</small></span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Real-Time Multiplayer Co-Authoring</strong> <small style="color:#94a3b8">(Live cursors)</small></span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>AI Living Document Copilot</strong> <small style="color:#94a3b8">(Text, 3D &amp; data charts)</small></span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>100 GB Encrypted Cloud Vault</strong> <small style="color:#94a3b8">(Zero-knowledge)</small></span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Infinite Revision Rollback</strong> &amp; Cloud Backups</span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Interactive Web Sharing</strong> &amp; Password Links</span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Priority Cloud Rendering</strong> &amp; WebGL Relay</span>
                </li>
              </ul>
            </div>
            <div class="card-cta-zone">
              <a href="https://jay-app.lemonsqueezy.com/checkout" target="_blank" class="lemonsqueezy-button btn-plan btn-plan-cloud">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <span>Start Cloud Pro &rarr;</span>
              </a>
              <a href="/live-studio" class="btn-plan-sublink">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
                <span>Launch Web Cloud Sandbox</span>
              </a>
            </div>
          </div>

          <!-- 4. Enterprise Fleet ($499/year) -->
          <div class="pricing-card" id="card-tier-enterprise">
            <div class="featured-badge badge-enterprise">ORGANIZATION FLEET • CUSTOM SLA</div>
            <div class="card-header-zone">
              <h3 class="plan-name">Enterprise Fleet</h3>
              <p class="plan-sub">For engineering, defense, healthcare &amp; institutions with strict compliance needs.</p>
              <div class="plan-price-wrap">
                <div class="plan-price">
                  <span class="price-num" id="price-val-enterprise">$499</span>
                  <span class="price-unit" id="price-unit-enterprise">/ year</span>
                </div>
                <div class="price-billing-sub" id="price-sub-enterprise">Complete organization fleet licensing</div>
              </div>
            </div>
            <div class="card-features-zone">
              <ul class="plan-features">
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Everything in Studio Pro &amp; Cloud</strong> <small style="color:#94a3b8">(Unlimited Seats)</small></span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Silent Fleet Deployment</strong> <small style="color:#94a3b8">(.msi, Intune &amp; RPM/Debian)</small></span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Custom Enterprise AST Schemas</strong> &amp; 3D Plugins</span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>HSM &amp; Corporate Root Key Signing</strong></span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Self-Hosted Sync Relay Option</strong> &amp; Zero-Egress</span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Headless CI/CD Batch CLI Flattener</strong></span>
                </li>
                <li>
                  <svg class="chk-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Dedicated Solutions Architect</strong> &amp; 99.9% SLA</span>
                </li>
              </ul>
            </div>
            <div class="card-cta-zone">
              <button type="button" onclick="openLeadModal('Enterprise')" class="btn-plan btn-plan-enterprise">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M9 8h1"/><path d="M9 12h1"/><path d="M9 16h1"/><path d="M14 8h1"/><path d="M14 12h1"/><path d="M14 16h1"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>
                <span>Contact Enterprise Fleet &rarr;</span>
              </button>
              <a href="mailto:jayaramankalidasan@gmail.com?subject=LDOC%20Enterprise%20Fleet%20Inquiry" class="btn-plan-sublink">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                <span>Invoice Billing &amp; Custom SLA</span>
              </a>
            </div>
          </div>
        </div>

        <!-- TRUST & SECURITY 4-CARD BAND -->
        <div class="trust-band">
          <div class="trust-card">
            <div class="trust-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <div class="trust-card-title">100% Air-Gapped Operation</div>
              <div class="trust-card-desc">Zero telemetry, zero forced cloud accounts. Runs fully disconnected on bare metal.</div>
            </div>
          </div>
          <div class="trust-card">
            <div class="trust-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <div>
              <div class="trust-card-title">Discrete GPU Acceleration</div>
              <div class="trust-card-desc">Fluid 120Hz 3D WebGL scenes with unbounded local VRAM and zero frame drop.</div>
            </div>
          </div>
          <div class="trust-card">
            <div class="trust-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <div>
              <div class="trust-card-title">Merkle SHA-256 Provenance</div>
              <div class="trust-card-desc">Every paragraph and 3D asset is cryptographically sealed with Ed25519 signatures.</div>
            </div>
          </div>
          <div class="trust-card">
            <div class="trust-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg>
            </div>
            <div>
              <div class="trust-card-title">14-Day Risk-Free Guarantee</div>
              <div class="trust-card-desc">Evaluate the full Pro Suite with confidence. Full refund upon request if not satisfied.</div>
            </div>
          </div>
        </div>
      </section>

      <!-- FORMAT BENCHMARK COMPARISON MATRIX -->
      <section class="container matrix-section">
        <div class="section-head">
          <span class="section-tag" style="color: #38bdf8;">Technical Audit</span>
          <h2 class="section-title">Why .ldocx Replaces Static Documents Forever</h2>
          <p class="section-sub">A side-by-side architectural comparison of Living Documents (.ldocx) against legacy paper formats.</p>
        </div>

        <div class="matrix-filter-bar">
          <button type="button" class="matrix-pill active" onclick="filterMatrixRows('all')">All Capabilities (8)</button>
          <button type="button" class="matrix-pill" onclick="filterMatrixRows('interactivity')">Interactivity &amp; 3D (3)</button>
          <button type="button" class="matrix-pill" onclick="filterMatrixRows('security')">Security &amp; Air-Gap (3)</button>
          <button type="button" class="matrix-pill" onclick="filterMatrixRows('export')">Portability &amp; Standards (2)</button>
        </div>

        <div class="matrix-table-wrap">
          <table class="matrix-table">
            <thead>
              <tr>
                <th style="width: 28%;">Capability / Architecture</th>
                <th class="col-ldocx" style="width: 28%;">LDOCX Living Document (.ldocx)</th>
                <th style="width: 15%;">Adobe PDF (.pdf)</th>
                <th style="width: 14%;">Word (.docx)</th>
                <th style="width: 15%;">PowerPoint (.pptx)</th>
              </tr>
            </thead>
            <tbody id="matrix-table-body">
              <tr data-cat="interactivity">
                <td style="font-weight: 600; color: #fff;">Spatial 3D WebGL Orbit Models</td>
                <td class="col-ldocx"><span class="matrix-check">✓</span> Native 120Hz Discrete GPU</td>
                <td><span class="matrix-cross">✗</span> Static Flat Image</td>
                <td><span class="matrix-cross">✗</span> Not Supported</td>
                <td><span class="matrix-cross">✗</span> Inert Snapshot</td>
              </tr>
              <tr data-cat="interactivity">
                <td style="font-weight: 600; color: #fff;">Sandboxed Code &amp; Interactive Blocks</td>
                <td class="col-ldocx"><span class="matrix-check">✓</span> Isolated Live Execution</td>
                <td><span class="matrix-cross">✗</span> Dead Text Only</td>
                <td><span class="matrix-cross">✗</span> High-Risk Macros</td>
                <td><span class="matrix-cross">✗</span> Non-Executable</td>
              </tr>
              <tr data-cat="interactivity">
                <td style="font-weight: 600; color: #fff;">Reactive Math &amp; Telemetry DAG</td>
                <td class="col-ldocx"><span class="matrix-check">✓</span> Dynamic Real-Time Math</td>
                <td><span class="matrix-cross">✗</span> Frozen Bitmaps</td>
                <td><span class="matrix-cross">✗</span> Static Tables</td>
                <td><span class="matrix-cross">✗</span> Manual Paste</td>
              </tr>
              <tr data-cat="security">
                <td style="font-weight: 600; color: #fff;">100% Air-Gapped Zero-Egress Security</td>
                <td class="col-ldocx"><span class="matrix-check">✓</span> Strict Zero Telemetry</td>
                <td><span class="matrix-cross">✗</span> Network Beacon Risk</td>
                <td><span class="matrix-cross">✗</span> Cloud Office Telemetry</td>
                <td><span class="matrix-cross">✗</span> Online Verification</td>
              </tr>
              <tr data-cat="security">
                <td style="font-weight: 600; color: #fff;">Cryptographic Merkle SHA-256 Seal</td>
                <td class="col-ldocx"><span class="matrix-check">✓</span> Built-In Tamper Hash</td>
                <td><span class="matrix-cross">✗</span> Fragile X.509 certs</td>
                <td><span class="matrix-cross">✗</span> Easily Manipulated</td>
                <td><span class="matrix-cross">✗</span> Unsigned Archive</td>
              </tr>
              <tr data-cat="security">
                <td style="font-weight: 600; color: #fff;">Single-File Self-Contained Container</td>
                <td class="col-ldocx"><span class="matrix-check">✓</span> Zero Server / Link Rot</td>
                <td><span class="matrix-check">✓</span> Monolithic File</td>
                <td><span class="matrix-cross">✗</span> External Link Rot</td>
                <td><span class="matrix-cross">✗</span> Missing Media Links</td>
              </tr>
              <tr data-cat="export">
                <td style="font-weight: 600; color: #fff;">Publication-Grade Vector PDF Flattener</td>
                <td class="col-ldocx"><span class="matrix-check">✓</span> Lossless High-DPI Output</td>
                <td><span class="matrix-check">✓</span> Native Print</td>
                <td><span class="matrix-cross">✗</span> Format Drift</td>
                <td><span class="matrix-cross">✗</span> Slide Distortion</td>
              </tr>
              <tr data-cat="export">
                <td style="font-weight: 600; color: #fff;">Open Specification Architecture</td>
                <td class="col-ldocx"><span class="matrix-check">✓</span> Apache 2.0 Open Spec</td>
                <td><span class="matrix-cross">✗</span> Proprietary ISO Complexity</td>
                <td><span class="matrix-cross">✗</span> Complex OpenXML</td>
                <td><span class="matrix-cross">✗</span> Proprietary Vendor</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- LICENSE KEY REDEMPTION & ACTIVATION STEPPER -->
      <section class="container" id="license-station">
        <div class="license-station">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
            <div>
              <span class="section-tag" style="color: #f59e0b;">Activation Station</span>
              <h2 style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 800; color: #fff; margin-bottom: 4px;">
                How to Unlock LDOC Studio Pro Workstation
              </h2>
              <p style="color: var(--text-muted); font-size: 0.95rem; margin: 0;">
                Downloads are 100% free to install. Activate with your receipt Order ID or cryptographic license key.
              </p>
            </div>
            <div>
              <button onclick="openLicenseHubModal('retrieve')" class="ldoc-btn ldoc-btn-primary" style="padding: 10px 20px; font-size: 13px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-2-2l2 2m-2 2l2-2m-7 7l7-7m-9 9a5 5 0 1 1-7-7 5 5 0 0 1 7 7z"/></svg>
                <span>Redeem / Retrieve License &rarr;</span>
              </button>
            </div>
          </div>

          <div class="stepper-grid">
            <div class="step-card">
              <span class="step-number">STEP 01</span>
              <h3 class="step-title">Acquire Lifetime License</h3>
              <p class="step-desc">Purchase a lifetime workstation license ($19) through our verified checkout. Instant delivery to your inbox.</p>
            </div>
            <div class="step-card">
              <span class="step-number">STEP 02</span>
              <h3 class="step-title">Retrieve Cryptographic Key</h3>
              <p class="step-desc">Enter your Order ID or customer email in the Licensing Hub to generate your deterministic Ed25519 key.</p>
            </div>
            <div class="step-card">
              <span class="step-number">STEP 03</span>
              <h3 class="step-title">Unlock Desktop App</h3>
              <p class="step-desc">Paste the key into LDOC Studio desktop upon first launch. All offline workstation capabilities unlock permanently.</p>
            </div>
          </div>

          <!-- Quick License Input -->
          <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; background: rgba(0,0,0,0.3); padding: 14px 18px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
            <div style="flex: 1; min-width: 240px;">
              <input type="text" id="license-key-input" placeholder="Enter license key e.g. LDOC-PRO-VIP-XXXX-XXXX" style="width: 100%; background: #080a0f; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #fff; padding: 10px 14px; font-family: var(--font-mono); font-size: 13px; outline: none;">
            </div>
            <button type="button" onclick="activateLicenseKey()" class="ldoc-btn ldoc-btn-secondary" style="padding: 10px 18px; font-size: 13px;">
              Verify &amp; Unlock Downloads
            </button>
          </div>
          <div id="license-modal-status" style="display: none; margin-top: 10px; font-size: 12.5px; font-family: var(--font-mono);"></div>
        </div>
      </section>

      <!-- MULTI-PLATFORM PRO DOWNLOAD SUITE -->
      <section class="container download-suite-section" id="download">
        <div class="section-head">
          <span class="section-tag" style="color: #f59e0b;">Official Distribution</span>
          <h2 class="section-title">Download LDOC Studio Pro Desktop Suite</h2>
          <p class="section-sub">100% Offline Standalone • Discrete High-Performance GPU Acceleration • Windows, Linux, Android &amp; iOS</p>
        </div>

        <div class="download-grid">
          <!-- Windows 10 / 11 Card -->
          <div class="download-card featured" id="dl-card-windows">
            <div>
              <div class="download-header">
                <div class="download-platform-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style="color:#0078d4"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.95-1.801"/></svg>
                </div>
                <div class="download-title">
                  <span>Windows 10 / 11</span>
                  <span class="download-badge badge-win">x64 Executable</span>
                </div>
              </div>
              <ul class="download-features-list">
                <li><span>✓</span> 100% Air-Gapped Anti-Tamper Guard</li>
                <li><span>✓</span> Direct OS File I/O &amp; Unlimited Size</li>
                <li><span>✓</span> Discrete GPU VRAM Pipeline (120Hz)</li>
                <li><span>✓</span> High-DPI Vector PDF Flattener</li>
                <li><span>✓</span> Lifetime Offline Cryptographic Key</li>
              </ul>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <a href="/downloads/Setup-LDOC-Studio-Pro-Windows.exe" download="Setup-LDOC-Studio-Pro-Windows.exe" id="btn-down-windows-setup" class="btn-download-action featured-dl">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Download Windows Setup (.exe)</span>
              </a>
              <a href="/downloads/LDOC-Studio-Pro-Windows-VIP.zip" download="LDOC-Studio-Pro-Windows-VIP.zip" id="btn-down-windows-zip" class="btn-download-action">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                <span>Portable ZIP (.zip)</span>
              </a>
            </div>
          </div>

          <!-- Linux (Universal) Card -->
          <div class="download-card" id="dl-card-linux">
            <div>
              <div class="download-header">
                <div class="download-platform-icon">
                  <svg width="22" height="22" viewBox="0 0 448 512" fill="currentColor" style="color:#eab308"><path d="M220.8 0C168.3 0 135 37.7 135 91.5c0 10.4 1.5 21.1 4.5 31.8C103.8 143.9 80 183.8 80 230.8c0 34.5 13.5 65.8 36.4 89.4-4.8 13.2-14.2 26.5-28.7 38.6-7.5 6.2-2.7 18 7.1 16.9 37.3-4.2 65.4-19.6 80-35.1 14.6 3.3 30.1 5.2 46 5.2s31.4-1.9 46-5.2c14.6 15.5 42.7 30.9 80 35.1 9.8 1.1 14.6-10.7 7.1-16.9-14.5-12.1-23.9-25.4-28.7-38.6 22.9-23.6 36.4-54.9 36.4-89.4 0-47-23.8-86.9-59.5-107.5 3-10.7 4.5-21.4 4.5-31.8C313 37.7 279.7 0 227.2 0h-6.4zm-37.4 228.3c13.3 0 24.1 11.6 24.1 26s-10.8 26-24.1 26-24.1-11.6-24.1-26 10.8-26 24.1-26zm74.8 0c13.3 0 24.1 11.6 24.1 26s-10.8 26-24.1 26-24.1-11.6-24.1-26 10.8-26 24.1-26z"/></svg>
                </div>
                <div class="download-title">
                  <span>Linux (Universal)</span>
                  <span class="download-badge badge-linux">tar.gz &amp; AppImage</span>
                </div>
              </div>
              <ul class="download-features-list">
                <li><span>✓</span> Bare-Metal Linux Speed (Ubuntu, Debian, Arch)</li>
                <li><span>✓</span> Standalone AppImage Air-Gap Binary</li>
                <li><span>✓</span> Hardware OpenGL / Vulkan GPU (120Hz)</li>
                <li><span>✓</span> Automated Headless Batch CLI</li>
                <li><span>✓</span> Offline 3D Scene Rendering &amp; AST</li>
              </ul>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <a href="/downloads/LDOC-Studio-Pro-Linux.AppImage" download="LDOC-Studio-Pro-Linux.AppImage" id="btn-down-linux-setup" class="btn-download-action featured-dl">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Download AppImage (.AppImage)</span>
              </a>
              <a href="/downloads/LDOC-Studio-Pro-Linux.tar.gz" download="LDOC-Studio-Pro-Linux.tar.gz" id="btn-down-linux-zip" class="btn-download-action">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                <span>Portable tar.gz (.tar.gz)</span>
              </a>
            </div>
          </div>

          <!-- macOS & iOS Card -->
          <div class="download-card" id="dl-card-mac">
            <div>
              <div class="download-header">
                <div class="download-platform-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style="color:#e2e8f0"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.87-.9.04-2.02.6-2.66 1.34-.56.64-1.06 1.7-0.93 2.73 1.01.08 2.06-.45 2.67-1.2"/></svg>
                </div>
                <div class="download-title">
                  <span>macOS &amp; iOS</span>
                  <span class="download-badge badge-ios">Apple Standalone</span>
                </div>
              </div>
              <ul class="download-features-list">
                <li><span>✓</span> Native Apple Silicon Metal GPU Engine</li>
                <li><span>✓</span> Trackpad &amp; Apple Pencil Optimized</li>
                <li><span>✓</span> Signed macOS DMG Bundle (.dmg)</li>
                <li><span>✓</span> Offline Touch PWA Suite (.zip)</li>
                <li><span>✓</span> Files App &amp; iCloud Drive Integration</li>
              </ul>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <a href="/downloads/LDOC-Studio-Pro-macOS.dmg" download="LDOC-Studio-Pro-macOS.dmg" id="btn-down-mac-setup" class="btn-download-action featured-dl">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Download macOS DMG (.dmg)</span>
              </a>
              <a href="/downloads/LDOC-Studio-Pro-iOS-PWA.zip" download="LDOC-Studio-Pro-iOS-PWA.zip" id="btn-down-ios-zip" class="btn-download-action">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                <span>iOS Touch PWA (.zip)</span>
              </a>
            </div>
          </div>

          <!-- Android Card -->
          <div class="download-card" id="dl-card-android">
            <div>
              <div class="download-header">
                <div class="download-platform-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style="color:#3ddc84"><path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4126 13.8533 8.12 12 8.12s-3.5902.2926-5.1368.8297L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396"/></svg>
                </div>
                <div class="download-title">
                  <span>Android</span>
                  <span class="download-badge badge-android">ARM64 APK</span>
                </div>
              </div>
              <ul class="download-features-list">
                <li><span>✓</span> Vulkan &amp; OpenGL ES 3.2 Mobile Engine</li>
                <li><span>✓</span> Stylus &amp; S-Pen Pressure Drawing</li>
                <li><span>✓</span> 100% Air-Gapped Standalone Offline</li>
                <li><span>✓</span> Local Storage Access Framework (SAF)</li>
                <li><span>✓</span> Instant Pro Workstation Unlock</li>
              </ul>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <a href="/downloads/LDOC-Studio-Pro-Android.apk" download="LDOC-Studio-Pro-Android.apk" id="btn-down-android-apk" class="btn-download-action featured-dl">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Download Android APK (.apk)</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- FAQ ACCORDION -->
      <section class="container faq-section" id="faq">
        <div class="faq-container">
          <div class="section-head">
            <span class="section-tag" style="color: #f59e0b;">Knowledge Base</span>
            <h2 class="section-title">Frequently Asked Questions</h2>
            <p class="section-sub">
              Clear technical answers regarding offline architecture, anti-tamper security, zero text drift, and licensing.
            </p>
          </div>

          <!-- Search Input -->
          <div class="faq-search-wrapper">
            <span class="faq-search-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input type="text" id="faqSearchInput" class="faq-search-input" placeholder="Search questions (e.g. 3D models, Word forgery, text drift, RAG OCR, pricing)..." aria-label="Search FAQ questions">
            <button type="button" class="faq-clear-btn" id="faqClearBtn" onclick="clearFaqSearch()" aria-label="Clear search" style="display:none;">&times;</button>
          </div>

          <!-- Category Filter Pills -->
          <div class="faq-filter-pills" role="tablist" aria-label="FAQ Categories">
            <button type="button" class="faq-pill active" data-category="all" onclick="filterFaq('all', this)" role="tab" aria-selected="true">
              All Questions <span class="pill-count">12</span>
            </button>
            <button type="button" class="faq-pill" data-category="showcase" onclick="filterFaq('showcase', this)" role="tab" aria-selected="false">
              3D &amp; Interactivity <span class="pill-count">3</span>
            </button>
            <button type="button" class="faq-pill" data-category="zerodrift" onclick="filterFaq('zerodrift', this)" role="tab" aria-selected="false">
              Zero Text Drift <span class="pill-count">2</span>
            </button>
            <button type="button" class="faq-pill" data-category="security" onclick="filterFaq('security', this)" role="tab" aria-selected="false">
              Anti-Tamper Security <span class="pill-count">2</span>
            </button>
            <button type="button" class="faq-pill" data-category="ai" onclick="filterFaq('ai', this)" role="tab" aria-selected="false">
              AI &amp; RAG Ingestion <span class="pill-count">2</span>
            </button>
            <button type="button" class="faq-pill" data-category="ownership" onclick="filterFaq('ownership', this)" role="tab" aria-selected="false">
              Offline &amp; Pricing <span class="pill-count">3</span>
            </button>
          </div>

          <!-- FAQ Accordion List -->
          <div class="faq-list" id="faqList">
            <div class="faq-item" data-category="showcase">
              <button class="faq-question" type="button" aria-expanded="false" onclick="toggleFaq(this)">
                <div class="faq-q-left">
                  <span class="faq-cat-badge badge-showcase">3D &amp; Showcase</span>
                  <span>Why can't I create an interactive 3D document showcase using PDF or Microsoft Word?</span>
                </div>
                <svg class="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-answer">
                <div class="faq-answer-inner">
                  <p>Traditional formats like Adobe PDF and Microsoft Word were engineered 30+ years ago as static "digital printer paper". They are restricted to frozen 2D flat images and static text. When engineering teams want to showcase 3D CAD parts or interactive telemetry in a report, PDF forces them to paste dead 2D screenshots.<br><br><strong>The LDOC Solution:</strong> The Living Document Format (<code>.ldocx</code>) embeds hardware-accelerated 60 FPS Three.js 3D WebGL viewports directly on the page. Stakeholders can rotate, zoom, and inspect full <code>.GLTF</code>, <code>.OBJ</code>, and <code>.STL</code> CAD assemblies with natural mouse or multi-touch gestures—no 15GB CAD software required.</p>
                </div>
              </div>
            </div>

            <div class="faq-item" data-category="showcase">
              <button class="faq-question" type="button" aria-expanded="false" onclick="toggleFaq(this)">
                <div class="faq-q-left">
                  <span class="faq-cat-badge badge-showcase">3D &amp; Showcase</span>
                  <span>How can clients inspect 3D engineering models without installing heavy CAD software?</span>
                </div>
                <svg class="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-answer">
                <div class="faq-answer-inner">
                  <p>Legacy CAD review requires recipients to either purchase expensive CAD seats ($2,000+/year) or install 10GB+ software like AutoCAD or SolidWorks. With LDOC Studio and the standalone viewer (&lt;4MB), anyone on Windows, macOS, Linux, Android, or iOS can open a <code>.ldocx</code> file and manipulate 3D models with zero software installation and zero cloud logins.</p>
                </div>
              </div>
            </div>

            <div class="faq-item" data-category="showcase">
              <button class="faq-question" type="button" aria-expanded="false" onclick="toggleFaq(this)">
                <div class="faq-q-left">
                  <span class="faq-cat-badge badge-showcase">3D &amp; Showcase</span>
                  <span>Can text wrap smoothly around 3D models and interactive media without layout glitches?</span>
                </div>
                <svg class="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-answer">
                <div class="faq-answer-inner">
                  <p>Yes. LDOC Studio features magazine-style obstacle exclusion carving powered by <code>LdocTextLayout</code>. Paragraphs dynamically flow around 3D canvas viewports using deterministic geometric margin carving, preventing bounding-box overlaps or forced browser reflow.</p>
                </div>
              </div>
            </div>

            <div class="faq-item" data-category="zerodrift">
              <button class="faq-question" type="button" aria-expanded="false" onclick="toggleFaq(this)">
                <div class="faq-q-left">
                  <span class="faq-cat-badge badge-zerodrift">Zero Text Drift</span>
                  <span>Why do Word documents and Google Docs shift formatting across computers?</span>
                </div>
                <svg class="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-answer">
                <div class="faq-answer-inner">
                  <p>Traditional word processors rely on system-installed OS fonts and browser DOM reflow heuristics. Opening a <code>.docx</code> file on Mac vs. Windows recalculates line widths differently, causing words to jump between lines and headings to orphan.<br><br><strong>The LDOC Solution:</strong> Built on pure arithmetic layout metrics (encapsulating <code>@chenglou/pretext</code> off-DOM), LDOC pre-computes text metrics to guarantee 100% bit-for-bit identical line breaks, line counts, and bounding heights across the Editor, Viewer, and headless PDF export.</p>
                </div>
              </div>
            </div>

            <div class="faq-item" data-category="zerodrift">
              <button class="faq-question" type="button" aria-expanded="false" onclick="toggleFaq(this)">
                <div class="faq-q-left">
                  <span class="faq-cat-badge badge-zerodrift">Zero Text Drift</span>
                  <span>Will my living document print or export to PDF exactly as it appears on my screen?</span>
                </div>
                <svg class="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-answer">
                <div class="faq-answer-inner">
                  <p>Yes. Unlike web pages where <code>window.print()</code> results in broken margins and page splits, LDOC Studio uses a predictive page-break flattener. The PDF export flattener executes identical layout arithmetic as the live editor canvas, ensuring zero text drift and publication print parity.</p>
                </div>
              </div>
            </div>

            <div class="faq-item" data-category="security">
              <button class="faq-question" type="button" aria-expanded="false" onclick="toggleFaq(this)">
                <div class="faq-q-left">
                  <span class="faq-cat-badge badge-security">Anti-Tamper Security</span>
                  <span>Can Microsoft Word (.docx) files be silently edited or forged without detection?</span>
                </div>
                <svg class="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-answer">
                <div class="faq-answer-inner">
                  <p>Yes. A <code>.docx</code> file is an unencrypted ZIP archive containing raw XML files. Anyone can unzip it, modify contract terms or financial figures, re-zip it, and Word will open it without warning.<br><br><strong>The LDOC Solution:</strong> Every <code>.ldocx</code> integrates a SHA-256 Merkle tree and Ed25519 digital signature manifest. Every paragraph, table, and 3D asset is individually hashed. If even a single character or mesh coordinate is tampered with, LDOC Studio raises an instant cryptographic alarm in under 15ms, pinpointing the altered block.</p>
                </div>
              </div>
            </div>

            <div class="faq-item" data-category="security">
              <button class="faq-question" type="button" aria-expanded="false" onclick="toggleFaq(this)">
                <div class="faq-q-left">
                  <span class="faq-cat-badge badge-security">Anti-Tamper Security</span>
                  <span>Does .ldocx protect against macro viruses and arbitrary code execution?</span>
                </div>
                <svg class="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-answer">
                <div class="faq-answer-inner">
                  <p>Yes. Word macros (VBA) remain a top enterprise threat vector. LDOC eliminates arbitrary code execution entirely. Instead of executable macros, document interactivity is powered by a sandboxed, deterministic Abstract Syntax Tree (AST). Formulas and sliders run in an isolated reactive DAG with zero access to system files, shell commands, or unauthorized network APIs.</p>
                </div>
              </div>
            </div>

            <div class="faq-item" data-category="ai">
              <button class="faq-question" type="button" aria-expanded="false" onclick="toggleFaq(this)">
                <div class="faq-q-left">
                  <span class="faq-cat-badge badge-ai">AI &amp; RAG Ingestion</span>
                  <span>Why is extracting text and tables from PDFs so unreliable for AI pipelines (RAG)?</span>
                </div>
                <svg class="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-answer">
                <div class="faq-answer-inner">
                  <p>PDFs store raw graphical draw calls like <em>"draw glyph 'A' at coordinate (142, 580)"</em>, not semantic paragraphs. AI pipelines burn huge GPU compute running heuristic OCR models that scramble tables and hallucinate reading order.<br><br><strong>The LDOC Solution:</strong> A <code>.ldocx</code> document is an AI-native JSON AST. AI agents, LangChain, or custom RAG pipelines ingest documents via <code>npm install @ldoc/sdk</code> in under 2ms. Tables, headings, code blocks, and 3D descriptions retain 100% structural fidelity with zero OCR errors.</p>
                </div>
              </div>
            </div>

            <div class="faq-item" data-category="ai">
              <button class="faq-question" type="button" aria-expanded="false" onclick="toggleFaq(this)">
                <div class="faq-q-left">
                  <span class="faq-cat-badge badge-ai">AI &amp; RAG Ingestion</span>
                  <span>How can AI assistants like Claude, Gemini, and ChatGPT generate .ldocx files?</span>
                </div>
                <svg class="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-answer">
                <div class="faq-answer-inner">
                  <p>Because <code>.ldocx</code> documents follow an open, well-typed JSON schema (<code>manifest.json</code> + <code>document.json</code>), AI models can programmatically construct, inspect, and update living documents directly using standard JSON tooling or the official <code>@ldoc/sdk</code> TypeScript/Node.js API.</p>
                </div>
              </div>
            </div>

            <div class="faq-item" data-category="ownership">
              <button class="faq-question" type="button" aria-expanded="false" onclick="toggleFaq(this)">
                <div class="faq-q-left">
                  <span class="faq-cat-badge badge-ownership">Offline &amp; Pricing</span>
                  <span>Do I lose access to my documents if I don't have internet or cancel a subscription?</span>
                </div>
                <svg class="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-answer">
                <div class="faq-answer-inner">
                  <p>Never. Cloud tools like Google Docs and Notion hold your files in proprietary cloud databases—if your subscription lapses or internet drops, you are locked out. LDOC is strictly <strong>Local-First and Offline-First</strong>. Your files are self-contained <code>.ldocx</code> archives stored on your local disk. You own them forever.</p>
                </div>
              </div>
            </div>

            <div class="faq-item" data-category="ownership">
              <button class="faq-question" type="button" aria-expanded="false" onclick="toggleFaq(this)">
                <div class="faq-q-left">
                  <span class="faq-cat-badge badge-ownership">Offline &amp; Pricing</span>
                  <span>Will a .ldocx file still be readable 20 years from now?</span>
                </div>
                <svg class="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-answer">
                <div class="faq-answer-inner">
                  <p>Yes. Every <code>.ldocx</code> file bundles a self-contained, standalone <code>fallback.html</code> archival viewer inside its container. Even if LDOC Studio evolves decades in the future, opening <code>fallback.html</code> in any standard web browser renders the entire document faithfully without external dependencies.</p>
                </div>
              </div>
            </div>

            <div class="faq-item" data-category="ownership">
              <button class="faq-question" type="button" aria-expanded="false" onclick="toggleFaq(this)">
                <div class="faq-q-left">
                  <span class="faq-cat-badge badge-ownership">Offline &amp; Pricing</span>
                  <span>What is the difference between Live Studio (Free Web Demo) and Studio Pro Suite?</span>
                </div>
                <svg class="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-answer">
                <div class="faq-answer-inner">
                  <p><strong>Live Studio (Free Web Demo):</strong> Runs directly in your browser with zero installation. Ideal for sandbox testing, viewing <code>.ldocx</code> files, experimenting with 3D blocks, and quick previews.<br><br><strong>Studio Pro Suite ($19 Lifetime License):</strong> Full offline desktop application for Windows, macOS, and Linux (plus companion mobile packages for Android and iOS). Unlocks unlimited multi-slide presentations, local disk file access, GPU hardware acceleration, watermark-free PDF/print export, Merkle verification tools, and commercial publishing rights.</p>
                </div>
              </div>
            </div>
          </div>

          <div class="faq-no-results" id="faqNoResults" style="display: none; text-align:center; padding: 40px 20px;">
            <p style="font-size: 1.1rem; color: #f1f5f9; margin-bottom: 8px;">No matching questions found.</p>
            <p style="font-size: 0.9rem; color: #94a3b8;">Try searching for keywords like "3D", "Word", "PDF", "Merkle", "drift", "RAG", or "offline".</p>
            <button type="button" onclick="clearFaqSearch()" class="ldoc-btn ldoc-btn-ghost" style="margin-top: 14px; border: 1px solid rgba(245,158,11,0.4); color: #fbbf24;">Reset Filters</button>
          </div>
        </div>
      </section>

      <!-- CONTEXTUAL CALL TO ACTION -->
      <section class="container">
        <div class="pricing-cta-card">
          <div>
            <h2 class="cta-content-title">Ready to build documents that compute and react?</h2>
            <p class="cta-content-desc">Test the living document pipeline live in your browser sandbox, or inspect our zero-dependency SDK on GitHub.</p>
          </div>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <a href="/live-studio" class="ldoc-btn ldoc-btn-primary" style="padding: 12px 24px; font-size: 0.95rem;">
              <span>Launch Live Studio &rarr;</span>
            </a>
            <a href="/format" class="ldoc-btn ldoc-btn-secondary" style="padding: 12px 22px; font-size: 0.95rem;">
              <span>Explore Format Spec</span>
            </a>
          </div>
        </div>
      </section>
    </main>

    <!-- FOOTER -->
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <a href="/" class="brand-logo">
              <img src="/ldoc_logo.png" alt="LDOC Logo" width="28" height="28">
              <span>LDOC STUDIO</span>
            </a>
            <p>The open living document architecture. Compute, render, and evolve beyond static PDFs.</p>
          </div>

          <div class="footer-col">
            <h5>Product</h5>
            <ul>
              <li><a href="/live-studio">Live Studio IDE</a></li>
              <li><a href="/models">Models &amp; Templates</a></li>
              <li><a href="/creator">Visual Creator</a></li>
              <li><a href="/pricing">Pricing Plans</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h5>Specification</h5>
            <ul>
              <li><a href="/format">.ldocx Architecture</a></li>
              <li><a href="/docs">AST Specification</a></li>
              <li><a href="/docs">Draco 3D Geometry</a></li>
              <li><a href="/security">Security &amp; Signing</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h5>Developers</h5>
            <ul>
              <li><a href="/docs">SDK Architecture Guide</a></li>
              <li><a href="/docs#sdk">Developer Integration</a></li>
              <li><a href="/changelog">Release Changelog</a></li>
              <li><a href="/format">Format Specification</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h5>Trust &amp; Legal</h5>
            <ul>
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a href="/terms">Terms of Service</a></li>
              <li><a href="/security">Security Architecture</a></li>
              <li><a href="/refund">Refund Policy</a></li>
              <li><a href="/license">Commercial SLA &amp; License</a></li>
              <li><a href="mailto:jayaramankalidasan@gmail.com">Contact Founder</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <div>&copy; 2026 LDOC Studio. Designed and created by J AI ENTERPRISES. Open Living Document Standard.</div>
          <div class="footer-legal-links" style="display: flex; gap: 16px; flex-wrap: wrap;">
            <a href="/privacy" style="color: var(--text-sub); text-decoration: none;">Privacy Policy</a>
            <a href="/terms" style="color: var(--text-sub); text-decoration: none;">Terms of Service</a>
            <a href="/security" style="color: var(--text-sub); text-decoration: none;">Security Architecture</a>
            <a href="/refund" style="color: var(--text-sub); text-decoration: none;">Refund Policy</a>
            <a href="/license" style="color: var(--text-sub); text-decoration: none;">Commercial SLA</a>
          </div>
        </div>
      </div>
    </footer>
  </div>

  <!-- FULLSTACK MODALS (AUTH, VAULT, VERSIONS, SHARE, LEAD, LICENSE HUB) -->
  <!-- 1. Auth Modal -->
  <div id="auth-modal" class="ldoc-cloud-modal-overlay">
    <div class="ldoc-cloud-modal-box">
      <div class="ldoc-cloud-modal-header">
        <div class="ldoc-cloud-modal-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:-3px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span id="auth-modal-title">LDOC Account &amp; Cloud Access</span>
        </div>
        <button class="ldoc-cloud-modal-close" onclick="closeAuthModal()">✕</button>
      </div>
      <div class="ldoc-cloud-modal-body">
        <div id="auth-forms-container">
          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px;">
            <button type="button" class="btn-oauth btn-oauth-google" onclick="initiateOAuth('google')" style="display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 10px 16px; border-radius: 8px; background: #ffffff; color: #1f2937; font-size: 13px; font-weight: 600; border: 1px solid #d1d5db; cursor: pointer; transition: all 0.2s;">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
            <button type="button" class="btn-oauth btn-oauth-github" onclick="initiateOAuth('github')" style="display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 10px 16px; border-radius: 8px; background: #24292e; color: #ffffff; font-size: 13px; font-weight: 600; border: 1px solid rgba(255,255,255,0.15); cursor: pointer; transition: all 0.2s;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              <span>Continue with GitHub</span>
            </button>
          </div>

          <div style="display: flex; align-items: center; gap: 12px; margin: 16px 0; color: #64748b; font-size: 11px; font-weight: 700;">
            <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
            <span>OR CONTINUE WITH EMAIL</span>
            <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
          </div>

          <div style="display:flex;gap:8px;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,.1);padding-bottom:8px">
            <button id="auth-tab-login" class="ldoc-cloud-btn" style="flex:1" onclick="switchAuthTab('login')">Sign In</button>
            <button id="auth-tab-register" class="ldoc-cloud-btn secondary" style="flex:1" onclick="switchAuthTab('register')">Create Account</button>
          </div>
          <form id="auth-form" onsubmit="handleAuthSubmit(event)">
            <div id="auth-name-group" style="display:none">
              <label style="font-size:11px;font-weight:700;color:#94a3b8;display:block;margin-bottom:4px">FULL NAME</label>
              <input type="text" id="auth-name" class="ldoc-cloud-input" placeholder="e.g. Carl Johnson">
            </div>
            <label style="font-size:11px;font-weight:700;color:#94a3b8;display:block;margin-bottom:4px">EMAIL ADDRESS</label>
            <input type="email" id="auth-email" class="ldoc-cloud-input" placeholder="creator@example.com" required>
            <label style="font-size:11px;font-weight:700;color:#94a3b8;display:block;margin-bottom:4px">PASSWORD</label>
            <input type="password" id="auth-password" class="ldoc-cloud-input" placeholder="••••••••••••" required>
            <div id="auth-error" style="color:#f87171;font-size:12px;margin-bottom:12px;display:none"></div>
            <button type="submit" id="auth-submit-btn" class="ldoc-cloud-btn" style="width:100%;margin-top:6px">Sign In to LDOC Cloud</button>
          </form>
        </div>

        <div id="auth-profile-container" style="display:none">
          <div style="display:flex;align-items:center;gap:14px;background:#161b22;padding:16px;border-radius:12px;margin-bottom:16px;border:1px solid rgba(255,255,255,0.08)">
            <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#2563eb);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#000" id="profile-avatar">U</div>
            <div>
              <div style="font-size:16px;font-weight:800;color:#fff" id="profile-name">User Name</div>
              <div style="font-size:12px;color:#94a3b8" id="profile-email">user@example.com</div>
              <div style="margin-top:6px;display:inline-block;padding:2px 8px;background:rgba(245,158,11,0.2);border:1px solid #f59e0b;border-radius:4px;font-size:10px;font-weight:800;color:#fef08a" id="profile-plan">FREE TIER</div>
            </div>
          </div>
          <div style="display:flex;gap:10px">
            <button class="ldoc-cloud-btn secondary" style="flex:1" onclick="handleLogout()">Log Out</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 2. Cloud Vault Modal -->
  <div id="cloud-vault-modal" class="ldoc-cloud-modal-overlay">
    <div class="ldoc-cloud-modal-box" style="width:720px">
      <div class="ldoc-cloud-modal-header">
        <div class="ldoc-cloud-modal-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:-3px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <span>LDOC Cloud Vault &amp; Documents</span>
        </div>
        <button class="ldoc-cloud-modal-close" onclick="closeCloudVaultModal()">✕</button>
      </div>
      <div class="ldoc-cloud-modal-body">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <span style="font-size:12px;color:#94a3b8">Cloud-synced living presentations and specs</span>
          <button class="ldoc-cloud-btn" onclick="createNewCloudDoc()" style="padding:6px 12px;font-size:12px">+ New Cloud Document</button>
        </div>
        <div id="cloud-vault-list" style="display:flex;flex-direction:column;gap:10px">
          <div style="text-align:center;padding:30px;color:#94a3b8">Loading cloud documents...</div>
        </div>
      </div>
    </div>
  </div>

  <!-- 3. Version History Modal -->
  <div id="versions-modal" class="ldoc-cloud-modal-overlay">
    <div class="ldoc-cloud-modal-box">
      <div class="ldoc-cloud-modal-header">
        <div class="ldoc-cloud-modal-title"><span>↺</span><span>Document Version History</span></div>
        <button class="ldoc-cloud-modal-close" onclick="closeVersionsModal()">✕</button>
      </div>
      <div class="ldoc-cloud-modal-body">
        <div style="font-size:12px;color:#94a3b8;margin-bottom:14px">Chronological snapshots captured automatically on edit &amp; build</div>
        <div id="versions-history-list" style="display:flex;flex-direction:column;gap:8px">
          <div style="text-align:center;padding:20px;color:#94a3b8">Loading revision history...</div>
        </div>
      </div>
    </div>
  </div>

  <!-- 4. Share Modal -->
  <div id="share-modal" class="ldoc-cloud-modal-overlay">
    <div class="ldoc-cloud-modal-box">
      <div class="ldoc-cloud-modal-header">
        <div class="ldoc-cloud-modal-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:-3px;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          <span>Share LDOC Studio</span>
        </div>
        <button class="ldoc-cloud-modal-close" onclick="closeShareModal()">✕</button>
      </div>
      <div class="ldoc-cloud-modal-body">
        <p style="font-size:12.5px;color:#94a3b8;margin-bottom:14px">Share LDOC Studio and the Living Document standard with developers, researchers, and creators.</p>
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
          <button class="ldoc-cloud-btn secondary" style="flex:1;min-width:120px;font-size:12px" onclick="shareToSocial('twitter')"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-right:4px;vertical-align:-1px;"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>X / Twitter</button>
          <button class="ldoc-cloud-btn secondary" style="flex:1;min-width:120px;font-size:12px" onclick="shareToSocial('linkedin')">LinkedIn</button>
          <button class="ldoc-cloud-btn secondary" style="flex:1;min-width:120px;font-size:12px" onclick="shareToSocial('reddit')">Reddit</button>
          <button class="ldoc-cloud-btn secondary" style="flex:1;min-width:120px;font-size:12px" onclick="shareToSocial('whatsapp')">WhatsApp</button>
        </div>
        <label style="font-size:11px;font-weight:700;color:#94a3b8;display:block;margin-bottom:4px">PUBLIC STUDIO PORTAL LINK</label>
        <div style="display:flex;gap:8px;margin-bottom:16px">
          <input type="text" id="share-link-input" class="ldoc-cloud-input" style="margin-bottom:0" value="https://ldoc-studios.vercel.app/" readonly>
          <button class="ldoc-cloud-btn" onclick="copyShareLink()">Copy</button>
        </div>
        <label style="font-size:11px;font-weight:700;color:#94a3b8;display:block;margin-bottom:4px">RESPONSIVE EMBED CODE (IFRAME)</label>
        <div style="display:flex;gap:8px">
          <input type="text" id="share-embed-input" class="ldoc-cloud-input" style="margin-bottom:0" value='<iframe src="https://ldoc-studios.vercel.app/live-studio" width="100%" height="650" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope"></iframe>' readonly>
          <button class="ldoc-cloud-btn secondary" onclick="copyEmbedCode()">Copy</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 5. Enterprise / VIP Lead Modal -->
  <div id="lead-modal" class="ldoc-cloud-modal-overlay">
    <div class="ldoc-cloud-modal-box" style="width:620px">
      <div class="ldoc-cloud-modal-header">
        <div class="ldoc-cloud-modal-title"><span></span><span>Enterprise Fleet &amp; VIP Consultation</span></div>
        <button class="ldoc-cloud-modal-close" onclick="closeLeadModal()">✕</button>
      </div>
      <div class="ldoc-cloud-modal-body">
        <div style="font-size:12.5px;color:#94a3b8;margin-bottom:14px">Inquire about enterprise organization deployment, custom AST plugins, dedicated solutions engineering, and corporate volume licensing.</div>
        <form id="lead-reservation-form" onsubmit="handleLeadSubmit(event)">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
            <div>
              <label style="font-size:11px;font-weight:700;color:#94a3b8;display:block;margin-bottom:4px">FULL NAME</label>
              <input type="text" id="lead-name" class="ldoc-cloud-input" placeholder="e.g. Carl Johnson" required>
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:#94a3b8;display:block;margin-bottom:4px">ORGANIZATION EMAIL</label>
              <input type="email" id="lead-email" class="ldoc-cloud-input" placeholder="lead@company.com" required>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
            <div>
              <label style="font-size:11px;font-weight:700;color:#94a3b8;display:block;margin-bottom:4px">PRIMARY PLATFORM</label>
              <select id="lead-platform" class="ldoc-cloud-input">
                <option>Windows 10 / 11 Enterprise</option>
                <option>Linux Workstation Cluster</option>
                <option>macOS Enterprise Fleet</option>
                <option>Hybrid Cross-Platform</option>
              </select>
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:#94a3b8;display:block;margin-bottom:4px">DEPLOYMENT TIER</label>
              <select id="lead-tier" class="ldoc-cloud-input">
                <option>Enterprise Fleet ($499/yr)</option>
                <option>Studio Pro Volume (50+ Seats)</option>
                <option>Air-Gapped Government Cluster</option>
              </select>
            </div>
          </div>
          <div style="margin-bottom:12px">
            <label style="font-size:11px;font-weight:700;color:#94a3b8;display:block;margin-bottom:4px">MESSAGE / REQUIREMENTS</label>
            <input type="text" id="lead-message" class="ldoc-cloud-input" placeholder="e.g. Inquiring about silent MSI deployment or custom HSM signing">
          </div>
          <button type="submit" id="lead-submit-btn" class="ldoc-cloud-btn" style="width:100%;padding:10px">Submit Inquiry</button>
        </form>
        <div id="lead-result-container" style="display:none"></div>
      </div>
    </div>
  </div>

  <!-- 6. License Hub Modal -->
  <div id="license-hub-modal" class="ldoc-cloud-modal-overlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(8,10,15,0.88);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);z-index:9999999;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;">
    <div class="ldoc-cloud-modal-box" style="width:620px;max-width:96vw;background:#0d1117;border:1.5px solid rgba(245,158,11,0.5);border-radius:14px;box-shadow:0 25px 80px rgba(0,0,0,0.95), 0 0 35px rgba(245,158,11,0.2);overflow:hidden;color:#e4e4e7;">
      <div style="background:linear-gradient(90deg,#161b22,#1c2128);padding:14px 22px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="background:linear-gradient(135deg,#f59e0b,#ea580c);color:#000;font-size:10.5px;font-weight:900;padding:3px 8px;border-radius:4px;letter-spacing:0.5px">PRO LICENSE HUB</span>
          <h3 style="font-size:15px;color:#fff;font-weight:700;margin:0">LDOC Studio Pro • Key &amp; Order Integration</h3>
        </div>
        <button onclick="closeLicenseHubModal()" style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer;padding:2px 8px;line-height:1" title="Close">✕</button>
      </div>

      <div style="display:flex;background:#161b22;border-bottom:1px solid rgba(255,255,255,0.08);">
        <button id="tab-btn-buy" onclick="switchLicenseHubTab('buy')" style="flex:1;padding:12px;background:#0d1117;border:none;border-bottom:2px solid #f59e0b;color:#fef08a;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:-2px;"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg><span>1. Buy License</span>
        </button>
        <button id="tab-btn-retrieve" onclick="switchLicenseHubTab('retrieve')" style="flex:1;padding:12px;background:transparent;border:none;border-bottom:2px solid transparent;color:#94a3b8;font-weight:600;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:-2px;"><path d="M21 2l-2 2m-2-2l2 2m-2 2l2-2m-7 7l7-7m-9 9a5 5 0 1 1-7-7 5 5 0 0 1 7 7z"/></svg><span>2. Retrieve / Generate Key</span>
        </button>
      </div>

      <div id="tab-content-buy" style="padding:22px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
          <div>
            <div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:4px">Own LDOC Studio Pro Lifetime</div>
            <div style="font-size:12.5px;color:#94a3b8">One-time purchase • Windows, Linux, Android &amp; macOS offline desktop workstation</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:28px;font-weight:900;color:#f59e0b;line-height:1">$19</div>
            <div style="font-size:11px;color:#71717a">USD / lifetime</div>
          </div>
        </div>
        <a href="https://jay-app.lemonsqueezy.com/checkout/buy/16851c1c-6dfb-4607-bf8b-81c3427594d1" target="_blank" class="lemonsqueezy-button" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;box-sizing:border-box;padding:14px;background:linear-gradient(135deg,#f59e0b,#ea580c);color:#000;font-weight:800;font-size:15px;border-radius:8px;border:none;cursor:pointer;text-decoration:none;box-shadow:0 10px 25px rgba(245,158,11,0.35);">
          <span>Buy Pro Lifetime ($19) &rarr;</span>
        </a>
      </div>

      <div id="tab-content-retrieve" style="display:none;padding:22px;">
        <div style="font-size:13px;color:#cbd5e1;margin-bottom:14px;line-height:1.5">
          Already purchased? Enter your Order ID (from receipt) or email to retrieve your Pro License Key:
        </div>
        <div style="margin-bottom:12px">
          <label style="display:block;font-size:11px;font-weight:700;color:#f59e0b;text-transform:uppercase;margin-bottom:4px;">Receipt Order ID (Optional):</label>
          <input type="text" id="hub-order-id" class="ldoc-cloud-input" placeholder="e.g. numeric Order ID or LDOC-PRO-VIP" style="width:100%;background:#161b22;border:1px solid #30363d;border-radius:6px;color:#fff;padding:10px 12px;font-family:monospace;font-size:13px;outline:none;">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Customer Email:</label>
          <input type="email" id="hub-email" class="ldoc-cloud-input" placeholder="customer@example.com" style="width:100%;background:#161b22;border:1px solid #30363d;border-radius:6px;color:#fff;padding:10px 12px;font-size:13px;outline:none;">
        </div>
        <button type="button" id="btn-generate-hub-key" onclick="generateOrRetrieveHubKey()" style="width:100%;padding:12px;background:#0284c7;border:none;border-radius:6px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
          <span>Retrieve Pro License Key</span>
        </button>
        <div id="hub-key-result-card" style="display:none;margin-top:16px;background:rgba(34,197,94,0.08);border:1.5px solid rgba(34,197,94,0.35);border-radius:10px;padding:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:11px;font-weight:800;color:#4ade80;text-transform:uppercase;">✓ Verified Pro License Key:</span>
            <span id="hub-license-tier-badge" style="background:#22c55e;color:#000;font-size:10px;font-weight:800;padding:2px 6px;border-radius:4px">PRO LIFETIME</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;">
            <input type="text" id="hub-generated-key" readonly style="flex:1;background:#161b22;border:1px solid rgba(34,197,94,0.5);border-radius:6px;padding:10px 12px;color:#4ade80;font-family:monospace;font-size:14px;font-weight:700;outline:none;">
            <button type="button" onclick="copyHubGeneratedKey()" style="padding:10px 16px;background:#22c55e;border:none;border-radius:6px;color:#000;font-weight:800;cursor:pointer;">Copy</button>
          </div>
        </div>
      </div>

      <div style="background:#161b22;padding:10px 20px;border-top:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:11.5px;color:#94a3b8">LDOC Studio Pro • Official Licensing Hub</span>
        <button onclick="closeLicenseHubModal()" style="background:none;border:none;color:#94a3b8;font-size:12px;cursor:pointer;text-decoration:underline">Dismiss</button>
      </div>
    </div>
  </div>

  <!-- SCRIPT ENGINE -->
  <script>
    // Billing Cycle Switcher
    window.setBillingCycle = function(cycle) {
      document.querySelectorAll('.pricing-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-cycle') === cycle);
      });

      const cloudPrice = document.getElementById('price-val-cloud');
      const cloudUnit = document.getElementById('price-unit-cloud');
      const cloudSub = document.getElementById('price-sub-cloud');

      const entPrice = document.getElementById('price-val-enterprise');
      const entUnit = document.getElementById('price-unit-enterprise');
      const entSub = document.getElementById('price-sub-enterprise');

      const cardPro = document.getElementById('card-tier-pro');
      const cardCloud = document.getElementById('card-tier-cloud');

      if (cycle === 'monthly') {
        if (cloudPrice) cloudPrice.textContent = '$8';
        if (cloudUnit) cloudUnit.textContent = '/ month';
        if (cloudSub) cloudSub.textContent = 'Billed monthly ($96/year)';
        if (entPrice) entPrice.textContent = '$49';
        if (entUnit) entUnit.textContent = '/ month';
        if (entSub) entSub.textContent = 'Billed annually ($499/year)';
        if (cardCloud) { cardCloud.classList.add('featured-cloud'); }
        if (cardPro) { cardPro.classList.remove('featured'); }
      } else if (cycle === 'annually') {
        if (cloudPrice) cloudPrice.textContent = '$6.50';
        if (cloudUnit) cloudUnit.textContent = '/ month';
        if (cloudSub) cloudSub.textContent = 'Billed annually ($79/year — Save 20%)';
        if (entPrice) entPrice.textContent = '$499';
        if (entUnit) entUnit.textContent = '/ year';
        if (entSub) entSub.textContent = 'Complete organization fleet licensing';
        if (cardCloud) { cardCloud.classList.remove('featured-cloud'); }
        if (cardPro) { cardPro.classList.add('featured'); }
      } else if (cycle === 'lifetime') {
        if (cloudPrice) cloudPrice.textContent = '$79';
        if (cloudUnit) cloudUnit.textContent = '/ year';
        if (cloudSub) cloudSub.textContent = 'Optional cloud & sync add-on';
        if (entPrice) entPrice.textContent = '$499';
        if (entUnit) entUnit.textContent = '/ year';
        if (entSub) entSub.textContent = 'Perpetual organization license available';
        if (cardPro) { cardPro.classList.add('featured'); }
        if (cardCloud) { cardCloud.classList.remove('featured-cloud'); }
      }
    };

    // Matrix Filter Rows
    function filterMatrixRows(category) {
      document.querySelectorAll('.matrix-pill').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(category));
      });

      const rows = document.querySelectorAll('#matrix-table-body tr');
      rows.forEach(r => {
        const cat = r.getAttribute('data-cat');
        r.style.display = (category === 'all' || cat === category) ? '' : 'none';
      });
    }

    // FAQ Accordion & Search
    function toggleFaq(btn) {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('active');
      document.querySelectorAll('.faq-item').forEach(el => {
        if (el !== item) {
          el.classList.remove('active');
          const b = el.querySelector('.faq-question');
          if (b) b.setAttribute('aria-expanded', 'false');
        }
      });
      item.classList.toggle('active', !isOpen);
      btn.setAttribute('aria-expanded', String(!isOpen));
    }

    let currentFaqCategory = 'all';
    function filterFaq(cat, btn) {
      currentFaqCategory = cat;
      document.querySelectorAll('.faq-pill').forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-selected', 'false');
      });
      if (btn) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      }
      applyFaqFilters();
    }

    function applyFaqFilters() {
      const query = (document.getElementById('faqSearchInput').value || '').trim().toLowerCase();
      const clearBtn = document.getElementById('faqClearBtn');
      if (clearBtn) clearBtn.style.display = query.length > 0 ? 'flex' : 'none';

      const items = document.querySelectorAll('.faq-item');
      let visibleCount = 0;
      items.forEach(item => {
        const itemCat = item.getAttribute('data-category');
        const catMatch = (currentFaqCategory === 'all') || (itemCat === currentFaqCategory);
        const textContent = item.textContent.toLowerCase();
        const queryMatch = !query || textContent.includes(query);
        const show = catMatch && queryMatch;
        item.style.display = show ? 'block' : 'none';
        if (show) visibleCount++;
      });

      const noRes = document.getElementById('faqNoResults');
      if (noRes) noRes.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    function clearFaqSearch() {
      const input = document.getElementById('faqSearchInput');
      if (input) { input.value = ''; input.focus(); }
      currentFaqCategory = 'all';
      document.querySelectorAll('.faq-pill').forEach(p => {
        p.classList.toggle('active', p.getAttribute('data-category') === 'all');
      });
      applyFaqFilters();
    }

    // OS Auto-Detection for Downloads
    function autoDetectOS() {
      const ua = navigator.userAgent.toLowerCase();
      let detectedId = 'dl-card-windows';
      if (ua.includes('mac') || ua.includes('iphone') || ua.includes('ipad')) {
        detectedId = 'dl-card-mac';
      } else if (ua.includes('android')) {
        detectedId = 'dl-card-android';
      } else if (ua.includes('linux')) {
        detectedId = 'dl-card-linux';
      }

      document.querySelectorAll('.download-card').forEach(card => {
        if (card.id === detectedId) {
          card.classList.add('featured');
          const badge = card.querySelector('.download-badge');
          if (badge && !badge.textContent.includes('YOUR OS')) {
            badge.textContent += ' • DETECTED OS';
          }
        } else {
          card.classList.remove('featured');
        }
      });
    }

    // License Activation
    async function activateLicenseKey() {
      const input = document.getElementById('license-key-input');
      const key = (input && input.value || '').trim();
      if (!key) {
        alert('Please enter a valid License Key or Order ID from your receipt.');
        return;
      }
      const statusEl = document.getElementById('license-modal-status');
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.color = '#38bdf8';
        statusEl.textContent = 'Verifying cryptographic license with activation server...';
      }

      try {
        const res = await fetch('/api/license/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ license_key: key })
        });
        const data = await res.json();
        if (data && data.valid) {
          localStorage.setItem('ldoc_pro_unlocked', 'true');
          localStorage.setItem('ldoc_license_key', data.license_key || key);
          if (typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          if (statusEl) {
            statusEl.style.color = '#34d399';
            statusEl.textContent = '✓ License key verified! Workstation packages unlocked.';
          }
          alert('License Verified Successfully! All workstation download packages are now unlocked.');
        } else {
          const msg = (data && data.error) || 'Invalid or unverified license key. Check your receipt.';
          if (statusEl) {
            statusEl.style.color = '#f87171';
            statusEl.textContent = 'Error: ' + msg;
          }
        }
      } catch (err) {
        if (statusEl) {
          statusEl.style.color = '#f87171';
          statusEl.textContent = 'Network error reaching activation server.';
        }
      }
    }

    // Modal & Auth Handlers
    const LDocAuth = {
      getToken() { return localStorage.getItem('ldoc_auth_token'); },
      setToken(t) { localStorage.setItem('ldoc_auth_token', t); },
      removeToken() { localStorage.removeItem('ldoc_auth_token'); },
      getUser() {
        try { return JSON.parse(localStorage.getItem('ldoc_auth_user') || 'null'); } catch (e) { return null; }
      },
      setUser(u) { localStorage.setItem('ldoc_auth_user', JSON.stringify(u)); },
      removeUser() { localStorage.removeItem('ldoc_auth_user'); },
      isAuthenticated() { return !!this.getToken(); }
    };

    function showAuthModal() {
      const modal = document.getElementById('auth-modal');
      if (!modal) return;
      if (LDocAuth.isAuthenticated()) {
        const user = LDocAuth.getUser() || { name: 'Creator', email: 'user@ldoc.com', plan: 'free' };
        document.getElementById('auth-forms-container').style.display = 'none';
        document.getElementById('auth-profile-container').style.display = 'block';
        document.getElementById('profile-name').textContent = user.name || 'Creator';
        document.getElementById('profile-email').textContent = user.email || '';
        document.getElementById('profile-avatar').textContent = (user.name || user.email || 'U')[0].toUpperCase();
        document.getElementById('profile-plan').textContent = (user.plan || 'FREE').toUpperCase() + ' PLAN';
      } else {
        document.getElementById('auth-forms-container').style.display = 'block';
        document.getElementById('auth-profile-container').style.display = 'none';
      }
      modal.classList.add('active');
    }

    function closeAuthModal() {
      const modal = document.getElementById('auth-modal');
      if (modal) modal.classList.remove('active');
    }

    function initiateOAuth(provider) {
      const returnUrl = encodeURIComponent(window.location.origin + '/live-studio');
      window.location.href = \`/api/auth/oauth/\${provider}?redirect=\${returnUrl}\`;
    }

    function openLeadModal(tier) {
      const m = document.getElementById('lead-modal');
      if (!m) return;
      if (tier && document.getElementById('lead-tier')) {
        const select = document.getElementById('lead-tier');
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].text.toLowerCase().includes(tier.toLowerCase())) {
            select.selectedIndex = i;
            break;
          }
        }
      }
      m.classList.add('active');
    }

    function closeLeadModal() {
      const m = document.getElementById('lead-modal');
      if (m) m.classList.remove('active');
    }

    async function handleLeadSubmit(e) {
      e.preventDefault();
      const name = document.getElementById('lead-name').value;
      const email = document.getElementById('lead-email').value;
      const platform = document.getElementById('lead-platform').value;
      const tier = document.getElementById('lead-tier').value;
      const message = document.getElementById('lead-message').value;

      const btn = document.getElementById('lead-submit-btn');
      btn.textContent = 'Submitting...';
      btn.disabled = true;

      try {
        const res = await fetch('/api/leads/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, platform, tier, message })
        });
        const data = await res.json();
        document.getElementById('lead-reservation-form').style.display = 'none';
        const resultBox = document.getElementById('lead-result-container');
        resultBox.style.display = 'block';
        resultBox.innerHTML = \`
          <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:16px;margin-top:10px">
            <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:4px">Inquiry Received: \${data.lead_id || 'ENTERPRISE_TICKET'}</div>
            <div style="font-size:12px;color:#94a3b8">Thank you, \${name}. Our enterprise architecture team will contact you at \${email}.</div>
            <button class="ldoc-cloud-btn" style="width:100%;margin-top:12px;padding:8px" onclick="closeLeadModal()">Done</button>
          </div>
        \`;
      } catch (err) {
        alert('Error submitting inquiry: ' + err.message);
      } finally {
        btn.textContent = 'Submit Inquiry';
        btn.disabled = false;
      }
    }

    window.openLicenseHubModal = function(initialTab) {
      const modal = document.getElementById('license-hub-modal');
      if (!modal) return;
      modal.style.display = 'flex';
      switchLicenseHubTab(initialTab === 'retrieve' ? 'retrieve' : 'buy');
    };

    window.closeLicenseHubModal = function() {
      const modal = document.getElementById('license-hub-modal');
      if (modal) modal.style.display = 'none';
    };

    window.switchLicenseHubTab = function(tab) {
      const buyBtn = document.getElementById('tab-btn-buy');
      const retBtn = document.getElementById('tab-btn-retrieve');
      const buyContent = document.getElementById('tab-content-buy');
      const retContent = document.getElementById('tab-content-retrieve');
      if (tab === 'buy') {
        if (buyBtn) { buyBtn.style.background = '#0d1117'; buyBtn.style.borderBottom = '2px solid #f59e0b'; buyBtn.style.color = '#fef08a'; }
        if (retBtn) { retBtn.style.background = 'transparent'; retBtn.style.borderBottom = '2px solid transparent'; retBtn.style.color = '#94a3b8'; }
        if (buyContent) buyContent.style.display = 'block';
        if (retContent) retContent.style.display = 'none';
      } else {
        if (retBtn) { retBtn.style.background = '#0d1117'; retBtn.style.borderBottom = '2px solid #38bdf8'; retBtn.style.color = '#38bdf8'; }
        if (buyBtn) { buyBtn.style.background = 'transparent'; buyBtn.style.borderBottom = '2px solid transparent'; buyBtn.style.color = '#94a3b8'; }
        if (retContent) retContent.style.display = 'block';
        if (buyContent) buyContent.style.display = 'none';
      }
    };

    window.generateOrRetrieveHubKey = function() {
      const orderInput = document.getElementById('hub-order-id');
      const emailInput = document.getElementById('hub-email');
      const orderId = (orderInput && orderInput.value || '').trim();
      const email = (emailInput && emailInput.value || '').trim();

      if (!orderId && !email) {
        alert("Please enter the Order ID or Customer Email from your purchase receipt.");
        if (orderInput) orderInput.focus();
        return;
      }

      const seed = (orderId || email).toUpperCase();
      let p1 = 'VIP';
      if (/^[0-9]{4,}$/.test(orderId)) p1 = orderId;
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
      }
      const h1 = Math.abs(hash).toString(16).toUpperCase().padStart(4, '0').slice(-4);
      const h2 = Math.abs((hash * 31) | 0).toString(16).toUpperCase().padStart(4, '0').slice(-4);
      const key = \`LDOC-PRO-\${p1}-\${h1}-\${h2}\`;

      const resCard = document.getElementById('hub-key-result-card');
      const keyInp = document.getElementById('hub-generated-key');
      if (keyInp) keyInp.value = key;
      if (resCard) resCard.style.display = 'block';

      try {
        localStorage.setItem('ldoc_pro_unlocked', 'true');
        localStorage.setItem('ldoc_license_key', key);
      } catch (e) {}

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(key).catch(() => {});
      }
      if (typeof confetti === 'function') {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      }
    };

    window.copyHubGeneratedKey = function() {
      const keyInp = document.getElementById('hub-generated-key');
      if (!keyInp) return;
      keyInp.select();
      navigator.clipboard.writeText(keyInp.value);
      alert('License Key copied to clipboard! Paste into LDOC-Studio desktop to unlock.');
    };

    document.addEventListener('DOMContentLoaded', () => {
      autoDetectOS();
      const searchInput = document.getElementById('faqSearchInput');
      if (searchInput) searchInput.addEventListener('input', applyFaqFilters);
    });
  </script>

  <script src="/design-system.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js" defer></script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, '..', 'pricing.html'), content, 'utf8');
console.log('Successfully written redesigned pricing.html!');
