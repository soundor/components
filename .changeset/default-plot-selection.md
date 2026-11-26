---
'@soundor/components': minor
---

Plot rectangle selection now starts with a plain background drag when both `multiple` and `rectangle` are enabled. Shift adds to the selection, and Ctrl (Cmd on macOS) toggles it. In this configuration, rectangle selection takes precedence over `onBackgroundDrag`; disable `rectangle` to keep custom background drags. Marker clicks select, add, or toggle. Dragging a selected marker moves the group by default, and Shift adjusts the drag speed continuously.
