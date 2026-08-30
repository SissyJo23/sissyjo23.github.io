const crypto = require('crypto');
const { URL } = require('url');
const MAX_OUTPUT_CHARS = 50000;
const MAX_WORKFLOW_CHARS = 500;
const MAX_OWNER_CHARS = 200;
const MAX_SOURCE_URL_CHARS = 2048;
const APPROVED_AUTHORITY_DOMAINS = new Set([
  'supremecourt.gov',
  'law.cornell.edu',
  'congress.gov',
  'govinfo.gov',
  'ecfr.gov',
  'uscode.house.gov',
  'justice.gov',
  'ftc.gov',
  'sec.gov',
  'uspto.gov',
  'irs.gov',
  'federalregister.gov',
  'eur-lex.europa.eu'
]);
function sha256(value) {
  return crypto
    .createHash('sha256')
    .update(String(value), 'utf8')
    .digest('hex');
}
function asTrimmedString(value, maxLength) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, maxLength);
}
function isApprovedAuthorityDomain(hostname) {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return APPROVED_AUTHORITY_DOMAINS.has(host);
}
function inspectSourceUrl(rawValue) {
  const sourceUrl = asTrimmedString(rawValue, MAX_SOURCE_URL_CHARS);
  if (!sourceUrl) {
    return {
      sourceUrl: null,
      sourceDomain: null,
      authorityStatus: 'MISSING',
      finding: 'Authoritative source evidence is missing.'
    };
  }
  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return {
      sourceUrl: null,
      sourceDomain: null,
      authorityStatus: 'UNVERIFIED',
      finding: 'Source URL is invalid and cannot be verified.'
    };
  }
  const hostname = parsed.hostname
    .toLowerCase()
    .replace(/^www\./, '');
  if (parsed.protocol !== 'https:') {
    return {
      sourceUrl: parsed.toString(),
      sourceDomain: hostname || null,
      authorityStatus: 'UNVERIFIED',
      finding: 'Source URL must use HTTPS.'
    };
  }
  if (!isApprovedAuthorityDomain(hostname)) {
    return {
      sourceUrl: parsed.toString(),
      sourceDomain: hostname || null,
      authorityStatus: 'UNVERIFIED',
      finding: `Source domain "${hostname}" is not in the approved authoritative-source registry.`
    };
  }
  return {
    sourceUrl: parsed.toString(),
    sourceDomain: hostname,
    authorityStatus: 'VERIFIED',
    finding: null
  };
}
function evaluateControlDecision(body = {}) {
  const output = asTrimmedString(body.ai_output, MAX_OUTPUT_CHARS);
  let upstream = null;
  try {
    upstream = JSON.parse(output);
  } catch {
    upstream = null;
  }
  const upstreamRisk = Number(upstream?.risk_score);
  const upstreamAction = String(
    upstream?.circuit_breaker_action || ''
  )
    .trim()
    .toUpperCase();
  const workflowUse = asTrimmedString(
    body.workflow_use,
    MAX_WORKFLOW_CHARS
  );
  const ownerId = asTrimmedString(
    body.owner_id,
    MAX_OWNER_CHARS
  );
  const verifiedByAi = body.verified_by_ai === true;
  const upstreamAiOutputUsed = body.upstream_ai_output_used === true;
  const claimedHumanReviewed = body.human_reviewed === true;
  const source = inspectSourceUrl(body.source_url);
  const findings = Array.isArray(upstream?.findings)
    ? [...upstream.findings]
    : [];
  let riskScore = Number.isFinite(upstreamRisk)
    ? Math.max(0, Math.min(100, upstreamRisk))
    : 0;
  if (!output) {
    riskScore += 40;
    findings.push(
      'Missing AI output: no content is available for a control decision.'
    );
  }
  if (!workflowUse) {
    riskScore += 20;
    findings.push(
      'Operational context missing: workflow_use is required.'
    );
  }
  if (!ownerId) {
    riskScore += 20;
    findings.push(
      'Accountability gate failed: owner_id is required.'
    );
  }
  if (source.finding) {
    riskScore += source.authorityStatus === 'MISSING'
      ? 35
      : 25;
    findings.push(source.finding);
  }
  if (verifiedByAi || upstreamAiOutputUsed) {
    riskScore = Math.max(riskScore, 90);
    findings.push(
      'AI-to-AI verification is prohibited: evidence must originate from an authoritative non-AI source.'
    );
  }
  if (claimedHumanReviewed) {
    findings.push(
      'Review attestation recorded; ALLOW requires a linked approved independent review.'
    );
  }
  riskScore = Math.min(100, riskScore);
  let action = 'ESCALATE';
  if (
    upstreamAction === 'INTERCEPT' ||
    riskScore >= 70 ||
    !output ||
    !workflowUse ||
    !ownerId ||
    source.authorityStatus === 'MISSING'
  ) {
    action = 'INTERCEPT';
  }
  if (verifiedByAi || upstreamAiOutputUsed) {
    action = 'INTERCEPT';
  }
  const mitigation =
    action === 'INTERCEPT'
      ? 'Do not deploy, send, file, or rely on this output. Provide the missing control evidence and resubmit after the required workflow controls are completed.'
      : 'Escalate for authenticated reviewer assessment. A linked approved independent review is required before ALLOW can be considered.';
  return {
    outputSha256: sha256(output),
    workflowUse,
    sourceUrl: source.sourceUrl,
    sourceDomain: source.sourceDomain,
    sourceAuthorityStatus: source.authorityStatus,
    ownerId: ownerId || null,
    reviewerId: null,
    humanReviewedAt: null,
    verifiedByAi,
    upstreamAiOutputUsed,
    riskScore,
    circuitBreakerAction: action,
    findings,
    mitigationRecommendation: mitigation
  };
}
function buildRecordHash(decision) {
  const canonical = JSON.stringify({
    decision_id: decision.decisionId,
    output_sha256: decision.outputSha256,
    workflow_use: decision.workflowUse,
    source_url: decision.sourceUrl,
    source_domain: decision.sourceDomain,
    source_authority_status: decision.sourceAuthorityStatus,
    owner_id: decision.ownerId,
    reviewer_id: decision.reviewerId,
    human_reviewed_at: decision.humanReviewedAt,
    verified_by_ai: decision.verifiedByAi,
    upstream_ai_output_used: decision.upstreamAiOutputUsed,
    risk_score: decision.riskScore,
    circuit_breaker_action: decision.circuitBreakerAction,
    findings: decision.findings,
    mitigation_recommendation: decision.mitigationRecommendation,
    previous_record_hash: decision.previousRecordHash
  });
  return sha256(canonical);
}
module.exports = {
  evaluateControlDecision,
  buildRecordHash,
  sha256
};
