---
name: concepts
description: Turning the brief into up to 3 concepts and storylines, choosing what changes and what changes with it, and the video types that work for Flicks.
when: After the brief, before the shot plan; again whenever the user wants new ideas.
---

# Concepts

## What a concept is
One line each:
- **Idea:** the hook in one sentence ("Three summer flavours, one ice-cold pour").
- **The question the tap answers:** "Which flavour is yours?", "Which colour suits you?",
  "Where would you go?". If a concept has no question worth tapping for, it's not a Flick concept.
- **The swap and the variations:** 2 to 5 options, each clearly different at thumbnail size.
- **The story in 2 or 3 beats:** what happens, start to end ("hand lifts the can, condensation
  close-up, can turns to camera").
- **The video type** (see the list below).

## Offering concepts (always, before the plan)
- Use **propose_concepts** before every plan, unless the user already gave a complete concept or
  asked to skip ideas. It shows each concept as a card with a preview image the app makes from your
  image_prompt, so the user sees the style before any video credits are spent.
- Suggest up to 3, clearly different from each other (not three versions of one idea).
- Write image_prompt as one frame of the concept: subject, setting, light, style; no text.
- **Previews use the user's images.** The app passes the user's own images (uploads, website and
  library images) as references by default, so each preview shows their real product or person.
  Set reference_image_ids to choose which ones (for example only the product photo, not the logo),
  and describe them in image_prompt as "the product from the photo".
- The user can pick one, or type a mix or a change. Then plan the picked concept.

## Choosing what changes
- **Anything that makes sense** can change: product, colour, flavour, size, person, outfit, pet,
  setting, time of day, season, weather, offer. Suggest what could change; confirm with the user.
- **Change everything that belongs together, and nothing else.** Example: an ice-cream video where
  the flavour changes also changes the packaging, the cream colour and the fruit floating around
  it. The hand, the camera and the table stay the same.
- **Odd requests:** if a swap would look absurd (a sports car swapping into a bicycle in the same
  motion), flag it in one line and suggest an option that works; then do what the user decides.
- **Visible enough:** the swap must be on screen at least 40 to 50% of the time and big enough to
  see at a glance. If a concept can't do that, change the concept.
- **Same footprint:** variations work best when the changing thing keeps the same shape and size
  (bottle to bottle, sneaker to sneaker, room to room). Different shapes make the motion drift.

## Video types that work for Flicks
| Type | What happens | Best swaps | Watch out |
|---|---|---|---|
| Product hero | the product alone, slow orbit or push-in, clean background | colour, flavour, finish, model | keep the product big and centred |
| In use | a hand or person uses the product, one simple action | product, colour | hands covering the product |
| Lifestyle moment | a person in a place enjoying the product | person, setting, outfit, time of day | faces and hands drifting between variations |
| Transformation | before and after in one shot (room makeover, glow up) | the "after" | keep the "before" identical |
| Place reveal | a slow reveal of a setting | destination, season, weather, décor | crowds and moving water |
| Ingredient story | ingredients arrange around the product | flavour, recipe | flying ingredients covering the pack |
| Collection | several products side by side, one highlighted | which product is highlighted | too many items, small products |
| Character | a mascot or person reacting | character, outfit | expressions changing between versions |

## Examples
- **Drinks, flavour swap:** "One sip, three moods." Variations: Lime, Mango, Berry. Beats: hand
  lifts the can into frame, condensation close-up, can turns to camera. Question: "Which flavour?"
- **Fashion, outfit swap:** "Same walk, your style." Variations: Denim, Linen, Leather. Beats: model
  walks toward camera, pauses, turns to a three-quarter pose. Question: "Which look is you?"
- **Travel, place swap:** "Where's your weekend?" Variations: Beach, Mountains, City. Beats: person
  opens a window, the view is revealed, slow push toward the view. Question: "Where would you go?"

For category-specific ideas, read the categories skill.
