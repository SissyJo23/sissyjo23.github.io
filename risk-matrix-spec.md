<!DOCTYPE html>

<html class="dark" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Risk Matrix Dashboard | Envictica</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&amp;family=Hanken+Grotesk:wght@400;600;700&amp;family=Geist:wght@400;600;700&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
  tailwind.config = {
    darkMode: "class",
    theme: {
      extend: {
        "colors": {
                "primary-fixed-dim": "#00dfc1",
                "on-primary-fixed": "#00201a",
                "tertiary-fixed-dim": "#6cd3fc",
                "surface-container-low": "#181c1d",
                "surface-container-highest": "#313536",
                "secondary-container": "#ac0037",
                "inverse-primary": "#006b5b",
                "on-secondary-container": "#ffb7bc",
                "surface-container": "#1c2021",
                "surface-tint": "#00dfc1",
                "primary-fixed": "#26fedc",
                "on-secondary": "#67001e",
                "primary-container": "#00f5d4",
                "on-primary": "#00382f",
                "primary": "#d7fff3",
                "tertiary": "#edf8ff",
                "outline": "#83948f",
                "on-error-container": "#ffdad6",
                "on-tertiary-fixed": "#001f2a",
                "surface": "#101415",
                "secondary-fixed-dim": "#ffb2b8",
                "on-tertiary-fixed-variant": "#004d63",
                "inverse-surface": "#e0e3e4",
                "surface-container-lowest": "#0b0f10",
                "on-secondary-fixed": "#40000f",
                "on-secondary-fixed-variant": "#91002d",
                "background": "#101415",
                "tertiary-container": "#a6e3ff",
                "on-tertiary-container": "#006784",
                "tertiary-fixed": "#bce9ff",
                "on-surface-variant": "#b9cac4",
                "surface-container-high": "#272b2c",
                "on-surface": "#e0e3e4",
                "secondary": "#ffb2b8",
                "error-container": "#93000a",
                "on-tertiary": "#003545",
                "on-primary-fixed-variant": "#005144",
                "on-background": "#e0e3e4",
                "error": "#ffb4ab",
                "outline-variant": "#3a4a46",
                "surface-dim": "#101415",
                "surface-bright": "#363a3b",
                "on-error": "#690005",
                "inverse-on-surface": "#2d3132",
                "on-primary-container": "#006c5c",
                "secondary-fixed": "#ffdadb",
                "surface-variant": "#313536",
                "electric-teal": "#00f5d4",
                "burnt-crimson": "#ffb4ab"
        },
        "borderRadius": {
                "DEFAULT": "0.125rem",
                "lg": "0.25rem",
                "xl": "0.5rem",
                "full": "0.75rem"
        },
        "spacing": {
                "max-width": "1600px",
                "margin-desktop": "32px",
                "density-standard": "16px",
                "unit": "4px",
                "margin-mobile": "16px",
                "gutter": "16px",
                "density-high": "8px",
                "margin": "24px",
                "density-regular": "8px",
                "density-compact": "4px"
        },
        "fontFamily": {
                "label-mono": [
                        "JetBrains Mono"
                ],
                "display-lg": [
                        "Hanken Grotesk"
                ],
                "body-md": [
                        "Geist"
                ],
                "headline-md": [
                        "Hanken Grotesk"
                ],
                "headline-sm": [
                        "Hanken Grotesk"
                ],
                "body-lg": [
                        "Geist"
                ],
                "label-caps": [
                        "Hanken Grotesk"
                ],
                "data-mono": ["JetBrains Mono"],
                "body-sm": ["Hanken Grotesk"],
                "title-sm": ["Hanken Grotesk"]
        },
        "fontSize": {
                "label-mono": [
                        "12px",
                        {
                                "lineHeight": "16px",
                                "letterSpacing": "0.05em",
                                "fontWeight": "500"
                        }
                ],
                "display-lg": [
                        "48px",
                        {
                                "lineHeight": "56px",
                                "letterSpacing": "-0.02em",
                                "fontWeight": "700"
                        }
                ],
                "body-md": [
                        "14px",
                        {
                                "lineHeight": "20px",
                                "fontWeight": "400"
                        }
                ],
                "headline-md": [
                        "24px",
                        {
                                "lineHeight": "32px",
                                "letterSpacing": "-0.01em",
                                "fontWeight": "600"
                        }
                ],
                "headline-sm": [
                        "18px",
                        {
                                "lineHeight": "24px",
                                "fontWeight": "600"
                        }
                ],
                "body-lg": [
                        "16px",
                        {
                                "lineHeight": "24px",
                                "fontWeight": "400"
                        }
                ],
                "label-caps": [
                        "11px",
                        {
                                "lineHeight": "16px",
                                "letterSpacing": "0.1em",
                                "fontWeight": "800"
                        }
                ],
                "data-mono": ["13px", { "lineHeight": "18px", "letterSpacing": "-0.01em", "fontWeight": "500" }],
                "body-sm": ["12px", { "lineHeight": "16px", "fontWeight": "400" }],
                "title-sm": ["18px", { "lineHeight": "24px", "fontWeight": "600" }]
        }
},
    },
  }
