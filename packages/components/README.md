# @soundor/components

Controls, displays, and layout for [Soundor](https://soundor.dev/) audio plugin
UIs, the same in VST3 and the web runtime.

```sh
pnpm add @soundor/components
```

It needs Soundor 0.20, `@soundor/react` 0.20, and React 19.3.

```tsx
import { ControlGroup, Knob, Slider } from '@soundor/components';
import { parameters } from 'soundor:parameters';

<ControlGroup title="Delay">
  <Knob parameter={parameters.feedback} />
  <Slider parameter={parameters.mix} />
</ControlGroup>;
```

- [Documentation](https://components.soundor.dev/docs)
- [Components](https://components.soundor.dev/docs/components/button)
- [Headless hooks](https://components.soundor.dev/docs/headless/use-knob) (`@soundor/components/headless`)
- [Theming](https://components.soundor.dev/docs/utils/theming) (`@soundor/components/theme`)
- [Chart helpers](https://components.soundor.dev/docs/utils/chart-helpers) (`@soundor/components/chart`)

The bundled Geist fonts are under the SIL Open Font License, in
[`assets/geist/`](assets/geist/).
