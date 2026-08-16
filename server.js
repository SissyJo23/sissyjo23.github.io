const express = require('express');
const path = require('path');
const db = require('./db.js');
const { Anthropic } = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('/var/www/envictica'));

// Initialize Anthropic SDK
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Root handler
app.get('/', (req, res) => {
  res.sendFile(path.join('/var/www/envictica', 'index.html'));
});

// --- API Endpoints connected to Neon PostgreSQL ---

// 1. Fetch live compliance logs from Neon
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

// 2. Insert new compliance log into Neon
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

// 3. Export Compliance Report Trigger
app.get('/api/export/compliance', (req, res) => {
  const format = req.query.format || 'csv';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="compliance_report_${Date.now()}.${format}"`);
  
  const csvData = `Timestamp,Module,Actor,Action,Status\n${new Date().toISOString()},Module 00,System Automated,Compliance Check,Passed\n`;
  res.send(csvData);
});

// 4. Analyze Risk Endpoint with Claude and Neon Logging
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
          content: `Analyze the following commercial clause (${contractType}) for legal risks and hazards. Respond in JSON format with keys "risk_score" (an integer from 0 to 100), "circuit_breaker_action" (either "INTERCEPT" if it poses severe risk/hazards, or "ALLOW" if it is standard/safe), "flagged_issues" (array of strings), and "mitigation_recommendation" (string).\n\nClause:\n${clauseText}`
        }
      ]
    });

    const textContent = response.content[0].text;

    // Fallback parsing for risk evaluation
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
      if (textContent.toLowerCase().includes('intercept') || textContent.toLowerCase().includes('high risk')) {
        circuit_breaker_action = 'INTERCEPT';
        risk_score = 85;
      }
    }

    // Save to Neon PostgreSQL compliance_logs table
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
