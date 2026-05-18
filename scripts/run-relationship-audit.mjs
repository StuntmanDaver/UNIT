import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const auditPath = path.join(process.cwd(), 'scripts', 'relationship-audit.sql');
const databaseUrl = process.env.RELATIONSHIP_AUDIT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!fs.existsSync(auditPath)) {
  console.error(`Relationship audit SQL not found: ${auditPath}`);
  process.exit(1);
}

if (!databaseUrl) {
  console.error('Set RELATIONSHIP_AUDIT_DATABASE_URL or DATABASE_URL before running the relationship audit.');
  process.exit(1);
}

const result = spawnSync('psql', ['-v', 'ON_ERROR_STOP=1', '-f', auditPath], {
  env: {
    ...process.env,
    PGDATABASE: databaseUrl,
  },
  stdio: 'inherit',
});

if (result.error) {
  console.error(`Failed to run psql: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
