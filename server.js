const express = require('express');





const path = require('path');
const db = require('./db.js');
const { Anthropic } = require('@anthropic-ai/sdk');
const { createReviewRequest, decideReviewRequest } = require('./two-key-reviews');

const app = express();
app.set('trust proxy', 1);
//

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('/var/www/envictica'));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.get('/', (req, res) => {
  res.sendFile(path.join('/var/www/envictica', 'index.html'));
});

app.get('/api/logs', (req, res) => {
  res.status(403).json({
    success: false,
    error: 'Audit-log access is restricted.'
  });
});

app.post('/api/logs', (req, res) => {
  res.status(403).json({
    success: false,
    error: 'Audit-log writes must use the operational-control workflow.'
  });
});

app.get('/api/export/compliance', requireAuthenticatedSession, requireAdministrator, (req, res) => {
  const format = req.query.format || 'csv';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="compliance_report_${Date.now()}.${format}"`);
  
  const csvData = `Timestamp,Module,Actor,Action,Status\n${new Date().toISOString()},Module 00,System Automated,Compliance Check,Passed\n`;
  res.send(csvData);
});

app.post('/api/v1/analyze-risk', requireAuthenticatedSession, async (req, res) => {
  try {
    const clauseText = req.body.clauseText || req.body.clause;
    const contractType = req.body.contractType;

    if (!clauseText) {
      return res.status(400).json({ error: 'Missing clauseText in request body' });
    }

    if (!contractType || typeof contractType !== "string") {
      return res.json({
        success: false,
        analysis: {
          risk_score: 99,
          circuit_breaker_action: "REVIEW",
          flagged_issues: ["Missing or invalid contractType"],
          mitigation_recommendation: "Provide a contract type such as SaaS, NDA, or Employment."
        }
      });
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      system: `# SYSTEM PURPOSE & ROLE
You are Envictica, a hyper-advanced, context-aware Legal Tech AI engine. Your purpose is to ingest raw legal contracts, analyze them for hidden liabilities, and output structural risk assessments. You do not rely on superficial string matching or simple keyword searches (e.g., searching blindly for the word "indemnification"). Instead, you analyze the core legal concepts, obligation allocations, and remedy frameworks to determine true risk.

---

# CORE CAPABILITIES
1. ZERO-INPUT EXTRACTION: Automatically map and ingest text, parsing data without requiring user input.
2. INTERACTIVE REDLINING: Provide instant, production-ready, vendor-favorable replacement language for any clause scored as "Medium" or "Critical".
3. PORTFOLIO-WIDE AGGREGATION: Format outputs so they can be easily aggregated into macro-level enterprise risk dashboards.

---

# RISK TAXONOMY & SCORING LOGIC

## 1. INTELLECTUAL PROPERTY (IP) RISK
Evaluate who retains ownership of background software, customer data inputs, and custom modifications or derivative works created during the term.

*   CRITICAL RISK (Score 80–100): Implied or explicit assignment of vendor software, custom code, configurations, or derivative works to the customer.
    *   Concept: "Work made for hire" applied to software configurations or updates.
    *   Example: "Any deliverables, modifications, or custom configurations developed under this Agreement shall be deemed 'work made for hire' and ownership vests entirely in Customer."
*   MEDIUM RISK (Score 40–79): Restrictive customer data handling that prevents the vendor from using anonymized, aggregated system logs or metadata to train AI or machine learning models.
    *   Concept: Overly broad definitions of Customer Data that swallow background system usage data.
    *   Example: "Vendor is granted a limited license to process Customer Data solely to provide the Services, excluding any derivative use, data aggregation, or model training."
*   LOW RISK (Score 0–39): Absolute reservation of background IP by the vendor. The customer receives a strictly non-exclusive, non-transferable, terminable usage license.
    *   Concept: Clear separation of background tech from customer content.
    *   Example: "Vendor retains exclusive ownership of all Intellectual Property Rights in the Platform. No implied licenses are granted hereunder."

## 2. TERMINATION & EXIT RISK
Evaluate how easily a client can cancel the agreement, their refund rights, and whether the vendor is bound to perpetual, uncompensated transition support.

*   CRITICAL RISK (Score 80–100): Termination for convenience by the customer coupled with pro-rata refunds of prepaid annual fees.
    *   Concept: Liquidates the predictability of Annual Recurring Revenue (ARR).
    *   Example: "Customer may terminate this Agreement at any time, with or without cause, upon thirty (30) days' written notice, and shall receive a pro-rata refund of prepaid fees."
*   MEDIUM RISK (Score 40–79): Vague or perpetual transition obligations forcing uncompensated post-termination engineering or migration support.
    *   Concept: Open-ended resource drain after contract termination.
    *   Example: "Upon termination, Vendor shall provide termination assistance services until Customer successfully migrates to a replacement vendor, at no additional cost."
*   LOW RISK (Score 0–39): Hard contract terms where termination is only permitted for material, uncured breaches, with zero refund guarantees.
    *   Concept: Enforceable annual or multi-year revenue commitment.
    *   Example: "This Agreement may only be terminated for an uncured material breach. In no event shall any refunds be issued for early termination."

## 3. NON-COMPETE & EXCLUSIVITY RISK
Evaluate whether the contract limits the vendor's ability to market or sell its software to other law firms, competitors, or specific geographic regions.

*   CRITICAL RISK (Score 80–100): Industry-wide, regional, or practice-area exclusivity bans that prevent the vendor from scaling within the legal vertical.
    *   Concept: Market lockouts or explicit competitive bans.
    *   Example: "Vendor shall not market, license, or provide similar legal technology services to any AmLaw 100 firm specializing in corporate bankruptcy for the duration of the Term."
*   MEDIUM RISK (Score 40–79): Overly broad non-solicitation or non-hire clauses covering all personnel, independent contractors, or affiliates, regardless of direct involvement.
    *   Concept: Operational hiring constraints.
    *   Example: "Vendor shall not, directly or indirectly, solicit, hire, or engage any employee or independent contractor of Customer during the term and for two (2) years thereafter."
*   LOW RISK (Score 0–39): Explicit statements confirming the vendor's absolute freedom to market and sell to any third party.
    *   Concept: Saved marketing liberties.
    *   Example: "Nothing in this Agreement shall restrict Vendor from developing, manufacturing, or marketing software or services that are competitive with Customer's business."

## 4. LIABILITIES & INDEMNIFICATION RISK
Evaluate the absolute worst-case financial exposure. Parse mathematical relationships (e.g., [Liability] = [Multiplier] x [Fees Paid]) and identify carve-outs.

*   CRITICAL RISK (Score 80–100): Uncapped liability, or carving out high-risk incidents (like data/confidentiality breaches) from the general liability cap.
    *   Concept: Infinite operational or financial liability.
    *   Example: "The limitation of liability set forth in Section X shall not apply to breaches of confidentiality, data security incidents, or gross negligence."
*   MEDIUM RISK (Score 40–79): Super-capped or multiplied limits where liability extends to a multiple of fees paid (e.g., 2x or 3x ARR) or a high fixed baseline.
    *   Concept: Multiplied liability exposure exceeding annual contract profits.
    *   Example: "Vendor's aggregate liability for all claims arising under this Agreement shall be limited to the greater of $500,000 or three times (3x) the fees paid in the prior 12 months."
*   LOW RISK (Score 0–39): Standard, tight liability caps strictly restricted to the actual fees paid to the vendor over the trailing 12-month period.
    *   Concept: Symmetric risk matching.
    *   Example: "Vendor's maximum aggregate liability for any and all claims shall be strictly limited to the actual amounts paid by Customer to Vendor in the twelve (12) months preceding the claim."

---

# OUTPUT FORMAT REQUIREMENTS
For every contract reviewed, you must output a structured JSON response containing:
1.  \`category\`: (IP, Termination, Non-Compete, or Liability)
2.  \`score\`: (0 to 100)
3.  \`extracted_text\`: The exact, raw sentence from the contract that triggered the score.
4.  \`legal_rationale\`: A 1-sentence breakdown of the underlying obligation/remedy structure explaining the score.
5.  \`envictica_redline\`: If the score is 40 or higher, provide a perfectly drafted, vendor-favorable alternative clause to replace the text.`,
      messages: [
        {
          role: 'user',
          content: `Analyze the following commercial clause (${contractType}) for legal risks and hazards.\n\nClause:\n${clauseText}`
        }
      ]
    });

    const textContent = response.content[0]?.text || '';

    let risk_score = 50;
    let circuit_breaker_action = 'ALLOW';
    let flagged_issues = [];
    let mitigation_recommendation = 'Standard review passed.';

    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.score === 'number') risk_score = parsed.score;
        else if (typeof parsed.risk_score === 'number') risk_score = parsed.risk_score;
        
        if (risk_score >= 80) {
          circuit_breaker_action = 'INTERCEPT';
        } else {
          circuit_breaker_action = 'ALLOW';
        }

        if (parsed.legal_rationale) mitigation_recommendation = parsed.legal_rationale;
        if (parsed.envictica_redline) flagged_issues.push(`Redline: ${parsed.envictica_redline}`);
        if (Array.isArray(parsed.flagged_issues)) flagged_issues = [...flagged_issues, ...parsed.flagged_issues];
      }
    } catch (parseErr) {
      if (textContent && (textContent.toLowerCase().includes('intercept') || textContent.toLowerCase().includes('high risk'))) {
        circuit_breaker_action = 'INTERCEPT';
        risk_score = 85;
      }
    }

    const lowerClause = clauseText.toLowerCase();
    if (
      (lowerClause.includes('disclaim') || lowerClause.includes('no warranties')) &&
      (lowerClause.includes('merchantability') || lowerClause.includes('fitness') || lowerClause.includes('all warranties'))
    ) {
      risk_score = 85;
      circuit_breaker_action = 'INTERCEPT';
      flagged_issues.push('Absolute warranty disclaimer without adequate statutory carve-outs or remedies.');
      mitigation_recommendation = 'Ensure express warranties are preserved and disclaimers are mutual or strictly bounded.';
    }

    // Refined guardrail: require actual adverse/toxic modifiers, not just topic names
    const hasAdverseModifier =
      lowerClause.includes('unlimited') ||
      lowerClause.includes('uncapped') ||
      lowerClause.includes('sole discretion') ||
      lowerClause.includes('unilateral') ||
      lowerClause.includes('without limitation') ||
      lowerClause.includes('waive') ||
      lowerClause.includes('disclaim');

    const isHighRisk =
      lowerClause.includes('irrevocable, perpetual') ||
      lowerClause.includes('remotely disable') ||
      lowerClause.includes('source code generated') ||
      lowerClause.includes('class action') ||
      ((lowerClause.includes('liability') || lowerClause.includes('indemnify')) && hasAdverseModifier);

    // ==========================================
    // DETERMINISTIC TAXONOMY RISK ENGINE
    // ==========================================
    const typeLower = (contractType || '').toLowerCase();

    // 1. Intellectual Property (IP) Taxonomy Check
    if (typeLower === 'ip' || lowerClause.includes('deliverables') || lowerClause.includes('ownership')) {
      if (lowerClause.includes('work made for hire') || lowerClause.includes('vest entirely in customer')) {
        risk_score = 85;
        circuit_breaker_action = 'INTERCEPT';
        flagged_issues.push('Critical: Implied Assignment / Work Made for Hire detected.');
        mitigation_recommendation = 'Retain background IP ownership and limit customer to a non-exclusive license.';
      } else if (lowerClause.includes('exclusive ownership')) {
        risk_score = 20;
        circuit_breaker_action = 'ALLOW';
        flagged_issues.push('Low: Absolute Reservation of background IP.');
        mitigation_recommendation = 'Standard terms accepted.';
      }
    }

    // 2. Termination & Exit Taxonomy Check
    else if (typeLower === 'termination' || lowerClause.includes('terminate')) {
      if (lowerClause.includes('with or without cause') && lowerClause.includes('refund')) {
        risk_score = 90;
        circuit_breaker_action = 'INTERCEPT';
        flagged_issues.push('Critical: Termination for Convenience with pro-rata refund exposure.');
        mitigation_recommendation = 'Remove pro-rata refund obligations for early convenience termination.';
      } else if (lowerClause.includes('no additional cost') || lowerClause.includes('migration')) {
        risk_score = 60;
        circuit_breaker_action = 'ALLOW';
        flagged_issues.push('Medium: Perpetual Transition Duties required.');
        mitigation_recommendation = 'Cap transition support duration and bill at standard professional service rates.';
      }
    }

    // 3. Non-Compete & Exclusivity Taxonomy Check
    else if (typeLower === 'non-compete' || lowerClause.includes('market') || lowerClause.includes('solicit')) {
      if (lowerClause.includes('shall not market') || lowerClause.includes('exclusivity')) {
        risk_score = 85;
        circuit_breaker_action = 'INTERCEPT';
        flagged_issues.push('Critical: Industry Exclusivity ban restricting market access.');
        mitigation_recommendation = 'Reject exclusive territory or practice restrictions.';
      } else if (lowerClause.includes('solicit') && lowerClause.includes('employee')) {
        risk_score = 55;
        circuit_breaker_action = 'ALLOW';
        flagged_issues.push('Medium: Personnel Non-Solicitation restriction.');
        mitigation_recommendation = 'Ensure mutual and time-bounded non-solicitation periods.';
      }
    }

    // 4. Liabilities & Indemnification Mathematical Taxonomy Check
    else if (typeLower === 'liabilities' || lowerClause.includes('liability' ) || lowerClause.includes('indemn')) {
      const hasCarveOut = lowerClause.includes('shall not apply to') || lowerClause.includes('breaches of confidentiality') || lowerClause.includes('data security incidents');
      
      if (hasCarveOut || lowerClause.includes('uncapped')) {
        risk_score = 85;
        circuit_breaker_action = 'INTERCEPT';
        flagged_issues.push('Critical: Uncapped Liability or Dangerous Carve-In detected via structural exclusion.');
        mitigation_recommendation = 'Enforce absolute aggregate liability caps with no exclusions for data incidents.';
      } else if (lowerClause.includes('multiple') || lowerClause.includes('greater of')) {
        risk_score = 65;
        circuit_breaker_action = 'ALLOW';
        flagged_issues.push('Medium: Super-Capped / Multiplier liability exposure.');
        mitigation_recommendation = 'Cap liability strictly to fees paid in the preceding 12 months.';
      }
    }

    const log = await db.query(
      `INSERT INTO compliance_logs (risk_score, circuit_breaker_action, flagged_issues, mitigation_recommendation)
       VALUES ($1, $2, $3, $4) RETURNING id`,
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
      compliance_log_id: log.rows[0].id
    });

  } catch (err) {
    console.error('API Error:', err.message);
    return res.status(500).json({ error: err.message, circuit_breaker_action: 'ERROR', risk_score: 0 });
  }
});



