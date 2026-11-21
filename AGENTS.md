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
pnpm test:e2e         # build the demos, then the browser tests in apps/demos/e2e
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
click counts, and hidden or disabled nodes take nothing. `fireEvent` sends one
event wherever it is told.

- Keys: focus with `user.tab()` (or a press), then `user.keyboard('{End}')`.
  Hold modifiers as a user does: `'{Shift>}{ArrowRight}{/Shift}'`,
  `'{Alt>}'` before a click.
- Pointers: `user.click`, `user.dblClick`, and `user.pointer` for a point or a
  drag: `{ target, keys: '[MouseLeft>]', clientX }`, then `{ clientX }` to
  move, `{ keys: '[/MouseLeft]' }` to release. A double-click at a point is two
  presses with `detail: 1` and `detail: 2`.
- `fireEvent` is for what `userEvent` has no way to send: `wheel`,
  `pointercancel`, `accessibilityAction`, touch and pen, more than one
  pointer, a button joining one already held, and an event a control must
  refuse although `userEvent` would not send it (a disabled control's own
  guard, a read-only control, which reports itself disabled, still taking a
  right-click). Say why in a comment beside it.

A test of a fix should fail without the fix; check that it does.

Behaviour that needs real layout, hit testing or browser input (a drag, the
wheel, a right-click, where a press lands on a slider) belongs in the browser
tests: Playwright on the demos' web build, `apps/demos/e2e/*.spec.ts`, one file
per demo they open with `openDemo(page, '<name>')` (`?demo=<name>`, a file of
`apps/demos/src/demos`). Find controls by role and name, and read values from
`aria-valuenow` or `aria-valuetext`, as assistive technology does. Focus does
not reach the plugin from the page with Tab (it goes through the web host's
toolbar), so click a control first. Changing a component needs its build:
`pnpm test:e2e` rebuilds through Turborepo; `pnpm exec playwright test` in
`apps/demos` runs on the build already there.

## Conventions

- oxfmt and oxlint; keep lint warning-free.
- Commits follow Conventional Commits (`feat(components): …`, `docs: …`,
  `test(components): …`).
- Add a changeset for any change to the published package.
- Install snippets in the docs use pnpm and npm only.
