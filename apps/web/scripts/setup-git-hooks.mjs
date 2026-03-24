import { execSync } from 'node:child_process';

function canRun(command) {
  try {
    execSync(command, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!canRun('git rev-parse --is-inside-work-tree')) {
  process.exit(0);
}

try {
  execSync('git config core.hooksPath .githooks', { stdio: 'ignore' });
  console.log('Configured Git hooks path to .githooks');
} catch (error) {
  console.warn('Failed to configure Git hooks path:', error instanceof Error ? error.message : error);
  process.exit(0);
}
