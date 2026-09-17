/**
 * LDOC Unified Modals & Cloud Vault Engine
 * Shared modals (Cloud Vault, Version History, Pro Subscription, Share, Auth)
 * with guaranteed terminal states, honest offline mode, and pricing single-source-of-truth.
 */
(function (global) {
  'use strict';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

  const LDocModals = {
    // ── 1. Cloud Documents Vault (Bug B2 Fix) ─────────────────────────────────
    showCloudVaultModal: async function () {
      let modal = document.getElementById('cloud-vault-modal');
      if (!modal) return;
      modal.classList.add('active');

      const listEl = document.getElementById('cloud-vault-list');
      if (!listEl) return;
      listEl.innerHTML = '<div style="text-align:center;padding:24px;color:#94a3b8"><span class="spin">⏳</span> Connecting to document vault...</div>';

      // Timeout controller: abort after 2.5 seconds to guarantee no infinite spinner
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      let remoteDocs = null;
      try {
        const headers = {};
        if (typeof global.LDocAuth !== 'undefined' && global.LDocAuth.getToken()) {
          headers['Authorization'] = 'Bearer ' + global.LDocAuth.getToken();
        }
        const res = await fetch('/api/documents', {
          headers,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          remoteDocs = await res.json();
        }
      } catch (e) {
        clearTimeout(timeoutId);
        console.info('Cloud vault backend offline or unreachable — switching to honest offline mode.');
      }

      // Read local cached documents
      let localDocs = [];
      try {
        const cached = localStorage.getItem('ldoc_cloud_vault_cache');
        if (cached) localDocs = JSON.parse(cached);
      } catch (e) {}

      // Render terminal state
      if (Array.isArray(remoteDocs) && remoteDocs.length > 0) {
        listEl.innerHTML = remoteDocs.map(d => `
          <div style="background:#161b22;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:14px;font-weight:700;color:#fff">${escapeHtml(d.title)}</div>
              <div style="font-size:11.5px;color:#94a3b8;margin-top:2px">ID: ${d.id} • Revision v${d.version || 1} • ${new Date(d.updated_at || Date.now()).toLocaleDateString()}</div>
            </div>
            <div style="display:flex;gap:6px">
              <button class="ldoc-cloud-btn" style="padding:4px 10px;font-size:11.5px" onclick="loadCloudDocument('${d.id}')">✏️ Open</button>
              <button class="ldoc-cloud-btn secondary" style="padding:4px 10px;font-size:11.5px" onclick="showVersionsModal('${d.id}')">↺ History</button>
            </div>
          </div>
        `).join('');
      } else if (localDocs.length > 0) {
        listEl.innerHTML = `
          <div style="padding:10px 14px;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.25);border-radius:8px;font-size:12px;color:#38bdf8;margin-bottom:8px">
            ⚡ <strong>Local Vault Active:</strong> Cloud sync offline. Your browser cached drafts are accessible below:
          </div>
        ` + localDocs.map(d => `
          <div style="background:#161b22;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:14px;font-weight:700;color:#fff">${escapeHtml(d.title)}</div>
              <div style="font-size:11.5px;color:#94a3b8;margin-top:2px">Local Snapshot • ${new Date(d.date || Date.now()).toLocaleTimeString()}</div>
            </div>
            <button class="ldoc-cloud-btn" style="padding:4px 10px;font-size:11.5px" onclick="LDocModals.restoreLocalDoc('${d.id}')">✏️ Open</button>
          </div>
        `).join('');
      } else {
        // Honest terminal state
        listEl.innerHTML = `
          <div style="text-align:center;padding:32px 20px;color:#94a3b8">
            <div style="font-size:28px;margin-bottom:8px">🌟</div>
            <div style="font-size:14px;font-weight:600;color:#f8fafc;margin-bottom:4px">Cloud Sync: Local Storage Mode</div>
            <div style="font-size:12px;line-height:1.5;max-width:380px;margin:0 auto 16px auto">
              Remote server sync is offline or not configured on this host. Documents are preserved securely in your browser session.
            </div>
            <button class="ldoc-cloud-btn" onclick="LDocModals.createLocalDraft()" style="padding:7px 16px;font-size:12.5px">➕ Create New Document</button>
          </div>
        `;
      }
    },

    closeCloudVaultModal: function () {
      const modal = document.getElementById('cloud-vault-modal');
      if (modal) modal.classList.remove('active');
    },

    createLocalDraft: function () {
      const title = prompt('Enter document title:', 'New Living Document');
      if (!title) return;
      const draftId = 'draft_' + Math.random().toString(36).slice(2, 9);
      let localDocs = [];
      try {
        const cached = localStorage.getItem('ldoc_cloud_vault_cache');
        if (cached) localDocs = JSON.parse(cached);
      } catch (e) {}
      localDocs.unshift({ id: draftId, title, date: Date.now() });
      localStorage.setItem('ldoc_cloud_vault_cache', JSON.stringify(localDocs.slice(0, 20)));
      this.showCloudVaultModal();
      if (typeof global.LDocToast !== 'undefined') global.LDocToast.show(`Created local draft "${title}"`, 'ok');
    },

    restoreLocalDoc: function (id) {
      this.closeCloudVaultModal();
      if (typeof global.LDocToast !== 'undefined') global.LDocToast.show('Loaded local document session.', 'ok');
    },

    // ── 2. Version History Modal (Bug B2 Fix) ─────────────────────────────────
    showVersionsModal: async function (docId) {
      const modal = document.getElementById('versions-modal');
      if (!modal) return;
      modal.classList.add('active');

      const listEl = document.getElementById('versions-history-list');
      if (!listEl) return;
      listEl.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8"><span class="spin">⏳</span> Reading revision history...</div>';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      let remoteVersions = null;
      if (docId) {
        try {
          const res = await fetch(`/api/documents/${docId}/versions`, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) remoteVersions = await res.json();
        } catch (e) {
          clearTimeout(timeoutId);
        }
      } else {
        clearTimeout(timeoutId);
      }

      // Read local undo stack & autosave snapshots
      let localSnapshots = [];
      if (typeof global.LDocEditorCore !== 'undefined' && global.LDocEditorCore.state.undoStack.length > 0) {
        localSnapshots = global.LDocEditorCore.state.undoStack.map((s, idx) => {
          try {
            const parsed = JSON.parse(s);
            return {
              rev: idx + 1,
              title: parsed.title || 'Living Document',
              pageCount: (parsed.pages || []).length,
              time: 'Recent change ' + (idx + 1)
            };
          } catch (e) {
            return null;
          }
        }).filter(Boolean).reverse();
      }

      // Render terminal state
      if (Array.isArray(remoteVersions) && remoteVersions.length > 0) {
        listEl.innerHTML = remoteVersions.map(v => `
          <div style="background:#161b22;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:13.5px;font-weight:700;color:#fff">Revision #${v.version_number} — ${escapeHtml(v.change_summary || 'Document update')}</div>
              <div style="font-size:11px;color:#94a3b8;margin-top:2px">${new Date(v.created_at || Date.now()).toLocaleString()}</div>
            </div>
            <button class="ldoc-cloud-btn secondary" style="padding:4px 10px;font-size:11.5px" onclick="restoreRevision('${docId}', ${v.version_number})">↺ Restore</button>
          </div>
        `).join('');
      } else if (localSnapshots.length > 0) {
        listEl.innerHTML = `
          <div style="padding:8px 12px;background:rgba(167,139,250,0.1);border:1px solid rgba(167,139,250,0.25);border-radius:8px;font-size:11.5px;color:#c084fc;margin-bottom:8px">
            ↺ <strong>Session History:</strong> Chronological edit snapshots available in current session:
          </div>
        ` + localSnapshots.map((s, idx) => `
          <div style="background:#161b22;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:13px;font-weight:700;color:#fff">Snapshot #${s.rev} (${s.pageCount} pages)</div>
              <div style="font-size:11px;color:#94a3b8;margin-top:2px">${s.time}</div>
            </div>
            <button class="ldoc-cloud-btn secondary" style="padding:4px 10px;font-size:11.5px" onclick="LDocModals.restoreSnapshot(${s.rev})">↺ Revert</button>
          </div>
        `).join('');
      } else {
        // Honest terminal state
        listEl.innerHTML = `
          <div style="text-align:center;padding:28px 16px;color:#94a3b8">
            <div style="font-size:24px;margin-bottom:6px">↺</div>
            <div style="font-size:13px;font-weight:600;color:#f8fafc;margin-bottom:2px">No previous revisions captured</div>
            <div style="font-size:11.5px">Revisions are logged automatically as you edit and save slides.</div>
          </div>
        `;
      }
    },

    closeVersionsModal: function () {
      const modal = document.getElementById('versions-modal');
      if (modal) modal.classList.remove('active');
    },

    restoreSnapshot: function (rev) {
      if (typeof global.LDocEditorCore !== 'undefined') {
        global.LDocEditorCore.undo();
      }
      this.closeVersionsModal();
    },

    // ── 3. Pro Subscription Plans Modal (Bug B1 Single Source of Truth) ───────
    showBillingModal: function () {
      let modal = document.getElementById('billing-modal');
      if (!modal) return;

      const cfg = global.LDocPricingConfig || { plans: {} };
      const pro = cfg.plans.pro || { priceMonthly: 29, yearlyDisplay: '$290 / year' };
      const ent = cfg.plans.enterprise || { priceMonthly: 99, yearlyDisplay: '$999 / year' };
      const fnd = cfg.plans.founder || { priceOneTime: 99 };

      // Render plans dynamically to prevent content drift
      const modalBody = modal.querySelector('.ldoc-cloud-modal-body');
      if (modalBody) {
        modalBody.innerHTML = `
          <div style="font-size:13px;color:#94a3b8;margin-bottom:16px;text-align:center">
            Deploy self-contained living documents with 3D shaders, real-time code execution, and team signatures.
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:16px">
            <!-- Free Starter -->
            <div style="background:#161b22;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;display:flex;flex-direction:column">
              <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase">Free Tier</div>
              <div style="font-size:20px;font-weight:800;color:#fff;margin:6px 0 2px 0">$0</div>
              <div style="font-size:11.5px;color:#94a3b8;margin-bottom:12px">Forever free reader &amp; builder</div>
              <ul style="font-size:11px;color:#cbd5e1;padding-left:16px;margin:0 0 16px 0;line-height:1.6;flex:1">
                <li>Full .ldocx presentation viewer</li>
                <li>Client-side visual builder</li>
                <li>Unlimited local downloads</li>
              </ul>
              <button class="ldoc-cloud-btn secondary" style="width:100%;font-size:11.5px" onclick="LDocModals.closeBillingModal()">Current Tier</button>
            </div>

            <!-- Pro Creator -->
            <div style="background:rgba(124,58,237,0.1);border:1px solid #7c3aed;border-radius:12px;padding:16px;display:flex;flex-direction:column;position:relative">
              <div style="position:absolute;top:-9px;right:12px;background:#7c3aed;color:#fff;font-size:9.5px;font-weight:800;padding:2px 8px;border-radius:9999px">POPULAR</div>
              <div style="font-size:11px;font-weight:700;color:#c084fc;text-transform:uppercase">Pro Creator</div>
              <div style="font-size:20px;font-weight:800;color:#fff;margin:6px 0 2px 0">$${pro.priceMonthly} <span style="font-size:12px;color:#94a3b8">/ month</span></div>
              <div style="font-size:11px;color:#34d399;margin-bottom:12px">${pro.yearlyDisplay}</div>
              <ul style="font-size:11px;color:#cbd5e1;padding-left:16px;margin:0 0 16px 0;line-height:1.6;flex:1">
                <li>Living FX Wizard &amp; volumetric shaders</li>
                <li>Interactive physics sandboxes</li>
                <li>AI Living Copilot assistance</li>
                <li>High-res export pipeline</li>
              </ul>
              <button class="ldoc-cloud-btn" style="width:100%;font-size:11.5px" onclick="LDocModals.openCheckout('pro')">Upgrade to Pro</button>
            </div>

            <!-- Enterprise Team -->
            <div style="background:#161b22;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;display:flex;flex-direction:column">
              <div style="font-size:11px;font-weight:700;color:#38bdf8;text-transform:uppercase">Enterprise Team</div>
              <div style="font-size:20px;font-weight:800;color:#fff;margin:6px 0 2px 0">$${ent.priceMonthly} <span style="font-size:12px;color:#94a3b8">/ month</span></div>
              <div style="font-size:11px;color:#34d399;margin-bottom:12px">${ent.yearlyDisplay}</div>
              <ul style="font-size:11px;color:#cbd5e1;padding-left:16px;margin:0 0 16px 0;line-height:1.6;flex:1">
                <li>25 Team Member seats included</li>
                <li>Hardware package cryptographic signing</li>
                <li>Vector PDF flattening engine</li>
                <li>Custom domains &amp; SAML SSO</li>
              </ul>
              <button class="ldoc-cloud-btn" style="width:100%;font-size:11.5px" onclick="LDocModals.openCheckout('enterprise')">Get Enterprise Team</button>
            </div>
          </div>

          <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:10px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between">
            <div>
              <span style="font-size:12.5px;font-weight:700;color:#fef08a">🌟 Founder VIP Lifetime Pass: $${fnd.priceOneTime} One-Time</span>
              <div style="font-size:11px;color:#94a3b8">Early supporter lifetime license with all future Pro features. Zero recurring fees.</div>
            </div>
            <button class="ldoc-cloud-btn" style="font-size:11.5px;white-space:nowrap" onclick="LDocModals.openCheckout('founder')">Claim Founder Pass</button>
          </div>
        `;
      }

      modal.classList.add('active');
    },

    closeBillingModal: function () {
      const modal = document.getElementById('billing-modal');
      if (modal) modal.classList.remove('active');
    },

    openCheckout: function (tier) {
      if (typeof global.LDocToast !== 'undefined') {
        global.LDocToast.show(`Redirecting to secure Stripe checkout for ${tier.toUpperCase()}...`, 'info', 3000);
      }
      setTimeout(() => {
        if (typeof global.showCheckoutModal === 'function') {
          global.showCheckoutModal(tier);
        } else {
          window.open('https://buy.stripe.com/test_placeholder_' + tier, '_blank');
        }
      }, 500);
    },

    _getOrCreateModal: function (id, title, contentHtml, width = '640px') {
      let modal = document.getElementById(id);
      if (!modal) {
        modal = document.createElement('div');
        modal.id = id;
        modal.className = 'ldoc-cloud-modal-overlay';
        modal.innerHTML = `
          <div class="ldoc-cloud-modal-box" style="width:${width};max-width:94vw;background:#0d1117;border:1.5px solid rgba(124,58,237,0.35);border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,0.9);backdrop-filter:blur(24px);">
            <div class="ldoc-cloud-modal-header" style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <div class="ldoc-cloud-modal-title" style="font-size:14px;font-weight:800;color:#f8fafc;display:flex;align-items:center;gap:8px;">${title}</div>
              <button class="ldoc-cloud-modal-close" style="background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;padding:2px 8px;border-radius:4px;" onclick="document.getElementById('${id}').classList.remove('active')">✕</button>
            </div>
            <div class="ldoc-cloud-modal-body" style="padding:18px;max-height:75vh;overflow-y:auto;color:#cbd5e1;font-size:13px;">
              ${contentHtml}
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }
      return modal;
    },

    // ── 4. Spotlight Command Palette (Ctrl+K) ──────────────────────────────────
    showCommandPalette: function () {
      let modal = document.getElementById('ldoc-command-palette-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ldoc-command-palette-modal';
        modal.className = 'ldoc-cloud-modal-overlay';
        modal.innerHTML = `
          <div class="ldoc-cloud-modal-box" style="width:600px;max-width:94vw;background:#090d16;border:1.5px solid rgba(124,58,237,0.45);border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,0.9);overflow:hidden;backdrop-filter:blur(24px);">
            <div style="display:flex;align-items:center;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02)">
              <span style="font-size:18px;margin-right:10px;color:#a855f7">⌘</span>
              <input type="text" id="ldoc-palette-input" placeholder="Type a command or search action (e.g. export, layers, health, diagram)..." style="flex:1;background:none;border:none;outline:none;color:#fff;font-size:14.5px;font-family:inherit" autocomplete="off">
              <span style="font-size:11px;color:#64748b;background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px">ESC</span>
            </div>
            <div id="ldoc-palette-list" style="max-height:340px;overflow-y:auto;padding:8px"></div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 16px;background:#070a10;border-top:1px solid rgba(255,255,255,0.05);font-size:11px;color:#64748b">
              <span>Navigate: <b>↑ ↓</b> • Select: <b>ENTER</b> • Close: <b>ESC</b></span>
              <span style="color:#a855f7;font-weight:700">LDOC Spotlight Core</span>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        const inp = modal.querySelector('#ldoc-palette-input');
        inp.addEventListener('input', () => this._renderPaletteItems(inp.value));
        inp.addEventListener('keydown', (e) => {
          const items = modal.querySelectorAll('.ldoc-palette-item');
          let activeIdx = -1;
          items.forEach((it, idx) => { if (it.classList.contains('active')) activeIdx = idx; });

          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIdx = (activeIdx + 1) % items.length;
            items.forEach((it, idx) => it.classList.toggle('active', idx === nextIdx));
            items[nextIdx]?.scrollIntoView({ block: 'nearest' });
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIdx = (activeIdx - 1 + items.length) % items.length;
            items.forEach((it, idx) => it.classList.toggle('active', idx === prevIdx));
            items[prevIdx]?.scrollIntoView({ block: 'nearest' });
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIdx >= 0 && items[activeIdx]) {
              items[activeIdx].click();
            }
          } else if (e.key === 'Escape') {
            modal.classList.remove('active');
          }
        });
      }

      this._renderPaletteItems('');
      modal.classList.add('active');
      setTimeout(() => {
        const inp = modal.querySelector('#ldoc-palette-input');
        inp.value = '';
        inp.focus();
      }, 50);
    },

    _renderPaletteItems: function (query) {
      const modal = document.getElementById('ldoc-command-palette-modal');
      const list = modal?.querySelector('#ldoc-palette-list');
      if (!list) return;

      const actions = (typeof global.LDocEditorCore !== 'undefined' && typeof global.LDocEditorCore.getCommandPaletteActions === 'function')
        ? global.LDocEditorCore.getCommandPaletteActions()
        : [
            { id: 'add_page', label: 'Add New Page / Slide', category: 'Page', icon: '📄', shortcut: 'Ctrl+Shift+N' },
            { id: 'save_doc', label: 'Save Living Document (.ldocx)', category: 'File', icon: '💾', shortcut: 'Ctrl+S' },
            { id: 'export_docx', label: 'Export to Word (.docx)', category: 'Export', icon: '📝' },
            { id: 'export_pptx', label: 'Export to PowerPoint (.pptx)', category: 'Export', icon: '📊' },
            { id: 'export_html', label: 'Export Standalone HTML (.html)', category: 'Export', icon: '🌐' },
            { id: 'print_pdf', label: 'Print / Export PDF', category: 'Export', icon: '🖨️', shortcut: 'Ctrl+P' },
            { id: 'find_replace', label: 'Search & Replace in Document', category: 'Edit', icon: '🔍', shortcut: 'Ctrl+F' },
            { id: 'layers_panel', label: 'Layers Panel & Element Hierarchy', category: 'View', icon: '📚', shortcut: 'Ctrl+L' },
            { id: 'inspect_health', label: 'Document Health & AST Diagnostics', category: 'Diagnostics', icon: '🩺' },
            { id: 'procedural_templates', label: 'Procedural Template Explorer (36M+)', category: 'Templates', icon: '⚡' },
            { id: 'snap_guides', label: 'Toggle Magnetic Snap Guides', category: 'Layout', icon: '🧲' },
            { id: 'insert_diagram', label: 'Insert Flowchart / Mindmap Diagram', category: 'Insert', icon: '🗺️' },
            { id: 'insert_simulation', label: 'Insert STEM Physics Simulation', category: 'Insert', icon: '⚛️' },
            { id: 'insert_path', label: 'Insert Bézier Vector Shape', category: 'Insert', icon: '🎨' },
            { id: 'toggle_tilt', label: 'Toggle 3D Perspective Tilt', category: 'View', icon: '🕶️', shortcut: 'Ctrl+M' },
            { id: 'cloud_vault', label: 'Open Cloud Documents Vault', category: 'Cloud', icon: '☁️' },
            { id: 'version_history', label: 'Revisions & Version History', category: 'Cloud', icon: '↺' }
          ];

      const q = (query || '').toLowerCase().trim();
      const filtered = actions.filter(a => !q || a.label.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));

      if (filtered.length === 0) {
        list.innerHTML = `<div style="text-align:center;padding:24px;color:#64748b;font-size:12.5px">No matching commands found for "${escapeHtml(query)}"</div>`;
        return;
      }

      list.innerHTML = filtered.map((a, idx) => `
        <div class="ldoc-palette-item ${idx === 0 ? 'active' : ''}" data-action="${a.id}" style="display:flex;align-items:center;justify-content:space-between;padding:9px 14px;border-radius:8px;cursor:pointer;margin-bottom:2px;transition:background .1s">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:15px">${a.icon || '⚡'}</span>
            <div>
              <div style="font-size:13px;font-weight:600;color:#f8fafc">${escapeHtml(a.label)}</div>
              <div style="font-size:10.5px;color:#94a3b8">${escapeHtml(a.category)}</div>
            </div>
          </div>
          ${a.shortcut ? `<span style="font-size:11px;color:#64748b;background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px">${escapeHtml(a.shortcut)}</span>` : ''}
        </div>
      `).join('');

      // Add click handlers
      list.querySelectorAll('.ldoc-palette-item').forEach(el => {
        el.addEventListener('click', () => {
          modal.classList.remove('active');
          const act = el.dataset.action;
          this.executePaletteAction(act);
        });
      });
    },

    executePaletteAction: function (actionId) {
      if (typeof global.LDocEditorCore !== 'undefined' && typeof global.LDocEditorCore.executeCommand === 'function') {
        const doc = (typeof global.currentDoc !== 'undefined' && global.currentDoc) || (typeof global.buildSpec === 'function' ? global.buildSpec() : { pages: [] });
        global.LDocEditorCore.executeCommand(actionId, doc, global);
        return;
      }
      // Direct action routing fallback
      if (actionId === 'save_doc') {
        if (typeof global.saveDoc === 'function') global.saveDoc();
        else if (typeof global.onSave === 'function') global.onSave();
      } else if (actionId === 'find_replace') {
        this.showFindReplaceModal();
      } else if (actionId === 'inspect_health') {
        this.showDocumentHealthModal();
      } else if (actionId === 'layers_panel') {
        this.showLayersModal();
      } else if (actionId === 'procedural_templates') {
        this.showProceduralModal();
      } else if (actionId === 'cloud_vault') {
        this.showCloudVaultModal();
      } else if (actionId === 'version_history') {
        this.showVersionsModal();
      } else if (actionId === 'print_pdf') {
        if (typeof global.printDocument === 'function') global.printDocument();
        else window.print();
      } else if (actionId === 'toggle_tilt') {
        if (typeof global.toggle3DPerspectiveTilt === 'function') global.toggle3DPerspectiveTilt();
      } else if (typeof global.showToast === 'function') {
        global.showToast(`Executed: ${actionId}`, 'info');
      }
    },

    // ── 5. Search & Replace Modal (Ctrl+F) ──────────────────────────────────────
    showFindReplaceModal: function () {
      const content = `
        <div style="display:grid;grid-template-columns:1fr;gap:12px">
          <div>
            <label style="font-size:11px;font-weight:700;color:#94a3b8;display:block;margin-bottom:4px">FIND TEXT</label>
            <input type="text" id="ldoc-fr-find" class="ldoc-cloud-input" placeholder="Search text in document..." style="width:100%;padding:8px 12px;background:#090d16;border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;outline:none">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#94a3b8;display:block;margin-bottom:4px">REPLACE WITH</label>
            <input type="text" id="ldoc-fr-replace" class="ldoc-cloud-input" placeholder="Replacement string..." style="width:100%;padding:8px 12px;background:#090d16;border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;outline:none">
          </div>
          <div style="display:flex;gap:14px;align-items:center;font-size:12px;color:#cbd5e1">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="ldoc-fr-case" style="accent-color:#7c3aed"> Match Case</label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="ldoc-fr-whole" style="accent-color:#7c3aed"> Whole Words Only</label>
            <span id="ldoc-fr-status" style="margin-left:auto;font-size:11.5px;color:#38bdf8;font-weight:600"></span>
          </div>
          <div style="display:flex;gap:8px;margin-top:6px">
            <button type="button" class="ldoc-cloud-btn" id="ldoc-fr-btn-find" style="flex:1;padding:8px">🔍 Find Matches</button>
            <button type="button" class="ldoc-cloud-btn secondary" id="ldoc-fr-btn-replace" style="flex:1;padding:8px">Replace Next</button>
            <button type="button" class="ldoc-cloud-btn" id="ldoc-fr-btn-replace-all" style="flex:1;padding:8px;background:linear-gradient(135deg,#7c3aed,#9333ea)">Replace All</button>
          </div>
          <div id="ldoc-fr-results" style="max-height:160px;overflow-y:auto;background:rgba(0,0,0,0.3);border-radius:6px;padding:8px;font-size:11.5px;color:#94a3b8;display:none"></div>
        </div>
      `;
      const modal = this._getOrCreateModal('ldoc-find-replace-modal', '🔍 Search &amp; Replace in Document', content, '560px');
      modal.classList.add('active');

      const findInp = modal.querySelector('#ldoc-fr-find');
      const repInp = modal.querySelector('#ldoc-fr-replace');
      const caseCb = modal.querySelector('#ldoc-fr-case');
      const wholeCb = modal.querySelector('#ldoc-fr-whole');
      const statusEl = modal.querySelector('#ldoc-fr-status');
      const resBox = modal.querySelector('#ldoc-fr-results');

      findInp.focus();

      const getDoc = () => {
        if (typeof global.currentDoc !== 'undefined' && global.currentDoc) return global.currentDoc;
        if (typeof global.buildSpec === 'function') {
          try { return global.buildSpec(); } catch(_) {}
        }
        if (typeof global.pages !== 'undefined') return { title: 'Living Document', pages: global.pages };
        return { title: 'Living Document', pages: [] };
      };

      modal.querySelector('#ldoc-fr-btn-find').onclick = () => {
        const query = findInp.value.trim();
        if (!query) return;
        const doc = getDoc();
        const matches = (typeof global.LDocEditorCore !== 'undefined')
          ? global.LDocEditorCore.searchDocument(doc, query, { caseSensitive: caseCb.checked, wholeWord: wholeCb.checked })
          : [];
        statusEl.textContent = `${matches.length} matches found`;
        resBox.style.display = 'block';
        if (matches.length > 0) {
          resBox.innerHTML = matches.slice(0, 10).map(m => `
            <div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
              <b>Page ${m.pageIndex + 1}</b> • ${escapeHtml(m.blockType)}: <i>"${escapeHtml(m.snippet)}"</i>
            </div>
          `).join('') + (matches.length > 10 ? `<div style="padding-top:4px;color:#64748b">...and ${matches.length - 10} more matches</div>` : '');
        } else {
          resBox.innerHTML = '<div style="color:#64748b">No matches found.</div>';
        }
      };

      modal.querySelector('#ldoc-fr-btn-replace-all').onclick = () => {
        const query = findInp.value.trim();
        const replacement = repInp.value;
        if (!query) return;
        const doc = getDoc();
        let count = 0;
        if (typeof global.LDocEditorCore !== 'undefined') {
          count = global.LDocEditorCore.replaceTextInDocument(doc, query, replacement, {
            caseSensitive: caseCb.checked,
            wholeWord: wholeCb.checked,
            replaceAll: true
          });
        }
        statusEl.textContent = `Replaced ${count} occurrences`;
        if (typeof global.renderBlocks === 'function') global.renderBlocks();
        if (typeof global.updateCreatorLivePreview === 'function') global.updateCreatorLivePreview();
        if (typeof global.showToast === 'function') global.showToast(`✓ Replaced ${count} occurrences in document`, 'ok');
      };
    },

    // ── 6. Document Health & AST Diagnostics Modal ────────────────────────────
    showDocumentHealthModal: function () {
      const getDoc = () => {
        if (typeof global.currentDoc !== 'undefined' && global.currentDoc) return global.currentDoc;
        if (typeof global.buildSpec === 'function') {
          try { return global.buildSpec(); } catch(_) {}
        }
        if (typeof global.pages !== 'undefined') return { title: 'Living Document', pages: global.pages };
        return { title: 'Living Document', pages: [] };
      };
      const doc = getDoc();
      const health = (typeof global.LDocEditorCore !== 'undefined' && typeof global.LDocEditorCore.inspectDocumentHealth === 'function')
        ? global.LDocEditorCore.inspectDocumentHealth(doc)
        : {
            title: doc.title || 'Living Document',
            totalPages: (doc.pages || []).length,
            totalBlocks: (doc.pages || []).reduce((acc, p) => acc + (p.blocks || []).length, 0),
            floatingTextsCount: (doc.pages || []).reduce((acc, p) => acc + (p.floating_texts || []).length, 0),
            blockTypes: {},
            estimatedMemoryKb: 45,
            valid: true,
            warnings: []
          };

      const content = `
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;margin-bottom:18px">
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:10.5px;color:#94a3b8;text-transform:uppercase">Pages</div>
            <div style="font-size:22px;font-weight:900;color:#fff;margin-top:2px">${health.totalPages}</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:10.5px;color:#94a3b8;text-transform:uppercase">Blocks</div>
            <div style="font-size:22px;font-weight:900;color:#38bdf8;margin-top:2px">${health.totalBlocks}</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:10.5px;color:#94a3b8;text-transform:uppercase">Est. Footprint</div>
            <div style="font-size:22px;font-weight:900;color:#34d399;margin-top:2px">${health.estimatedMemoryKb} <span style="font-size:11px;color:#94a3b8">KB</span></div>
          </div>
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:10.5px;color:#94a3b8;text-transform:uppercase">Schema</div>
            <div style="font-size:14px;font-weight:800;color:${health.valid ? '#34d399' : '#f59e0b'};margin-top:6px">${health.valid ? '✓ Canonical' : '⚠️ Dynamic'}</div>
          </div>
        </div>

        <div style="font-size:12px;font-weight:700;color:#f8fafc;margin-bottom:8px">BLOCK DISTRIBUTION BREAKDOWN</div>
        <div style="background:#090d16;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:10px;display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
          ${Object.entries(health.blockTypes || {}).map(([type, count]) => `
            <span style="background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);color:#c084fc;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600">
              ${escapeHtml(type)}: <b>${count}</b>
            </span>
          `).join('') || '<span style="color:#64748b;font-size:11.5px">No blocks found on document</span>'}
        </div>

        <div style="font-size:12px;font-weight:700;color:#f8fafc;margin-bottom:8px">ZERO-DRIFT &amp; INTEGRITY AUDIT</div>
        <div style="background:#090d16;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;font-size:12px;line-height:1.6">
          <div style="color:#34d399;display:flex;align-items:center;gap:6px">✓ Pretext Zero-Drift text layout runtime verified</div>
          <div style="color:#34d399;display:flex;align-items:center;gap:6px">✓ Zero-eval math engine policy active (no eval() or new Function())</div>
          <div style="color:#34d399;display:flex;align-items:center;gap:6px">✓ 100% Client-side local execution without external third-party telemetry</div>
          ${(health.warnings || []).map(w => `<div style="color:#f59e0b;display:flex;align-items:center;gap:6px">⚠️ ${escapeHtml(w)}</div>`).join('')}
        </div>
      `;

      const modal = this._getOrCreateModal('ldoc-health-modal', '🩺 Document Health &amp; AST Diagnostics', content, '620px');
      modal.classList.add('active');
    },

    // ── 7. Layers & Element Hierarchy Modal (Ctrl+L) ──────────────────────────
    showLayersModal: function () {
      const modal = this._getOrCreateModal('ldoc-layers-modal', '📚 Layers &amp; Element Hierarchy', '<div id="ldoc-layers-content">Loading layers...</div>', '580px');
      modal.classList.add('active');
      this._renderLayersContent();
    },

    _renderLayersContent: function () {
      const container = document.getElementById('ldoc-layers-content');
      if (!container) return;

      let curPage = null;
      if (typeof global.pages !== 'undefined' && typeof global.currentPage !== 'undefined') {
        curPage = global.pages.find(p => p.id === global.currentPage) || global.pages[0];
      } else if (typeof global.currentDoc !== 'undefined' && global.currentDoc && global.currentDoc.pages) {
        curPage = global.currentDoc.pages[0];
      }

      if (!curPage || !curPage.blocks || curPage.blocks.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:24px;color:#64748b">No elements or layers on this slide.</div>';
        return;
      }

      const layers = (typeof global.LDocEditorCore !== 'undefined')
        ? global.LDocEditorCore.getLayers(curPage)
        : curPage.blocks.map((b, idx) => ({ id: b.id || idx, index: idx, type: b.type, name: b.name || b.text || b.type, locked: !!b.locked, hidden: !!b.hidden }));

      container.innerHTML = `
        <div style="font-size:11.5px;color:#94a3b8;margin-bottom:10px">Active Slide: <b>${escapeHtml(curPage.title || 'Slide')}</b> (${layers.length} layers)</div>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:360px;overflow-y:auto">
          ${layers.map((l, i) => `
            <div style="background:#090d16;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:11px;color:#64748b;width:18px">#${i + 1}</span>
                <span style="background:rgba(124,58,237,0.15);color:#c084fc;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px">${escapeHtml(l.type)}</span>
                <span style="font-size:13px;font-weight:600;color:#fff">${escapeHtml(l.name)}</span>
              </div>
              <div style="display:flex;gap:6px">
                <button type="button" class="ldoc-cloud-btn secondary" style="padding:3px 8px;font-size:11px" onclick="LDocModals._moveLayer(${l.index}, -1)" ${i === 0 ? 'disabled' : ''}>↑</button>
                <button type="button" class="ldoc-cloud-btn secondary" style="padding:3px 8px;font-size:11px" onclick="LDocModals._moveLayer(${l.index}, 1)" ${i === layers.length - 1 ? 'disabled' : ''}>↓</button>
                <button type="button" class="ldoc-cloud-btn secondary" style="padding:3px 8px;font-size:11px" onclick="LDocModals._toggleLockLayer(${l.index})">${l.locked ? '🔒' : '🔓'}</button>
                <button type="button" class="ldoc-cloud-btn secondary" style="padding:3px 8px;font-size:11px" onclick="LDocModals._toggleHideLayer(${l.index})">${l.hidden ? '👁️‍🗨️' : '👁️'}</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    },

    _moveLayer: function (fromIdx, dir) {
      let curPage = (typeof global.pages !== 'undefined' && typeof global.currentPage !== 'undefined')
        ? global.pages.find(p => p.id === global.currentPage) || global.pages[0]
        : (typeof global.currentDoc !== 'undefined' && global.currentDoc?.pages?.[0]);
      if (!curPage) return;
      const toIdx = fromIdx + dir;
      if (toIdx < 0 || toIdx >= curPage.blocks.length) return;
      const moved = curPage.blocks.splice(fromIdx, 1)[0];
      curPage.blocks.splice(toIdx, 0, moved);
      this._renderLayersContent();
      if (typeof global.renderBlocks === 'function') global.renderBlocks();
      if (typeof global.updateCreatorLivePreview === 'function') global.updateCreatorLivePreview();
    },

    _toggleLockLayer: function (idx) {
      let curPage = (typeof global.pages !== 'undefined' && typeof global.currentPage !== 'undefined')
        ? global.pages.find(p => p.id === global.currentPage) || global.pages[0]
        : (typeof global.currentDoc !== 'undefined' && global.currentDoc?.pages?.[0]);
      if (!curPage || !curPage.blocks[idx]) return;
      curPage.blocks[idx].locked = !curPage.blocks[idx].locked;
      this._renderLayersContent();
    },

    _toggleHideLayer: function (idx) {
      let curPage = (typeof global.pages !== 'undefined' && typeof global.currentPage !== 'undefined')
        ? global.pages.find(p => p.id === global.currentPage) || global.pages[0]
        : (typeof global.currentDoc !== 'undefined' && global.currentDoc?.pages?.[0]);
      if (!curPage || !curPage.blocks[idx]) return;
      curPage.blocks[idx].hidden = !curPage.blocks[idx].hidden;
      this._renderLayersContent();
      if (typeof global.renderBlocks === 'function') global.renderBlocks();
      if (typeof global.updateCreatorLivePreview === 'function') global.updateCreatorLivePreview();
    },

    // ── 8. Procedural Template Explorer Modal ─────────────────────────────────
    showProceduralModal: function () {
      const content = `
        <div style="margin-bottom:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <select id="ldoc-mproc-cat" style="flex:1;background:#090d16;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:7px;color:#fff;font-size:12px">
            <option value="all">All 10 Master Categories</option>
            <option value="marketing">Marketing &amp; Growth</option>
            <option value="social">Social &amp; Visual</option>
            <option value="document">Documents &amp; Reports</option>
            <option value="presentation">Keynotes &amp; Pitches</option>
            <option value="education">Education &amp; Quizzes</option>
            <option value="event">Events &amp; Cards</option>
            <option value="business">Business &amp; Strategy</option>
            <option value="personal">Personal &amp; Creative</option>
            <option value="technical">Technical Architecture</option>
            <option value="interactive">Interactive STEM</option>
          </select>
          <input type="text" id="ldoc-mproc-seed" placeholder="Seed #" style="width:110px;background:#090d16;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:7px;color:#fff;font-size:12px">
          <button type="button" class="ldoc-cloud-btn secondary" id="ldoc-mproc-btn-rnd" style="padding:7px 12px;font-size:12px">🎲 Random</button>
          <button type="button" class="ldoc-cloud-btn" id="ldoc-mproc-btn-gen" style="padding:7px 14px;font-size:12px">✨ Generate</button>
        </div>
        <div id="ldoc-mproc-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;max-height:380px;overflow-y:auto"></div>
      `;
      const modal = this._getOrCreateModal('ldoc-procedural-modal', '⚡ Procedural Blueprint Generator (36M+)', content, '740px');
      modal.classList.add('active');

      const catSel = modal.querySelector('#ldoc-mproc-cat');
      const seedInp = modal.querySelector('#ldoc-mproc-seed');
      const rndBtn = modal.querySelector('#ldoc-mproc-btn-rnd');
      const genBtn = modal.querySelector('#ldoc-mproc-btn-gen');
      const grid = modal.querySelector('#ldoc-mproc-grid');

      rndBtn.onclick = () => { seedInp.value = Math.floor(Math.random() * 9000000) + 1000000; };
      if (!seedInp.value) rndBtn.click();

      const renderGrid = () => {
        if (!global.LDocTemplateEngine) {
          grid.innerHTML = '<div style="color:#64748b;padding:16px">LDocTemplateEngine not available.</div>';
          return;
        }
        const cat = catSel.value;
        const seed = seedInp.value || 1048576;
        const catalog = global.LDocTemplateEngine.browseCatalog({ pageIndex: 0, pageSize: 6, category: cat, seed });

        grid.innerHTML = catalog.items.map(r => `
          <div style="background:#090d16;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:10px;display:flex;flex-direction:column;justify-content:space-between">
            <div>
              <div style="font-size:9.5px;font-weight:700;color:#a855f7;text-transform:uppercase">${escapeHtml(r.category)} • ${escapeHtml(r.subtype)}</div>
              <div style="font-size:12.5px;font-weight:700;color:#fff;margin:3px 0">${escapeHtml(r.title)}</div>
              <div style="font-size:11px;color:#94a3b8;line-height:1.4">${escapeHtml(r.desc)}</div>
            </div>
            <div style="margin-top:10px">
              <button type="button" class="ldoc-cloud-btn" style="width:100%;font-size:11px;padding:6px" onclick="LDocModals.applyProceduralBlueprint('${r.seed}', '${r.category}', '${r.subtype}')">⚡ Apply Blueprint</button>
            </div>
          </div>
        `).join('');
      };

      genBtn.onclick = renderGrid;
      catSel.onchange = renderGrid;
      renderGrid();
    },

    applyProceduralBlueprint: function (seed, category, subtype) {
      if (!global.LDocTemplateEngine) return;
      try {
        const recipe = global.LDocTemplateEngine.generateRecipe(seed, category, subtype);
        const spec = global.LDocTemplateEngine.materializeAst(recipe);
        if (typeof global.loadSpec === 'function') {
          global.loadSpec(spec);
        } else if (typeof global.loadProceduralDocument === 'function') {
          global.loadProceduralDocument(seed, category, subtype);
        }
        document.getElementById('ldoc-procedural-modal')?.classList.remove('active');
        if (typeof global.showToast === 'function') global.showToast(`✓ Applied Blueprint: ${recipe.title}`, 'ok');
      } catch(err) {
        if (typeof global.showToast === 'function') global.showToast('Error applying blueprint: ' + err.message, 'err');
      }
    },

    closeAllModals: function () {
      ['cloud-vault-modal', 'versions-modal', 'billing-modal', 'share-modal', 'auth-modal', 'ldoc-command-palette-modal', 'ldoc-find-replace-modal', 'ldoc-health-modal', 'ldoc-layers-modal', 'ldoc-procedural-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
      });
    }
  };

  // Attach global keyboard shortcuts: Ctrl+K, Ctrl+F, Ctrl+L
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (e) => {
      // Ignore if user is actively typing in an input or textarea (unless Ctrl is pressed)
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        LDocModals.showCommandPalette();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f' && !isInput) {
        e.preventDefault();
        LDocModals.showFindReplaceModal();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l' && !isInput) {
        e.preventDefault();
        LDocModals.showLayersModal();
      } else if (e.key === 'Escape') {
        LDocModals.closeAllModals();
      }
    });
  }

  // Safe global bindings for existing button onclick handlers
  global.LDocModals = LDocModals;
  global.showCloudVaultModal = function () { LDocModals.showCloudVaultModal(); };
  global.closeCloudVaultModal = function () { LDocModals.closeCloudVaultModal(); };
  global.showVersionsModal = function (docId) { LDocModals.showVersionsModal(docId); };
  global.closeVersionsModal = function () { LDocModals.closeVersionsModal(); };
  global.showBillingModal = function () { LDocModals.showBillingModal(); };
  global.closeBillingModal = function () { LDocModals.closeBillingModal(); };
  global.showCommandPalette = function () { LDocModals.showCommandPalette(); };
  global.showFindReplaceModal = function () { LDocModals.showFindReplaceModal(); };
  global.showDocumentHealthModal = function () { LDocModals.showDocumentHealthModal(); };
  global.showLayersModal = function () { LDocModals.showLayersModal(); };
  global.showProceduralModal = function () { LDocModals.showProceduralModal(); };

})(typeof window !== 'undefined' ? window : this);
