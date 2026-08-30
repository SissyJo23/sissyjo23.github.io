Envictica v1.3 Benchmark Results & Audit Log

Executive Summary

The Envictica v1.3 evaluation suite tested the pipeline against 50 labeled commercial clauses, consisting of standard commercial terms and designated high-risk hazards.

Benchmark Results

Metric	Result
Total Clauses Evaluated	50
System Accuracy	98.0%
Standard Terms Correctly Allowed	25 / 25
High-Risk Hazards Correctly Intercepted	24 / 25
False Positives	0
False Negatives	1
Historical Exception	H-020 — Absolute Warranty Disclaimer

The single false negative was identified under the historical evaluation configuration and subsequently addressed through the v1.3 remediation architecture.

⸻

Live API Execution & Database Verification

The benchmark executes labeled clauses through the live risk-analysis API and records each evaluation in the compliance database.

Evaluation endpoint:

/api/v1/analyze-risk

Each successful evaluation returns a risk score, a circuit-breaker decision, and a sequential database compliance-log identifier.

⸻

Standard Commercial Terms

The standard-term control set contains 25 clauses expected to receive an ALLOW decision.

The recorded evaluations demonstrate correct classification across the supplied portion of the benchmark:

ID	Clause	Expected	Actual	Score	DB Log
A-001	Liability Cap	ALLOW	ALLOW	35	#28
A-002	Payment Terms	ALLOW	ALLOW	10	#29
A-003	Governing Law	ALLOW	ALLOW	5	#30
A-004	Confidentiality	ALLOW	ALLOW	22	#31
A-005	Audit Rights	ALLOW	ALLOW	18	#32
A-006	Assignment	ALLOW	ALLOW	15	#33
A-007	Renewal	ALLOW	ALLOW	28	#34
A-008	Standard Termination Notice	ALLOW	ALLOW	10	#35
A-009	Mutual Indemnification	ALLOW	ALLOW	22	#36
A-010	Intellectual Property Ownership	ALLOW	ALLOW	12	#37
A-011	Force Majeure	ALLOW	ALLOW	15	#38
A-012	Dispute Resolution	ALLOW	ALLOW	10	#39
A-013	Warranties	ALLOW	ALLOW	22	#40
A-014	Subcontracting	ALLOW	ALLOW	15	#41
A-015	Publicity	ALLOW	ALLOW	10	#42
A-016	Data Protection Compliance	ALLOW	ALLOW	15	#43
A-017	Insurance Requirements	ALLOW	ALLOW	10	#44
A-018	Severability	ALLOW	ALLOW	5	#45
A-019	Entire Agreement	ALLOW	ALLOW	15	#46
A-020	Notice Delivery	ALLOW	ALLOW	8	#47
A-021	Independent Contractors	ALLOW	ALLOW	5	#48
A-022	Non-Exclusivity	ALLOW	ALLOW	5	#49
A-023	Survival	ALLOW	ALLOW	10	#50
A-024	Compliance with Laws	ALLOW	ALLOW	5	#51
A-025	Counterparts	ALLOW	ALLOW	2	#52

Control-set result: 25 / 25 correctly allowed.

⸻

High-Risk Hazard Evaluations

The hazard control set contains 25 designated clauses expected to trigger INTERCEPT.

The supplied execution record confirms the beginning of this sequence:

ID	Hazard	Expected	Actual	Score	DB Log
H-001	Uncapped Indemnity	INTERCEPT	INTERCEPT	87	#53
H-002	Broad IP Assignment	INTERCEPT	INTERCEPT	92	record continues

The remaining hazard records should be reproduced directly from the benchmark execution output rather than reconstructed from aggregate statistics.

⸻

Historical False Negative

H-020 — Absolute Warranty Disclaimer

The historical v1.2 configuration produced a risk score of 62 for H-020.

Under the legacy decision architecture, scores from 61–64 entered the advisory range rather than triggering immediate interception.

The event was recorded under:

compliance_log_id: #72

This exposed a structural weakness in the legacy threshold architecture: a high-severity contractual hazard could receive a score below the hard interception threshold while still presenting material risk.

⸻

v1.3 Remediation

The current evaluation architecture removes the legacy advisory range.

Production Decision Boundary

Risk Score <= 60  → ALLOW
Risk Score > 60   → INTERCEPT

The pipeline also applies deterministic hazard-pattern detection independently of the model’s raw score.

For qualifying absolute-disclaimer patterns, the implementation applies a minimum scoring floor of:

Risk Score >= 80

This ensures that a qualifying high-severity warranty disclaimer cannot bypass interception solely because of model scoring variance.

⸻

Post-Remediation Verification

The remediated H-020 condition was subsequently evaluated under the v1.3 architecture.

Live Result

risk_score: 88
circuit_breaker_action: INTERCEPT

The evaluation also returned mitigation recommendations.

Audit Record

The resulting evaluation was persisted as:

compliance_log_id: #84

This provides the recorded end-to-end verification point for the remediation.

⸻

Benchmark Interpretation

The benchmark establishes three separate observations:

1. Baseline classification performance

The 50-case evaluation produced 98.0% aggregate accuracy, with all 25 standard terms correctly allowed and 24 of 25 designated hazards intercepted.

2. Failure-mode identification

The H-020 result exposed a boundary-condition failure in the historical v1.2 decision architecture.

3. Remediation verification

The subsequent v1.3 evaluation of the same hazard produced an INTERCEPT result with a risk score of 88 and a persisted compliance record.

Accordingly, the benchmark should be presented as evidence of both initial system performance and iterative guardrail validation, rather than as a claim that the original 50-case run achieved perfect hazard detection.
