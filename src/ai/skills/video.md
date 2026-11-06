---
name: video
description: Writing the reference and variation video prompts, the words to avoid and why, settings, and what to do when a video fails.
when: Right before writing the plan's video prompts, and before any regenerate.
---

# Video

## Model and settings
- Default 720p; choose by size and use (the app makes 720p today). Sound is always off: Flicks play muted.
- Always make **one video first (the reference), then its variations.** The app does this for you:
  variations wait for the finished reference, the user reviews and approves it, and then the
  variations are made from it (see the models skill). If the user wants changes, regenerate the
  reference; variations always use the latest approved version.

## The reference prompt
Brief the video the way a director briefs a camera team: what we see, what moves and how, the
camera, the place and light, and what must stay exact. Use a timeline ("0 to 2 s: … 2 to 5 s: …")
whenever it helps. Name every input by position: [Image 1], [Image 2]… (reference_image_ids in
order), [Video 1]… (reference_video_ids); in an edit, the user's video is "the video".
- Fill the plan's shot: subject (what appears and from which input), action (what happens and what
  moves), camera, setting and light, keep (what must stay exact).
- Use concrete physical words (what it's made of, how it moves, how fast), not praise: "stunning"
  gives the model nothing to show.
- The reference sets the motion every variation follows, so make it count.

## Variation prompts: what they must say, and what they never repeat
*Why this matters:* a variation is the reference video with one thing changed. The app makes each
variation from the finished reference video itself, plus your variation line (and tells the model
to keep everything else exactly the same). If your line re-describes the camera, light or action,
the model treats them as new instructions and the variations stop matching.
- **Must say:** only what changes, plus everything that changes with it, concretely, naming its
  images: "Replace the can with the lime green one from [Image 1], with lime slices floating around it."
- **Never repeat:** the camera, the light, the setting or the action. Never add a new action.
- **Keep the footprint:** the changed thing keeps the same shape, size and position.
- **Master video from the user:** vary only what they asked, based on their references.
- **A change that comes later in the video** (a tour with the same opening and a different room at
  the end, a reveal with the same lead-in): set the variation's keep_seconds to where the change
  starts (the storyboard's timeline tells you: "0 to 5 s drone and entry, 5 to 8 s the kitchen" means
  keep_seconds 5), and write the line as "From 5 s: … instead of the kitchen". The app pins the
  opening (timecodes, Variation 1's first frame as a reference), checks the finished video's opening
  against Variation 1's, and if it drifted marks the tile with Remake (the user's call; you say it in
  one line and never remake on your own). Without
  keep_seconds the model redraws the whole clip and the opening drifts.
  Prefer swaps that run through the whole video (one room per variation from the first frame, a
  colour, a product) when the brief allows: they match far more reliably than a shared opening.

## What video models get wrong
Mention the ones that apply, in plain words at the end of the prompt.
| Watch out for | Why |
|---|---|
| extra people, crowds, animals in the background | they appear differently in each variation |
| close-up fine hand work (tying, typing) | fingers distort |
| faces talking | mouths and faces morph |
| shaky, handheld camera | looks cheap and makes variations drift |

**Text, logos and real people** are fine when the idea needs them (the brand's own logo on the
product, a word on a sign, the brand's ambassador). Small or long text can come out garbled: keep it
big and short, or put it on the canvas instead. Real people only when the user has the right to
show them; never other brands' logos unless the user asks.

## Images and videos as inputs
- **Default (reference_mode "reference"):** the product, people and style come from
  reference_image_ids and reference_video_ids: the user's photos and videos, website images, the
  approved suggested look, and sheets. Name each in the prompt by its position.
- **The user gave a video to change (reference_mode "edit"):** source_video_id is that video; the
  prompt says what changes in "the video", and any images for the change are [Image 1]….
- **The user gave an image to bring to life as it is (reference_mode "animate"):** first_frame_id
  (and last_frame_id for a reveal). The video opens on it exactly; the prompt describes only the
  motion and camera from there. To change the image first, make an edited version with
  generate_image purpose "edit" and animate that.
- **Products or people that must stay the same:** make a sheet (make_sheet) and pass it as a
  reference, and in variations' image_ids.
- **Variations:** always edits of the approved reference. Give each variation image_ids when you
  have images of its change (each colour's product photo, or its sheet).

## Show the style first
Before videos are generated, the user sees the look: their own images, a concept preview, or a
suggested look (generate_image purpose "look") when they gave nothing. The video is made from what
they pick.

## When a video fails or looks wrong
Show what happened and suggest how to fix it; never regenerate silently.
| Problem | Suggest |
|---|---|
| failed or blocked | simplify the subject or wording; remove anything sensitive |
| swap hard to see | closer shot size, bigger product, fewer moving parts |
| variations don't match | shorten the variation line to just the change; simpler camera move |
| motion jerky or drifting | one clear camera move, and say how fast |
| video too static | something moving from the first frame, and a clear payoff moment |
| product looks wrong | describe its shape and materials more exactly; add a product photo as reference |
