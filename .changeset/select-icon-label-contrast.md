---
'@soundor/components': minor
---

Select icons now live on `option.icon` as a React node or a renderer that receives the label color and option state. Migrate `getOptionIcon` callbacks to per-option icons. Parameter-bound Selects can supply `{ value, icon }` entries through `options`. The selected option remains visually distinct while another row has focus.

Set `hideCheckmark` to hide the selected option's checkmark without changing its accessible state.
