/**
 * LDOC Studio — Universal Master Interactive & Motion Engine
 * Scroll-Reveal Staggers, Ambient Layer, Spotlight Tracker, Top Progress Bar,
 * Command Palette (Ctrl+K), and 3D Card Tilt.
 */

(function () {
  'use strict';

  // ── 1. GLOBAL AMBIENT BACKGROUND INJECTION ──
  function injectAmbientBackground() {
    if (document.querySelector('.ldoc-ambient-background')) return;

    const bg = document.createElement('div');
    bg.className = 'ldoc-ambient-background';
    bg.innerHTML = `
      <div class="ldoc-ambient-grid"></div>
      <div class="ldoc-ambient-orb orb-amber"></div>
      <div class="ldoc-ambient-orb orb-violet"></div>
      <div class="ldoc-ambient-noise"></div>
    `;
    document.body.prepend(bg);
  }

  // ── 2. SCROLL PROGRESS BAR & PILL NAVBAR SCROLL STATE ──
  function initScrollProgressAndNavbar() {
    let progressBar = document.getElementById('ldoc-scroll-progress');
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.id = 'ldoc-scroll-progress';
      document.body.prepend(progressBar);
    }

    const pillNav = document.querySelector('.ldoc-pill-navbar');

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progressBar.style.width = `${progress}%`;

      if (pillNav) {
        if (scrollTop > 24) {
          pillNav.classList.add('scrolled');
        } else {
          pillNav.classList.remove('scrolled');
        }
      }
    }, { passive: true });
  }

  // ── 3. STAGGERED SCROLL-REVEAL ENGINE ──
  function initScrollRevealEngine() {
    const revealElements = document.querySelectorAll('.ldoc-reveal');
    if (!revealElements.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry, idx) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const delay = el.getAttribute('data-delay') || (idx * 60) + 'ms';
            el.style.transitionDelay = delay;
            el.classList.add('revealed');
            obs.unobserve(el);
          }
        });
      }, {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px'
      });

      revealElements.forEach(el => observer.observe(el));

      // Safety fallback: ensure nothing stays hidden if user scrolls quickly or headless audits run
      setTimeout(() => {
        revealElements.forEach(el => el.classList.add('revealed'));
      }, 1500);
    } else {
      // Direct fallback
      revealElements.forEach(el => el.classList.add('revealed'));
    }
  }

  // ── 4. CURSOR-FOLLOWING SPOTLIGHT CARD TRACKER ──
  function initSpotlightTracker() {
    const cards = document.querySelectorAll('.ldoc-spotlight-card');
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    });
  }

  // ── 5. 3D CARD TILT INTERACTION ──
  function initTiltInteraction() {
    const tiltElements = document.querySelectorAll('.ldoc-tilt-card');
    tiltElements.forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - (rect.width / 2);
        const y = e.clientY - rect.top - (rect.height / 2);
        const rotateX = -(y / (rect.height / 2)) * 8;
        const rotateY = (x / (rect.width / 2)) * 8;
        el.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
        el.style.transition = 'transform 0.08s ease-out';
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        el.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      });
    });
  }

  // ── 6. NUMBER COUNT-UP ANIMATION ──
  function initCountUpAnimation() {
    const counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseFloat(el.getAttribute('data-counter') || '0');
          const prefix = el.getAttribute('data-prefix') || '';
          const suffix = el.getAttribute('data-suffix') || '';
          const duration = 1200;
          const startTime = performance.now();

          function updateCounter(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(ease * target);
            el.textContent = `${prefix}${current.toLocaleString()}${suffix}`;
            if (progress < 1) {
              requestAnimationFrame(updateCounter);
            } else {
              el.textContent = `${prefix}${target.toLocaleString()}${suffix}`;
            }
          }

          requestAnimationFrame(updateCounter);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.2 });

    counters.forEach(c => observer.observe(c));
  }

  // ── 7. COMMAND PALETTE (Ctrl / Cmd + K) ──
  const COMMANDS = [
    { title: 'Home Overview', desc: 'Vanguard-7 living demo, engine benchmarks & architecture', href: '/' },
    { title: 'Interactive Features', desc: 'Spatial 3D canvas, reactive formulas, Merkle verification', href: '/features' },
    { title: 'Format Specification v2.5.0', desc: 'Pretext layout, Merkle tree AST, zip container structure', href: '/format' },
    { title: 'Live Studio Editor', desc: 'Launch full browser IDE, slide generator & 3D inspector', href: '/live-studio' },
    { title: 'Creator Studio Pro', desc: 'Visual block composer & presentation builder', href: '/creator' },
    { title: 'Models & Template Hub', desc: 'Living document templates, 3D assets & verified blueprints', href: '/models' },
    { title: 'Pricing & Licensing', desc: 'Community $0, Studio Pro $19 lifetime, Cloud $79, Enterprise $499', href: '/pricing' },
    { title: 'Documentation & SDK', desc: '@ldoc/sdk NPM guide, CLI toolchain, offline API docs', href: '/docs' },
    { title: 'Release Changelog', desc: 'Version history, AST engine updates, security patches', href: '/changelog' },
    { title: 'Security & Air-Gap Model', desc: 'Cryptographic Merkle verification, zero-network sandbox', href: '/security' }
  ];

  function initCommandPalette() {
    if (document.getElementById('ldoc-cmd-palette')) return;

    const modal = document.createElement('div');
    modal.id = 'ldoc-cmd-palette';
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(8,9,14,0.8);backdrop-filter:blur(16px);
      z-index:99999;display:none;align-items:flex-start;justify-content:center;padding-top:14vh;
    `;
    modal.innerHTML = `
      <div style="background:#0e1018;border:1px solid rgba(255,255,255,0.12);border-radius:16px;max-width:580px;width:92%;box-shadow:0 24px 60px rgba(0,0,0,0.85);overflow:hidden">
        <div style="display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.08)">
          <span style="color:#f59e0b;font-size:14px">⌘</span>
          <input type="text" id="ldoc-cmd-input" placeholder="Type a route or command (features, studio, pricing)..." style="background:none;border:none;color:#fff;font-size:14px;outline:none;flex:1;font-family:inherit" />
          <kbd style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.14);border-radius:5px;padding:2px 6px;font-size:10.5px;color:#94a3b8;font-family:monospace">ESC</kbd>
        </div>
        <div id="ldoc-cmd-results" style="max-height:340px;overflow-y:auto;padding:8px"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 18px;background:rgba(0,0,0,0.25);border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:#64748b">
          <span>LDOC Living Document System</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = document.getElementById('ldoc-cmd-input');
    const results = document.getElementById('ldoc-cmd-results');

    function renderList(query) {
      const q = (query || '').toLowerCase().trim();
      const filtered = COMMANDS.filter(c => c.title.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));
      results.innerHTML = filtered.map(c => `
        <a href="${c.href}" style="display:flex;flex-direction:column;gap:3px;padding:10px 14px;border-radius:8px;text-decoration:none;transition:background .12s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='transparent'">
          <div style="font-size:13.5px;font-weight:600;color:#f8fafc">${c.title}</div>
          <div style="font-size:11.5px;color:#94a3b8">${c.desc}</div>
        </a>
      `).join('');
    }

    renderList('');
    input?.addEventListener('input', (e) => renderList(e.target.value));

    window.openCommandPalette = () => {
      modal.style.display = 'flex';
      setTimeout(() => input?.focus(), 50);
    };

    window.closeCommandPalette = () => {
      modal.style.display = 'none';
      if (input) input.value = '';
    };

    modal.addEventListener('click', (e) => {
      if (e.target === modal) window.closeCommandPalette();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        modal.style.display === 'flex' ? window.closeCommandPalette() : window.openCommandPalette();
      }
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        window.closeCommandPalette();
      }
    });
  }

  // ── 8. INITIALIZATION ──
  document.addEventListener('DOMContentLoaded', () => {
    injectAmbientBackground();
    initScrollProgressAndNavbar();
    initScrollRevealEngine();
    initSpotlightTracker();
    initTiltInteraction();
    initCountUpAnimation();
    initCommandPalette();
  });
})();
