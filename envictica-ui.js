document.addEventListener('DOMContentLoaded', () => {
  // 1. Automatic link routing normalization
  const routeMap = {
    'pipeline-ingest': 'pipeline-injest.html',
    'board-roi': 'board-ROI-report-final.html',
    'command-center': 'command-center.html',
    'risk-matrix': 'risk-matrix.html',
    'schema-library': 'schema-library.html'
  };

  document.querySelectorAll('a').forEach(anchor => {
    let href = anchor.getAttribute('href');
    if (href) {
      Object.keys(routeMap).forEach(key => {
        if (href.includes(key) && !href.endsWith('.html')) {
          anchor.setAttribute('href', routeMap[key]);
        }
      });
    }
  });

  // 2. Global Modal Builder for Settings, Alerts, & Audits
  const createModal = (title, contentHTML) => {
    const existing = document.getElementById('envictica-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'envictica-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="bg-slate-900 border border-[#00F5D4]/30 rounded-lg p-6 max-w-lg w-full shadow-2xl relative space-y-4">
        <div class="flex justify-between items-center border-b border-white/10 pb-3">
          <h3 class="text-lg font-bold text-[#00F5D4] tracking-wider uppercase">${title}</h3>
          <button onclick="document.getElementById('envictica-modal').remove()" class="text-slate-400 hover:text-white text-xl">&times;</button>
        </div>
        <div class="text-sm text-slate-300 space-y-3 font-mono">
          ${contentHTML}
        </div>
        <div class="pt-2 flex justify-end">
          <button onclick="document.getElementById('envictica-modal').remove()" class="px-4 py-2 bg-[#00F5D4] text-black font-bold text-xs uppercase rounded">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  };

  // 3. Bind Top Nav Settings & Notifications
  document.querySelectorAll('.material-symbols-outlined').forEach(icon => {
    if (icon.textContent.trim() === 'settings') {
      icon.parentElement.style.cursor = 'pointer';
      icon.parentElement.onclick = (e) => {
        e.preventDefault();
        createModal('System Settings', `
          <div class="space-y-2">
            <label class="block text-xs text-slate-400">Environment Node</label>
            <input type="text" value="us-east-aws-prod-06" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white" readonly/>
            <label class="block text-xs text-slate-400">Telemetry Sampling</label>
            <select class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"><option>100% High Fidelity</option><option>50% Adaptive</option></select>
          </div>
        `);
      };
    }
    if (icon.textContent.trim() === 'notifications') {
      icon.parentElement.style.cursor = 'pointer';
      icon.parentElement.onclick = (e) => {
        e.preventDefault();
        createModal('Active Alerts', `
          <p class="text-emerald-400">✓ All pipeline ingestion rates stable (12.4k TPS).</p>
          <p class="text-amber-400">⚠ Risk Matrix: 2 Clause Anomalies detected in SEC filings.</p>
        `);
      };
    }
  });

  // 4. Bind Action Buttons (Audit, Intervene, Export, etc.)
  document.querySelectorAll('button, .btn-action').forEach(btn => {
    const text = btn.innerText.toUpperCase().trim();
    if (text.includes('NEW SYSTEM AUDIT') || text.includes('AUDIT LOGS')) {
      btn.onclick = () => createModal('Audit Execution', '<p class="text-[#00F5D4]">Initiating real-time system audit on cluster node...</p><div class="w-full bg-slate-800 h-2 rounded overflow-hidden mt-2"><div class="bg-[#00F5D4] h-full w-2/3 animate-pulse"></div></div>');
    } else if (text.includes('INTERVENE')) {
      btn.onclick = () => createModal('Manual Override', '<p class="text-rose-400">Circuit Breaker Intervention triggered. Halting downstream cascade...</p>');
    } else if (text.includes('FORCE SYNC')) {
      btn.onclick = () => createModal('Database Sync', '<p class="text-[#00F5D4]">Syncing schema states with Neon PostgreSQL instance...</p>');
    }
  });
});
