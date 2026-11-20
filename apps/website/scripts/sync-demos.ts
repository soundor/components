/**
 * Copies the demos' web build (`apps/demos`) into the site's `public/demos/`,
 * where `<Demo>` embeds it. Builds the demos first when they have not been
 * built: `pnpm build` does it through Turborepo, `pnpm dev` through this.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../../..', import.meta.url).pathname;
const built = join(root, 'apps/demos/.soundor/dist/web');
const target = join(root, 'apps/website/public/demos');

if (!existsSync(join(built, 'index.html'))) {
  console.log('Demos: building apps/demos');
  execFileSync('pnpm', ['--filter', '@soundor/components-demos', 'build'], {
    cwd: root,
    stdio: 'inherit',
  });
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(built, target, { recursive: true });
console.log('Demos: copied to apps/website/public/demos');
