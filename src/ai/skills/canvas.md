---
name: canvas
description: Everything on the Flick's canvas and how to control it: elements and every property, positions and units, layers, the thumbnail strip, several elements at once, the start variation and version history.
when: Always once the Flick is built (it's then in your instructions in full).
---

# The canvas

The design is the same on every variation; only feed values (text and links set per variation) change.
The project state's `design` lists every element with a short id and all its properties, in the same
names you write with; `layer` 1 is the back. Hidden elements are listed with `hidden: true`.

## Positions and units
- x and y are % of the frame. y is the element's middle. x is its left edge, center or right edge
  by its `align` (images and shapes: their center).
- width is % of the frame width; height is % of the frame height.
- Text and button `size` is the font size in % of the frame width (heading about 8, body 3.4).
- Border, stroke, gap and highlight widths are px at 1080 wide.
- radius is % of the largest possible rounding (100 = pill or circle).
- rotation is degrees clockwise (text, images, shapes).

## Elements
- **Text** (add_element type text): text, style (heading, subheading, body, caption, label), x, y,
  align, width (a box the text wraps in), size, color, font, bold, italic, underline, rotation.
- **Button**: text, link, style (pill, rounded, sharp, arrow, light, lightSharp, outline,
  outlineSharp, glass, block, link, icon), background, color (text), font, size, bold, italic,
  underline, radius, border, border_width, width, height, a picture background (image_id) with fit.
- **Image** (image_id): x, y, width, height, fit (cover fills the box, contain fits inside it),
  crop (top, right, bottom, left, % cut), radius, lock (keep proportions), rotation.
- **Shape**: rect (radius), ellipse, triangle, polygon (points = sides), star (points), heart, play,
  line, arrow, and path (any shape: d is SVG path data in a 100×100 box). fill and stroke take a
  color or a gradient; stroke_width, opacity, width, height, lock, rotation; a picture fill
  (image_id) with fit.
- Every element: `layer` (front, back, forward, backward) and `hidden`.

## The thumbnail strip
One thumbnail per variation; viewers tap them to switch. Change it with edit_element on its id:
- `layout`: row, column or free. x and y are its top-left. size is a thumbnail's width (% of the
  frame width; thumbnails are square). gap, radius, highlight_color, highlight_width, background, and
  fade (how visible the other thumbnails are, 0.1 to 1).
- **Free layout**: `thumbnails` gives each thumbnail's top-left corner (% of the frame) in variation
  order. Use it when a thumbnail belongs somewhere in the frame: next to its product, one per person,
  on a shelf. `arrangement` (arc, corner_stack, diagonal, grid, scatter) is a ready pattern: use one
  only when the user asks for it or the layout calls for it; otherwise keep a row or column.
- Keep thumbnails at least 7% of the frame width so they're easy to tap, off faces and the product,
  and inside the frame (the app pulls them back in and says so).
- update_design's `thumbnails` sets quick presets (position, shape, size, highlight color).

## Several elements at once (arrange_elements)
move (dx, dy), align (left, center, right, top, middle, bottom; to the selection or the frame),
distribute (horizontal or vertical, 3 or more), front, back, duplicate (returns the new ids; then
edit each copy), delete. The strip can't be duplicated or deleted.

## Variations
- set_variation `start: true` makes the Flick open on that variation (`starts_on` in the state).
- Names, labels, prices, links and per-variation copy: set_variation and vary_field.

## Versions
The canvas saves versions as it changes. list_versions shows them; restore_version brings one back
(when the user asks to undo or go back; restoring is itself saved, so it can be undone);
save_version names the current one (before a big change, or when asked).

## Working well
- Look before and after (view_flick): fix overlaps, text over the product or faces, anything on the
  strip, crowding.
- Change only what's asked; keep everything else where it is.
- Prefer one arrange_elements call to many single moves.
