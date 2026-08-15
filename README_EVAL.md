# Envictica Pipeline Evaluation & Decision Architecture

## 1. Evaluation Versioning & Scope
Envictica utilizes a strictly versioned evaluation harness powered by the Anthropic Claude API (`claude-3-5-sonnet-20241022`) to test commercial clause pipelines against curated baseline terms and high-risk hazard injections. To ensure transparent compliance tracking, every evaluation request dynamically executes against `/api/v1/analyze-risk` and persists an immutable audit log to Neon PostgreSQL, returning a sequential `compliance_log_id`.

## 2. Decision Logic & Threshold Evolution
The pipeline enforces deterministic circuit-breaker rules mapping quantitative risk scores directly to runtime actions:
* **`envictica-eval-v1.2` (Historical Baseline):** Utilized a tiered threshold where scores $\le 60$ mapped to `ALLOW`, an amber warning zone of $61 - 64$ permitted conditional `ALLOW` with advisory notices, and scores $\ge 65$ triggered an `INTERCEPT`.
* **`envictica-eval-v1.3` (Current Production):** Removed the amber warning zone to eliminate operational blind spots. The current non-negotiable circuit-breaker rule enforces:
  * **Risk Score $\le 60$:** Action = `ALLOW` (Standard commercial terms and minor notices).
  * **Risk Score $> 60$:** Action = `INTERCEPT` (Critical liability shifts, unilateral waivers, and toxic terms).

## 3. False-Negative Remediation & Guardrail Architecture
To address structural false negatives identified during baseline testing (such as `H-020` / Absolute Warranty Disclaimer, which initially scored a 62 and bypassed interception under the legacy amber rule, logged under `compliance_log_id: #72`), the system implements a hybrid guardrail:
* **Prompt Rubric:** Enforces strict penalty weights for total warranty disclaimers and unilateral liability shifts.
* **Deterministic Code Override (`server.js`):** Beyond raw model scoring, the pipeline executes a programmatic keyword and hazard pattern check. If ambiguous absolute-disclaimer phrasing is detected, the code applies a hard scoring floor override ($\ge 80$), guaranteeing that critical structural hazards route directly to `INTERCEPT`.

## 4. Post-Remediation Verification (`envictica-eval-v1.3` Suite)
Re-evaluating the absolute warranty disclaimer hazard under the updated v1.3 architecture confirms proper circuit-breaker enforcement:
* **Live API Output:** Returns `risk_score: 88`, `circuit_breaker_action: "INTERCEPT"`, and actionable mitigation recommendations.
* **Database Audit Record:** Persisted permanently to Neon PostgreSQL as `compliance_log_id: #84`, verifying end-to-end auditability and elimination of false negatives.
