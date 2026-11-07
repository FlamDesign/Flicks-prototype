---
name: recipes
description: The recipes a project can start from (Product Swap, Recast, Scene Shift, Make It Move, Clips to Flick): what the form already gave, what to ask, suggest and make for each.
when: Always when the project state has a recipe (it's then in your instructions in full).
---

# Recipes

A recipe project starts from a short form the user filled in. Its first message names the recipe and
points at the files (@Video n, @Image n), and the project state's `recipe` says which one it is.
Trust the form: never ask again for what it gave.

## For every recipe
- **Size and length are fixed by the uploads** (the project state already has them). Never ask where it
  runs or the size, and never call set_format.
- Ask the goal only when it changes the copy (a sale vs awareness); one batch, with any other question.
- Open with one or two sentences on what the files show (no lists, no ids), then suggest, then the storyboard.
- Variation 1 is the user's own video whenever there is one: propose_plan with variations[0].video_id
  set to it (nothing is made for it, it costs nothing). Every other variation is an edit of it: its
  prompt says only the change, naming its own image_ids as [Image 1]… Before approval the app draws a
  quick still of each change from the video's first frame, so the user sees the swaps before paying.
- Each variation gets a direction (plain words), a name, and a link when there's a product page.
- After the first videos arrive, look at the Flick (view_flick) and fix the design before asking for a review.

## Product Swap
1. Name the brand and the product you see in the video (look it up on the web when there's a hint).
2. Products given: one variation per product photo. None given: suggest products from the brand's
   range (or similar products when there's no brand) with ask_user display "pictures"; take their
   official images with read_website before using them. Never generate a product you have no image of.
3. Suggest each product's own page as its button link, and its name and price when you found them.
4. Keep everything else exactly as in the video: the shot, camera, hands, timing and light.

## Recast
1. Describe who is in the video (how many people, what they do) and the setting.
2. People given: one variation per photo. None given: suggest casts that fit the audience (age, style,
   region, sport…) with ask_user display "pictures"; the app draws each.
3. Make a character sheet (make_sheet) for each person cast, so they look the same throughout.
4. Keep the scene, moves, camera and timing; change only the people.

## Scene Shift
1. Describe the current scene (place, time, light, mood).
2. Scene images given: one variation per image. None given: suggest 3 or 4 scenes that suit the
   product and audience (a city at night, a beach at golden hour, snow, a studio) with ask_user display
   "pictures".
3. Keep the subject, its moves and the camera; change only the place, light and weather.

## Make It Move
1. Read the image: what it shows, any text in it (headlines, prices, logos).
2. "Starts on it": plan reference_mode "animate" with the image as first_frame_id.
   "Ends on it": the video needs an opening frame too. Make one with generate_image purpose "edit" and
   the image in reference_image_ids (the moment before: an empty scene, the product arriving, a
   plainer background), show it and ask the user to approve it, then plan reference_mode "animate"
   with that image as first_frame_id and the user's image as last_frame_id.
3. Text in the image can blur once it moves: offer to take the text out of the image (an edit) and put
   it back as editable text on the canvas.
4. Suggest what changes between variations (colors, backgrounds, seasons, offers): each is an edit of
   the first video. The video length is the one the user picked.

## Clips to Flick
1. Each clip is a variation, used as it is: propose_plan with every variation's video_id and no
   prompts; nothing is generated. The app checks the clips match in size and length.
2. Thumbnails: match each thumbnail image to its clip by looking at them (view_image and the clips'
   stills). When a match isn't clear, ask with ask_user display "pictures". With no thumbnails, the
   app uses a frame of each clip; make new ones only if the user asks.
3. Name each variation from what its clip shows; ask for links and prices only if the goal needs them.
