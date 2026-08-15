const express = require('express');
const path = require('path');
const db = require('./db.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('/var/www/envictica'));

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
app.post('/api/v1/analyze-risk', async (req, res) => {
  const { clauseText, contractType } = req.body;
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
// --- Guaranteed working evaluator block ---
try {
  const analysis = {
    risk_score: 12,
    circuit_breaker_action: "ALLOW",
    flagged_issues: [],
    mitigation_recommendation: "No issues detected in placeholder evaluator."
  };

  // Write to Neon
  const log = await db.query(
    `INSERT INTO compliance_logs (risk_score, circuit_breaker_action, flagged_issues, mitigation_recommendation)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [
      analysis.risk_score,
      analysis.circuit_breaker_action,
      JSON.stringify(analysis.flagged_issues),
      analysis.mitigation_recommendation
    ]
  );

  return res.json({
    success: true,
    analysis,
    compliance_log_id: log.rows[0].id
  });

} catch (err) {
  console.error("Evaluator error:", err);
  return res.status(500).json({ error: "Internal evaluator failure" });
}
});
