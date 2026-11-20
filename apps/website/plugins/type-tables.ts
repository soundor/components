/**
 * The props tables `<auto-type-table>` makes in MDX, from the real types
 * (fumadocs-typescript, on TypeScript's own checker): a component page's
 * table is its props interface, with each prop's doc comment.
 *
 * One TypeScript project: `packages/components`', which loads
 * `@soundor/environment`'s `soundor:*` declarations through its `types`.
 */

import { join } from 'node:path';

import {
  createGenerator,
  createProject,
  type GenerateOptions,
} from 'fumadocs-typescript';

/** The repository's root: `path` in `<auto-type-table>` starts there. */
export const REPOSITORY = join(import.meta.dirname, '../../..');

/** Types this short show in full, not as their kind ('union', 'object'). */
const SHORT_TYPE = 40;

export const typeTableOptions: GenerateOptions & { basePath: string } = {
  basePath: REPOSITORY,
  typeSimplifier: {
    override: ({ checker, type, location }) => {
      // An optional prop's type has `undefined` in it; the table says
      // optional already.
      const text = checker
        .typeToString(type, location)
        .replace(/ \| undefined$/, '')
        .replace(/^undefined \| /, '');
      return text.length <= SHORT_TYPE ? text : undefined;
    },
  },
};

export async function typeTableGenerator() {
  const project = await createProject({
    tsconfigPath: join(REPOSITORY, 'packages/components/tsconfig.json'),
  });
  return { generator: createGenerator({ project }) };
}
