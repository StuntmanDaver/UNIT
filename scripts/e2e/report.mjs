#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDir, parseArgs, resultsRoot, writeJson } from './lib.mjs';

const args = parseArgs();
const runId = String(args['run-id'] || process.env.E2E_RUN_ID || '');

if (!runId) {
  console.error('Missing --run-id or E2E_RUN_ID');
  process.exit(1);
}

const dir = ensureDir(join(resultsRoot, runId));
const summaryPath = join(dir, 'summary.json');
const summary = existsSync(summaryPath)
  ? JSON.parse(readFileSync(summaryPath, 'utf8'))
  : { runId, results: [] };

writeReports(dir, summary);

export function writeReports(dir, summary) {
  const results = summary.results ?? [];
  const failed = results.filter((result) => result.status !== 0);
  const passed = results.filter((result) => result.status === 0);
  const markdown = [
    `# UNIT E2E Run ${summary.runId}`,
    '',
    `Target: ${summary.target ?? 'unknown'}`,
    `Started: ${summary.startedAt ?? 'unknown'}`,
    `Finished: ${summary.finishedAt ?? new Date().toISOString()}`,
    `Passed: ${passed.length}`,
    `Failed: ${failed.length}`,
    '',
    '## Results',
    '',
    '| Platform | Flow | Attempts | Status | Log |',
    '| --- | --- | ---: | --- | --- |',
    ...results.map((result) => {
      const log = result.logPath ? result.logPath.replace(`${dir}/`, '') : '';
      return `| ${result.platform} | ${result.name} | ${result.attempts} | ${result.status === 0 ? 'PASS' : 'FAIL'} | ${log} |`;
    }),
    '',
  ].join('\n');

  const htmlRows = results.map((result) => {
    const log = result.logPath ? result.logPath.replace(`${dir}/`, '') : '';
    const status = result.status === 0 ? 'PASS' : 'FAIL';
    return `<tr class="${status.toLowerCase()}"><td>${escapeHtml(result.platform)}</td><td>${escapeHtml(result.name)}</td><td>${result.attempts}</td><td>${status}</td><td>${escapeHtml(log)}</td></tr>`;
  }).join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>UNIT E2E ${escapeHtml(summary.runId)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 32px; color: #111827; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 10px; text-align: left; }
    .pass td { background: #f0fdf4; }
    .fail td { background: #fef2f2; }
    .meta { color: #4b5563; }
  </style>
</head>
<body>
  <h1>UNIT E2E Run ${escapeHtml(summary.runId)}</h1>
  <p class="meta">Target: ${escapeHtml(summary.target ?? 'unknown')} | Passed: ${passed.length} | Failed: ${failed.length}</p>
  <table>
    <thead><tr><th>Platform</th><th>Flow</th><th>Attempts</th><th>Status</th><th>Log</th></tr></thead>
    <tbody>${htmlRows}</tbody>
  </table>
</body>
</html>
`;

  writeFileSync(join(dir, 'summary.md'), markdown);
  writeFileSync(join(dir, 'summary.html'), html);
  writeJson(join(dir, 'summary.json'), summary);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
