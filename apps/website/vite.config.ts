import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import { remarkAutoTypeTable } from 'fumadocs-typescript';
import { defineConfig } from 'vite';

import { analytics } from './plugins/analytics.ts';
import { remarkDemos } from './plugins/remark-demos.ts';
import {
  REPOSITORY,
  typeTableGenerator,
  typeTableOptions,
} from './plugins/type-tables.ts';
import { serveFile } from './scripts/static.ts';

const typeTables = await typeTableGenerator();

// The code `<Demo>` shows, read as each page compiles: an edit shows on the
// next reload.
const demosDir = join(REPOSITORY, 'apps/demos/src/demos');
const readDemo = (name: string): string | undefined => {
  try {
    return readFileSync(join(demosDir, `${name}.tsx`), 'utf-8');
  } catch {
    return undefined;
  }
};
const base = process.env.SITE_BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [
    analytics(),
    {
      // The folder `scripts/sync-demos.ts` writes into public/, served from
      // disk under `vite dev`: Vite's list of public files goes stale when it
      // is rewritten while it runs (the demos rebuilt, say).
      name: 'soundor-components:synced-public',
      configureServer(server) {
        const publicDir = new URL('./public', import.meta.url).pathname;
        // Vite has already taken `base` off the request's URL.
        server.middlewares.use((request, response, next) => {
          if (
            !(request.url ?? '').startsWith('/demos/') ||
            !serveFile(publicDir, request, response)
          ) {
            next();
          }
        });
      },
    },
    fumadocsMdx({
      globalOptions: {
        mdxOptions: {
          remarkPlugins: (defaults) => [
            remarkDemos(readDemo),
            [
              remarkAutoTypeTable,
              {
                generator: typeTables.generator,
                options: typeTableOptions,
                remarkStringify: true,
              },
            ],
            ...defaults,
          ],
        },
      },
    }),
    tailwindcss(),
    tanstackStart({
      router: { basepath: base },
      pages: [{ path: '/search-index.json' }],
      prerender: { enabled: true, crawlLinks: true, failOnError: true },
    }),
    react(),
  ],
});
