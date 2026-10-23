// ============================================================
// prebuild.mjs —— 书稿导入（npm run build / dev 前自动执行）
//   chapters/（前言 + 31 章）→ src/content/docs/
// ============================================================
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

execFileSync('node', ['scripts/import-fde.mjs'], { stdio: 'inherit', cwd: ROOT });

console.log('prebuild: 导入完成');
