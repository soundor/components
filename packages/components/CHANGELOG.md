# @soundor/components

## 0.3.0

### Minor Changes

- ab0e347: `Alt`-click (`Option`-click on a Mac) resets a Knob, Slider, Fader, ValueField, XYPad, draggable Plot marker or EnvelopeEditor handle to its default, as a double-click does, in one gesture and without a drag or a Slider's jump to the pointer. It is the pointer's reset on a ValueField, whose double-click types a value. The headless hooks get it too.

  A press on a Slider's thumb or an XYPad's handle grabs it where it is, and only a press elsewhere jumps to the pointer. A double-click resets only on the thumb or handle: one elsewhere jumps there and resets nothing, where it used to jump, then reset. `useSlider`, `useXYPad` and the other headless hooks take a `grabRadius` option for this.

- 6fac8f0: `Delete` or `Backspace` (the key a Mac labels "delete") resets the focused Knob, Slider, Fader, ValueField, XYPad, draggable Plot marker or EnvelopeEditor handle to its default, in one gesture: the keyboard's reset, beside the screen reader's reset action. With Command, Control or Alt held, the keys are left to shortcuts of their own; the headless hooks get it too.

## 0.2.0

### Minor Changes

- 8746bca: Add `Select`, `Dropdown`, `ContextMenu` and `EnvelopeEditor`, on shared popup and menu infrastructure built on Soundor's `Portal` and `FocusScope`.

  - `Select` chooses one value from a list: bound to a choice parameter, it takes the options, label and value from it and writes with history; without one it is controlled or uncontrolled, with a placeholder, disabled options and custom option rows.
  - `Dropdown` opens a menu of actions from a trigger of your own, beside it even when opened in code before any press, or beside an `anchor` of yours; a popup follows its anchor if it moves. `ContextMenu` opens one for the control it is given, with no view of its own around it: on the secondary press or a long touch at the pointer, with Shift+F10 or the context menu key beside the focused control, and from a screen reader's "Show menu" action. Both share one item model: actions, separators, icons, displayed shortcuts and checked items. A shortcut is written once (`Mod+Shift+Z`) and shown the way the platform writes it (`⇧⌘Z` on macOS, `Ctrl+Shift+Z` elsewhere), and `formatShortcut` does the same for your own views. `parameterMenuItems` builds a parameter's reset, enter-value, copy and paste items.
  - `EnvelopeEditor` edits an ADSR envelope by its handles, drawn on a Plot, each stage bound to a parameter or held in state; `useEnvelopeEditor` is its interaction alone, from `@soundor/components/headless`.
  - `Plot` takes an `overlay` of views in its coordinates and a `safeZone`; `useXYPad` takes `keyGesture: 'axis'` and `resetOnDoubleClick`; `Button` takes an `accessibilityState`. Every control takes a `ref` to its focusable node, and `accessibilityActions` and `onAccessibilityAction` of yours after its own (`HostProps`). The theme gains a `shadow` colour and slots for `Select`, `Menu` and `EnvelopeEditor`.

- 5de5bb9: `SegmentedControl` infers its value type from a `parameter`, so `<SegmentedControl parameter={parameters.mode} />` no longer needs a type argument. Bound to a parameter, it takes its options, value and label from it and rejects `options`, `value`, `defaultValue` and `onChange`; use `parameter.subscribe` to observe changes. Without a parameter, `options` is now required.

## 0.1.0

### Minor Changes

- 36f7b95: Release Soundor’s styled controls, displays, and editor resize grip, with bundled Geist and Geist Mono fonts. The `headless` entry exports interaction hooks for custom controls without loading the theme or fonts, and the `chart` entry exports scales and drawing helpers for custom displays.
