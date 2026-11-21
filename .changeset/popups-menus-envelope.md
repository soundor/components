---
'@soundor/components': minor
---

Add `Select`, `Dropdown`, `ContextMenu` and `EnvelopeEditor`, on shared popup and menu infrastructure built on Soundor's `Portal` and `FocusScope`.

- `Select` chooses one value from a list: bound to a choice parameter, it takes the options, label and value from it and writes with history; without one it is controlled or uncontrolled, with a placeholder, disabled options and custom option rows.
- `Dropdown` opens a menu of actions from a trigger of your own, and `ContextMenu` opens one for what it wraps, on the secondary press at the pointer or with Shift+F10 beside the focused control. Both share one item model: actions, separators, icons, displayed shortcuts and checked items. A shortcut is written once (`Mod+Shift+Z`) and shown the way the platform writes it (`⇧⌘Z` on macOS, `Ctrl+Shift+Z` elsewhere), and `formatShortcut` does the same for your own views. `parameterMenuItems` builds a parameter's reset, enter-value, copy and paste items.
- `EnvelopeEditor` edits an ADSR envelope by its handles, drawn on a Plot, each stage bound to a parameter or held in state; `useEnvelopeEditor` is its interaction alone, from `@soundor/components/headless`.
- `Plot` takes an `overlay` of views in its coordinates and a `safeZone`; `useXYPad` takes `keyGesture: 'axis'`; `Button` takes an `accessibilityState`. The theme gains a `shadow` colour and slots for `Select`, `Menu` and `EnvelopeEditor`.
