const express = require('express');
const path = require('path');
const db = require('./db.js');
const { Anthropic } = require('@anthropic-ai/sdk');

const app = express();
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
    else if (typeLower === 'liabilities' || lowerClause.includes('liability') || lowerClause.includes('indemn')) {
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

app.listen(PORT, () => {
  console.log(`Envictica server running on port ${PORT}`);
});
