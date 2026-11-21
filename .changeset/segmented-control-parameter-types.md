---
'@soundor/components': minor
---

`SegmentedControl` infers its value type from a `parameter`, so `<SegmentedControl parameter={parameters.mode} />` no longer needs a type argument. Bound to a parameter, it takes its options, value and label from it and rejects `options`, `value`, `defaultValue` and `onChange`; use `parameter.subscribe` to observe changes. Without a parameter, `options` is now required.
