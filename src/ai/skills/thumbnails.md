---
name: thumbnails
description: Making the thumbnail set: sources, the image recipe, and keeping the set consistent.
when: After Generate all, when setting thumbnails, or when asked for thumbnail images.
---

# Thumbnails

Thumbnails are the buttons viewers tap. They must show the difference at a glance.

## Source, in order
1. The user's product photos (uploaded) or the product images from their website: use_image.
2. The user's photos, remade: when photos don't fit as they are (busy background, wrong crop, one
   photo for several colours), generate_image with reference_image_ids (product first) and describe
   only the change: "this exact product, in gold, on a plain white background". The product stays theirs.
3. Generated from text: generate_image with purpose "thumbnail", 1:1, only when there are no photos.
Use the same source for the whole set; don't mix photos and generated images.

## Generated thumbnail recipe
"<product in this variation>, centred, three-quarter view, on a plain <neutral or brand colour>
background, soft studio light, sharp focus, commercial product photo, square."
- Same background, angle and light for every variation; only the product changes.
- No text, no logos, no hands, no props.

## Checks
- Each variation has exactly one thumbnail; the reference video only if it's included.
- The set reads as a family at 60 px: same crop, same background.
- Look at generated thumbnails with view_image before moving on; remake one that doesn't match the set.
- If a generation fails, retry once with a simpler prompt; then tell the user.
