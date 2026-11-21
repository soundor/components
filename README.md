<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/brand/soundor-components-logo-dark-bg.svg">
  <img alt="Soundor Components" src="assets/brand/soundor-components-logo.svg" height="64">
</picture>

Controls, displays, and layout for [Soundor](https://soundor.dev/) audio plugin
UIs, the same in a native VST3 plugin and in a browser.

`@soundor/components` is built on Soundor's React primitives. Bind a control to
a parameter and it takes the parameter's range, formatting, and reset value,
and reports host gestures and undo history. Every control works with the
keyboard and screen readers. For a design of your own, theme the styled
components or use their interaction hooks with your own visuals.

```tsx
import { ControlGroup, Knob, Panel, Slider } from '@soundor/components';
import { useState } from 'react';
import { parameters } from 'soundor:parameters';

export function Editor() {
  const [width, setWidth] = useState(0.5);
  return (
    <Panel title="Tone">
      <ControlGroup>
        <Knob parameter={parameters.drive} />
        <Slider label="Width" value={width} onChange={setWidth} />
      </ControlGroup>
    </Panel>
  );
}
```

The knob is bound to a `drive` parameter from the project configuration; the
slider keeps its value in React state. Every component is live in the
[documentation](https://components.soundor.dev/docs).

## What is included

| Group    | Components                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actions  | [Button](https://components.soundor.dev/docs/components/button), [Toggle](https://components.soundor.dev/docs/components/toggle), [SegmentedControl](https://components.soundor.dev/docs/components/segmented-control), [Select](https://components.soundor.dev/docs/components/select)                                                                                                                                                                                                                                                            |
| Menus    | [Dropdown](https://components.soundor.dev/docs/components/dropdown), [ContextMenu](https://components.soundor.dev/docs/components/context-menu)                                                                                                                                                                                                                                                                                                                                                                                                    |
| Controls | [Knob](https://components.soundor.dev/docs/components/knob), [Slider](https://components.soundor.dev/docs/components/slider), [Fader](https://components.soundor.dev/docs/components/fader), [ValueField](https://components.soundor.dev/docs/components/value-field), [TextField](https://components.soundor.dev/docs/components/text-field)                                                                                                                                                                                                      |
| Displays | [Plot](https://components.soundor.dev/docs/components/plot) (EQ curves, spectra, envelopes, with draggable handles), [XYPad](https://components.soundor.dev/docs/components/xy-pad), [LevelMeter](https://components.soundor.dev/docs/components/level-meter), [EnvelopeEditor](https://components.soundor.dev/docs/components/envelope-editor)                                                                                                                                                                                                    |
| Layout   | [Panel](https://components.soundor.dev/docs/components/panel), [ControlGroup](https://components.soundor.dev/docs/components/control-group), [Divider](https://components.soundor.dev/docs/components/divider), [ResizeGrip](https://components.soundor.dev/docs/components/resize-grip)                                                                                                                                                                                                                                                           |
| Headless | [`useKnob`](https://components.soundor.dev/docs/headless/use-knob), [`useSlider`](https://components.soundor.dev/docs/headless/use-slider), [`useFader`](https://components.soundor.dev/docs/headless/use-fader), [`useValueField`](https://components.soundor.dev/docs/headless/use-value-field), [`useXYPad`](https://components.soundor.dev/docs/headless/use-xy-pad), [`useEnvelopeEditor`](https://components.soundor.dev/docs/headless/use-envelope-editor), [`useResizeGrip`](https://components.soundor.dev/docs/headless/use-resize-grip) |

## Install

In a [Soundor project](https://soundor.dev/docs/getting-started), with pnpm or
npm (Yarn and bun are not supported):

```sh
pnpm add @soundor/components
```

It needs `@soundor/react` 0.19 and React 19.3. Build with the Soundor CLI, which
resolves the runtime imports and packages the bundled Geist fonts.

## Documentation

All guides and references are on
[components.soundor.dev](https://components.soundor.dev/docs), from
`apps/website/content/docs/` in this repository. Start with:

- [Getting started](https://components.soundor.dev/docs): install, bind a control, and use one without a parameter.
- [Theming](https://components.soundor.dev/docs/utils/theming): tokens, slots, and fonts.
- [Live plot data](https://components.soundor.dev/docs/guides/live-plot-data): feed a plot or a meter from the audio side.
- [Keyboard and accessibility](https://components.soundor.dev/docs/guides/keyboard-and-accessibility): keys, labels, and hints for every control.
- [Custom controls](https://components.soundor.dev/docs/guides/custom-controls): the headless hooks with your own visuals.

## Work on Soundor Components

Use Node from `.nvmrc`, pnpm via Corepack, and Rust stable with the
`wasm32-unknown-unknown` target, which the demos need:

```sh
corepack enable
pnpm install
pnpm check
pnpm dev
```

`pnpm check` runs Oxfmt, Oxlint, the package and website builds, and the
component tests. The repository has three parts:

- [`packages/components`](packages/components): `@soundor/components`, its public APIs, and its tests.
- [`apps/demos`](apps/demos): the web-runtime app whose build the documentation embeds as live demos (`?demo=<name>`).
- [`apps/website`](apps/website): the documentation, built with Fumadocs on TanStack Start and Vite.

### Releases and the website

1. Add a changeset with `pnpm changeset` for a package change. Keep the peer range compatible with a published, tested `@soundor/react` version.
2. The **Release** workflow on `main` opens or updates a version PR with the new version, changelog, and lockfile. Merging the PR releases to npm: the workflow checks, builds and packs the package without secrets, and only its publish job runs in the `npm-production` environment, which accepts deployments from `main` alone. Changesets creates the tag and GitHub release. Enable GitHub Actions PR creation for the repo, or provide `RELEASE_PR_TOKEN` with contents and pull-request access if release PRs need to trigger required checks.
3. Configure npm trusted publishing for `soundor/components`, `release.yml`, and environment `npm-production`. If npm requires an existing package to set up trust, a maintainer can bootstrap the versioned package with `pnpm check`, `pnpm --filter @soundor/components pack`, and npm publishing from the verified tarball, then configure the trusted publisher for subsequent versions.
4. GitHub Pages deploys from GitHub Actions to the custom domain `components.soundor.dev`. The **Website** workflow builds and deploys `apps/website/dist/client`: the **Release** workflow calls it after each npm release, with the released commit, and it can be run by hand for a website-only change (`gh workflow run website.yml -f ref=main`).

The first package release is `0.1.0`. After it is on npm, update the Orbit example and the docs playground in `soundor/soundor` to depend on the published package, then remove the old in-tree package and its release workflow.

## License

Soundor Components is [MIT licensed](LICENSE). The bundled Geist fonts are under
the [SIL Open Font License](packages/components/assets/geist/OFL.txt).
