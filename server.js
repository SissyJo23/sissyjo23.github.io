const express = require('express');
const path = require('path');
const crypto = require('crypto');

const db = require('./db.js');
const { Anthropic } = require('@anthropic-ai/sdk');
const { auth } = require('./workos-auth');
const {
  createReviewRequest,
  decideReviewRequest
} = require('./two-key-reviews');
const {
  evaluateControlDecision,
  buildRecordHash
} = require('./control-decision-gate');

const app = express();

app.set('trust proxy', 1);

const PORT = Number(process.env.PORT) || 3000;
const STATIC_ROOT = '/var/www/envictica';

app.use(express.json({ limit: '2mb' }));
app.use(express.static(STATIC_ROOT));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/* -------------------------------------------------------------------------- */
/* Authentication & Authorization                                             */
/* -------------------------------------------------------------------------- */

const ADMIN_USER_IDS = new Set(
  (process.env.ENVICTICA_ADMIN_USER_IDS || '')
    .split(',')
    .map((userId) => userId.trim())
    .filter(Boolean)
);

function reviewUserId(req) {
  return req.auth?.user?.id || null;
}

function requireAdministrator(req, res, next) {
  const userId = req.auth?.user?.id;

  if (!userId || !ADMIN_USER_IDS.has(userId)) {
    return res.status(403).json({
      success: false,
      error: 'Administrator access is required.'
    });
  }

  return next();
}

async function requireAuthenticatedSession(req, res, next) {
  try {
    const session = await auth.getSession(req);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Authentication is required.'
      });
    }

    req.auth = {
      user: session.user ?? null,
      organizationId: session.organizationId ?? null,
      role: session.role ?? null
    };

    return next();
  } catch (error) {
    console.error('Authentication middleware failed:', error.message);

    return res.status(401).json({
      success: false,
      error: 'Authentication is required.'
    });
  }
}

