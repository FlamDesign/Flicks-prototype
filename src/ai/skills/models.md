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
| Concept previews, suggested looks | propose_concepts, or generate_image purpose "look" | ad image model; draft quality for previews | about 1 to 3 cents | fast |
| Product or character sheets | make_sheet with the user's photos | ad image model, keeps the real product or person | about 3 cents | medium |
| A user's photo changed before animating it | generate_image purpose "edit", the photo in reference_image_ids | ad image model, precise editing model as backup | about 3 cents | medium |
| Thumbnails or canvas images | purpose "thumbnail" or "canvas" (with reference_image_ids when it shows their product) | ad image model | about 1 to 3 cents | fast |
| Images with readable words (a badge, an offer, a sign) | has_text: true | text-rendering model | 3 cents | medium |

Rules:
- Previews are cheap: offer them freely to show direction.
- Pass reference_image_ids whenever the image shows the user's product: it's the only way to keep it exact.
- Set has_text only when words must be readable in the image itself; on-screen text normally goes on
  the canvas instead (add_element), which is sharper and editable.

## Videos
Every video is 720p with no sound, as long as the Flick's length setting. The plan's reference_mode
picks how the reference video (Variation 1) is made:

| Video | reference_mode and inputs | How it's made | Use when |
|---|---|---|---|
| Reference | "reference" (default): reference_image_ids, reference_video_ids | reference to video: a new video true to the product, characters and style in the inputs | almost always: the user's photos or videos to follow, website images, an approved suggested look, sheets |
| Reference | "edit": source_video_id (+ reference_image_ids for the change) | video edit: changes the user's own video, keeping the rest; length and framing follow it | the user gave a video and asked to change it |
| Reference | "animate": first_frame_id (+ optional last_frame_id) | image to video: opens exactly on that image | the user gave an image to bring to life as it is (or one you edited for them with purpose "edit") |
| Variation | its prompt (the change) + image_ids | video edit of the approved reference video | every variation: same shot, camera, people and timing; only the change |

There is no prompt-only video. With nothing to work from, suggest looks first (concept previews or
purpose "look"), and make the video from the one the user picks.

Prompts name their inputs by position: [Image 1], [Image 2]… are reference_image_ids (or a
variation's image_ids) in order; [Video 1]… are reference_video_ids; in an edit, the user's video is
"the video". Write the reference as shot: subject (what appears, from which input), action, camera,
setting and light, keep (what must stay exact).

Example: subject "the bottle from [Image 1] on the bar from [Image 2]", action "a hand sets it down,
condensation runs", camera "slow push-in, eye level", setting "warm bar at night, soft backlight",
keep "the label and bottle shape exactly as in [Image 1]".

Costs: about 46 cents a second at 720p (an 8 s reference is about $3.70). Variations are edits of the
reference video, billed by its length, so they cost about the same.

Images for videos:
- **Sheets** keep a product or person the same in every video: make one when it must stay
  consistent, or when there's only one photo of it.
- **First frames** (animate only) must already be the Flick's shape (1:1, 9:16 or 16:9) and show the
  exact opening shot.
- **Image ids for a variation** should show only that variation's changed thing (the lime green
  can, the denim jacket), cleanly; one or two is enough, or its sheet.
- Never pass images that contradict the prompt.

What this means for you:
- **The reference is the master.** Every variation is an edit of it, so its prompt matters most.
- **Variation lines say only the change** ("replace the can with the lime green one from [Image 1]").
  The app adds "keep everything else exactly the same".
- **Regenerating the reference** means the variations should be made again too.
- **Timing:** a video takes a few minutes; variations start after the reference is approved, so a
  full Flick takes the reference's time plus one variation's time.
- **Cost talk:** each video also costs credits in the app (shown on the plan card). Mention money or
  credits only if the user asks or is short.