app.post('/api/v1/operational-control', requireAuthenticatedSession, async (req, res) => {
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

    const output = String(ai_output).trim();
    let upstream = null;

    try {
      upstream = JSON.parse(output);
    } catch (_) {
      upstream = null;
    }

    const findings = Array.isArray(upstream?.findings)
      ? [...upstream.findings]
      : [];

    const upstreamRisk = Number(upstream?.risk_score);
    let risk_score = Number.isFinite(upstreamRisk)
      ? Math.max(0, Math.min(100, upstreamRisk))
      : 0;

    const upstreamAction = String(
      upstream?.circuit_breaker_action || ''
    ).trim().toUpperCase();

    const workflow = String(workflow_use).trim();
    const sourceStatus = String(source_status).trim().toLowerCase();
    const sourceReference = String(source_reference).trim();
    const accountableOwner = String(owner).trim();

    if (!output) {
      return res.status(400).json({
        success: false,
        error: 'Missing ai_output. Provide the AI-generated output or decision being evaluated.'
      });
    }

    if (!workflow) {
      risk_score += 20;
      findings.push('Operational context missing: the intended workflow use was not identified.');
    }

    if (!sourceReference || ['none', 'unknown', 'unverified', 'missing'].includes(sourceStatus)) {
      risk_score += 35;
      findings.push('Synthetic Inertia detected: AI output has no verified authoritative source attached.');
    }

    if (verified_by_ai === true || upstream_ai_output_used === true) {
      risk_score += 45;
      findings.push('Autonomous Hallucination Cascade detected: AI output was verified, grounded, or extended using another AI output rather than an authoritative source.');
    }

    if (!accountableOwner) {
      risk_score += 20;
      findings.push('Operational plumbing failure: no accountable human owner is assigned to the output.');
    }

    if (human_reviewed !== true) {
      risk_score += 15;
      findings.push('Human review gate has not been completed.');
    }

    const normalizedOutput = output.toLowerCase();
    if (
      normalizedOutput.includes('citation') ||
      normalizedOutput.includes('statute') ||
      normalizedOutput.includes('case law') ||
      normalizedOutput.includes('legal advice')
    ) {
      risk_score += 10;
      findings.push('High-consequence legal content detected: source verification and accountable review are required before use.');
    }

    risk_score = Math.min(risk_score, 100);

    let circuit_breaker_action = 'ALLOW';
    if (risk_score >= 70 || upstreamAction === 'INTERCEPT') {
      circuit_breaker_action = 'INTERCEPT';
    } else if (risk_score >= 30 || upstreamAction === 'REVIEW') {
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
          (risk_score, circuit_breaker_action, flagged_issues, mitigation_recommendation)
         VALUES ($1, $2, $3::jsonb, $4)
         RETURNING id`,
        [
          risk_score,
          circuit_breaker_action,
          JSON.stringify(findings),
          mitigation_recommendation
        ]
      );

      compliance_log_id = log.rows[0]?.id || null;
    } catch (logError) {
      console.error('Operational control log error:', logError.message);
    }

    return res.json({
      success: true,
      risk_score,
      circuit_breaker_action,
      findings,
      mitigation_recommendation,
      controls: {
        source_attached: Boolean(sourceReference),
        source_status: sourceStatus || 'unknown',
        accountable_owner: accountableOwner || null,
        human_reviewed: human_reviewed === true,
        verified_by_ai: verified_by_ai === true,
        upstream_ai_output_used: upstream_ai_output_used === true
      },
      compliance_log_id
    });
  } catch (err) {
    console.error('Operational control error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Operational control evaluation failed.',
      circuit_breaker_action: 'ERROR',
      risk_score: 0
    });
  }
});

const crypto = require('crypto');
const { auth } = require('./workos-auth');

const { evaluateControlDecision, buildRecordHash } = require('./control-decision-gate');

app.post('/api/v1/control-decisions/evaluate', requireAuthenticatedSession, requireAdministrator, async (req, res) => {
  let decision;

  try {
    decision = evaluateControlDecision(req.body || {});

    const reviewRequestId = String(
      req.body?.review_request_id || ''
    ).trim();

    if (reviewRequestId) {
      const reviewLookup = await db.query(
        `SELECT request_id, maker_user_id, reviewer_user_id, status,
                reviewer_decision, reviewed_at, output_sha256
         FROM review_requests
         WHERE request_id = $1
         LIMIT 1`,
        [reviewRequestId]
      );

      const review = reviewLookup.rows[0] || null;

      if (!review) {
        return res.status(400).json({
          success: false,
          error: 'The supplied review_request_id was not found.',
          circuit_breaker_action: 'ERROR',
          risk_score: decision.riskScore
        });
      }

      if (review.output_sha256 !== decision.outputSha256) {
        return res.status(400).json({
          success: false,
          error: 'The approved review does not match this exact analysis output.',
          circuit_breaker_action: 'ERROR',
          risk_score: decision.riskScore
        });
      }

      if (
        review.status === 'APPROVED' &&
        review.reviewer_decision === 'APPROVE' &&
        review.reviewer_user_id &&
        review.reviewed_at
      ) {
        decision.reviewerId = review.reviewer_user_id;
        decision.humanReviewedAt = review.reviewed_at;
        decision.findings.push(
          `Independent review approved: ${review.request_id}.`
        );
      } else {
        decision.findings.push(
          'Linked review is not an approved independent review; it cannot authorize ALLOW.'
        );
      }
    }

    if (
      decision.circuitBreakerAction === 'ESCALATE' &&
      decision.riskScore < 70 &&
      decision.sourceAuthorityStatus === 'VERIFIED' &&
      decision.ownerId &&
      decision.reviewerId &&
      decision.humanReviewedAt &&
      decision.reviewerId !== decision.ownerId &&
      decision.verifiedByAi === false &&
      decision.upstreamAiOutputUsed === false
    ) {
      decision.circuitBreakerAction = 'ALLOW';
      decision.mitigationRecommendation =
        'Approved independent review, verified source evidence, distinct owner and reviewer, and required controls are recorded. Retain this append-only decision record for auditability.';
    }

    if (
      decision.circuitBreakerAction === 'ESCALATE' &&
      !decision.reviewerId
    ) {
      decision.findings.push(
        'No approved independent review is linked; ALLOW is not permitted.'
      );
    }

    decision.decisionId = crypto.randomUUID();

    const previous = await db.query(
      'SELECT record_hash FROM control_decisions ORDER BY id DESC LIMIT 1'
    );

    decision.previousRecordHash = previous.rows[0]?.record_hash || null;
    const recordHash = buildRecordHash(decision);

    const saved = await db.query(
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
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16, $17
      ) RETURNING id, decision_id, created_at`,
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
        JSON.stringify(decision.findings),
        decision.mitigationRecommendation,
        decision.previousRecordHash,
        recordHash
      ]
    );

    return res.status(decision.circuitBreakerAction === 'INTERCEPT' ? 403 : 202).json({
      success: true,
      decision_id: saved.rows[0].decision_id,
      audit_record_id: saved.rows[0].id,
      created_at: saved.rows[0].created_at,
      output_sha256: decision.outputSha256,
      risk_score: decision.riskScore,
      circuit_breaker_action: decision.circuitBreakerAction,
      findings: decision.findings,
      mitigation_recommendation: decision.mitigationRecommendation,
      controls: {
        source_authority_status: decision.sourceAuthorityStatus,
        source_domain: decision.sourceDomain,
        owner_id: decision.ownerId,
        reviewer_id: decision.reviewerId,
        human_reviewed_at: decision.humanReviewedAt,
        authentication_required_for_allow: true
      }
    });
  } catch (error) {
    console.error('Control-decision gate error:', error.message);
    return res.status(503).json({
      success: false,
      error: 'Control decision could not be recorded. Output must not be used.',
      circuit_breaker_action: 'ERROR',
      risk_score: 0
    });
  }
});


