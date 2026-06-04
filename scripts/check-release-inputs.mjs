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
const MAX_LISTED = 80;

if (process.platform !== 'darwin') {
  console.log('release-inputs-ok: non-macOS filesystem');
  process.exit(0);
}

const findDirs = INPUT_DIRS.map((dir) => `"${dir}"`).join(' ');
const findNames = INPUT_NAMES.map((name, index) => (
  `${index === 0 ? '' : '-o '}-name "${name}"`
)).join(' ');
const scan = spawnSync(
  'bash',
  [
    '-lc',
    [
      `find ${findDirs} -type f \\( ${findNames} \\) -print0`,
      '| xargs -0 ls -lO 2>/dev/null',
      "| awk '/dataless/ {print}'",
    ].join(' '),
  ],
  {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: 1024 * 1024 * 10,
  }
);

const output = `${scan.stdout ?? ''}${scan.stderr ?? ''}`;
const datalessFiles = output
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

if (scan.status !== 0 && datalessFiles.length === 0) {
  console.error(`release-inputs-failed: scan exited with status ${scan.status ?? 1}`);
  if (output.trim()) console.error(output.trim());
  process.exit(1);
}

if (datalessFiles.length > 0) {
  console.error('release-inputs-failed: mobile source/assets are not fully materialized on this Mac.');
  console.error('Metro can hang during Expo export or Android createBundleReleaseJsAndAssets while files are dataless.');
  console.error(`Dataless files found: ${datalessFiles.length}`);
  for (const line of datalessFiles.slice(0, MAX_LISTED)) {
    console.error(line);
  }
  if (datalessFiles.length > MAX_LISTED) {
    console.error(`...and ${datalessFiles.length - MAX_LISTED} more`);
  }
  console.error('Download/materialize the UNIT project files locally, then rerun the release check.');
  process.exit(1);
}

console.log('release-inputs-ok: mobile source/assets are materialized');
