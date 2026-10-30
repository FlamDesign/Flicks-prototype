---
name: images
description: Which image model for what, prompts for previews, thumbnails and canvas images, using the user's images as references, and checking results.
when: Before generating any image: storyline previews, style options, thumbnails or canvas images.
---

# Images

## Pick the right model
| Use | Model | Why |
|---|---|---|
| storyline previews, style and layout options, anything that barely affects the final Flick | fast | quick and cheap; it's for deciding |
| thumbnails, images placed on the canvas | quality | it ends up in the Flick |
| anything that must keep the user's product, character or style | image to image (pass reference_image_ids) | keeps their real product; you describe only what changes |
(The app picks the model from the purpose and the references you pass.)

## Using the user's images
- When their images match the prompt, use them as references. Product first, then a model or scene.
- Work out what each image is for (the product, the style, a character, a setting); confirm when unsure.
- Describe only the change: "this exact product, in gold, on a plain white background".

## Prompt recipes
- **Storyline preview:** "<scene from the concept>, <shot size and angle>, <light>, <style>,
  photographic, no text". One per concept.
- **Thumbnail:** "<the product in this variation>, centred, three-quarter view, on a plain <neutral
  or brand colour> background, soft studio light, sharp focus, square, no text". Same background,
  angle and light for every variation; only the product changes.
- **Canvas image (badge, background, extra product):** describe exactly what and where it sits;
  transparent or plain background; no text unless asked.

## Thumbnails
- One per variation, generated to match it. 1:1.
- Easy to tell apart at a glance: the difference shows at 60 pixels.
- The product centred, with the same pose and placement in every thumbnail.
- No text unless it's needed.

## Check every image
Look at it (view_image) before keeping it: the right product, sharp, centred, matching the set.
Remake once with a simpler prompt if it's off; then tell the user.
