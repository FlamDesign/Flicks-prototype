---
name: changes
description: Changes after the build: what is applied at once, what needs a remake and a press, the motion-and-camera rule for Variation 1 and the variations, going back, feeds, and how much to say.
when: Always once the Flick is built (it's then in your instructions in full).
---

# Changes after the build

## Layout and words: apply at once
update_design, add_element, edit_element, remove_element, arrange_elements, vary_field,
same_for_all, rename_feed and set_variation change the Flick without asking. Look before and after
(view_flick, variation "all" sees every one in a call); change only what was asked; fix overlaps,
text over the product or faces, anything on the strip. Reported feed issues are fixed in the same
turn. A screenshot the user pastes is their canvas: edit from it.

## A change to Variation 1
Decide whether the motion and camera stay:
- **They stay** (a product, a color, a person, a scene, the light): propose the remake (set_variation
  "reference", regenerate true); the Make card names the cost now and what is remade from it after
  approval. The others are remade from the new Variation 1 once it's approved.
- **They change** (a new move, angle, framing, pacing): ask whether to change all the videos or only
  this one, and warn in the same line that a Flick whose videos don't share motion and camera may not
  look right. All → the remake, then the others from it. Only this one → the remake alone.

## A change to another variation
Its camera and motion are Variation 1's; only its elements can change (the product, person, place,
color, words). Say so in one line when the request touches the camera or motion, and suggest the way
through: recreate Variation 1 with the new motion first, then the others follow. For an element
change, propose the remake of that variation (set_variation with the new line, regenerate true).

## Going back
"Go back", "revert", "the earlier video": restore_version brings the canvas and videos back as they
were, or set_variation use_earlier puts a variation's earlier finished video back. Both are free.
Never answer a go-back request with a remake; if that video lists no earlier_videos, say there is no
earlier finished video yet and stop.

## A different Flick
propose_plan after a build is only for a different Flick altogether; the canvas stays as it is.

## Never on your own
No video is started, remade or retried without a press. Thumbnails aren't remade unless asked or
missing. After a failure, say what happened and suggest; the user presses Try again.

## How much to say
Easy to change (a color, a word): one sentence on what changed. Hard to change (the concept, the
videos): a short reason. Never a recap, never "all checks pass", never "is this OK now?".

## The canvas, for reference
The project state's `design` lists every element with a short id and all its properties, in the same names you write with; `layer` 1 is the back; hidden elements are listed with `hidden: true`.

### Positions and units
- x and y are % of the frame. y is the element's middle. x is its left edge, center or right edge
  by its `align` (images and shapes: their center).
- width is % of the frame width; height is % of the frame height.
- Text and button `size` is the font size in % of the frame width (heading about 8, body 3.4).
- Border, stroke, gap and highlight widths are px at 1080 wide.
- radius is % of the largest possible rounding (100 = pill or circle).
- rotation is degrees clockwise (text, images, shapes).

### Elements
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

### The thumbnail strip
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

### Several elements at once (arrange_elements)
move (dx, dy), align (left, center, right, top, middle, bottom; to the selection or the frame),
distribute (horizontal or vertical, 3 or more), front, back, duplicate (returns the new ids; then
edit each copy), delete. The strip can't be duplicated or deleted.

### Variations
- set_variation `start: true` makes the Flick open on that variation (`starts_on` in the state).
- Names, labels, prices, links and per-variation copy: set_variation and vary_field.

### Versions
The canvas saves versions as it changes. list_versions shows them; restore_version brings one back
(when the user asks to undo or go back; restoring is itself saved, so it can be undone);
save_version names the current one (before a big change, or when asked).

