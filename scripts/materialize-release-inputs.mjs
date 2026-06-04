#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const INPUT_DIRS = ['app', 'components', 'constants', 'hooks', 'lib', 'services', 'assets'];
const INPUT_NAMES = [
  '*.ts',
  '*.tsx',
  '*.js',
  '*.jsx',
  '*.css',
  '*.json',
  '*.png',
  '*.ttf',
];
const SHOULD_ATTEMPT_DOWNLOAD = process.env.UNIT_MATERIALIZE_RELEASE_INPUTS === '1';

if (process.platform !== 'darwin') {
  console.log('materialize-release-inputs: skipped on non-macOS filesystem');
  process.exit(0);
}

let datalessFiles = scanDatalessFiles();
if (datalessFiles.length === 0) {
  console.log('materialize-release-inputs: no dataless release inputs found');
  process.exit(0);
}

console.log(`materialize-release-inputs: ${datalessFiles.length} dataless release inputs found`);
for (const path of datalessFiles.slice(0, 80)) {
  console.log(`- ${path}`);
}
if (datalessFiles.length > 80) {
  console.log(`...and ${datalessFiles.length - 80} more`);
}

if (!SHOULD_ATTEMPT_DOWNLOAD) {
  console.log('materialize-release-inputs: dry run only. Set UNIT_MATERIALIZE_RELEASE_INPUTS=1 to ask macOS to download these files.');
  process.exit(1);
}

if (!commandExists('brctl')) {
  console.error('materialize-release-inputs: brctl is not available; materialize the files in Finder or from your cloud provider.');
  process.exit(1);
}

console.log('materialize-release-inputs: requesting macOS cloud download via brctl');
for (const path of datalessFiles) {
  spawnSync('brctl', ['download', path], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 10000,
    maxBuffer: 1024 * 1024,
  });
}

console.log('materialize-release-inputs: reading remaining files once to trigger local materialization');
datalessFiles = scanDatalessFiles();
for (const path of datalessFiles) {
  spawnSync('timeout', ['15s', 'dd', `if=${path}`, 'of=/dev/null', 'bs=1048576', 'count=1'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 20000,
    maxBuffer: 1024 * 1024,
  });
}

datalessFiles = scanDatalessFiles();
if (datalessFiles.length > 0) {
  console.error(`materialize-release-inputs: ${datalessFiles.length} files are still dataless after brctl download requests.`);
  console.error('Open the project folder in Finder and download/materialize it locally, then rerun npm run release:check-inputs.');
  process.exit(1);
}

console.log('materialize-release-inputs: release inputs are materialized');

function scanDatalessFiles() {
  const findDirs = INPUT_DIRS.map((dir) => `"${dir}"`).join(' ');
  const findNames = INPUT_NAMES.map((name, index) => (
    `${index === 0 ? '' : '-o '}-name "${name}"`
  )).join(' ');
  const result = spawnSync(
    'bash',
    [
      '-lc',
      [
        `find ${findDirs} -type f \\( ${findNames} \\) -print0`,
        '| xargs -0 ls -lO 2>/dev/null',
        "| awk '/dataless/ {$1=$2=$3=$4=$5=$6=$7=$8=\"\"; sub(/^ +/, \"\"); print}'",
      ].join(' '),
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 30000,
      maxBuffer: 1024 * 1024 * 10,
    }
  );
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^.* (app|components|constants|hooks|lib|services|assets)\//, '$1/'));
}

function commandExists(command) {
  const result = spawnSync('command', ['-v', command], {
    shell: true,
    encoding: 'utf8',
    timeout: 5000,
  });
  return result.status === 0;
}
