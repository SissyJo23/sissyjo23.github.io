<!DOCTYPE html>
<html class="dark" lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta
    name="description"
    content="Envictica system stress testing and resilience verification."
  />
  <title>Envictica | Stress-Test Suite</title>
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  <link
    href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;800&family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;600&display=swap"
    rel="stylesheet"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
    rel="stylesheet"
  />
  <script>
    tailwind.config = {
      darkMode: "class",
      theme: {
        extend: {
          colors: {
            primary: "#00F5D4",
            "env-alert": "#FF4D6D",
            surface: "#0A0B0E",
            "surface-container": "#13151B",
            outline: "#2A2E39",
            "on-surface-variant": "#9CA3AF"
          },
          fontFamily: {
            display: ["Sora", "sans-serif"],
            mono: ["JetBrains Mono", "monospace"],
            body: ["Inter", "sans-serif"]
          }
        }
      }
    };
  </script>
  <style>
    body {
      background: #050608;
      color: #e3e1e9;
    }
    .node-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 8px;
    }
    .node-square {
      aspect-ratio: 1;
      border: 1px solid rgba(255, 255, 255, 0.05);
      background: #11141a;
      transition: all 0.3s ease;
    }
    .node-failing {
      background: rgba(255, 77, 109, 0.2);
      border-color: #ff4d6d;
      box-shadow: 0 0 10px rgba(255, 77, 109, 0.35);
    }
    .node-rerouting {
      background: rgba(0, 245, 212, 0.2);
      border-color: #00f5d4;
      box-shadow: 0 0 8px rgba(0, 245, 212, 0.15);
    }
    .glow-crimson {
      text-shadow: 0 0 10px rgba(255, 77, 109, 0.7);
    }
    @media (max-width: 768px) {
      .node-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
  </style>
</head>
<body class="font-body antialiased min-h-screen">
  <div class="min-h-screen flex flex-col md:flex-row">
<!-- Sidebar -->
<nav
  class="w-full md:w-64 shrink-0 bg-surface-container border-b md:border-b-0 md:border-r border-outline p-6 flex flex-col gap-8"
  aria-label="Envictica navigation"
>
  <div class="flex flex-col gap-1">
    <span
      class="font-display text-2xl font-black italic tracking-tighter text-white"
    >
      ENVICTICA
    </span>
    <span
      class="font-mono text-[10px] text-primary tracking-widest uppercase"
    >
      Resilience Suite
    </span>
  </div>
  <div class="flex flex-col gap-2">
    <a
      href="command-center.html"
      class="p-3 flex items-center gap-3 text-on-surface-variant hover:text-white transition-colors rounded"
    >
      <span class="material-symbols-outlined text-lg">terminal</span>
      <span class="font-mono text-xs uppercase tracking-wider">
        Command
      </span>
    </a>
    <a
      href="stress-test.html"
      aria-current="page"
      class="bg-primary/10 border border-primary/20 p-3 rounded flex items-center gap-3 text-primary"
    >
      <span class="material-symbols-outlined text-lg">bolt</span>
      <span class="font-mono text-xs font-bold uppercase tracking-wider">
        Stress-Test
      </span>
    </a>
    <a
      href="compliance-logs.html"
      class="p-3 flex items-center gap-3 text-on-surface-variant hover:text-white transition-colors rounded"
    >
      <span class="material-symbols-outlined text-lg">history_edu</span>
      <span class="font-mono text-xs uppercase tracking-wider">
        Audit Log
      </span>
    </a>
  </div>
</nav>
<!-- Main -->
<main class="flex-1 min-w-0 overflow-y-auto p-5 md:p-8">
  <!-- Header -->
  <header
    class="flex flex-col xl:flex-row xl:justify-between xl:items-end gap-6 mb-10 border-b border-outline pb-8"
  >
    <div class="flex flex-col gap-3">
      <div
        class="font-mono text-[10px] text-primary uppercase tracking-[0.25em]"
      >
        Infrastructure / Resilience Verification
      </div>
      <h1
        class="font-display text-3xl md:text-4xl font-black text-white uppercase tracking-tight"
      >
        System Stress-Test Suite
      </h1>
      <p class="text-on-surface-variant max-w-2xl leading-relaxed">
        Controlled simulation environment for evaluating failover behavior,
        recovery targets, model-provider dependency, and schema integrity
        during infrastructure disruption.
      </p>
    </div>
    <div class="flex flex-wrap gap-3">
      <button
        id="abortTest"
        type="button"
        class="bg-env-alert/10 border border-env-alert text-env-alert px-4 py-2 text-[10px] font-mono uppercase tracking-widest hover:bg-env-alert/20 transition-colors rounded"
      >
        Abort Test
      </button>
      <button
        id="simulateBlackout"
        type="button"
        class="bg-primary text-[#002022] px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest hover:opacity-90 transition-opacity rounded"
      >
        Simulate Cloud Blackout
      </button>
    </div>
  </header>
  <!-- Simulation State -->
  <section
    class="mb-8 bg-surface-container border border-outline p-5"
    aria-labelledby="simulation-state-title"
  >
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div
          id="simulation-state-title"
          class="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest"
        >
          Simulation State
        </div>
        <div
          id="simulationState"
          class="mt-2 font-display text-xl font-bold text-white"
        >
          READY
        </div>
      </div>
      <div
        id="simulationDescription"
        class="font-mono text-[10px] text-on-surface-variant uppercase"
      >
        No active stress sequence
      </div>
    </div>
  </section>
  <!-- Main Grid -->
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
    <!-- Left / Status -->
    <div class="xl:col-span-2 flex flex-col gap-6">
      <!-- Node Status -->
      <section
        class="bg-surface-container border border-outline p-6"
        aria-labelledby="node-status-title"
      >
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <h2
            id="node-status-title"
            class="font-mono text-xs font-bold text-on-surface-variant uppercase tracking-widest"
          >
            Processing Node Status
          </h2>
          <span
            id="loadStatus"
            class="font-mono text-[10px] text-on-surface-variant uppercase"
          >
            IDLE
          </span>
        </div>
        <div
          id="nodeGrid"
          class="node-grid"
          aria-label="Processing node simulation grid"
        >
          <div class="node-square"></div>
          <div class="node-square"></div>
          <div class="node-square"></div>
          <div class="node-square"></div>
          <div class="node-square"></div>
          <div class="node-square"></div>
          <div class="node-square"></div>
          <div class="node-square"></div>
          <div class="node-square"></div>
          <div class="node-square"></div>
          <div class="node-square"></div>
          <div class="node-square"></div>
          <div class="node-square"></div>
          <div class="node-square"></div>
          <div class="node-square"></div>
          <div class="node-square"></div>
        </div>
        <div class="mt-5 flex flex-wrap gap-5 font-mono text-[10px] uppercase">
          <div class="flex items-center gap-2 text-on-surface-variant">
            <span class="w-3 h-3 border border-outline bg-[#11141a]"></span>
            Standby
          </div>
          <div class="flex items-center gap-2 text-env-alert">
            <span class="w-3 h-3 border border-env-alert bg-env-alert/20"></span>
            Failure
          </div>
          <div class="flex items-center gap-2 text-primary">
            <span class="w-3 h-3 border border-primary bg-primary/20"></span>
            Rerouting
          </div>
        </div>
      </section>
      <!-- Event Console -->
      <section
        class="bg-black/40 border border-outline p-4 font-mono text-[10px] h-48 overflow-y-auto"
        aria-labelledby="event-log-title"
      >
        <div
          id="event-log-title"
          class="text-on-surface-variant uppercase tracking-widest mb-3"
        >
          Stress-Test Event Log
        </div>
        <div id="eventLog" class="flex flex-col gap-2">
          <div class="text-on-surface-variant">
            [READY] Stress-test environment initialized.
          </div>
          <div class="text-on-surface-variant">
            [READY] Awaiting controlled simulation.
          </div>
        </div>
      </section>
      <!-- Test Vectors -->
      <section
        class="bg-surface-container border border-outline p-6"
        aria-labelledby="vectors-title"
      >
        <h2
          id="vectors-title"
          class="font-mono text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-5"
        >
          Active Simulation Vectors
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            class="vector-button text-left border border-outline p-4 hover:border-primary/50 transition-colors rounded"
            data-vector="Cloud Blackout"
          >
            <div class="font-mono text-xs text-white uppercase">
              Cloud Blackout
            </div>
            <div class="mt-2 text-[11px] text-on-surface-variant">
              Simulate loss of external model-provider connectivity.
            </div>
          </button>
          <button
            type="button"
            class="vector-button text-left border border-outline p-4 hover:border-primary/50 transition-colors rounded"
            data-vector="Context Window Overflow"
          >
            <div class="font-mono text-xs text-white uppercase">
              Context Window Overflow
            </div>
            <div class="mt-2 text-[11px] text-on-surface-variant">
              Test behavior under extreme context pressure.
            </div>
          </button>
          <button
            type="button"
            class="vector-button text-left border border-outline p-4 hover:border-primary/50 transition-colors rounded"
            data-vector="Vector Database Failure"
          >
            <div class="font-mono text-xs text-white uppercase">
              Vector Database Failure
            </div>
            <div class="mt-2 text-[11px] text-on-surface-variant">
              Evaluate retrieval resilience when a storage shard fails.
            </div>
          </button>
          <button
            type="button"
            class="vector-button text-left border border-outline p-4 hover:border-primary/50 transition-colors rounded"
            data-vector="Schema Violation"
          >
            <div class="font-mono text-xs text-white uppercase">
              Schema Violation
            </div>
            <div class="mt-2 text-[11px] text-on-surface-variant">
              Test rejection of structurally invalid model output.
            </div>
          </button>
        </div>
      </section>
    </div>
    <!-- Right / Metrics -->
    <aside class="xl:col-span-1 flex flex-col gap-6">
      <!-- RTO -->
      <section
        class="bg-surface-container border border-outline p-8 flex flex-col items-center justify-center text-center"
      >
        <span
          class="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-4"
        >
          Recovery Target
        </span>
        <div
          id="rtoValue"
          class="text-5xl md:text-6xl font-mono text-white tracking-tighter mb-2"
        >
          —
        </div>
        <span
          id="rtoStatus"
          class="font-mono text-[10px] text-on-surface-variant uppercase"
        >
          No verified measurement
        </span>
      </section>
      <!-- Resilience Parameters -->
      <section
        class="bg-surface-container border border-outline p-6"
        aria-labelledby="parameters-title"
      >
        <h2
          id="parameters-title"
          class="font-mono text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-5"
        >
          Resilience Parameters
        </h2>
        <div class="flex flex-col gap-4 font-mono text-[10px]">
          <div class="flex justify-between gap-4">
            <span class="text-on-surface-variant">
              RTO Target
            </span>
            <span class="text-white">
              &lt; 5.00ms
            </span>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-on-surface-variant">
              Drift Tolerance
            </span>
            <span class="text-white">
              15%
            </span>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-on-surface-variant">
              Failover Mode
            </span>
            <span class="text-white">
              Localized
            </span>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-on-surface-variant">
              Verification
            </span>
            <span class="text-white">
              Required
            </span>
          </div>
        </div>
      </section>
      <!-- Actions -->
      <section
        class="bg-surface-container border border-outline p-6"
        aria-labelledby="actions-title"
      >
        <h2
          id="actions-title"
          class="font-mono text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-5"
        >
          Resilience Actions
        </h2>
        <div class="flex flex-col gap-3">
          <button
            type="button"
            id="runSimulation"
            class="w-full border border-primary/40 text-primary px-4 py-3 text-[10px] font-mono uppercase tracking-widest hover:bg-primary/10 transition-colors rounded"
          >
            Run Simulation
          </button>
          <button
            type="button"
            id="clearLog"
            class="w-full border border-outline text-on-surface-variant px-4 py-3 text-[10px] font-mono uppercase tracking-widest hover:text-white transition-colors rounded"
          >
            Clear Event Log
          </button>
        </div>
      </section>
    </aside>
  </div>
  <footer
    class="mt-10 pt-6 border-t border-outline text-[10px] font-mono text-on-surface-variant uppercase tracking-wider"
  >
    Envictica / Resilience Verification Infrastructure
  </footer>
</main>
  </div>
  <script>
    (() => {
      const state = {
        running: false,
        timer: null
      };
      const simulationState = document.getElementById("simulationState");
      const simulationDescription = document.getElementById("simulationDescription");
      const loadStatus = document.getElementById("loadStatus");
      const rtoValue = document.getElementById("rtoValue");
      const rtoStatus = document.getElementById("rtoStatus");
      const eventLog = document.getElementById("eventLog");
      const nodeGrid = document.getElementById("nodeGrid");
      function timestamp() {
        return new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });
      }
      function log(message, type = "info") {
        const entry = document.createElement("div");
        entry.className =
          type === "error"
            ? "text-env-alert"
            : type === "success"
              ? "text-primary"
              : "text-on-surface-variant";
        entry.textContent = `[${timestamp()}] ${message}`;
        eventLog.appendChild(entry);
        eventLog.scrollTop = eventLog.scrollHeight;
      }
      function setNodes(mode) {
        const nodes = [...nodeGrid.children];
        nodes.forEach((node) => {
          node.classList.remove("node-failing", "node-rerouting");
        });
        if (mode === "stress") {
          [0, 1, 8, 9].forEach((index) => {
            nodes[index].classList.add("node-failing");
          });
          [4, 5, 12, 13].forEach((index) => {
            nodes[index].classList.add("node-rerouting");
          });
        }
        if (mode === "recovered") {
          [4, 5, 6, 7, 12, 13, 14, 15].forEach((index) => {
            nodes[index].classList.add("node-rerouting");
          });
        }
      }
      function resetState() {
        clearTimeout(state.timer);
        state.running = false;
        simulationState.textContent = "READY";
        simulationDescription.textContent = "No active stress sequence";
        loadStatus.textContent = "IDLE";
        rtoValue.textContent = "—";
        rtoStatus.textContent = "No verified measurement";
        setNodes("idle");
      }
      function runSimulation(vector = "Cloud Blackout") {
        if (state.running) {
          log("[BLOCKED] A simulation is already running.", "error");
          return;
        }
        state.running = true;
        simulationState.textContent = "RUNNING";
        simulationDescription.textContent = vector;
        loadStatus.textContent = "STRESS LOAD ACTIVE";
        setNodes("stress");
        rtoValue.textContent = "—";
        rtoStatus.textContent = "Measurement pending";
        log(`[START] ${vector} simulation initiated.`);
        state.timer = setTimeout(() => {
          simulationState.textContent = "FAILOVER DETECTED";
          loadStatus.textContent = "REROUTING";
          log("[DETECTED] Primary processing path marked unavailable.", "error");
          log("[ACTION] Failover path requested.");
          setNodes("recovered");
          state.timer = setTimeout(() => {
            simulationState.textContent = "RECOVERY COMPLETE";
            simulationDescription.textContent = `${vector} / simulation complete`;
            loadStatus.textContent = "RECOVERED";
            /*
             * This is deliberately not presented as a real measured RTO.
             * A real value must come from actual telemetry/API instrumentation.
             */
            rtoValue.textContent = "—";
            rtoStatus.textContent = "Simulation only / no verified RTO";
            log("[COMPLETE] Simulation sequence finished.", "success");
            log("[NOTICE] No production telemetry was recorded.", "info");
            state.running = false;
          }, 900);
        }, 900);
      }
      document
        .getElementById("simulateBlackout")
        .addEventListener("click", () => {
          runSimulation("Cloud Blackout");
        });
      document
        .getElementById("runSimulation")
        .addEventListener("click", () => {
          runSimulation("Controlled Resilience Test");
        });
      document
        .getElementById("abortTest")
        .addEventListener("click", () => {
          if (!state.running) {
            log("[INFO] No active simulation to abort.");
            return;
          }
          clearTimeout(state.timer);
          resetState();
          log("[ABORTED] Active simulation terminated.", "error");
        });
      document
        .getElementById("clearLog")
        .addEventListener("click", () => {
          eventLog.innerHTML = "";
          log("[READY] Event log cleared.");
        });
      document.querySelectorAll(".vector-button").forEach((button) => {
        button.addEventListener("click", () => {
          runSimulation(button.dataset.vector);
        });
      });
    })();
  </script>
  <script src="envictica-ui.js"></script>
</body>
</html>
