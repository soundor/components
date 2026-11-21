/**
 * Copies the demos' web build (`apps/demos`) into the site's `public/demos/`,
 * where `<Demo>` embeds it. `pnpm build` and `pnpm dev` build the components
 * package first through Turborepo; run on its own, this does it too, and it
 * builds the demos again when they are older than the package: a demo bundled
 * without the package's `dist` has `@soundor/components` left unresolved, and
 * the page shows "The plugin UI failed to load".
 */

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../../..', import.meta.url).pathname;
const packageEntry = join(root, 'packages/components/dist/index.js');
const built = join(root, 'apps/demos/.soundor/dist/web');
const demosIndex = join(built, 'index.html');
const target = join(root, 'apps/website/public/demos');

function build(filter: string): void {
  execFileSync('pnpm', ['--filter', filter, 'build'], {
    cwd: root,
    stdio: 'inherit',
  });
}

if (!existsSync(packageEntry)) {
  console.log('Demos: building packages/components');
  build('@soundor/components');
}

if (
  !existsSync(demosIndex) ||
  statSync(demosIndex).mtimeMs < statSync(packageEntry).mtimeMs
) {
  console.log('Demos: building apps/demos');
  rmSync(join(root, 'apps/demos/.soundor/dist'), {
    recursive: true,
    force: true,
  });
  build('@soundor/components-demos');
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(built, target, { recursive: true });
console.log('Demos: copied to apps/website/public/demos');
