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
| Step | How it's made | Cost |
|---|---|---|
| Reference video | from your reference prompt (text to video), 720p, no sound | about 46 cents a second (an 8 s video is about $3.70) |
| Each variation | from the finished reference video plus your variation line (reference to video): it copies the reference's camera, motion and timing, changing only what you describe | the same rate or less |
| Several variations | start together once the user approves the finished reference; until then they show "Waiting for the reference video" | |

**The user always reviews the reference video first.** When it's ready, a bar asks them to approve it
("Make the variations") or change it. If they want changes, regenerate the reference with their
changes; they review the new one, and the variations are made from the latest approved version.

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
