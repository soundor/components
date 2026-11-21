import { launchPlugin } from '@soundor/vitest-e2e';

export type Plugin = Awaited<ReturnType<typeof launchPlugin>>;

/** An edit the plugin's editor reported to the host, as a DAW records it. */
export type Edit =
  | { type: 'begin'; id: number }
  | { type: 'perform'; id: number; value: number }
  | { type: 'end'; id: number };

/**
 * Starts the plugin (the gallery: its UI shows that demo without a page
 * address) and records every edit its editor reports to the host.
 */
export async function launch(): Promise<{ plugin: Plugin; edits: Edit[] }> {
  const plugin = await launchPlugin();
  const edits: Edit[] = [];
  plugin.host
    .on('beginEdit', ({ id }) => edits.push({ type: 'begin', id }))
    .on('performEdit', ({ id, value }) =>
      edits.push({ type: 'perform', id, value }),
    )
    .on('endEdit', ({ id }) => edits.push({ type: 'end', id }));
  return { plugin, edits };
}

/** A parameter's host id, by its title. */
export async function idOf(plugin: Plugin, title: string): Promise<number> {
  const found = (await plugin.host.getParameters()).find(
    (parameter) => parameter.title === title,
  );
  if (!found) throw new Error(`No parameter titled ${title}`);
  return found.id;
}

/** The begins and ends alone, in order: the gestures a host sees. */
export const gestures = (edits: readonly Edit[]) =>
  edits.filter((edit) => edit.type !== 'perform').map((edit) => edit.type);

/** What a control reports as its value, as a screen reader reads it. */
export const shown = (plugin: Plugin, name: string) => async () => {
  const { value } = await plugin
    .getByRole('adjustable', { name })
    .getAccessibility();
  return (value as { text?: string } | undefined)?.text;
};

/** A parameter's normalized value, as the host has it. */
export const normalized = (plugin: Plugin, title: string) => async () =>
  (await plugin.parameter(title).get()).normalized;
