---
name: references
description: Reference sheets for products, people and places; which video model each input calls for (image to video, reference to video, video edit); naming every input in the prompt; writing Variation 1 and variation prompts; what the models get wrong.
when: Before making any sheet, image or video, and before any remake.
---

# References and prompts

Every video and image is made from references. The app picks the model from what you pass; your job
is to pass the right inputs and name each one in the prompt.

## Naming inputs
- Images: reference_image_ids in order are [Image 1], [Image 2]… in the prompt. Videos:
  reference_video_ids are [Video 1]…; in an edit the user's video is "the video".
- The user's @ mentions (@Image 1, @Video 2, @<saved element>) arrive with a [Mentions: …] line that
  maps each to ids: use exactly those ids, for image and video models alike.
- Never pass an image that contradicts the prompt. One or two images per changed thing is enough.

## Reference sheets (make_sheet)
A sheet shows a product, person or place in several views on a clean background, so it looks the
same in every video. You decide when one is needed; make it without asking when:
- a product or person must stay consistent across videos and there is only one photo, or the photos
  differ in light and angle;
- a person or character will be recast or appears in several shots;
- a place must read the same across variations.
Skip it when the user gave clean, matching photos, or the thing changes per variation anyway (each
variation's own product photo is passed as that variation's image). Pass sheets in
reference_image_ids and in variations' image_ids. Show the sheet only when getting it right matters
(a hero product, a face): one card, Use it or Redo.

## Which model (by the inputs you pass)
| Variation 1 from | reference_mode and inputs | Model |
|---|---|---|
| photos, a look, sheets, videos to follow | "reference": reference_image_ids, reference_video_ids | reference to video |
| the user's own video, changed | "edit": source_video_id (+ reference_image_ids for the change) | video edit |
| an image to bring to life as it is | "animate": first_frame_id (+ last_frame_id for a reveal) | image to video |
Every other variation: a video edit of the approved Variation 1 with its own image_ids. There is no
prompt-only video: with nothing to work from, suggest looks first (concept previews, or
generate_image purpose "look") and make the video from the one the user picks.
- Animate needs a first frame already in the Flick's shape showing the exact opening shot. To change
  the user's image first, generate_image purpose "edit" with it in reference_image_ids, then animate
  the result. "Ends on it" needs an opening frame made and approved first.

## Variation 1 prompt
Brief it like a director briefs a camera team, as shot: subject (what appears, from which input),
action (what happens and what moves), camera, setting and light, keep (what must stay exact). A
timeline ("0 to 2 s: … 2 to 5 s: …") whenever it helps. Concrete physical words (material, speed,
direction), never praise. When the user has product or people images, they must be in the inputs.

## Variation prompts
A variation is Variation 1 with one thing changed; the app makes it from the finished video plus your
line and tells the model to keep everything else. So the line says **only the change and what changes
with it**, naming its image ("Replace the can with the lime green one from [Image 1], lime slices
floating around it"), and never repeats the camera, light, setting or action. The changed thing keeps
its shape, size and position. A change that comes later in the video sets keep_seconds to where it
starts ("From 5 s: …"); swaps that run through the whole video match more reliably.

## Images
- Thumbnails: the product of this variation, centered, three-quarter, plain neutral or brand
  background, soft studio light, square, no text; the same background, angle and light for every
  variation; readable at 60 px. Pass the variation's product image as reference.
- Concept previews and looks: one frame, photographic, no text.
- Layout images (a badge, a cut-out): exactly what and where; transparent or plain background;
  has_text only when words must be readable in the image itself (text normally goes on the canvas).

## What the models get wrong (say the ones that apply, in plain words, at the end of the prompt)
Extra people, crowds and animals in the background (they differ per variation); close-up fine hand
work; faces talking; shaky camera. Small or long text comes out garbled: keep it big and short, or on
the canvas. Logos and real people are fine when the idea needs them and the user has the right.

## When a video looks wrong
Show what happened and suggest the fix; never remake on your own: failed or blocked → simpler
subject or wording; swap hard to see → closer shot, bigger product; variations don't match → a
shorter variation line; jerky motion → one clear camera move; too static → something moving from the
first frame; product wrong → describe shape and materials, add a product photo.
