---
name: models
description: Which image and video models make each step, what they cost and how fast they are, and how your choices (purpose, references, text, the reference video) pick the model.
when: Before generating images or videos, and when the user asks about cost, speed or quality.
---

# Models

The app picks the model from what you ask for. Your choices decide it: the image's purpose, whether
you pass reference images, whether it needs readable text, and (for videos) whether it's the
reference or a variation. Never name models or providers to the user; the video model is
"Flam Forge" if asked.

## Images
| Step | You ask for | Model the app uses | Cost each | Speed |
|---|---|---|---|---|
| Concept previews, style and layout options | propose_concepts, or generate_image with purpose "idea" | photographic model, 720p (draft) | under half a cent | fast |
| Thumbnails or canvas images, no user photos | purpose "thumbnail" or "canvas" | photographic model, 1080p | about half a cent | fast |
| Anything that must keep the user's product, person or style | pass reference_image_ids | ad-product model (keeps the real product), with a precise editing model as backup | 1.4 to 7.5 cents | medium |
| Images with readable words (a badge, an offer, a sign) | has_text: true | text-rendering model | 3 cents | medium |

Rules:
- Previews are cheap: offer them freely to show direction.
- Pass reference_image_ids whenever the image shows the user's product: it's the only way to keep it exact.
- Set has_text only when words must be readable in the image itself; on-screen text normally goes on
  the canvas instead (add_element), which is sharper and editable.

## Videos
Every video is 720p with no sound. Pick the way it's made by what you give the plan:

| Video | What you give | How it's made | Use when |
|---|---|---|---|
| Reference | the prompt only | text to video | no images to work from |
| Reference | first_frame_id (and optionally last_frame_id) | image to video: opens exactly on that image (ends on the last one) | the user has the exact shot, or you made and they approved a look frame; a controlled reveal from one frame to another |
| Reference | reference_image_ids | reference to video: stays true to those images | the product, person or style must match photos, but there's no exact first frame |
| Variation | (default) method "edit", plus image_ids if you have images of its change | video edit: edits the approved reference video, changing only what you describe, matching the images | almost always: colour, flavour, product swaps of the same shape, outfits, time of day |
| Variation | method "regenerate", plus image_ids | reference to video, following the approved reference video | bigger changes the edit can't make cleanly: a different product shape, a new setting |

Costs: about 46 cents a second at 720p (an 8 s reference is about $3.70). Variations made from the
reference video are billed for the input video at a lower rate, so they cost about the same or less.

Images for videos:
- **First frames** must already be the Flick's shape (1:1, 9:16 or 16:9) and show the exact opening
  shot: make one with generate_image (quality, with the user's product as reference) and have the
  user approve it, or use the user's own shot.
- **Image ids for a variation** should show only that variation's changed thing (the lime green
  can, the denim jacket), cleanly; one or two is enough.
- Never pass images that contradict the prompt.

What this means for you:
- **The reference is the master.** Every variation copies it, so its prompt matters most: subject,
  one simple motion, one camera move, setting, light, style (see the video skill).
- **Variation lines say only the change** ("the can is lime green with lime slices floating
  around it"). The app adds "keep everything else exactly the same".
- **Regenerating the reference** means the variations should be made again too.
- **Timing:** a video takes a few minutes; variations start after the reference, so a full Flick
  takes the reference's time plus one variation's time.
- **Cost talk:** each video also costs credits in the app (shown on the plan card). Mention money or
  credits only if the user asks or is short.
