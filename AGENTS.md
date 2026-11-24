# AGENTS.md

This file provides guidance to coding agents (Claude Code, claude.ai/code and others) when working with code in this repository.

## What this is

`@soundor/components` (`packages/components`): controls, displays and layout
for [Soundor](https://soundor.dev/) plugin UIs, built on `@soundor/react`, the
same in the VST3 and the web runtime. `apps/website` is the documentation,
whose pages in `apps/website/content/docs/` are the spec of behaviour; keep
them in sync when behaviour changes. `apps/demos` holds the live demos the
site embeds (web only).

## Commands

```sh
pnpm install
pnpm check            # format + lint + build + test, what CI runs
pnpm --filter @soundor/components exec vitest run src/internal/range.test.tsx -t "<name>"
pnpm test:e2e         # build the demos, then the browser tests in apps/demos/e2e/web
xvfb-run -a pnpm test:vst3   # the Debug VST3 in the VST3 host, apps/demos/e2e/vst3
pnpm format:fix
pnpm dev              # the website, with the demos
```

## Tests

Unit tests use `@soundor/testing-library/react` on the simulated runtime
(`@soundor/test-runtime`): no layout, so a test that needs geometry defines
`getBoundingClientRect` on the node.

**Drive tests with `userEvent`; use `fireEvent` only where `userEvent` cannot
do it.** `userEvent` sends what a user's action really sends: a press moves
focus, keys go to the focused node, a click and a double-click carry their
click counts, and disabled nodes still receive hover but cannot take focus or
be edited. `fireEvent` sends one event wherever it is told.

- Keys: focus with `user.tab()` (or a press), then `user.keyboard('{End}')`.
  Hold modifiers as a user does: `'{Shift>}{ArrowRight}{/Shift}'`,
  `'{Alt>}'` before a click.
- Pointers: `user.click`, `user.dblClick`, and `user.pointer` for a point or a
  drag: `{ target, keys: '[MouseLeft>]', clientX }`, then `{ clientX }` to
  move, `{ keys: '[/MouseLeft]' }` to release. A double-click at a point is two
  presses with `detail: 1` and `detail: 2`.
- Use `user.wheel(target, { deltaY })`, `user.accessibilityAction(target, name)`,
  and `user.pointer` with `[TouchA>]`, `pointerName: 'TouchA'` to move, and
  `[/TouchA]` to release. Use `fireEvent.pointerCancel` for cancellation;
  `userEvent` does not simulate it.

A test of a fix should fail without the fix; check that it does.

Behaviour that needs real layout, hit testing or browser input (a drag, the
wheel, a right-click, where a press lands on a slider) belongs in the browser
tests: Playwright on the demos' web build, `apps/demos/e2e/web/*.spec.ts`, one file
per demo they open with `openDemo(page, '<name>')` (`?demo=<name>`, a file of
`apps/demos/src/demos`). Find controls by role and name, and read values from
`aria-valuenow` or `aria-valuetext`, as assistive technology does. Focus does
not reach the plugin from the page with Tab (it goes through the web host's
toolbar), so click a control first. Changing a component needs its build:
`pnpm test:e2e` rebuilds through Turborepo; `pnpm exec playwright test` in
`apps/demos` runs on the build already there.

What a host sees belongs in the VST3 tests: `@soundor/vitest-e2e` on the
demos' Debug VST3 in Soundor's VST3 host, `apps/demos/e2e/vst3/*.test.ts`.
The plugin shows the gallery demo (it has no page address to choose another),
whose controls are bound to parameters. `launch()` in `e2e/vst3/plugin.ts`
records the `beginEdit`, `performEdit` and `endEdit` the editor reports, so a
test checks the gestures and edits a DAW would record, and `plugin.parameter()`
reads and automates a parameter as the host does. On Linux the editor needs a
display: run them under `xvfb-run -a`. `pnpm test:vst3` builds the components
and the plugin first; the VST3 runtime is Steinberg's SDK, prebuilt, not JUCE.

## Conventions

- oxfmt and oxlint; keep lint warning-free.
- Commits follow Conventional Commits (`feat(components): …`, `docs: …`,
  `test(components): …`).
- Add a changeset for any change to the published package.
- Install snippets in the docs use pnpm and npm only.

## Public component API design

The library is opinionated and high level: complete, accessible audio
controls with sensible defaults, not a low-level kit like Radix or Base UI.
**Components are complete by default and composable where their
functionality requires it.**

```tsx
// Predictable controls: ordinary props.
<Knob parameter={parameters.gain} />
<Button onPress={reset}>Reset</Button>

// Typed data: configuration keeps options, value and onChange related.
<Select value={filter} onChange={setFilter} options={filterOptions} />

// Naturally variable content: compound parts.
<ContextMenu>
  <ContextMenu.Trigger>
    <Knob parameter={parameters.gain} />
  </ContextMenu.Trigger>
  <ContextMenu.Content>
    <ParameterMenuItems parameter={parameters.gain} />
  </ContextMenu.Content>
</ContextMenu>
```

### Developer experience

- Ease of use over unlimited customization. A component is styled, complete
  and works with its defaults; keep APIs small and consistent with their
  neighbours.
- Design for real audio UIs (plug-in editors, analysers, preset menus), not
  for parity with general-purpose UI frameworks.

### Composition

- Ordinary props for a predictable structure (a Knob, a Select). Composition
  for content that naturally varies: menu items, plot series and markers.
- Expose no internal anatomy without a demonstrated use case.
- Compound parts are `Component.Part` (`Plot.Line`, `DropdownMenu.Trigger`);
  the root is `<Component>`, never `<Component.Root>`. A shared namespace with
  no root of its own (`Menu.Item`) is fine where two roots share parts.
- Parts find their parent through context and register with it, so custom
  components, fragments, conditions and `map`s work. Don't rely on
  `React.Children` inspection or child component identity; take order from
  the rendered tree.
- No `asChild`, slots or polymorphic `as` props. A trigger enhances its one
  child with `cloneElement`, merged refs (`useMergedRef`) and composed
  handlers (`HostProps`).
- A part used outside its parent, or a structure TypeScript can't rule out
  (two `Plot.XAxis`), throws a message that names it.

### TypeScript

- Keep inference between related data: Select's value type comes from its
  options or parameter. Prefer typed configuration where composition would
  lose it.
- Compound parts are typed independently; no generic factories or
  render-prop APIs to thread types from parent to child.
- Each part takes only its own props; use discriminated unions for
  mutually exclusive ones (`points` | `values` | `source`), and check them
  at run time as well.
- No `any`, unchecked assertions or broad public types.

### Customization

- Theming is central: tokens and `theme.components` slots, plus `style` and
  `styles` on the component.
- Substantially different visuals or behaviour use the headless hooks
  (`@soundor/components/headless`), not more props on the standard component.

### Accessibility and engine integration

- Accessibility and keyboard interaction are part of every component's
  defaults, never opt-in.
- A secondary interaction (a context menu) keeps the control's role, name,
  value, state, actions, focus and primary input. Append accessibility
  actions after the control's own (`withActions`, `extraActions`); never
  replace them. Keep the caller's ref and handlers working.
- Prefer the engine's semantic APIs over component-level workarounds, and
  don't depend on unreleased engine APIs. Where a workaround is needed now,
  isolate it in one internal module with a note on what replaces it (as
  `internal/menu/context-menu-trigger.ts` does for soundor/soundor#399), and
  add no public prop that only the workaround needs.

### Performance

- Keep the shared rendering paths: one canvas per display, drawn once per
  frame at most.
- High-frequency data (spectra, meters) goes through sources read at draw
  time, never through React state: a live update causes no React render.
- Structural changes (an axis, a legend) may render; per-frame changes may
  not. Don't add expensive abstractions only to support a different public
  API.
