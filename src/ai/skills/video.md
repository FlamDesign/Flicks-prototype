---
name: video
description: Writing the reference and variation video prompts, the words to avoid and why, settings, and what to do when a video fails.
when: Right before writing the plan's video prompts, and before any regenerate.
---

# Video

## Model and settings
- The model is **Flam Forge**. Never name any other model or provider.
- Default 720p; choose by size and use (the app makes 720p today). Sound is always off: Flicks play muted.
- Always make **one video first (the reference), then its variations.** The app does this for you:
  variations wait for the finished reference, the user reviews and approves it, and then the
  variations are made from it (see the models skill). If the user wants changes, regenerate the
  reference; variations always use the latest approved version.

## The reference prompt
Write it as the plan's shot, 60 to 100 words in all, most important first (models follow the start
of a prompt best). Name every input by position: [Image 1], [Image 2]… (reference_image_ids in
order), [Video 1]… (reference_video_ids); in an edit, the user's video is "the video".
1. **subject:** what we see and where it comes from, concretely: material, colour, shape, size.
   "The matte black sport sunglasses from [Image 1], gold mirrored lenses, on the athlete from
   [Image 2]", not "beautiful sunglasses".
2. **action:** one simple, physical motion, with its result: "a hand lifts the can; condensation
   beads run down the side". No lists of actions.
3. **camera:** shot size, angle and one move from the shot plan: "close-up at eye level, slow
   push-in, easing in and out".
4. **setting:** one place and one light, plus style: "sunlit concrete wall at golden hour, clean
   commercial look, shallow depth of field".
5. **keep:** what must stay exact, and the avoid list: "the lenses and frame exactly as in
   [Image 1]; no on-screen text, no logos, no extra people, smooth motion".
- **Over 8 seconds or more than one shot?** Write a timeline: "0 to 4 s: ... Cut to 4 to 8 s: ...".
- **Use plain physical words,** not praise ("stunning", "epic"): they give the model nothing to show.

Example: subject "Close-up of the matte black sport sunglasses from [Image 1], gold mirrored
lenses, on an athlete leaning on a sunlit concrete wall"; action "he turns his head slowly toward
the camera"; camera "eye level, slow push-in, easing in and out"; setting "golden-hour light, warm
tones, shallow depth of field, clean commercial look"; keep "the frame and lenses exactly as in
[Image 1]; no on-screen text, no logos, no extra people, smooth motion, no face or hand distortion".

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

## The avoid list, and why each is on it
Video models get these wrong, and errors differ between variations, which breaks the Flick.
| Avoid | Why |
|---|---|
| on-screen text, logos, watermarks, price tags | they come out garbled; real text goes on the canvas |
| readable screens and interfaces | same: garbled |
| extra people, crowds, animals in the background | they appear differently in each variation |
| fast, jerky or spinning motion | variations drift apart; it looks cheap |
| more than one camera move in a shot | causes jitter and drift |
| hands doing fine work (tying, typing) | fingers distort |
| faces turning fast or talking | faces morph |
| several locations in one short clip | smeared transitions |
| real celebrities and other brands | legal and reputation risk |
End every prompt with the relevant part of the list, in plain words ("no on-screen text, no
logos, no extra people, smooth motion").

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
| motion jerky | one slower move, or static |
| product looks wrong | describe its shape and materials more exactly; add a product photo as reference |
