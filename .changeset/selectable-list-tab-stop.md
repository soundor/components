---
'@soundor/components': patch
---

Make `SelectableList` a single Tab stop. Tab enters on the first enabled selected option (or the first enabled option) and returns to the last-focused option. Arrow keys, Home and End continue to move focus without changing selection. Custom lists can use the same behavior through `useSelection`. This requires `@soundor/react` 0.21.1 or later within the 0.21 series.
