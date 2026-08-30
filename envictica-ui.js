document.addEventListener('DOMContentLoaded', () => {
  /*
   * Envictica — Global Interface Controls
   * Handles route normalization, system modals, navigation controls,
   * and explicit action buttons.
   */
  // ------------------------------------------------------------
  // Route normalization
  // ------------------------------------------------------------
  const routeMap = {
    'pipeline-ingest': 'pipeline-injest.html',
    'board-roi': 'board-ROI-report-final.html',
    'command-center': 'command-center.html',
    'risk-matrix': 'risk-matrix.html',
    'schema-library': 'schema-library.html'
  };
  document.querySelectorAll('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href');
    if (!href) return;
    for (const [route, target] of Object.entries(routeMap)) {
      if (href.includes(route) && !href.endsWith('.html')) {
        anchor.setAttribute('href', target);
        break;
      }
    }
  });
  // ------------------------------------------------------------
  // Modal system
  // ------------------------------------------------------------
  function closeModal() {
    document.getElementById('envictica-modal')?.remove();
  }
  function createModal(title, contentHTML) {
    closeModal();
    const modal = document.createElement('div');
    modal.id = 'envictica-modal';
    modal.className =
      'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm';
    modal.innerHTML = `
      <div
        class="bg-slate-900 border border-[#00F5D4]/30 rounded-lg p-6 max-w-lg w-full shadow-2xl relative space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="envictica-modal-title"
      >
        <div class="flex justify-between items-center border-b border-white/10 pb-3">
          <h3
            id="envictica-modal-title"
            class="text-lg font-bold text-[#00F5D4] tracking-wider uppercase"
          >
            ${title}
          </h3>
          <button
            type="button"
            class="modal-close text-slate-400 hover:text-white text-xl"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div class="text-sm text-slate-300 space-y-3 font-mono">
          ${contentHTML}
        </div>
        <div class="pt-2 flex justify-end">
          <button
            type="button"
            class="modal-close px-4 py-2 bg-[#00F5D4] text-black font-bold text-xs uppercase rounded"
          >
            Close
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('.modal-close').forEach((button) => {
      button.addEventListener('click', closeModal);
    });
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });
  }
  // ------------------------------------------------------------
  // Settings
  // ------------------------------------------------------------
  document.querySelectorAll('.material-symbols-outlined').forEach((icon) => {
    const iconName = icon.textContent.trim();
    const trigger = icon.parentElement;
    if (!trigger) return;
    if (iconName === 'settings') {
      trigger.style.cursor = 'pointer';
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        createModal(
          'System Settings',
          `
            <div class="space-y-2">
              <label class="block text-xs text-slate-400">
                Environment Node
              </label>
              <input
                type="text"
                value="us-east-aws-prod-06"
                class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                readonly
              />
              <label class="block text-xs text-slate-400">
                Telemetry Sampling
              </label>
              <select
                class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
              >
                <option>100% High Fidelity</option>
                <option>50% Adaptive</option>
              </select>
            </div>
          `
        );
      });
    }
    // ----------------------------------------------------------
    // Notifications
    // ----------------------------------------------------------
    if (iconName === 'notifications') {
      trigger.style.cursor = 'pointer';
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        createModal(
          'Active Alerts',
          `
            <p class="text-emerald-400">
              ✓ Pipeline ingestion rates stable.
            </p>
            <p class="text-amber-400">
              ⚠ Risk Matrix contains active anomalies requiring review.
            </p>
          `
        );
      });
    }
  });
  // ------------------------------------------------------------
  // Explicit action controls
  // ------------------------------------------------------------
  document
    .querySelectorAll('button[data-envictica-action], .btn-action[data-envictica-action]')
    .forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const action = button.dataset.envicticaAction;
        switch (action) {
          case 'audit':
            createModal(
              'Audit Execution',
              `
                <p class="text-[#00F5D4]">
                  System audit initiated.
                </p>
                <div class="w-full bg-slate-800 h-2 rounded overflow-hidden mt-2">
                  <div class="bg-[#00F5D4] h-full w-2/3 animate-pulse"></div>
                </div>
              `
            );
            break;
          case 'intervene':
          case 'override':
            createModal(
              'Manual Override',
              `
                <p class="text-rose-400">
                  Circuit-breaker intervention initiated.
                  Downstream processing has been flagged for review.
                </p>
              `
            );
            break;
          case 'sync':
            createModal(
              'Database Sync',
              `
                <p class="text-[#00F5D4]">
                  Schema synchronization initiated.
                </p>
              `
            );
            break;
          default:
            createModal(
              'System Action',
              `
                <p class="text-[#00F5D4]">
                  The requested system action has been registered.
                </p>
              `
            );
        }
      });
    });
});