async function requireReviewer(req, res, next) {
  try {
    const {
      requireActiveRole,
      ROLES
    } = require('./two-key-auth');

    await requireActiveRole(
      reviewUserId(req),
      ROLES.REVIEWER
    );

    return next();
  } catch (error) {
    return res.status(error.statusCode || 403).json({
      success: false,
      error: error.message || 'Reviewer access required.'
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Static Application                                                          */
/* -------------------------------------------------------------------------- */

app.get('/', (req, res) => {
  res.sendFile(path.join(STATIC_ROOT, 'index.html'));
});

/* -------------------------------------------------------------------------- */
/* Audit / Compliance                                                          */
/* -------------------------------------------------------------------------- */

app.get(
  '/api/logs',
  (req, res) => {
    return res.status(403).json({
      success: false,
      error: 'Audit-log access is restricted.'
    });
  }
);

app.post(
  '/api/logs',
  (req, res) => {
    return res.status(403).json({
      success: false,
      error: 'Audit-log writes must use the operational-control workflow.'
    });
  }
);

app.get(
  '/api/export/compliance',
  requireAuthenticatedSession,
  requireAdministrator,
  async (req, res) => {
    try {
      const timestamp = new Date().toISOString();

      const csvData = [
        'Timestamp,Module,Actor,Action,Status',
        `${timestamp},System Automated,Compliance Check,Export Requested,Passed`
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="compliance_report_${Date.now()}.csv"`
      );

      return res.send(csvData);
    } catch (error) {
      console.error('Compliance export failed:', error.message);

      return res.status(500).json({
        success: false,
        error: 'Compliance export failed.'
      });
    }
  }
);

/* -------------------------------------------------------------------------- */
/* Risk Analysis                                                               */
/* -------------------------------------------------------------------------- */

app.post(
  '/api/v1/analyze-risk',
  requireAuthenticatedSession,
  async (req, res) => {
    try {
      const clauseText =
        req.body?.clauseText ||
        req.body?.clause ||
        '';

      const contractType =
        typeof req.body?.contractType === 'string'
          ? req.body.contractType.trim()
          : '';

      if (!clauseText || typeof clauseText !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Missing clauseText in request body.'
        });
      }

      if (!contractType) {
        return res.status(400).json({
          success: false,
          error: 'Missing or invalid contractType.'
        });
      }

      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(503).json({
          success: false,
          error: 'Risk-analysis provider is not configured.',
          circuit_breaker_action: 'ERROR',
          risk_score: 0
        });
      }

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        system: `You are Envictica, a legal-risk analysis engine.

Your task is to analyze commercial contract language for structural risk.

Do not invent facts that are not present in the supplied clause.

If the supplied text does not contain enough evidence to support a classification, say so explicitly.

Analyze these categories:

1. Intellectual Property
2. Termination & Exit
3. Non-Compete & Exclusivity
4. Liability & Indemnification

Return JSON only.

Required structure:

{
  "category": "IP | Termination | Non-Compete | Liability",
  "score": 0,
  "extracted_text": "exact sentence from supplied text",
  "legal_rationale": "one sentence explaining the structural basis for the score",
  "envictica_redline": "replacement language when score >= 40"
}

Scoring:

0-39 = LOW
40-79 = MEDIUM
80-100 = CRITICAL

Important:
- extracted_text must be exact text from the supplied clause.
- Never fabricate an extracted sentence.
- Never claim a fact that is absent from the supplied text.
- If evidence is insufficient, reflect that limitation in legal_rationale.
- Do not treat a topic appearing in the text as proof of legal risk.
- Evaluate the actual obligation, restriction, remedy, allocation, or liability structure.`,
        messages: [
          {
            role: 'user',
            content:
              `Contract type: ${contractType}\n\n` +
              `Analyze this clause:\n\n${clauseText}`
          }
        ]
      });

      const textContent =
        response.content
          ?.filter((item) => item.type === 'text')
          ?.map((item) => item.text)
          ?.join('\n')
          ?.trim() || '';

      let risk_score = 50;
      let circuit_breaker_action = 'REVIEW';
      let flagged_issues = [];
      let mitigation_recommendation =
        'The analysis did not provide enough structured evidence to establish a final disposition.';

      try {
        const jsonMatch =
          textContent.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          if (typeof parsed.score === 'number') {
            risk_score = parsed.score;
          } else if (
            typeof parsed.risk_score === 'number'
          ) {
            risk_score = parsed.risk_score;
          }

          risk_score = Math.max(
            0,
            Math.min(100, risk_score)
          );

          if (risk_score >= 80) {
            circuit_breaker_action = 'INTERCEPT';
          } else if (risk_score >= 40) {
            circuit_breaker_action = 'REVIEW';
          } else {
            circuit_breaker_action = 'ALLOW';
          }

          if (parsed.legal_rationale) {
            mitigation_recommendation =
              String(parsed.legal_rationale);
          }

          if (parsed.envictica_redline) {
            flagged_issues.push(
              `Redline: ${String(parsed.envictica_redline)}`
            );
          }

          if (Array.isArray(parsed.flagged_issues)) {
            flagged_issues.push(
              ...parsed.flagged_issues.map(String)
            );
          }
        } else {
          flagged_issues.push(
            'The model response was not valid structured JSON.'
          );
        }
      } catch (parseError) {
        console.error(
          'Risk-analysis response parsing failed:',
          parseError.message
        );

        circuit_breaker_action = 'REVIEW';
        flagged_issues.push(
          'The model response could not be verified as structured JSON.'
        );

        mitigation_recommendation =
          'Do not rely on the unstructured model response until it has been independently reviewed.';
      }

      const lowerClause =
        clauseText.toLowerCase();

      /* -------------------------------------------------------------------- */
      /* Deterministic guardrails                                             */
      /* -------------------------------------------------------------------- */

      if (
        (
          lowerClause.includes('disclaim') ||
          lowerClause.includes('no warranties')
        ) &&
        (
          lowerClause.includes('merchantability') ||
          lowerClause.includes('fitness') ||
          lowerClause.includes('all warranties')
        )
      ) {
        risk_score = Math.max(risk_score, 85);
        circuit_breaker_action = 'INTERCEPT';

        flagged_issues.push(
          'Absolute warranty disclaimer detected.'
        );

        mitigation_recommendation =
          'Review the warranty disclaimer for applicable carve-outs, express warranties, and enforceability before use.';
      }

      const hasAdverseModifier =
        lowerClause.includes('unlimited') ||
        lowerClause.includes('uncapped') ||
        lowerClause.includes('sole discretion') ||
        lowerClause.includes('unilateral') ||
        lowerClause.includes('without limitation') ||
        lowerClause.includes('waive') ||
        lowerClause.includes('disclaim');

      const isHighLiabilityRisk =
        (
          lowerClause.includes('liability') ||
          lowerClause.includes('indemnify')
        ) &&
        hasAdverseModifier;

      if (isHighLiabilityRisk) {
        risk_score = Math.max(risk_score, 85);
        circuit_breaker_action = 'INTERCEPT';

        flagged_issues.push(
          'Potential high-risk liability structure detected by deterministic guardrail.'
        );
      }

      if (
        lowerClause.includes('irrevocable, perpetual') ||
        lowerClause.includes('remotely disable') ||
        lowerClause.includes('source code generated') ||
        lowerClause.includes('class action')
      ) {
        risk_score = Math.max(risk_score, 70);

        if (risk_score >= 80) {
          circuit_breaker_action = 'INTERCEPT';
        } else {
          circuit_breaker_action = 'REVIEW';
        }

        flagged_issues.push(
          'High-consequence contractual language requires review.'
        );
      }

      /* -------------------------------------------------------------------- */
      /* Deterministic taxonomy checks                                        */
      /* -------------------------------------------------------------------- */

      const typeLower =
        contractType.toLowerCase();

      if (
        typeLower === 'ip' ||
        lowerClause.includes('deliverables') ||
        lowerClause.includes('ownership')
      ) {
        if (
          lowerClause.includes('work made for hire') ||
          lowerClause.includes('vest entirely in customer')
        ) {
          risk_score = Math.max(risk_score, 85);
          circuit_breaker_action = 'INTERCEPT';

          flagged_issues.push(
            'Critical: potential assignment or work-made-for-hire exposure detected.'
          );

          mitigation_recommendation =
            'Retain background IP ownership and limit the customer license to the rights actually required for the agreement.';
        } else if (
          lowerClause.includes('exclusive ownership')
        ) {
          risk_score = Math.min(risk_score, 39);

          if (risk_score < 40) {
            circuit_breaker_action = 'ALLOW';
          }

          flagged_issues.push(
            'Low-risk IP reservation language detected.'
          );
        }
      }

      if (
        typeLower === 'termination' ||
        lowerClause.includes('terminate')
      ) {
        if (
          lowerClause.includes('with or without cause') &&
          lowerClause.includes('refund')
        ) {
          risk_score = Math.max(risk_score, 90);
          circuit_breaker_action = 'INTERCEPT';

          flagged_issues.push(
            'Critical: termination-for-convenience and refund exposure detected.'
          );

          mitigation_recommendation =
            'Review or remove pro-rata refund exposure associated with convenience termination.';
        } else if (
          lowerClause.includes('no additional cost') ||
          lowerClause.includes('migration')
        ) {
          risk_score = Math.max(risk_score, 60);

          if (risk_score >= 80) {
            circuit_breaker_action = 'INTERCEPT';
          } else {
            circuit_breaker_action = 'REVIEW';
          }

          flagged_issues.push(
            'Medium: transition or migration obligations detected.'
          );

          mitigation_recommendation =
            'Define a finite transition period, scope the services, and establish applicable fees.';
        }
      }

      if (
        typeLower === 'non-compete' ||
        lowerClause.includes('market') ||
        lowerClause.includes('solicit')
      ) {
        if (
          lowerClause.includes('shall not market') ||
          lowerClause.includes('exclusivity')
        ) {
          risk_score = Math.max(risk_score, 85);
          circuit_breaker_action = 'INTERCEPT';

          flagged_issues.push(
            'Critical: market-access or exclusivity restriction detected.'
          );

          mitigation_recommendation =
            'Review the geographic, industry, customer, and duration scope of the restriction.';
        } else if (
          lowerClause.includes('solicit') &&
          lowerClause.includes('employee')
        ) {
          risk_score = Math.max(risk_score, 55);

          if (risk_score >= 80) {
            circuit_breaker_action = 'INTERCEPT';
          } else {
            circuit_breaker_action = 'REVIEW';
          }

          flagged_issues.push(
            'Medium: personnel non-solicitation restriction detected.'
          );

          mitigation_recommendation =
            'Ensure the restriction is mutual, narrowly scoped, and time-bounded.';
        }
      }

      if (
        typeLower === 'liabilities' ||
        lowerClause.includes('liability') ||
        lowerClause.includes('indemn')
      ) {
        const hasCarveOut =
          lowerClause.includes('shall not apply to') ||
          lowerClause.includes('breaches of confidentiality') ||
          lowerClause.includes('data security incidents');

        if (
          hasCarveOut ||
          lowerClause.includes('uncapped')
        ) {
          risk_score = Math.max(risk_score, 85);
          circuit_breaker_action = 'INTERCEPT';

          flagged_issues.push(
            'Critical: uncapped liability or liability-cap carve-out detected.'
          );

          mitigation_recommendation =
            'Review the aggregate liability cap and every carve-out before accepting the clause.';
        } else if (
          lowerClause.includes('multiple') ||
          lowerClause.includes('greater of')
        ) {
          risk_score = Math.max(risk_score, 65);

          if (risk_score >= 80) {
            circuit_breaker_action = 'INTERCEPT';
          } else {
            circuit_breaker_action = 'REVIEW';
          }

          flagged_issues.push(
            'Medium: multiplied or super-capped liability exposure detected.'
          );

          mitigation_recommendation =
            'Review whether liability should instead be limited to fees paid during the applicable preceding period.';
        }
      }

      risk_score = Math.max(
        0,
        Math.min(100, risk_score)
      );

      if (risk_score >= 80) {
        circuit_breaker_action = 'INTERCEPT';
      } else if (risk_score >= 40) {
        circuit_breaker_action = 'REVIEW';
      } else {
        circuit_breaker_action = 'ALLOW';
      }

      const log = await db.query(
        `INSERT INTO compliance_logs
          (
            risk_score,
            circuit_breaker_action,
            flagged_issues,
            mitigation_recommendation
          )
         VALUES ($1, $2, $3::jsonb, $4)
         RETURNING id`,
        [
          risk_score,
          circuit_breaker_action,
          JSON.stringify(flagged_issues),
          mitigation_recommendation
        ]
      );

      return res.json({
        success: true,
        risk_score,
        circuit_breaker_action,
        flagged_issues,
        mitigation_recommendation,
        analysis: textContent,
        compliance_log_id:
          log.rows[0]?.id || null
      });
    } catch (error) {
      console.error(
        'Risk-analysis API error:',
        error.message
      );

      return res.status(503).json({
        success: false,
        error: 'Risk analysis could not be completed.',
        circuit_breaker_action: 'ERROR',
        risk_score: 0
      });
    }
  }
);

/* -------------------------------------------------------------------------- */
/* Operational Control                                                         */
/* -------------------------------------------------------------------------- */

app.post(
  '/api/v1/operational-control',
  requireAuthenticatedSession,
  async (req, res) => {
    try {
      const {
        ai_output = '',
        workflow_use = '',
        source_status = '',
        source_reference = '',
        owner = '',
        human_reviewed = false,
        verified_by_ai = false,
        upstream_ai_output_used = false
      } = req.body || {};

      const output =
        String(ai_output).trim();

      if (!output) {
        return res.status(400).json({
          success: false,
          error:
            'Missing ai_output. Provide the AI-generated output or decision being evaluated.'
        });
      }

      let upstream = null;

      try {
        upstream = JSON.parse(output);
      } catch (_) {
        upstream = null;
      }

      const findings = Array.isArray(
        upstream?.findings
      )
        ? [...upstream.findings]
        : [];

      const upstreamRisk =
        Number(upstream?.risk_score);

      let risk_score =
        Number.isFinite(upstreamRisk)
          ? Math.max(
              0,
              Math.min(100, upstreamRisk)
            )
          : 0;

      const upstreamAction =
        String(
          upstream?.circuit_breaker_action || ''
        )
          .trim()
          .toUpperCase();

      const workflow =
        String(workflow_use).trim();

      const sourceStatus =
        String(source_status)
          .trim()
          .toLowerCase();

      const sourceReference =
        String(source_reference).trim();

      const accountableOwner =
        String(owner).trim();

      if (!workflow) {
        risk_score += 20;

        findings.push(
          'Operational context missing: intended workflow use was not identified.'
        );
      }

      if (
        !sourceReference ||
        [
          'none',
          'unknown',
          'unverified',
          'missing'
        ].includes(sourceStatus)
      ) {
        risk_score += 35;

        findings.push(
          'Authoritative source evidence is missing or unverified.'
        );
      }

      if (
        verified_by_ai === true ||
        upstream_ai_output_used === true
      ) {
        risk_score += 45;

        findings.push(
          'AI-to-AI verification or upstream AI output dependency detected.'
        );
      }

      if (!accountableOwner) {
        risk_score += 20;

        findings.push(
          'No accountable human owner is assigned to the output.'
        );
      }

      if (human_reviewed !== true) {
        risk_score += 15;

        findings.push(
          'Human review gate has not been completed.'
        );
      }

      const normalizedOutput =
        output.toLowerCase();

      if (
        normalizedOutput.includes('citation') ||
        normalizedOutput.includes('statute') ||
        normalizedOutput.includes('case law') ||
        normalizedOutput.includes('legal advice')
      ) {
        risk_score += 10;

        findings.push(
          'High-consequence legal content detected; source verification and accountable review are required.'
        );
      }

      risk_score = Math.min(
        risk_score,
        100
      );

      let circuit_breaker_action = 'ALLOW';

      if (
        risk_score >= 70 ||
        upstreamAction === 'INTERCEPT'
      ) {
        circuit_breaker_action = 'INTERCEPT';
      } else if (
        risk_score >= 30 ||
        upstreamAction === 'REVIEW'
      ) {
        circuit_breaker_action = 'REVIEW';
      }

      const mitigation_recommendation =
        circuit_breaker_action === 'INTERCEPT'
          ? 'Do not deploy, send, file, or rely on this output. Attach authoritative source material, assign a human owner, remove AI-to-AI verification, and complete human review before retrying.'
          : circuit_breaker_action === 'REVIEW'
            ? 'Pause the workflow. Add source references, identify the accountable owner, and complete documented human review before operational use.'
            : 'Control requirements are present. Retain the source reference and review record for auditability.';

      let compliance_log_id = null;

      try {
        const log = await db.query(
          `INSERT INTO public.compliance_logs
            (
              risk_score,
              circuit_breaker_action,
              flagged_issues,
              mitigation_recommendation
            )
           VALUES ($1, $2, $3::jsonb, $4)
           RETURNING id`,
          [
            risk_score,
            circuit_breaker_action,
            JSON.stringify(findings),
            mitigation_recommendation
          ]
        );

        compliance_log_id =
          log.rows[0]?.id || null;
      } catch (logError) {
        console.error(
          'Operational control log error:',
          logError.message
        );
      }

      return res.json({
        success: true,
        risk_score,
        circuit_breaker_action,
        findings,
        mitigation_recommendation,
        controls: {
          source_attached:
            Boolean(sourceReference),
          source_status:
            sourceStatus || 'unknown',
          accountable_owner:
            accountableOwner || null,
          human_reviewed:
            human_reviewed === true,
          verified_by_ai:
            verified_by_ai === true,
          upstream_ai_output_used:
            upstream_ai_output_used === true
        },
        compliance_log_id
      });
    } catch (error) {
      console.error(
        'Operational control error:',
        error.message
      );

      return res.status(500).json({
        success: false,
        error:
          'Operational control evaluation failed.',
        circuit_breaker_action: 'ERROR',
        risk_score: 0
      });
    }
  }
);

/* -------------------------------------------------------------------------- */
/* Control Decision Gate                                                       */
/* -------------------------------------------------------------------------- */

app.post(
  '/api/v1/control-decisions/evaluate',
  requireAuthenticatedSession,
  requireAdministrator,
  async (req, res) => {
    let decision;

    try {
      decision =
        evaluateControlDecision(
          req.body || {}
        );

      const reviewRequestId =
        String(
          req.body?.review_request_id || ''
        ).trim();

      if (reviewRequestId) {
        const reviewLookup =
          await db.query(
            `SELECT
               request_id,
               maker_user_id,
               reviewer_user_id,
               status,
               reviewer_decision,
               reviewed_at,
               output_sha256
             FROM review_requests
             WHERE request_id = $1
             LIMIT 1`,
            [reviewRequestId]
          );

        const review =
          reviewLookup.rows[0] || null;

        if (!review) {
          return res.status(400).json({
            success: false,
            error:
              'The supplied review_request_id was not found.',
            circuit_breaker_action: 'ERROR',
            risk_score:
              decision.riskScore
          });
        }

        if (
          review.output_sha256 !==
          decision.outputSha256
        ) {
          return res.status(400).json({
            success: false,
            error:
              'The approved review does not match this exact analysis output.',
            circuit_breaker_action: 'ERROR',
            risk_score:
              decision.riskScore
          });
        }

        if (
          review.status === 'APPROVED' &&
          review.reviewer_decision === 'APPROVE' &&
          review.reviewer_user_id &&
          review.reviewed_at
        ) {
          decision.reviewerId =
            review.reviewer_user_id;

          decision.humanReviewedAt =
            review.reviewed_at;

          decision.findings.push(
            `Independent review approved: ${review.request_id}.`
          );
        } else {
          decision.findings.push(
            'Linked review is not an approved independent review; it cannot authorize ALLOW.'
          );
        }
      }

      const independentReviewSatisfied =
        decision.circuitBreakerAction ===
          'ESCALATE' &&
        decision.riskScore < 70 &&
        decision.sourceAuthorityStatus ===
          'VERIFIED' &&
        decision.ownerId &&
        decision.reviewerId &&
        decision.humanReviewedAt &&
        decision.reviewerId !==
          decision.ownerId &&
        decision.verifiedByAi === false &&
        decision.upstreamAiOutputUsed === false;

      if (independentReviewSatisfied) {
        decision.circuitBreakerAction =
          'ALLOW';

        decision.mitigationRecommendation =
          'Approved independent review, verified source evidence, distinct owner and reviewer, and required controls are recorded. Retain this append-only decision record for auditability.';
      }

      if (
        decision.circuitBreakerAction ===
          'ESCALATE' &&
        !decision.reviewerId
      ) {
        decision.findings.push(
          'No approved independent review is linked; ALLOW is not permitted.'
        );
      }

      decision.decisionId =
        crypto.randomUUID();

      const previous =
        await db.query(
          `SELECT record_hash
           FROM control_decisions
           ORDER BY id DESC
           LIMIT 1`
        );

      decision.previousRecordHash =
        previous.rows[0]?.record_hash ||
        null;

      const recordHash =
        buildRecordHash(decision);

      const saved =
        await db.query(
          `INSERT INTO control_decisions (
            decision_id,
            output_sha256,
            workflow_use,
            source_url,
            source_domain,
            source_authority_status,
            owner_id,
            reviewer_id,
            human_reviewed_at,
            verified_by_ai,
            upstream_ai_output_used,
            risk_score,
            circuit_breaker_action,
            findings,
            mitigation_recommendation,
            previous_record_hash,
            record_hash
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14::jsonb,
            $15,
            $16,
            $17
          )
          RETURNING id, decision_id, created_at`,
          [
            decision.decisionId,
            decision.outputSha256,
            decision.workflowUse,
            decision.sourceUrl,
            decision.sourceDomain,
            decision.sourceAuthorityStatus,
            decision.ownerId,
            decision.reviewerId,
            decision.humanReviewedAt,
            decision.verifiedByAi,
            decision.upstreamAiOutputUsed,
            decision.riskScore,
            decision.circuitBreakerAction,
            JSON.stringify(
              decision.findings
            ),
            decision.mitigationRecommendation,
            decision.previousRecordHash,
            recordHash
          ]
        );

      return res
        .status(
          decision.circuitBreakerAction ===
            'INTERCEPT'
            ? 403
            : 202
        )
        .json({
          success: true,
          decision_id:
            saved.rows[0].decision_id,
          audit_record_id:
            saved.rows[0].id,
          created_at:
            saved.rows[0].created_at,
          output_sha256:
            decision.outputSha256,
          risk_score:
            decision.riskScore,
          circuit_breaker_action:
            decision.circuitBreakerAction,
          findings:
            decision.findings,
          mitigation_recommendation:
            decision.mitigationRecommendation,
          controls: {
            source_authority_status:
              decision.sourceAuthorityStatus,
            source_domain:
              decision.sourceDomain,
            owner_id:
              decision.ownerId,
            reviewer_id:
              decision.reviewerId,
            human_reviewed_at:
              decision.humanReviewedAt,
            authentication_required_for_allow:
              true
          }
        });
    } catch (error) {
      console.error(
        'Control-decision gate error:',
        error.message
      );

      return res.status(503).json({
        success: false,
        error:
          'Control decision could not be recorded. Output must not be used.',
        circuit_breaker_action: 'ERROR',
        risk_score: 0
      });
    }
  }
);

/* -------------------------------------------------------------------------- */
/* Review Workflow                                                             */
/* -------------------------------------------------------------------------- */

app.get(
  '/reviews',
  requireAuthenticatedSession,
  requireReviewer,
  (req, res) => {
    return res.sendFile(
      path.join(
        STATIC_ROOT,
        'reviews.html'
      )
    );
  }
);

app.get(
  '/api/v1/reviews/pending',
  requireAuthenticatedSession,
  requireReviewer,
  async (req, res) => {
    try {
      const result =
        await db.query(
          `SELECT
             request_id,
             maker_user_id,
             source_url,
             source_domain,
             source_authority_status,
             risk_score,
             requested_action,
             created_at
           FROM review_requests
           WHERE status = 'PENDING'
           ORDER BY created_at ASC
           LIMIT 100`
        );

      return res.json({
        success: true,
        reviews: result.rows
      });
    } catch (error) {
      console.error(
        'Pending-review lookup failed:',
        error.message
      );

      return res.status(500).json({
        success: false,
        error:
          'Unable to load review queue.'
      });
    }
  }
);

app.post(
  '/api/v1/reviews/:requestId/decision',
  requireAuthenticatedSession,
  requireReviewer,
  async (req, res) => {
    try {
      const body = req.body || {};

      const review =
        await decideReviewRequest({
          requestId:
            req.params.requestId,
          reviewerUserId:
            reviewUserId(req),
          decision:
            body.decision,
          rationale:
            body.rationale
        });

      return res.json({
        success: true,
        review
      });
    } catch (error) {
      console.error(
        'Review decision failed:',
        error.message
      );

      return res.status(
        error.statusCode || 500
      ).json({
        success: false,
        error:
          error.message ||
          'Unable to record decision.'
      });
    }
  }
);

app.post(
  '/api/v1/reviews',
  requireAuthenticatedSession,
  async (req, res) => {
    try {
      const body = req.body || {};

      const review =
        await createReviewRequest({
          makerUserId:
            reviewUserId(req),
          outputSha256:
            body.outputSha256,
          sourceUrl:
            body.sourceUrl || null,
          sourceDomain:
            body.sourceDomain || null,
          sourceAuthorityStatus:
            body.sourceAuthorityStatus,
          riskScore:
            body.riskScore,
          requestedAction:
            body.requestedAction
        });

      return res.status(201).json({
        success: true,
        review
      });
    } catch (error) {
      console.error(
        'Review request creation failed:',
        error.message
      );

      return res.status(
        error.statusCode || 500
      ).json({
        success: false,
        error:
          error.message ||
          'Unable to create review request.'
      });
    }
  }
);

/* -------------------------------------------------------------------------- */
/* WorkOS Authentication                                                        */
/* -------------------------------------------------------------------------- */

app.get(
  '/auth/login',
  async (req, res) => {
    try {
      const result =
        await auth.createSignIn(res);

      return res.redirect(
        result.url
      );
    } catch (error) {
      console.error(
        'WorkOS login initialization failed:',
        error.message
      );

      return res.status(500).json({
        success: false,
        error:
          'Unable to start sign-in.'
      });
    }
  }
);

app.get(
  '/auth/callback',
  async (req, res) => {
    console.log(
      'WorkOS callback received:',
      {
        hasCode:
          Boolean(req.query.code),
        hasState:
          Boolean(req.query.state),
        host:
          req.get('host'),
        forwardedProto:
          req.get('x-forwarded-proto') ||
          null
      }
    );

    try {
      await auth.handleCallback(
        req,
        res,
        {
          code:
            req.query.code,
          state:
            req.query.state
        }
      );

      const setCookie =
        res.getHeader(
          'Set-Cookie'
        );

      console.log(
        'WorkOS callback session cookie set:',
        {
          present:
            Boolean(setCookie),
          count:
            Array.isArray(setCookie)
              ? setCookie.length
              : setCookie
                ? 1
                : 0
        }
      );

      return res.redirect('/');
    } catch (error) {
      console.error(
        'WorkOS callback failed:',
        error.message
      );

      return res.status(401).json({
        success: false,
        error:
          'Sign-in could not be completed.'
      });
    }
  }
);

app.get(
  '/auth/session',
  async (req, res) => {
    try {
      const session =
        await auth.getSession(req);

      if (!session) {
        return res.status(401).json({
          authenticated: false
        });
      }

      return res.json({
        authenticated: true,
        user:
          session.user ?? null,
        organizationId:
          session.organizationId ??
          null,
        role:
          session.role ?? null
      });
    } catch (error) {
      console.error(
        'WorkOS session lookup failed:',
        error.message
      );

      return res.status(401).json({
        authenticated: false
      });
    }
  }
);

app.post(
  '/auth/logout',
  async (req, res) => {
    try {
      await auth.clearSession(res);

      return res.status(204).end();
    } catch (error) {
      console.error(
        'WorkOS logout failed:',
        error.message
      );

      return res.status(500).json({
        success: false,
        error:
          'Unable to sign out.'
      });
    }
  }
);

/* -------------------------------------------------------------------------- */
/* Telemetry                                                                   */
/* -------------------------------------------------------------------------- */

/*
 * This endpoint intentionally reports only server-observable state.
 * It does not claim AWS, EC2, database, model-provider, latency,
 * uptime, or failover metrics that have not actually been measured.
 */

app.get(
  '/api/telemetry',
  (req, res) => {
    return res.json({
      status: 'online',
      active_trace: 'LIVE',
      timestamp:
        new Date().toISOString()
    });
  }
);

/* -------------------------------------------------------------------------- */
/* Server                                                                     */
/* -------------------------------------------------------------------------- */

app.listen(PORT, () => {
  console.log(
    `Envictica server running on port ${PORT}`
  );
});
