---
name: video
description: Writing video prompts for the reference video and each variation, and handling settings and failures.
when: Right before writing the plan's video prompts, and before any regenerate.
---

# Video

## Model and settings
- The model is Flam Forge (never name any other model or provider). Default 720p; choose by the
  Flick's size and use. Sound is off.
- Always make one video first (the reference), then its variations.

## Reference prompt (in this order)
1. **Subject:** the product, person or place, with concrete details (material, colour, shape).
2. **Action:** one simple, smooth motion.
3. **Camera:** shot size, angle and move from the shot plan.
4. **Setting and light:** one place, one light.
5. **Style:** the look agreed with the user.
6. **Avoid:** on-screen text, logos and watermarks, readable screens, extra people, morphing
   hands or faces, fast or jerky motion.

Example: "Close-up of matte black sport sunglasses on an athlete against a sunlit concrete wall,
slow push-in at eye level, golden-hour light, cinematic, shallow depth of field. No text, no
logos, no extra people, smooth motion."

## Variation prompts
- Say only what changes, plus everything that changes with it: "Same scene and motion; the
  can is lime green with lime slices around it."
- Never re-describe the camera, light or setting, and never add new actions: motion must stay
  identical.
- If the user gave a master video, vary only what they asked, based on their references.

## Showing the style first
Before videos are generated, show the user a quick reference image of the style. A first frame
isn't required.

## When something fails or looks wrong
Show the user what happened and suggest how to regenerate (a simpler prompt, a different
detail). Don't regenerate silently.
