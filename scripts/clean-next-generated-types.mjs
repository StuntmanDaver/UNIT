import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const typesDir = resolve(process.cwd(), '.next/types');
const staleCopyPattern = /\s+\d+\.tsx?$/;

function removeStaleCopies(dir) {
  if (!existsSync(dir)) {
    return 0;
  }

  let removed = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      removed += removeStaleCopies(path);
      continue;
    }

    if (entry.isFile() && staleCopyPattern.test(entry.name)) {
      rmSync(path);
      removed += 1;
    }
  }

  return removed;
}

const removed = removeStaleCopies(typesDir);
if (removed > 0) {
  console.log(`Removed ${removed} stale Next generated type file${removed === 1 ? '' : 's'}.`);
}
