import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const functionsDir = path.join(projectRoot, 'supabase', 'functions');
const workflowPath = path.join(projectRoot, '.github', 'workflows', 'supabase-deploy.yml');
const packagePath = path.join(projectRoot, 'package.json');

function listDeployableFunctions() {
  return fs
    .readdirSync(functionsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('_'))
    .filter((name) => fs.existsSync(path.join(functionsDir, name, 'index.ts')))
    .sort();
}

function extractEdgeCheckFunctions() {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const edgeCheck = packageJson.scripts?.['edge:check'] ?? '';
  return [...edgeCheck.matchAll(/supabase\/functions\/([^/\s]+)\/index\.ts/g)]
    .map((match) => match[1])
    .sort();
}

function extractWorkflowDeployFunctions() {
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  return [...workflow.matchAll(/supabase functions deploy ([a-z0-9-]+)/g)]
    .map((match) => match[1])
    .sort();
}

function diff(expected, actual) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);

  return {
    missing: expected.filter((name) => !actualSet.has(name)),
    extra: actual.filter((name) => !expectedSet.has(name)),
  };
}

function format(label, result) {
  const lines = [];

  if (result.missing.length > 0) {
    lines.push(`${label} missing: ${result.missing.join(', ')}`);
  }

  if (result.extra.length > 0) {
    lines.push(`${label} extra: ${result.extra.join(', ')}`);
  }

  return lines;
}

const deployableFunctions = listDeployableFunctions();
const edgeCheckFunctions = extractEdgeCheckFunctions();
const workflowDeployFunctions = extractWorkflowDeployFunctions();

const edgeCheckDiff = diff(deployableFunctions, edgeCheckFunctions);
const workflowDiff = diff(deployableFunctions, workflowDeployFunctions);
const errors = [
  ...format('edge:check', edgeCheckDiff),
  ...format('supabase-deploy.yml', workflowDiff),
];

if (errors.length > 0) {
  console.error('Edge Function coverage mismatch detected.');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`edge-functions-coverage-clean (${deployableFunctions.length} functions)`);
