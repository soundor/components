import type { Code, Root } from 'mdast';
import type { VFile } from 'vfile';

/** `<Demo name="…" />` in MDX, as the parser gives it. */
interface DemoElement {
  readonly type: 'mdxJsxFlowElement';
  readonly name: string | null;
  readonly attributes: readonly {
    readonly type: string;
    readonly name?: string;
    readonly value?: unknown;
  }[];
  children: Code[];
}

function isDemo(node: unknown): node is DemoElement {
  const element = node as Partial<DemoElement>;
  return element.type === 'mdxJsxFlowElement' && element.name === 'Demo';
}

/**
 * Gives every `<Demo name>` its code, as a `tsx` code block child: the
 * page then has it highlighted, and readable without JavaScript, from the
 * file the preview runs. An unknown demo fails the build.
 */
export function remarkDemos(read: (name: string) => string | undefined) {
  return () => (tree: Root, file: VFile) => {
    const where = file.path ?? 'content';
    const visit = (node: unknown): void => {
      if (isDemo(node)) {
        const name = node.attributes.find(
          (attribute) =>
            attribute.type === 'mdxJsxAttribute' && attribute.name === 'name',
        )?.value;
        if (typeof name !== 'string') {
          throw new Error(`${where}: <Demo> needs name="<demo>"`);
        }
        const code = read(name);
        if (code === undefined) {
          throw new Error(`${where}: there is no demo "${name}"`);
        }
        node.children = [{ type: 'code', lang: 'tsx', value: code.trimEnd() }];
        return;
      }
      const children = (node as { children?: unknown[] }).children;
      if (Array.isArray(children)) for (const child of children) visit(child);
    };
    visit(tree);
  };
}
