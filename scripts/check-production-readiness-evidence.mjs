#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const unitDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projectRoot = resolve(unitDir, '..');
const evidencePath = resolve(unitDir, 'docs/production-readiness-evidence.json');
const args = new Set(process.argv.slice(2));
const outputJson = args.has('--json');
const allowExternalBlockers = args.has('--allow-external-blockers');
const allowStaleEvidence = args.has('--allow-stale-evidence');
const runSelfTest = args.has('--self-test');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function relative(path) {
  return path.replace(`${projectRoot}/`, '');
}

function fail(message, details = {}) {
  return { ok: false, message, ...details };
}

function pass(message, details = {}) {
  return { ok: true, message, ...details };
}

function withoutStatus(details) {
  const { ok, message, ...rest } = details;
  return rest;
}

function checkRecordedEvidence(gate) {
  if (!gate.evidence) return fail(`${gate.id} is missing evidence text`);
  if (!gate.verifiedAt) return fail(`${gate.id} is missing verifiedAt`);

  const verifiedAtMs = Date.parse(gate.verifiedAt);
  if (Number.isNaN(verifiedAtMs)) {
    return fail(`${gate.id} has invalid verifiedAt`, { verifiedAt: gate.verifiedAt });
  }

  if (gate.maxAgeHours && !allowStaleEvidence) {
    const ageHours = (Date.now() - verifiedAtMs) / (1000 * 60 * 60);
    if (ageHours > Number(gate.maxAgeHours)) {
      return fail(`${gate.id} evidence is stale`, {
        verifiedAt: gate.verifiedAt,
        ageHours: Number(ageHours.toFixed(1)),
        maxAgeHours: gate.maxAgeHours,
      });
    }
  }

  return pass(`${gate.id} evidence metadata is current`, {
    evidence: gate.evidence,
    verifiedAt: gate.verifiedAt,
    maxAgeHours: gate.maxAgeHours ?? null,
  });
}

function checkSummary(gate) {
  if (!gate.artifact) return fail(`${gate.id} is missing an artifact path`);
  const metadataCheck = checkRecordedEvidence(gate);
  if (!metadataCheck.ok) return metadataCheck;

  const artifactPath = resolve(projectRoot, gate.artifact);
  if (!existsSync(artifactPath)) return fail(`${gate.id} artifact is missing`, { artifact: gate.artifact });

  const summary = readJson(artifactPath);
  const results = Array.isArray(summary.results) ? summary.results : [];
  const passed = results.filter((result) => result.status === 0).length;
  const failed = results.filter((result) => result.status !== 0).length;
  const minimumPassed = Number(gate.minimumPassed ?? gate.expectedPassed ?? 1);

  if (failed > 0) {
    return fail(`${gate.id} has failed E2E results`, {
      artifact: relative(artifactPath),
      passed,
      failed,
      failedNames: results.filter((result) => result.status !== 0).map((result) => result.name),
    });
  }

  if (passed < minimumPassed) {
    return fail(`${gate.id} passed too few checks`, {
      artifact: relative(artifactPath),
      passed,
      minimumPassed,
    });
  }

  if (gate.runId && summary.runId !== gate.runId) {
    return fail(`${gate.id} runId does not match evidence`, {
      expected: gate.runId,
      actual: summary.runId,
    });
  }

  return pass(`${gate.id} summary is green`, {
    artifact: relative(artifactPath),
    passed,
    failed,
    verifiedAt: gate.verifiedAt,
  });
}

function checkGate(gate) {
  if (!gate || !gate.id) return fail('Malformed gate entry');
  if (gate.kind === 'e2e-summary') return checkSummary(gate);
  const metadataCheck = checkRecordedEvidence(gate);
  if (!metadataCheck.ok) return metadataCheck;
  const metadata = withoutStatus(metadataCheck);
  if (gate.status === 'pass') return pass(`${gate.id} is recorded as pass`, metadata);
  if (gate.status === 'blocked') return fail(`${gate.id} is blocked`, { blocker: gate.blocker, ...metadata });
  return fail(`${gate.id} is not passing`, { status: gate.status, evidence: gate.evidence });
}

function runCheckerSelfTest() {
  const blocked = checkGate({
    id: 'self-test-blocked',
    kind: 'provider',
    status: 'blocked',
    verifiedAt: new Date().toISOString(),
    maxAgeHours: 1,
    evidence: 'synthetic blocked gate',
    blocker: 'synthetic blocker',
  });

  const passing = checkGate({
    id: 'self-test-pass',
    kind: 'provider',
    status: 'pass',
    verifiedAt: new Date().toISOString(),
    maxAgeHours: 1,
    evidence: 'synthetic pass gate',
  });

  const stale = checkGate({
    id: 'self-test-stale',
    kind: 'provider',
    status: 'pass',
    verifiedAt: '2000-01-01T00:00:00Z',
    maxAgeHours: 1,
    evidence: 'synthetic stale gate',
  });

  const failures = [];
  if (blocked.ok || blocked.message !== 'self-test-blocked is blocked') {
    failures.push(`blocked gate was not preserved as failed: ${JSON.stringify(blocked)}`);
  }
  if (!passing.ok || passing.message !== 'self-test-pass is recorded as pass') {
    failures.push(`passing gate was not preserved as pass: ${JSON.stringify(passing)}`);
  }
  if (stale.ok || stale.message !== 'self-test-stale evidence is stale') {
    failures.push(`stale gate was not rejected: ${JSON.stringify(stale)}`);
  }

  if (failures.length > 0) {
    console.error('production-readiness-evidence:self-test-failed');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log('production-readiness-evidence:self-test-ok');
  process.exit(0);
}

if (runSelfTest) {
  runCheckerSelfTest();
}

if (!existsSync(evidencePath)) {
  console.error(`Missing production readiness evidence file: ${evidencePath}`);
  process.exit(1);
}

const evidence = readJson(evidencePath);
const gates = Array.isArray(evidence.gates) ? evidence.gates : [];
const checks = gates.map(checkGate);
const hardBlockers = Array.isArray(evidence.hardBlockers) ? evidence.hardBlockers : [];
const externalBlockers = hardBlockers.filter((blocker) => blocker.type === 'external');
const localBlockers = hardBlockers.filter((blocker) => blocker.type !== 'external');

let ok = checks.every((check) => check.ok) && localBlockers.length === 0 && hardBlockers.length === 0;
if (allowExternalBlockers) {
  ok = checks.every((check) => check.ok || externalBlockers.some((blocker) => check.message.includes(blocker.gateId))) && localBlockers.length === 0;
}

const report = {
  ok,
  launchReady: checks.every((check) => check.ok) && hardBlockers.length === 0,
  externalBlockersAllowed: allowExternalBlockers,
  staleEvidenceAllowed: allowStaleEvidence,
  generatedAt: evidence.generatedAt,
  readiness: evidence.readiness,
  checkedAt: new Date().toISOString(),
  checks,
  hardBlockers,
};

if (outputJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const label = report.launchReady ? 'pass' : ok ? 'external-blockers-allowed' : 'blocked';
  console.log(`production-readiness-evidence:${label}`);
  for (const check of checks) {
    console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.message}`);
  }
  for (const blocker of hardBlockers) {
    console.log(`BLOCKER ${blocker.gateId}: ${blocker.summary}`);
  }
}

process.exit(ok ? 0 : 1);
