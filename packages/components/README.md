# @soundor/components

Soundor-native controls and displays for audio plug-ins. The default design uses warm neutral surfaces, flat graphite controls, one accent, and a charcoal display. The components work in VST3 and Soundor's web runtime and need no provider.

## Install

```sh
pnpm add @soundor/components
```

Components 0.1 requires `@soundor/react` `^0.19.0` and React `^19.3.0`. Use the corresponding Soundor CLI and runtimes in your plug-in. Build through Soundor so its runtime imports and bundled font assets are resolved.

```tsx
import {
  Button,
  ControlGroup,
  Knob,
  Slider,
  formatters,
} from '@soundor/components';
import { parameters } from 'soundor:parameters';

<ControlGroup title="Delay">
  <Knob parameter={parameters.feedback} size="lg" format={formatters.percent} />
  <Slider parameter={parameters.mix} />
  <Button variant="ghost" onPress={loadNextPreset}>
    Next preset
  </Button>
</ControlGroup>;
```

| Area           | Components                                                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| Actions        | `Button` (surface, accent, ghost), `Toggle` (button, chip, switch), `SegmentedControl` (single selection)            |
| Range controls | `Knob` (270° dial), `Slider` (horizontal), `Fader` (vertical with optional ticks), `ValueField` (drag, step or type) |
| Displays       | `LevelMeter` (dB, multi-channel, held peak and latched clip), `Plot`, `XYPad`                                        |
| Layout         | `Panel`, `ControlGroup`, `Divider`                                                                                   |
| Editor         | `ResizeGrip`                                                                                                         |

### Parameter and headless integration

Pass a generated numeric parameter to inherit its bounds, normalized mapping, formatting, parser, and reset value. The controls open and close host gestures and record history by default. Set `history={false}` to opt out or pass `{ label: 'Adjust feedback' }` to name the undo entry. Standalone controls accept `value`/`onChange` or `defaultValue`, plus `min`, `max`, `step`, `scale`, `format`, and `parse` as needed. `onChangeStart` and `onChangeEnd` report interaction boundaries. A controlled component should update its `value` in response to `onChange`.

Range controls support drag, wheel, arrows, Page Up/Down, Home/End and double-click reset. Shift makes adjustments finer and Escape cancels an in-progress drag. Key/wheel bursts are grouped. `ValueField` also supports Enter to edit and parsing typed units; `XYPad` edits both coordinates with a drag and uses the arrow keys to edit one axis at a time.

`@soundor/components/headless` exports `useKnob`, `useSlider`, `useFader`, `useValueField`, and `useXYPad`. Use their `handlers` on a focusable Soundor `View` and the returned state to draw your own appearance. The handlers supply accessibility, input, and focus state without loading the theme or fonts.

```tsx
import { useKnob } from '@soundor/components/headless';
import { View } from '@soundor/react';

function CustomKnob({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const knob = useKnob({ label: 'Mix', value, onChange, defaultValue: 0.5 });
  return (
    <View {...knob.handlers} style={{ width: 64, height: 64 }}>
      <Dial position={knob.normalized} focused={knob.focusVisible} />
    </View>
  );
}
```

### Customize the theme

```tsx
import { createTheme, ThemeProvider } from '@soundor/components/theme';

const theme = createTheme({
  spacing: { spaceLg: 14 },
  components: { Knob: { value: { fontSize: 10 } } },
});

<ThemeProvider theme={theme}>
  <Knob label="Tone" styles={{ value: { fontSize: 11 } }} />
  <ThemeProvider theme={{ color: { trackFill: '#484b47' } }}>
    <Slider label="Shape" />
  </ThemeProvider>
</ThemeProvider>;
```

Nested providers inherit tokens and component slots from the nearest provider. Pass a partial override to change only the nested values you specify. Precedence is component defaults → theme slots → instance `styles` → instance root `style`. Use `useTheme` and `textStyle` to apply shared tokens to custom views. The package supplies one built-in theme.

Geist and Geist Mono are the default fonts. Styled components register them automatically. To preload them, call `await registerFonts()` from `@soundor/components` or `@soundor/components/theme` before rendering. The Soundor bundler follows the static `.ttf` imports and packages them for both runtimes. The font files and their SIL Open Font License ship in [`assets/geist/`](assets/geist/). To use a custom font, register it with `soundor:ui` and set `font.sans` or `font.mono` in your theme.

### Editor resize grip

Render `<ResizeGrip />` at the editor root, outside any centered safe area, to put it in the bottom-right corner. It hides automatically when the host does not allow resize requests. Dragging uses screen coordinates, so resizing a scaling editor does not change the drag distance. The arrow keys resize by 10 editor pixels, or 50 with Shift. The host applies its own size limits and can decline requests.

For a custom handle, call `useResizeGrip()` from `@soundor/components/headless`. Render your handle only when `resizable` is true, spread `handlers` onto its Soundor `View`, and use `focusVisible` to draw its focus ring. Both APIs accept a custom accessible label, hint, and keyboard `keyStep`; the styled grip also accepts `size`, `color`, and `root`/`icon` style overrides.

### Canvas charts

```tsx
<Plot
  width={480}
  height={200}
  title="Response"
  x={{
    domain: [20, 20_000],
    scale: 'log',
    ticks: 'decades',
    format: formatters.frequency,
  }}
  y={{ domain: [-24, 24], format: formatters.decibels }}
  series={[{ label: 'EQ', points: response, type: 'area', baseline: 0 }]}
  markers={[
    { x: cutoff, y: gain, label: '1', onMove: ([hz, db]) => setBand(hz, db) },
  ]}
  readout
/>
```

- **Geometry** (`@soundor/components/chart`): scales and their inverses, viewport/coordinate helpers, ticks, formatting, and hit testing.
- **Drawing** (same entry point): clipping, axes, grids, line/area/bar/step/point/band series, markers and handles. Draw on Soundor's `Canvas` context.
- **React**: `Plot` and `XYPad` compose those functions with Soundor's `useCanvasSize` for device-pixel sizing. `Plot` markers with both coordinates and `onMove` are draggable and keyboard-adjustable. `onMoveStart` and `onMoveEnd` let the caller group its own edits.

Pass sorted `[x, y]` points or evenly spaced `values` (typed arrays are supported). For live data, keep the `series` configuration stable and supply `seriesSource` with `get()` and `subscribe(invalidate)`; samples replace the configured data by index. Updates coalesce to a Canvas draw per frame without reconciling React. Keep reusable sample buffers on the UI side and publish only coherent snapshots. Plot draws the supplied response or measurement data; frequency analysis and other DSP belong in the plug-in.

See the [repository README](https://github.com/soundor/components#readme) for development and release instructions.ls""