</script>
<style>
        .heat-cell-safe { @apply bg-[#00f5d4]/20 text-electric-teal; }
        .heat-cell-warning { background: linear-gradient(90deg, rgba(0,245,212,0.2) 0%, rgba(255,180,171,0.2) 100%); @apply text-on-surface; }
        .heat-cell-danger { @apply bg-[#ffb4ab]/20 text-burnt-crimson; }
        .metric-card { @apply bg-surface-container border border-outline-variant p-gutter rounded; }
    </style>
</head>
<body class="bg-background text-on-background min-h-screen flex font-body-md overflow-hidden">
<!-- SideNavBar Component -->
<nav class="bg-surface dark:bg-surface font-label-caps text-label-caps docked h-screen left-0 w-64 border-r border-outline-variant flat no shadows transition-all duration-150 ease-in-out flex flex-col h-full py-density-regular shrink-0 hidden md:flex z-40">
<div class="px-margin mb-margin flex items-center gap-gutter">
<div class="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center overflow-hidden border border-outline-variant">
<img alt="System Administrator" class="w-full h-full object-cover" data-alt="A macro close-up of a glowing fiber optic nexus in a sterile, dark server room. The aesthetic is hyper-technical, industrial, and precise, reflecting the core engine's systemic complexity. Deep slates and emerald green accents dominate the composition, representing data flow." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXFNPEgJuNA0JsYGN8bhPiTvunHYg3wBhDh6uP0GN4l2q-X76MpLbcmJMJG7kL9DZkUy-sDMYwBaZoHdGOPMHAsaDnurUBMHZs-wimrXVSqFYubVy0IF1uOPbV2AEA7pFlfLblzUlam42WSr0cs5KTDPqv0I_B9i4lWeRhykGBu_TADMexJ1MDK_9AmBxFIIaXBlZLpIcnEPWZDaCo8BM8Rl9xzE9Zn01YiuSSscVrB_hJlYGIupg8fg"/>
</div>
<div>
<div class="font-headline-md text-headline-md text-primary-container truncate">Core Engine</div>
<div class="text-on-surface-variant text-data-mono font-data-mono">V2.4.0-Stable</div>
</div>
</div>
<div class="flex-1 overflow-y-auto px-gutter space-y-density-compact">
<a class="flex items-center gap-gutter px-gutter py-density-regular rounded text-on-surface-variant bg-transparent hover:bg-surface-variant hover:text-on-surface" href="#">
<span class="material-symbols-outlined" data-icon="dns">dns</span>
<span>Infrastructure</span>
</a>
<a class="flex items-center gap-gutter px-gutter py-density-regular rounded text-on-surface-variant bg-transparent hover:bg-surface-variant hover:text-on-surface" href="#">
<span class="material-symbols-outlined" data-icon="gavel">gavel</span>
<span>Governance</span>
</a>
<a class="flex items-center gap-gutter px-gutter py-density-regular rounded text-on-surface-variant bg-transparent hover:bg-surface-variant hover:text-on-surface" href="#">
<span class="material-symbols-outlined" data-icon="account_tree">account_tree</span>
<span>Pipelines</span>
</a>
<a class="flex items-center gap-gutter px-gutter py-density-regular rounded text-on-surface-variant bg-transparent hover:bg-surface-variant hover:text-on-surface" href="#">
<span class="material-symbols-outlined" data-icon="fact_check">fact_check</span>
<span>Data Validation</span>
</a>
<a class="flex items-center gap-gutter px-gutter py-density-regular rounded text-on-surface-variant bg-transparent hover:bg-surface-variant hover:text-on-surface" href="#">
<span class="material-symbols-outlined" data-icon="build_circle">build_circle</span>
<span>Data Debt Repair</span>
</a>
<a class="flex items-center gap-gutter px-gutter py-density-regular rounded text-on-surface-variant bg-transparent hover:bg-surface-variant hover:text-on-surface" href="#">
<span class="material-symbols-outlined" data-icon="layers">layers</span>
<span>Model Abstraction Layer</span>
</a>
<a class="flex items-center gap-gutter px-gutter py-density-regular rounded text-on-surface-variant bg-transparent hover:bg-surface-variant hover:text-on-surface" href="#">
<span class="material-symbols-outlined" data-icon="history_edu">history_edu</span>
<span>Audit Logs</span>
</a>
<a class="flex items-center gap-gutter px-gutter py-density-regular rounded border-r-2 border-primary-container text-primary-container bg-primary-container/10" href="#">
<span class="material-symbols-outlined" data-icon="grid_view" style="font-variation-settings: 'FILL' 1;">grid_view</span>
<span>Risk Matrix</span>
</a>
<a class="flex items-center gap-gutter px-gutter py-density-regular rounded text-on-surface-variant bg-transparent hover:bg-surface-variant hover:text-on-surface" href="#">
<span class="material-symbols-outlined" data-icon="schema">schema</span>
<span>Schema Library</span>
</a>
</div>
<div class="px-gutter pt-margin border-t border-outline-variant space-y-density-compact mt-auto">
<a class="flex items-center gap-gutter px-gutter py-density-regular rounded text-on-surface-variant bg-transparent hover:bg-surface-variant hover:text-on-surface" href="#">
<span class="material-symbols-outlined" data-icon="description">description</span>
<span>Docs</span>
</a>
<a class="flex items-center gap-gutter px-gutter py-density-regular rounded text-on-surface-variant bg-transparent hover:bg-surface-variant hover:text-on-surface" href="#">
<span class="material-symbols-outlined" data-icon="help">help</span>
<span>Support</span>
</a>
</div>
</nav>
<!-- Main Content Area -->
<main class="flex-1 flex flex-col h-screen overflow-hidden">
<!-- Module Top Bar -->
<div class="bg-primary-container text-on-primary-container py-1.5 px-margin text-center font-label-caps text-[11px] font-bold tracking-widest z-50 shrink-0 border-b border-primary-fixed-dim">
    OFFICIAL ENVICTICA MODULE: 2 OF 15
</div>
<!-- TopNavBar Component -->
<header class="bg-surface-container dark:bg-surface-container text-primary-container dark:text-primary-container font-title-sm text-title-sm docked full-width top-0 border-b border-outline-variant flat no shadows flex justify-between items-center px-margin h-16 w-full z-40 shrink-0">
<div class="flex items-center gap-margin">
<button class="md:hidden text-on-surface-variant hover:bg-surface-container-highest transition-colors cursor-pointer active:opacity-80 p-unit rounded">
<span class="material-symbols-outlined">menu</span>
</button>
<div class="font-headline-md text-headline-md text-primary-container dark:text-primary-container uppercase tracking-wider">Envictica</div>
</div>
<div class="flex-1 flex justify-start pl-margin">
<div class="relative w-64 hidden sm:block">
<span class="material-symbols-outlined absolute left-density-regular top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
<input class="w-full bg-surface-container-highest border border-outline-variant rounded pl-8 pr-density-regular py-unit text-body-sm font-body-sm text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none placeholder:text-on-surface-variant" placeholder="Search parameters..." type="text"/>
</div>
</div>
<div class="flex items-center gap-gutter">
<button class="text-on-surface-variant hover:bg-surface-container-highest transition-colors cursor-pointer active:opacity-80 p-unit rounded relative">
<span class="material-symbols-outlined" data-icon="monitor_heart">monitor_heart</span>
</button>
<button class="text-on-surface-variant hover:bg-surface-container-highest transition-colors cursor-pointer active:opacity-80 p-unit rounded">
<span class="material-symbols-outlined" data-icon="settings">settings</span>
</button>
<button class="text-on-surface-variant hover:bg-surface-container-highest transition-colors cursor-pointer active:opacity-80 p-unit rounded relative">
<span class="material-symbols-outlined" data-icon="notifications">notifications</span>
<span class="absolute top-1 right-1 w-2 h-2 bg-primary-container rounded-full"></span>
</button>
<div class="w-8 h-8 rounded-full ml-density-regular overflow-hidden border border-outline-variant cursor-pointer">
<img alt="Operator Profile" class="w-full h-full object-cover" data-alt="A macro close-up of a glowing fiber optic nexus in a sterile, dark server room. The aesthetic is hyper-technical, industrial, and precise, reflecting the core engine's systemic complexity. Deep slates and emerald green accents dominate the composition, representing data flow." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDX3BikU_192cMC3qQ8XbUGEghaE3snSkxaBQDJcyBg0VYKK0D3-dnfQItus9paU3bxak6nq9VZMJRVeMrtF5_2n8K2jCeak9FHXRydUwmjA-W9tSxzolq1UxdvoXAxT9p65Zlo_ibbE5NbmvHp-vM9rgo53OrS8wkDIPVDxsPJkJW6zPaV9_a1pwgxt5itolkww0KDeO46UWwBPOcpu1kyakZsjM0QjhLwBLHkfBEurASspLxaCmuMfQ"/>
</div>
</div>
</header>
<!-- Canvas -->
<div class="flex-1 overflow-y-auto bg-background p-margin space-y-margin">
<!-- Context Header -->
<div class="flex justify-between items-end">
<div>
<div class="flex items-center gap-unit text-on-surface-variant font-data-mono text-data-mono mb-unit">
<span>Infrastructure</span>
<span class="material-symbols-outlined text-[14px]">chevron_right</span>
<span>Risk Matrix</span>
</div>
<h1 class="font-display-lg text-display-lg text-on-surface">Hallucination Propensity vs. Data Drift</h1>
</div>
<div class="flex gap-gutter"><div class="flex items-center gap-unit px-gutter py-density-regular bg-surface-container-highest border border-primary-container rounded-full text-primary-container font-label-caps text-[10px] tracking-widest"><span class="material-symbols-outlined text-[14px]">verified_user</span> FIDUCIARY OVERSIGHT ACTIVE</div>
<button class="flex items-center gap-unit px-gutter py-density-regular border border-outline-variant rounded text-on-surface font-label-caps text-label-caps hover:bg-surface-container transition-colors">
<span class="material-symbols-outlined text-[16px]">download</span>
                        EXPORT CSV
                    </button>
<button class="flex items-center gap-unit px-gutter py-density-regular bg-primary-container text-on-primary-fixed rounded font-label-caps text-label-caps hover:bg-primary-fixed transition-colors border border-transparent">
<span class="material-symbols-outlined text-[16px]">refresh</span>
                        FORCE SYNC
                    </button>
</div>
</div>
<!-- Metrics Bar -->
<div class="grid grid-cols-1 md:grid-cols-4 gap-gutter">
<div class="metric-card flex flex-col">
<span class="font-label-caps text-label-caps text-on-surface-variant mb-unit uppercase">Avg Node Temperature</span>
<div class="flex items-end gap-gutter mt-auto">
<span class="font-headline-md text-headline-md text-on-surface font-data-mono">42.8°C</span>
<span class="text-primary-container font-data-mono text-data-mono flex items-center"><span class="material-symbols-outlined text-[14px]">arrow_downward</span> 1.2°</span>
</div>
</div>
<div class="metric-card flex flex-col">
<span class="font-label-caps text-label-caps text-on-surface-variant mb-unit uppercase">Total Anomaly Intercepts</span>
<div class="flex items-end gap-gutter mt-auto">
<span class="font-headline-md text-headline-md text-error font-data-mono">1,492</span>
<span class="text-error font-data-mono text-data-mono flex items-center"><span class="material-symbols-outlined text-[14px]">arrow_upward</span> 14%</span>
</div>
</div>
<div class="metric-card flex flex-col">
<span class="font-label-caps text-label-caps text-on-surface-variant mb-unit uppercase">Drift Velocity (Avg)</span>
<div class="flex items-end gap-gutter mt-auto">
<span class="font-headline-md text-headline-md text-on-surface font-data-mono">0.042 µ/s</span>
<span class="text-tertiary font-data-mono text-data-mono flex items-center"><span class="material-symbols-outlined text-[14px]">horizontal_rule</span> 0%</span>
</div>
</div>
<div class="metric-card flex flex-col">
<span class="font-label-caps text-label-caps text-on-surface-variant mb-unit uppercase">System Integrity</span>
<div class="flex items-end gap-gutter mt-auto">
<span class="font-headline-md text-headline-md text-primary-container font-data-mono">98.9%</span>
<div class="flex-1 h-1 bg-surface-variant rounded-full ml-gutter mb-density-regular overflow-hidden">
<div class="h-full bg-primary-container w-[98.9%]"></div>
</div>
</div>
</div>
</div>
<!-- Heat Map Container -->
<div class="bg-surface-container border border-outline-variant rounded overflow-hidden">
<div class="p-gutter border-b border-outline-variant bg-surface-container-high flex justify-between items-center">
<h2 class="font-title-sm text-title-sm text-on-surface">Node Analysis Heat-Map</h2>
<div class="flex items-center gap-margin font-label-caps text-label-caps"><div class="flex items-center gap-unit"><div class="w-3 h-3 bg-primary-container rounded-sm border border-outline-variant"></div><span class="text-on-surface-variant">STABLE</span></div><div class="flex items-center gap-unit"><div class="w-3 h-3 bg-gradient-to-r from-primary-container to-error rounded-sm border border-outline-variant"></div><span class="text-on-surface-variant">DRIFT RISK</span></div><div class="flex items-center gap-unit"><div class="w-3 h-3 bg-error rounded-sm border border-outline-variant"></div><span class="text-on-surface-variant">CRITICAL LIABILITY</span></div></div>
</div>
<div class="p-gutter overflow-x-auto">
<!-- High-density Grid -->
<div class="min-w-[800px] grid gap-[2px] bg-outline-variant border border-outline-variant grid-cols-7">
<!-- Header Row -->
<div class="bg-surface-container-highest p-density-regular font-label-caps text-label-caps text-on-surface-variant uppercase">Business Unit</div>
<div class="bg-surface-container-highest p-density-regular font-label-caps text-label-caps text-on-surface-variant uppercase text-right">Hallucination Index</div>
<div class="bg-surface-container-highest p-density-regular font-label-caps text-label-caps text-on-surface-variant uppercase text-right">Data Drift (%)</div>
<div class="bg-surface-container-highest p-density-regular font-label-caps text-label-caps text-on-surface-variant uppercase text-right">Intercepts (24h)</div>
<div class="bg-surface-container-highest p-density-regular font-label-caps text-label-caps text-on-surface-variant uppercase text-center">Status</div>
<div class="bg-surface-container-highest p-density-regular font-label-caps text-label-caps text-on-surface-variant uppercase text-center">Action</div>
<!-- Data Row 1 - Critical -->
<div class="bg-surface p-density-regular text-body-sm font-body-sm text-on-surface flex items-center font-bold">Corporate M&amp;A</div>
<div class="bg-surface p-density-regular text-data-mono font-data-mono text-error text-right flex items-center justify-end">0.89</div>
<div class="heat-cell-danger p-density-regular text-data-mono font-data-mono text-right flex items-center justify-end">7.2%</div>
<div class="bg-surface p-density-regular text-data-mono font-data-mono text-on-surface text-right flex items-center justify-end">412</div>
<div class="bg-surface p-density-regular flex items-center justify-center">
<span class="px-2 py-[2px] rounded-full border border-error text-error text-[10px] font-bold uppercase tracking-wider">High Risk</span>
</div>
<div class="bg-surface p-density-regular flex items-center justify-center gap-gutter">
<button class="text-on-surface-variant hover:text-primary-container transition-colors"><span class="material-symbols-outlined text-[18px]">visibility</span></button>
<button class="text-on-surface-variant hover:text-error transition-colors"><span class="material-symbols-outlined text-[18px]">stop_circle</span></button>
</div>
<!-- Data Row 2 - Safe -->
<div class="bg-surface p-density-regular text-body-sm font-body-sm text-on-surface flex items-center font-bold">Global Litigation</div>
<div class="bg-surface p-density-regular text-data-mono font-data-mono text-primary-container text-right flex items-center justify-end">0.12</div>
<div class="heat-cell-safe p-density-regular text-data-mono font-data-mono text-right flex items-center justify-end">0.4%</div>
<div class="bg-surface p-density-regular text-data-mono font-data-mono text-on-surface text-right flex items-center justify-end">14</div>
<div class="bg-surface p-density-regular flex items-center justify-center">
<span class="px-2 py-[2px] rounded-full border border-primary-container text-primary-container text-[10px] font-bold uppercase tracking-wider">Nominal</span>
</div>
<div class="bg-surface p-density-regular flex items-center justify-center gap-gutter">
<button class="text-on-surface-variant hover:text-primary-container transition-colors"><span class="material-symbols-outlined text-[18px]">visibility</span></button>
<button class="text-on-surface-variant hover:text-error transition-colors opacity-50 cursor-not-allowed"><span class="material-symbols-outlined text-[18px]">stop_circle</span></button>
</div>
<!-- Data Row 3 - Warning -->
<div class="bg-surface p-density-regular text-body-sm font-body-sm text-on-surface flex items-center font-bold">IP Compliance</div>
<div class="bg-surface p-density-regular text-data-mono font-data-mono text-on-surface text-right flex items-center justify-end">0.45</div>
<div class="heat-cell-warning p-density-regular text-data-mono font-data-mono text-right flex items-center justify-end">3.1%</div>
<div class="bg-surface p-density-regular text-data-mono font-data-mono text-on-surface text-right flex items-center justify-end">89</div>
<div class="bg-surface p-density-regular flex items-center justify-center">
<span class="px-2 py-[2px] rounded-full border border-on-surface text-on-surface text-[10px] font-bold uppercase tracking-wider">Drift</span>
</div>
<div class="bg-surface p-density-regular flex items-center justify-center gap-gutter">
<button class="text-on-surface-variant hover:text-primary-container transition-colors"><span class="material-symbols-outlined text-[18px]">visibility</span></button>
<button class="text-on-surface-variant hover:text-error transition-colors"><span class="material-symbols-outlined text-[18px]">stop_circle</span></button>
</div>
<!-- Data Row 4 - Safe -->
<div class="bg-surface p-density-regular text-body-sm font-body-sm text-on-surface flex items-center font-bold">HR Analytics</div>
<div class="bg-surface p-density-regular text-data-mono font-data-mono text-primary-container text-right flex items-center justify-end">0.05</div>
<div class="heat-cell-safe p-density-regular text-data-mono font-data-mono text-right flex items-center justify-end">1.1%</div>
<div class="bg-surface p-density-regular text-data-mono font-data-mono text-on-surface text-right flex items-center justify-end">3</div>
<div class="bg-surface p-density-regular flex items-center justify-center">
<span class="px-2 py-[2px] rounded-full border border-primary-container text-primary-container text-[10px] font-bold uppercase tracking-wider">Nominal</span>
</div>
<div class="bg-surface p-density-regular flex items-center justify-center gap-gutter">
<button class="text-on-surface-variant hover:text-primary-container transition-colors"><span class="material-symbols-outlined text-[18px]">visibility</span></button>
<button class="text-on-surface-variant hover:text-error transition-colors opacity-50 cursor-not-allowed"><span class="material-symbols-outlined text-[18px]">stop_circle</span></button>
</div>
<!-- Data Row 5 - Critical -->
<div class="bg-surface p-density-regular text-body-sm font-body-sm text-on-surface flex items-center font-bold">Financial Auditing</div>
<div class="bg-surface p-density-regular text-data-mono font-data-mono text-error text-right flex items-center justify-end">0.72</div>
<div class="heat-cell-danger p-density-regular text-data-mono font-data-mono text-right flex items-center justify-end">6.8%</div>
<div class="bg-surface p-density-regular text-data-mono font-data-mono text-on-surface text-right flex items-center justify-end">275</div>
<div class="bg-surface p-density-regular flex items-center justify-center">
<span class="px-2 py-[2px] rounded-full border border-error text-error text-[10px] font-bold uppercase tracking-wider">High Risk</span>
</div>
<div class="bg-surface p-density-regular flex items-center justify-center gap-gutter">
<button class="text-on-surface-variant hover:text-primary-container transition-colors"><span class="material-symbols-outlined text-[18px]">visibility</span></button>
<button class="text-on-surface-variant hover:text-error transition-colors"><span class="material-symbols-outlined text-[18px]">stop_circle</span></button>
</div>
</div>
</div>
</div>
</div>
</main>
</body></html>