// WorkOS AuthKit routes


const ADMIN_USER_IDS = new Set(
  (process.env.ENVICTICA_ADMIN_USER_IDS || '')
    .split(',')
    .map((userId) => userId.trim())
    .filter(Boolean)
);

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

function reviewUserId(req) {
  return req.auth?.user?.id || null;
}

async function requireReviewer(req, res, next) {
  try {
    const { requireActiveRole, ROLES } = require('./two-key-auth');
    await requireActiveRole(reviewUserId(req), ROLES.REVIEWER);
    return next();
  } catch (error) {
    return res.status(error.statusCode || 403).json({
      success: false,
      error: error.message || 'Reviewer access required.'
    });
  }
}

app.get(
  '/reviews',
  requireAuthenticatedSession,
  requireReviewer,
  (req, res) => {
    res.sendFile(path.join('/var/www/envictica', 'reviews.html'));
  }
);

app.get(
  '/api/v1/reviews/pending',
  requireAuthenticatedSession,
  requireReviewer,
  async (req, res) => {
    try {
      const result = await db.query(
        'SELECT request_id, maker_user_id, source_url, ' +
        'source_domain, source_authority_status, risk_score, ' +
        'requested_action, created_at ' +
        'FROM review_requests ' +
        "WHERE status = 'PENDING' " +
        'ORDER BY created_at ASC LIMIT 100'
      );

      return res.json({
        success: true,
        reviews: result.rows
      });
    } catch (error) {
      console.error('Pending-review lookup failed:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Unable to load review queue.'
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
      const review = await decideReviewRequest({
        requestId: req.params.requestId,
        reviewerUserId: reviewUserId(req),
        decision: body.decision,
        rationale: body.rationale
      });

      return res.json({
        success: true,
        review
      });
    } catch (error) {
      console.error('Review decision failed:', error.message);
      return res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Unable to record decision.'
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
      const review = await createReviewRequest({
        makerUserId: reviewUserId(req),
        outputSha256: body.outputSha256,
        sourceUrl: body.sourceUrl || null,
        sourceDomain: body.sourceDomain || null,
        sourceAuthorityStatus: body.sourceAuthorityStatus,
        riskScore: body.riskScore,
        requestedAction: body.requestedAction
      });

      return res.status(201).json({
        success: true,
        review
      });
    } catch (error) {
      console.error('Review request creation failed:', error.message);
      return res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Unable to create review request.'
      });
    }
  }
);

