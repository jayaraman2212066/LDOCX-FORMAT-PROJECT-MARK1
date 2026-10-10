/**
 * LDOC Studio — Design System Controller & Interactions
 * Industrial Precision UI/UX Engine (Figma/Linear/Vercel standard)
 * Zero external runtime dependencies. Strict 60fps transform/opacity animations.
 */

(function () {
  'use strict';

  // 1. THEME CONTROLLER (Dark-First with Light Mode Toggle)
  const THEME_KEY = 'ldoc_theme';
  
  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    // Default dark-first
    return 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    
    // Update all theme toggle buttons across DOM
    document.querySelectorAll('.ldoc-theme-toggle').forEach(btn => {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('title', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      const iconDark = btn.querySelector('.theme-icon-dark');
      const iconLight = btn.querySelector('.theme-icon-light');
      if (iconDark && iconLight) {
        if (theme === 'dark') {
          iconDark.style.display = 'block';
          iconLight.style.display = 'none';
        } else {
          iconDark.style.display = 'none';
          iconLight.style.display = 'block';
        }
      }
    });
  }

  function initTheme() {
    const theme = getPreferredTheme();
    applyTheme(theme);

    document.addEventListener('click', (e) => {
      const toggle = e.target.closest('.ldoc-theme-toggle');
      if (toggle) {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
      }
    });
  }

  // 2. DISMISSIBLE TOP BANNER
  function initBanner() {
    const BANNER_KEY = 'ldoc_banner_v250_dismissed';
    const banner = document.querySelector('.ldoc-pill-banner');
    if (!banner) return;

    if (sessionStorage.getItem(BANNER_KEY) === '1') {
      banner.style.display = 'none';
      return;
    }

    const closeBtn = banner.querySelector('.ldoc-banner-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        banner.style.transition = 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(-10px)';
        banner.style.maxHeight = '0px';
        banner.style.padding = '0';
        banner.style.margin = '0';
        banner.style.overflow = 'hidden';
        sessionStorage.setItem(BANNER_KEY, '1');
        setTimeout(() => {
          banner.style.display = 'none';
        }, 260);
      });
    }
  }

  // 3. COMMAND PALETTE (Ctrl/Cmd + K)
  const COMMAND_ITEMS = [
    { title: 'Home Overview', desc: 'Vanguard-7 living demo, engine benchmarks & architecture', href: '/', category: 'Navigation', icon: 'home' },
    { title: 'Interactive Features', desc: 'Spatial 3D canvas, reactive formulas, Merkle verification', href: '/features', category: 'Product', icon: 'zap' },
    { title: 'Format Specification v2.5.0', desc: 'Pretext layout, Merkle tree AST, zip container structure', href: '/format', category: 'Developers', icon: 'file-text' },
    { title: 'Live Studio Editor', desc: 'Launch full browser IDE, slide generator & 3D inspector', href: '/live-studio', category: 'Product', icon: 'edit' },
    { title: 'Creator Studio Pro', desc: 'Professional authoring suite, slide master & template builder', href: '/creator', category: 'Product', icon: 'layers' },
    { title: 'Models & Template Hub', desc: 'Living document templates, 3D assets & verified samples', href: '/models', category: 'Resources', icon: 'grid' },
    { title: 'Pricing & Licensing', desc: 'Community $0, Studio Pro $19 lifetime, Cloud $79, Enterprise $499', href: '/pricing', category: 'Commercial', icon: 'credit-card' },
    { title: 'Documentation & SDK', desc: '@ldoc/sdk NPM guide, CLI toolchain, offline API docs', href: '/docs', category: 'Developers', icon: 'book' },
    { title: 'Release Changelog', desc: 'Version history, AST engine updates, security patches', href: '/changelog', category: 'Updates', icon: 'git-commit' },
    { title: 'Security & Air-Gap Model', desc: 'Cryptographic Merkle verification, zero-network sandbox', href: '/security', category: 'Security', icon: 'shield' },
    { title: 'Download Desktop Suite (Win/Mac/Linux)', desc: 'Official signed offline desktop applications', href: '/pricing#downloads', category: 'Downloads', icon: 'download' },
    { title: 'License Activation Hub', desc: 'Redeem or verify your lifetime offline product key', href: '/license', category: 'Commercial', icon: 'key' }
  ];

  function getIconSvg(iconName) {
    const svgs = {
      home: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
      zap: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
      'file-text': '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
      edit: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
      layers: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>',
      grid: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
      'credit-card': '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>',
      book: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
      'git-commit': '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><line x1="1.05" y1="12" x2="7" y2="12"></line><line x1="17.05" y1="12" x2="23" y2="12"></line></svg>',
      shield: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
      download: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
      key: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1.5-1.5L8 9a5 5 0 1 0 7.07 7.07l5.93-5.93a1 1 0 0 0 0-1.41l-2-2a1 1 0 0 0-1.41 0z"></path><circle cx="7" cy="17" r="2"></circle></svg>'
    };
    return svgs[iconName] || svgs.home;
  }

  function createCommandPalette() {
    if (document.getElementById('ldoc-cmd-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'ldoc-cmd-modal';
    modal.className = 'ldoc-cmd-modal';
    modal.innerHTML = `
      <div class="ldoc-cmd-backdrop"></div>
      <div class="ldoc-cmd-window" role="dialog" aria-modal="true" aria-label="Command Menu">
        <div class="ldoc-cmd-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" class="ldoc-cmd-input" placeholder="Type a route, doc, or command (e.g. features, sdk, pricing)..." autocomplete="off" spellcheck="false" />
          <kbd class="ldoc-kbd">ESC</kbd>
        </div>
        <div class="ldoc-cmd-list" role="listbox"></div>
        <div class="ldoc-cmd-footer">
          <span><kbd class="ldoc-kbd">&uarr;</kbd> <kbd class="ldoc-kbd">&darr;</kbd> Navigate</span>
          <span><kbd class="ldoc-kbd">&crarr;</kbd> Select</span>
          <span><kbd class="ldoc-kbd">ESC</kbd> Close</span>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const input = modal.querySelector('.ldoc-cmd-input');
    const list = modal.querySelector('.ldoc-cmd-list');
    const backdrop = modal.querySelector('.ldoc-cmd-backdrop');
    let selectedIndex = 0;
    let currentResults = [...COMMAND_ITEMS];

    function renderList(items) {
      currentResults = items;
      selectedIndex = 0;
      if (items.length === 0) {
        list.innerHTML = `<div class="ldoc-cmd-empty">No results found for "${escapeHtml(input.value)}"</div>`;
        return;
      }
      list.innerHTML = items.map((item, idx) => `
        <div class="ldoc-cmd-item ${idx === 0 ? 'selected' : ''}" data-index="${idx}" data-href="${item.href}" role="option" aria-selected="${idx === 0}">
          <div class="ldoc-cmd-icon">${getIconSvg(item.icon)}</div>
          <div class="ldoc-cmd-info">
            <div class="ldoc-cmd-title">${item.title}</div>
            <div class="ldoc-cmd-desc">${item.desc}</div>
          </div>
          <span class="ldoc-cmd-tag">${item.category}</span>
        </div>
      `).join('');

      list.querySelectorAll('.ldoc-cmd-item').forEach(el => {
        el.addEventListener('mouseenter', () => {
          updateSelected(parseInt(el.getAttribute('data-index'), 10));
        });
        el.addEventListener('click', () => {
          navigate(el.getAttribute('data-href'));
        });
      });
    }

    function updateSelected(newIndex) {
      selectedIndex = Math.max(0, Math.min(newIndex, currentResults.length - 1));
      list.querySelectorAll('.ldoc-cmd-item').forEach((el, idx) => {
        const isSel = idx === selectedIndex;
        el.classList.toggle('selected', isSel);
        el.setAttribute('aria-selected', isSel);
        if (isSel) {
          el.scrollIntoView({ block: 'nearest' });
        }
      });
    }

    function navigate(href) {
      if (!href) return;
      closeModal();
      window.location.href = href;
    }

    function openModal() {
      modal.classList.add('open');
      input.value = '';
      renderList(COMMAND_ITEMS);
      setTimeout(() => input.focus(), 50);
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }

    backdrop.addEventListener('click', closeModal);

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        renderList(COMMAND_ITEMS);
      } else {
        const filtered = COMMAND_ITEMS.filter(item => 
          item.title.toLowerCase().includes(q) ||
          item.desc.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
        renderList(filtered);
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        updateSelected(selectedIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        updateSelected(selectedIndex - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentResults[selectedIndex]) {
          navigate(currentResults[selectedIndex].href);
        }
      } else if (e.key === 'Escape') {
        closeModal();
      }
    });

    // Global shortcut listener
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (modal.classList.contains('open')) {
          closeModal();
        } else {
          openModal();
        }
      }
    });

    // Delegate button triggers
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-cmd-palette-trigger]')) {
        e.preventDefault();
        openModal();
      }
    });
  }

  // 4. MOBILE DRAWER MENU
  function initMobileMenu() {
    const toggles = document.querySelectorAll('.ldoc-mobile-toggle');
    const menu = document.querySelector('.ldoc-mobile-menu');
    if (!toggles.length || !menu) return;

    toggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        const isOpen = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });
    });

    menu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        menu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // 5. ACCORDION LOGIC
  function initAccordions() {
    document.addEventListener('click', (e) => {
      const header = e.target.closest('.ldoc-accordion-header');
      if (!header) return;

      const item = header.closest('.ldoc-accordion-item');
      if (!item) return;

      const isOpen = item.classList.contains('open');
      const parent = item.closest('.ldoc-accordion');

      // Optionally close siblings if in exclusive accordion
      if (parent && parent.hasAttribute('data-exclusive')) {
        parent.querySelectorAll('.ldoc-accordion-item').forEach(sib => {
          if (sib !== item) {
            sib.classList.remove('open');
            const h = sib.querySelector('.ldoc-accordion-header');
            if (h) h.setAttribute('aria-expanded', 'false');
          }
        });
      }

      item.classList.toggle('open', !isOpen);
      header.setAttribute('aria-expanded', !isOpen);
    });
  }

  // 6. CODE BLOCK COPY & TABS
  function initCodeBlocks() {
    document.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('.ldoc-code-copy');
      if (!copyBtn) return;

      const codeBox = copyBtn.closest('.ldoc-code-box, pre');
      if (!codeBox) return;

      const codeEl = codeBox.querySelector('code') || codeBox;
      const text = codeEl.innerText || codeEl.textContent;

      navigator.clipboard.writeText(text).then(() => {
        const origHtml = copyBtn.innerHTML;
        copyBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span style="color:var(--emerald);font-size:11px;font-weight:600;">Copied</span>
        `;
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.innerHTML = origHtml;
          copyBtn.classList.remove('copied');
        }, 2000);
      }).catch(err => {
        console.warn('Clipboard write failed:', err);
      });
    });

    // Tab buttons inside code box headers
    document.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.ldoc-code-tab');
      if (!tabBtn) return;

      const tabsContainer = tabBtn.closest('.ldoc-code-tabs');
      const box = tabBtn.closest('.ldoc-code-box');
      if (!tabsContainer || !box) return;

      const targetId = tabBtn.getAttribute('data-tab');
      tabsContainer.querySelectorAll('.ldoc-code-tab').forEach(b => b.classList.remove('active'));
      tabBtn.classList.add('active');

      box.querySelectorAll('.ldoc-code-tab-content').forEach(c => {
        if (c.getAttribute('data-tab-content') === targetId) {
          c.classList.add('active');
          c.style.display = 'block';
        } else {
          c.classList.remove('active');
          c.style.display = 'none';
        }
      });
    });
  }

  // 7. CARD 3D TILT & CURSOR GLOW
  function initTiltAndGlow() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if ('ontouchstart' in window) return;

    const cards = document.querySelectorAll('.ldoc-tilt-card, .ldoc-card-glow, .ldoc-card');

    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);

        if (card.classList.contains('ldoc-tilt-card')) {
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateX = ((y - centerY) / centerY) * -5;
          const rotateY = ((x - centerX) / centerX) * 5;

          card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(4px)`;
        }
      });

      card.addEventListener('mouseleave', () => {
        if (card.classList.contains('ldoc-tilt-card')) {
          card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
          card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        }
      });

      card.addEventListener('mouseenter', () => {
        if (card.classList.contains('ldoc-tilt-card')) {
          card.style.transition = 'none';
        }
      });
    });
  }

  // 8. OS AUTO-DETECTION FOR DOWNLOAD BUTTONS
  function initOsDetection() {
    const ua = navigator.userAgent || '';
    let os = 'Windows';
    let file = 'LDOC-Studio-Setup-2.5.0.exe';
    let label = 'Download for Windows';
    let badge = 'v2.5.0 .exe (Win 10/11 x64)';

    if (/Macintosh|Mac OS X/i.test(ua)) {
      os = 'macOS';
      file = 'LDOC-Studio-2.5.0-arm64.dmg';
      label = 'Download for macOS';
      badge = 'v2.5.0 Apple Silicon / Intel DMG';
    } else if (/Linux/i.test(ua)) {
      os = 'Linux';
      file = 'LDOC-Studio-2.5.0.AppImage';
      label = 'Download for Linux';
      badge = 'v2.5.0 AppImage / .deb';
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      os = 'iOS';
      file = '#';
      label = 'Get for iPad / iOS';
      badge = 'App Store Preview';
    }

    document.querySelectorAll('[data-os-detect-cta]').forEach(cta => {
      cta.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        <span>${label}</span>
      `;
      if (file !== '#') {
        cta.setAttribute('href', `/downloads/${file}`);
        cta.setAttribute('download', file);
      }
    });

    document.querySelectorAll('[data-os-detect-badge]').forEach(el => {
      el.textContent = `Auto-detected: ${badge}`;
    });
  }

  // 9. NAVBAR SCROLL EFFECT
  function initNavbarScroll() {
    const nav = document.querySelector('.ldoc-navbar');
    if (!nav) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  // UTILITY
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // INITIALIZE ON DOM READY
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  function bootstrap() {
    initTheme();
    initBanner();
    createCommandPalette();
    initMobileMenu();
    initAccordions();
    initCodeBlocks();
    initTiltAndGlow();
    initOsDetection();
    initNavbarScroll();
  }

  // Expose global controller
  window.LDOC_DS = {
    applyTheme,
    getPreferredTheme,
    COMMAND_ITEMS
  };
})();
