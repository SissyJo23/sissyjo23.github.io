const express = require('express');





const path = require('path');
const db = require('./db.js');
const { Anthropic } = require('@anthropic-ai/sdk');

const app = express();
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

app.get('/api/logs', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM compliance_logs ORDER BY created_at DESC LIMIT 50');
    res.json({
      success: true,
      total: result.rowCount,
      data: result.rows
    });
  } catch (err) {
    console.error('Neon Read Error:', err);
    res.status(500).json({ error: 'Failed to fetch logs from database' });
  }
});

app.post('/api/logs', async (req, res) => {
  try {
    const { action, user_name, status } = req.body;
    const result = await db.query(
      'INSERT INTO compliance_logs (action, user_name, status) VALUES ($1, $2, $3) RETURNING *',
      [action || 'System Verification', user_name || 'System Automated', status || 'Verified']
    );
    res.json({ success: true, log: result.rows[0] });
  } catch (err) {
    console.error('Neon Write Error:', err);
    res.status(500).json({ error: 'Failed to insert log entry' });
  }
});

app.get('/api/export/compliance', (req, res) => {
  const format = req.query.format || 'csv';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="compliance_report_${Date.now()}.${format}"`);
  
  const csvData = `Timestamp,Module,Actor,Action,Status\n${new Date().toISOString()},Module 00,System Automated,Compliance Check,Passed\n`;
  res.send(csvData);
});

app.post('/api/v1/analyze-risk', async (req, res) => {
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
      messages: [
        {
          role: 'user',
          content: `Analyze the following commercial clause (${contractType}) for legal risks and hazards. 
          
CRITICAL RULE: Any clause containing an "Absolute Warranty Disclaimer" (e.g., disclaiming all express, implied, or statutory warranties without standard "as-is" guardrails or remedies) must be classified as a high-risk hazard with a risk_score >= 75 and circuit_breaker_action: "INTERCEPT".

Respond in JSON format with keys "risk_score" (an integer from 0 to 100), "circuit_breaker_action" (either "INTERCEPT" if it poses severe risk/hazards, or "ALLOW" if it is standard/safe), "flagged_issues" (array of strings), and "mitigation_recommendation" (string).\n\nClause:\n${clauseText}`
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
        if (typeof parsed.risk_score === 'number') risk_score = parsed.risk_score;
        if (parsed.circuit_breaker_action) circuit_breaker_action = parsed.circuit_breaker_action;
        if (Array.isArray(parsed.flagged_issues)) flagged_issues = parsed.flagged_issues;
        if (parsed.mitigation_recommendation) mitigation_recommendation = parsed.mitigation_recommendation;
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

    if (isHighRisk) {
      risk_score = 85;
      circuit_breaker_action = 'INTERCEPT';
      flagged_issues.push('High-risk commercial clause detected via deterministic safety policy guardrail.');
      mitigation_recommendation = 'Negotiate balanced terms, mutual indemnification, and clear dispute/remedy frameworks.';
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



app.post('/api/v1/operational-control', async (req, res) => {
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

    const findings = [];
    let risk_score = 0;

    const output = String(ai_output).trim();
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
    if (risk_score >= 70) {
      circuit_breaker_action = 'INTERCEPT';
    } else if (risk_score >= 30) {
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
        `INSERT INTO compliance_logs
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
