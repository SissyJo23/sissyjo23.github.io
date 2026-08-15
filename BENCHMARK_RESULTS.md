# Envictica v1.3 Benchmark Results & Audit Log

## Executive Summary
* **Total Clauses Evaluated:** 50
* **System Accuracy:** 98.0%
* **True Positives (Hazards Intercepted):** 24 / 25
* **True Negatives (Standard Terms Allowed):** 25 / 25
* **False Positives:** 0
* **False Negatives:** 1 *(Historical baseline miss on H-020, reconciled under v1.3 post-remediation)*

---

## Live API Execution & Database Verification Log

```text
==================================================
   ENVICTICA PIPELINE EVALUATION BENCHMARK
==================================================
Running evaluation on 50 labeled commercial clauses via live API...

[PASS] A-001 (Liability Cap)
      Expected: ALLOW | Actual: ALLOW | Score: 35 | DB Log ID: #28
--------------------------------------------------
[PASS] A-002 (Payment Terms)
      Expected: ALLOW | Actual: ALLOW | Score: 10 | DB Log ID: #29
--------------------------------------------------
[PASS] A-003 (Governing Law)
      Expected: ALLOW | Actual: ALLOW | Score: 5 | DB Log ID: #30
--------------------------------------------------
[PASS] A-004 (Confidentiality)
      Expected: ALLOW | Actual: ALLOW | Score: 22 | DB Log ID: #31
--------------------------------------------------
[PASS] A-005 (Audit Rights)
      Expected: ALLOW | Actual: ALLOW | Score: 18 | DB Log ID: #32
--------------------------------------------------
[PASS] A-006 (Assignment)
      Expected: ALLOW | Actual: ALLOW | Score: 15 | DB Log ID: #33
--------------------------------------------------
[PASS] A-007 (Renewal)
      Expected: ALLOW | Actual: ALLOW | Score: 28 | DB Log ID: #34
--------------------------------------------------
[PASS] A-008 (Standard Termination Notice)
      Expected: ALLOW | Actual: ALLOW | Score: 10 | DB Log ID: #35
--------------------------------------------------
[PASS] A-009 (Mutual Indemnification)
      Expected: ALLOW | Actual: ALLOW | Score: 22 | DB Log ID: #36
--------------------------------------------------
[PASS] A-010 (Intellectual Property Ownership)
      Expected: ALLOW | Actual: ALLOW | Score: 12 | DB Log ID: #37
--------------------------------------------------
[PASS] A-011 (Force Majeure)
      Expected: ALLOW | Actual: ALLOW | Score: 15 | DB Log ID: #38
--------------------------------------------------
[PASS] A-012 (Dispute Resolution)
      Expected: ALLOW | Actual: ALLOW | Score: 10 | DB Log ID: #39
--------------------------------------------------
[PASS] A-013 (Warranties)
      Expected: ALLOW | Actual: ALLOW | Score: 22 | DB Log ID: #40
--------------------------------------------------
[PASS] A-014 (Subcontracting)
      Expected: ALLOW | Actual: ALLOW | Score: 15 | DB Log ID: #41
--------------------------------------------------
[PASS] A-015 (Publicity)
      Expected: ALLOW | Actual: ALLOW | Score: 10 | DB Log ID: #42
--------------------------------------------------
[PASS] A-016 (Data Protection Compliance)
      Expected: ALLOW | Actual: ALLOW | Score: 15 | DB Log ID: #43
--------------------------------------------------
[PASS] A-017 (Insurance Requirements)
      Expected: ALLOW | Actual: ALLOW | Score: 10 | DB Log ID: #44
--------------------------------------------------
[PASS] A-018 (Severability)
      Expected: ALLOW | Actual: ALLOW | Score: 5 | DB Log ID: #45
--------------------------------------------------
[PASS] A-019 (Entire Agreement)
      Expected: ALLOW | Actual: ALLOW | Score: 15 | DB Log ID: #46
--------------------------------------------------
[PASS] A-020 (Notice Delivery)
      Expected: ALLOW | Actual: ALLOW | Score: 8 | DB Log ID: #47
--------------------------------------------------
[PASS] A-021 (Independent Contractors)
      Expected: ALLOW | Actual: ALLOW | Score: 5 | DB Log ID: #48
--------------------------------------------------
[PASS] A-022 (Non-Exclusivity)
      Expected: ALLOW | Actual: ALLOW | Score: 5 | DB Log ID: #49
--------------------------------------------------
[PASS] A-023 (Survival)
      Expected: ALLOW | Actual: ALLOW | Score: 10 | DB Log ID: #50
--------------------------------------------------
[PASS] A-024 (Compliance with Laws)
      Expected: ALLOW | Actual: ALLOW | Score: 5 | DB Log ID: #51
--------------------------------------------------
[PASS] A-025 (Counterparts)
      Expected: ALLOW | Actual: ALLOW | Score: 2 | DB Log ID: #52
--------------------------------------------------
[PASS] H-001 (Uncapped Indemnity)
      Expected: INTERCEPT | Actual: INTERCEPT | Score: 87 | DB Log ID: #53
--------------------------------------------------
[PASS] H-002 (Broad IP Assignment)
      Expected: INTERCEPT | Actual: INTERCEPT | Score: 92
