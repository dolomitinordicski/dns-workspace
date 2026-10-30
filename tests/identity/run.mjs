import { spawnSync } from 'node:child_process';
import { requireEmulators } from './safety.mjs';
requireEmulators();
for (const args of [['tests/identity/verify-upstream.mjs'], ['--test', 'tests/identity/rules.test.mjs'], ['node_modules/@playwright/test/cli.js', 'test', '--config=playwright.identity.config.ts']]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
