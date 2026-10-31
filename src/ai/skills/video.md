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
Write 60 to 100 words, most important first (models follow the start of a prompt best).
1. **Subject:** what we see, concretely: material, colour, shape, size. "Matte black sport
   sunglasses with gold mirrored lenses", not "beautiful sunglasses".
2. **Action:** one simple, physical motion, with its result: "a hand lifts the can; condensation
   beads run down the side". No lists of actions.
3. **Camera:** shot size, angle and one move from the shot plan: "close-up at eye level, slow
   push-in, easing in and out".
4. **Setting and light:** one place and one light: "sunlit concrete wall at golden hour".
5. **Style:** "clean commercial look, shallow depth of field".
6. **Avoid:** see the avoid list.
- **Over 8 seconds or more than one shot?** Write a timeline: "0 to 4 s: ... Cut to 4 to 8 s: ...".
- **Use plain physical words,** not praise ("stunning", "epic"): they give the model nothing to show.

Example: "Close-up of matte black sport sunglasses with gold mirrored lenses on an athlete leaning
on a sunlit concrete wall. He turns his head slowly toward the camera. Eye level, slow push-in,
easing in and out. Golden-hour light, warm tones, shallow depth of field, clean commercial look.
No on-screen text, no logos, no extra people, smooth motion, no face or hand distortion."

## Variation prompts: what they must say, and what they never repeat
*Why this matters:* a variation is the reference video with one thing changed. The app makes each
variation from the finished reference video itself, plus your variation line (and tells the model
to keep everything else exactly the same). If your line re-describes the camera, light or action,
the model treats them as new instructions and the variations stop matching.
- **Must say:** only what changes, plus everything that changes with it, concretely:
  "Same scene and motion; the can is lime green with lime slices floating around it."
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

## Images and the reference video as inputs
- **The user gave the exact opening shot, or approved a look frame:** set first_frame_id
  (and last_frame_id for a reveal). The video opens on it exactly; the prompt then describes only
  the motion and camera from there.
- **The product or person must match photos:** set reference_image_ids, and name what they show in
  the prompt ("the bottle from the photos").
- **Variations:** give each variation image_ids when you have images of its change (each colour's
  product photo). Leave method as "edit" unless the change is too big for an edit (see the models skill).

## Show the style first
Before videos are generated, show the user a quick reference image of the style (fast image
model). A first frame isn't required.

## When a video fails or looks wrong
Show what happened and suggest how to fix it; never regenerate silently.
| Problem | Suggest |
|---|---|
| failed or blocked | simplify the subject or wording; remove anything sensitive |
| swap hard to see | closer shot size, bigger product, fewer moving parts |
| variations don't match | shorten the variation line to just the change; simpler camera move |
| motion jerky | one slower move, or static |
| product looks wrong | describe its shape and materials more exactly; add a product photo as reference |
