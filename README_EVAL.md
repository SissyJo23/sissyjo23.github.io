Envictica Pipeline Evaluation & Decision Architecture

Evaluation Versioning & Scope

Envictica uses a versioned evaluation harness to test commercial clause-analysis pipelines against curated baseline terms and high-risk hazard injections.

Each evaluation request executes against:

/api/v1/analyze-risk

Evaluation results are persisted to Neon PostgreSQL as an immutable compliance record and return a sequential compliance_log_id.

The evaluation framework preserves versioned decision logic so that changes to risk thresholds, guardrails, and remediation behavior remain traceable.

⸻

Decision Logic & Threshold Evolution

envictica-eval-v1.2 — Historical Baseline

The historical evaluation configuration used a tiered decision model:

* Risk Score ≤ 60: ALLOW
* Risk Score 61–64: Conditional ALLOW with advisory notice
* Risk Score ≥ 65: INTERCEPT

Testing identified a false-negative condition within the advisory range.

envictica-eval-v1.3 — Current Production

The current configuration removes the advisory range and applies a deterministic circuit-breaker threshold:

* Risk Score ≤ 60: ALLOW
* Risk Score > 60: INTERCEPT

This eliminates the intermediate decision state and establishes a single enforcement boundary.

⸻

False-Negative Remediation

Baseline testing identified a structural false negative involving H-020 — Absolute Warranty Disclaimer.

The hazard initially received a risk score of 62, allowing it to pass through the legacy v1.2 advisory range. The event was recorded as:

compliance_log_id: #72

The remediation architecture combines model evaluation with deterministic programmatic controls.

Prompt-Level Guardrails

The evaluation rubric applies explicit penalty weights to:

* Absolute warranty disclaimers
* Unilateral liability shifts
* Other high-severity contractual hazard patterns

Deterministic Code Override

In addition to model-generated risk scoring, server.js performs programmatic hazard-pattern detection.

When qualifying absolute-disclaimer language is detected, the system applies a minimum risk-score floor of:

80

This forces qualifying high-severity hazards to the INTERCEPT path regardless of the underlying model score.

⸻

Post-Remediation Verification

The envictica-eval-v1.3 evaluation suite was used to verify the corrected behavior for the absolute warranty disclaimer hazard.

Live API Result

risk_score: 88
circuit_breaker_action: INTERCEPT

The response also returned actionable mitigation recommendations.

Audit Persistence

The resulting evaluation was persisted to Neon PostgreSQL as:

compliance_log_id: #84

This confirms that the remediation path is represented in both runtime decisioning and the compliance audit trail.

⸻

Adjudication & Technical Review Protocol

The evaluation architecture and failure-mode analysis were subjected to structured technical review focused on:

* Decision-boundary behavior
* Edge-case scoring
* Runtime anomalies
* Evaluation versioning
* Audit-trail integrity

Review Scope

The review examined:

1. ALLOW versus INTERCEPT threshold behavior.
2. The false-negative condition associated with compliance_log_id: #72.
3. Differences between envictica-eval-v1.2 and envictica-eval-v1.3.
4. Programmatic hazard overrides.
5. End-to-end compliance logging.

Resulting Architecture

The reviewed implementation establishes:

* A strict >60 INTERCEPT production threshold.
* Removal of the legacy 61–64 advisory zone.
* A deterministic ≥80 scoring floor for qualifying warranty-disclaimer hazards.
* Persistent compliance tracking through Neon PostgreSQL.
* Versioned evaluation configurations for reproducible testing and auditability.

The resulting architecture separates model evaluation, deterministic safety enforcement, and audit persistence, allowing each layer to be independently inspected and verified.