app.get('/auth/login', async (req, res) => {
  try {
    const result = await auth.createSignIn(res);
    return res.redirect(result.url);
  } catch (error) {
    console.error('WorkOS login initialization failed:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Unable to start sign-in.'
    });
  }
});

app.get('/auth/callback', async (req, res) => {
  console.log('WorkOS callback received:', {
    hasCode: Boolean(req.query.code),
    hasState: Boolean(req.query.state),
    host: req.get('host'),
    forwardedProto: req.get('x-forwarded-proto') || null
  });

  try {
    await auth.handleCallback(req, res, {
      code: req.query.code,
      state: req.query.state
    });

    const setCookie = res.getHeader('Set-Cookie');
    console.log('WorkOS callback session cookie set:', {
      present: Boolean(setCookie),
      count: Array.isArray(setCookie) ? setCookie.length : (setCookie ? 1 : 0)
    });

    return res.redirect('/');
  } catch (error) {
    console.error('WorkOS callback failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Sign-in could not be completed.'
    });
  }
});

app.get('/auth/session', async (req, res) => {
  try {
    const session = await auth.getSession(req);

    if (!session) {
      return res.status(401).json({
        authenticated: false
      });
    }

    return res.json({
      authenticated: true,
      user: session.user ?? null,
      organizationId: session.organizationId ?? null,
      role: session.role ?? null
    });
  } catch (error) {
    console.error('WorkOS session lookup failed:', error.message);
    return res.status(401).json({
      authenticated: false
    });
  }
});

app.post('/auth/logout', async (req, res) => {
  try {
    await auth.clearSession(res);
    return res.status(204).end();
  } catch (error) {
    console.error('WorkOS logout failed:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Unable to sign out.'
    });
  }
});

app.get('/api/telemetry', (req, res) => {
  res.json({
    status: 'online',
    signal_depth: 0.87,
    evidence_path: 4,
    active_trace: 'LIVE',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Envictica server running on port ${PORT}`);
});
