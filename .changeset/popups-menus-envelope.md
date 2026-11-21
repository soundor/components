---
'@soundor/components': minor
---

Add `Select`, `Dropdown`, `ContextMenu` and `EnvelopeEditor`, on shared popup and menu infrastructure built on Soundor's `Portal` and `FocusScope`.

- `Select` chooses one value from a list: bound to a choice parameter, it takes the options, label and value from it and writes with history; without one it is controlled or uncontrolled, with a placeholder, disabled options and custom option rows.
- `Dropdown` opens a menu of actions from a trigger of your own, beside it even when opened in code before any press, or beside an `anchor` of yours; a popup follows its anchor if it moves. `ContextMenu` opens one for the control it is given, with no view of its own around it: on the secondary press or a long touch at the pointer, with Shift+F10 or the context menu key beside the focused control, and from a screen reader's "Show menu" action. Both share one item model: actions, separators, icons, displayed shortcuts and checked items. A shortcut is written once (`Mod+Shift+Z`) and shown the way the platform writes it (`⇧⌘Z` on macOS, `Ctrl+Shift+Z` elsewhere), and `formatShortcut` does the same for your own views. `parameterMenuItems` builds a parameter's reset, enter-value, copy and paste items.
- `EnvelopeEditor` edits an ADSR envelope by its handles, drawn on a Plot, each stage bound to a parameter or held in state; `useEnvelopeEditor` is its interaction alone, from `@soundor/components/headless`.
- `Plot` takes an `overlay` of views in its coordinates and a `safeZone`; `useXYPad` takes `keyGesture: 'axis'` and `resetOnDoubleClick`; `Button` takes an `accessibilityState`. Every control takes a `ref` to its focusable node, and `accessibilityActions` and `onAccessibilityAction` of yours after its own (`HostProps`). The theme gains a `shadow` colour and slots for `Select`, `Menu` and `EnvelopeEditor`.
