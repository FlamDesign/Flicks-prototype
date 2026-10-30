---
name: "flick-studio-no-blender"
description: "Concept-to-delivery Flicks production without Blender: detect the brief's category, suggest a shot plan from Flam's camera grammar, lock the swap, write the shot sheet, then make a Seedance 2.5 master from a look frame and synced variants."
when: "Before planning any Flick: detect the category, lock the swap, plan the shots; again before writing video prompts."
---

# Flick Studio (no Blender): concept → swap lock → director pass → spec → shot sheet → Higgsfield → Flick set

> This is the Blender-free copy of `flick-studio`. There is no 3D blockout and no clay video: the master start frame plus a written shot sheet carry the camera, framing, layout and cut timing that the blockout used to carry. Expect looser framing and cut timing than the Blender pipeline; the shot sheet, the start-frame check and the Phase 7 cut fix exist to compensate.

Use this skill for Ari's (Flam) Flicks work: a set of 3–4 interactive-ad variants that are replicas of each other in layout, camera, product placement and motion, character movement and shots. Usually there is no base video; we start from a concept.

Every Flick changes exactly one thing, written as **swap: product / character / environment**. The swap is chosen and locked at the concept stage. Every later phase follows that swap's playbook below. Use a mixed swap (e.g. character + outfit) only if Ari explicitly asks for it, and then still name one primary swap.

When writing concepts and prompts, follow the `flicks-prompting` skill's rules: identical motion, different look; difference visible from frame 1; silhouette compatibility; no baked-in text; overlay safe zones.

Camera language comes from Flam's **Shot Director** vocabulary (Flam's Camera_Angles_Movements_Ad_Making_Reference + Additional Stylistic Examples): 8 groups, 92 terms, listed with camera recipes in the **Shot Grammar** section at the end. Always use those exact term names in shot plans, specs and Seedance prompts, so Ari, the spec, the look frames and Seedance share one vocabulary.

## Commands Ari uses (any wording is fine)
| Ari says | Phase |
|---|---|
| "Flick concept for …, swap: product" / "give me concepts" | 1 Concept + swap + director pass |
| "Direct it" / "suggest shots" / pastes Shot Director text | 1b Director pass only (re-plan the shots of the current concept) |
| "Lock it" | 2 Spec |
| "Write shots" | 3 Shot sheet |
| "Look frames" | 4 Start frames |
| "Shoot master" | 5 Master video |
| "Make replicas" | 6 Variants |
| "Finish" | 7 Post + QA |
| "Run it end to end" | All phases, stopping only at the gates |

**Gates:** G1 concept + swap + shot plan lock, G2 master start frame + shot sheet approval, G3 master video approval. **Suggest first, then make:** never generate look frames or video until Ari has approved the shot plan at G1, even in "end to end" mode. Never spend video credits before G2. Never spend replica credits before G3, unless Ari says to run straight through. Once G1 is passed, the swap does not change. If Ari wants a different swap, that is a new concept, so go back to Phase 1. Shot-plan tweaks after G1 (e.g. "make S2 a low angle") are fine: update the spec and rewrite only the affected shot in the shot sheet (and remake its start frame if the change affects its first frame).

## Project folder (ask once for access to ~/Movies, then create)
`~/Movies/Flicks/<Brand>_<Concept>_<swap>/`: `00_spec/`, `01_refs/`, `02_frames/`, `03_master/`, `04_replicas/`, `05_final/`, `_uploads/`

## Phase 1: Concept + swap lock
1. **Detect the brief's category** (see Phase 1b step 1) before writing anything; it shapes the concepts, the swap suggestion and the shots.
2. If Ari hasn't named the swap, ask for it first: "swap: product / character / environment?" If he wants ideas, offer concepts for the swap that fits the brand's real choice (what the brand wants preference data on). The category table suggests the usual best swap.
3. Give 2–3 concepts for the locked swap. Each has: a one-line hook; the brand question the tap answers ("Which colourway?", "Who do you see yourself as?", "Which destination mood?"); 3–4 named variants, maximally distinct at thumbnail size; and sync risks.
4. Check the concept against the swap rules below. Reject or adjust ideas that break them.
5. Run the **Director pass (1b)** for the concept Ari picks (or for all, in one compact line each, if he hasn't picked yet).
6. At G1, Ari confirms: swap, concept, variants and the shot plan.

## Phase 1b: Director pass (auto-detect category → suggest shots → Ari approves)
Think like the director and DP. The output is a **suggestion**; nothing is built until Ari approves it.

1. **Detect the category.** Read the brand, product, brief and any refs. Match against the Category Playbooks table (Shot Grammar section). State the result as: `Category: <name> (<high/medium/low> confidence, signals: "...", "...")`. If two categories fit (e.g. a beer brand selling a travel moment), name the primary and borrow shots from the secondary, saying so. If confidence is low, still suggest a plan, and ask one question alongside it.
2. **Start from the category's default shot plan**, then adapt it in this order:
   - **Swap modifier** (Shot Grammar → Swap modifiers): e.g. character swap forces the face visible in every shot; product swap forces the product ≥25% of frame and unobstructed.
   - **Brand question and hook:** the hero beat that answers the tap question gets the strongest shot (usually the last or longest shot).
   - **Flicks constraints:** ≤3 shots, 10–13 s, 1:1 default, the swap element visible from frame 1, the right rail clear for the switcher, the lower third clear for the headline.
   - **Editing grammar** (below).
   - **Sync-risk budget:** at most one **M** term per shot and no **H** term unless Ari asks for it (then flag it clearly with the mitigation).
3. **Editing grammar rules** (apply to every plan):
   - Change shot size by at least 2 steps (EWS·WS·FS·MWS·MS·MCU·CU·ECU), or change the angle by ≥30°, between consecutive shots; otherwise it reads as a jump cut.
   - Keep the 180° line: the camera stays on one side of the subject's action/eyeline across all shots.
   - One camera move per shot. At most two different move types in the whole Flick.
   - Open on the swap element (Flicks rule) and end on a hero frame of it held ≥1.5 s, still or with a slow move, for the CTA and switcher.
   - Moves start and end with eases (ease-in-out) unless the shot is a tracking/rolling shot tied to a moving subject (then linear).
   - Speed limits for replica sync: camera translation ≤0.5 m/s (≤0.2 m/s within 1 m of the product), rotation ≤15°/s, lens changes only in a dolly zoom.
   - Durations: shots of 3–5 s; first shot ≥3 s.
4. **Present the plan** as a table, one row per shot, plus one alternative plan (bolder or safer) in a single line each:

| Shot | Time / frames | Size | Angle | Lens | Move | Focus | Style & Mood | Why (story job) | Camera setup | Sync risk |
|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 0–4 s / 0–95 | MCU | Eye-Level | Normal 50 mm | Slow Push 0.25 m | Shallow f/2.8, Focus Lock | Backlit, Warm Tone | open on the hand + bottle, swap visible | cam (0,−0.76,1.15) → product (d = 0.55×50/36), ease | L |

   Camera setup numbers come from the Shot Grammar recipes and the framing maths; they go into the spec and are turned into words in the shot sheet (Phase 3). Also note the lighting/look decisions that belong to the look frames.
5. **Shot Director paste:** if Ari pastes text from his Shot Director tool (comma-separated term names plus free description), map each term to its Shot Grammar entry, keep his choices, fill only the missing fields (size/angle/lens/move/focus) from the category default, and flag any H-risk terms with a safer swap-in.
6. At approval the plan becomes the `shots:` block of the spec (Phase 2).

## Swap playbooks (apply in every phase)

### Swap: product (colourway, flavour, model, finish)
- **Concept rules:** every variant has the same form factor and silhouette (bottle to bottle, sneaker to sneaker). Colour or finish swaps are safest. The product is the hero: centred, at least 25% of frame, unobstructed from frame 1 to the end, never covered by hands. Hands may hold it only at the edges.
- **Constant:** character (if any), set, light, and all motion, including the product's own motion (spin, tilt, pour).
- **Spec fields:** `product: {form, size_m, pivot_m, motion, finish_by_variant: {A: "exact colour/material", ...}, packshot_frames}`. Add product reference images per variant in `01_refs/`.
- **Motion source:** no rig. The product's motion (spin, tilt, pour) is written once in the master prompt and every replica inherits it through `video_edit`. State the real product's proportions in the look-frame prompt and attach the official packshot so the shape is right from frame 1.
- **Look frames:** make the master start frame with the variant A product ref. Make the other variants by editing the master frame: "Replace only the <product> colour/finish with <variant>, keep shape, logo position, lighting and everything else identical."
- **Replicas:** default to `video_edit` from the master: "Replace the <product exactly as named> with <variant colour, material, finish>. Keep everything else exactly the same: camera movement, framing, timing, the hand and its movement, the set and lighting." Use `regen` only if the variants differ in form.
- **QA region:** the swap mask is the product's bounding box per frame. Everything outside it must match the master.
- **Risks:** reflections or labels morphing; real logos and text on the product. Ask Ari for the official packshots and keep the label area as close to the reference as possible.

### Swap: character (person, influencer, mascot, outfit)
- **Concept rules:** similar height, build and hair volume across variants; the same pose, gestures and expression; the same props. No hands through hair, no flowing fabric, no free dancing. Choreograph a few clear, slow beats. Show the face from frame 1.
- **Constant:** set, product, camera, every gesture and its timing.
- **Spec fields:** `characters: {swap_id, look_by_variant: {A: {age, skin, hair, build, wardrobe}, ...}, constant_characters: [...]}`. Generate or collect one identity portrait per variant in `01_refs/` before the look frames, all with the same framing and light.
- **Motion source:** no rig. The master video is the only source of posing and gestures; every variant inherits them through `video_edit`. Keep variant identities close in height (within a few cm), build and hair volume so the edit can hold the same silhouette. Never re-prompt motion per variant.
- **Look frames:** make the master frame with identity A. Make the variants by editing the master frame: "Replace only the <character> with the person in image N (<look>); keep pose, framing, hands, props, set and light identical."
- **Replicas:** default to `video_edit` from the master: "Replace <character exactly as named> with <new person: age range, skin, hair, build, wardrobe>. Keep the same pose, gestures, facial expression and timing, camera, framing, props, set and lighting." Use `regen` (the approved master as @Video + that identity portrait) if the edit keeps the old face or the body proportions drift.
- **QA region:** the swap mask is the character silhouette. Also compare the head position and hand positions at the beat frames.
- **Risks:** identity bleed between variants; expressions drifting. Repeat "same facial expression and timing" in the prompt, and check the reaction beats closely.

### Swap: environment (setting, time of day, season, weather, décor)
- **Concept rules:** the same ground geometry and layout: a path stays a path, water stays water, a room stays a room. Change the time of day, season, weather, palette or décor, not the spatial layout. The character and product stay identical. Light direction may change only when lighting is the swap.
- **Constant:** character, product, every motion, camera, and the set's footprint and horizon line.
- **Spec fields:** `set: {footprint, horizon_y_frame, ground, key_landmarks_m: [...]}` and `env_by_variant: {A: {setting, time_of_day, weather, palette, key_light_dir, sky}, ...}`.
- **Layout source:** no shared set build. The master start frame fixes the footprint, landmarks and horizon; write them into the look-frame prompt from the spec's `set:` numbers. Variant look frames edit only dressing and light (sun angle and colour, practicals) on that same frame.
- **Look frames:** make the master frame for environment A. Make the variants by editing the master frame: "Change the environment to <variant> (time of day, weather, palette, lighting). Keep the character, product, pose, framing, layout and horizon identical. Describe how the new light falls on the subject."
- **Replicas:** default to `video_edit` from the master: "Change the environment to <setting, time of day, lighting, palette>. Keep <subject> and all their motion, the camera movement, framing, layout and timing unchanged." Use `regen` with the approved master as @Video and that variant's edited start frame if the edit warps the layout.
- **QA region:** the swap is the background, so invert the mask: the subject and product silhouettes must match the master, and the horizon must stay within ±2% of frame height.
- **Risks:** the layout or horizon shifting; the subject relit inconsistently; crowds or animals appearing. Add "no extra people or animals" to AVOID.
- **Style & Mood as the swap:** grade and light terms (Warm Tone / Cool Tone / Teal & Orange / High Key / Low Key / Neon Light / Backlit) make strong environment-swap variant sets; describe each as a lighting setup in that variant's look-frame edit and replica prompt.

## Phase 2: Spec (the single source of truth)
Write `00_spec/spec.yaml` and a readable `spec.md`. Everything downstream is derived from it.
```yaml
flick: <name>
brand: <brand>
category: beverage | food_qsr | beauty | fashion | footwear | tech | automotive | travel | finance_app | luxury | home | fmcg | sports | gaming_ent | family_kids
swap: product | character | environment     # locked at G1
master_mode: single | per_shot              # see Phase 3
brand_question: "Which ... ?"
format: {aspect: "1:1", res: 1080, fps: 24, frames: 241}   # 10.04s; 12s = 289
variants:
  - {id: A, master: true, label: "...", look: "exact colours/materials/wardrobe/environment"}
  - {id: B, label: "...", look: "...", method: video_edit | regen}
  - {id: C, label: "...", look: "...", method: video_edit | regen}
swap_element: "<the exact name used in every edit prompt>"
constants: [everything that must never change]
set: {backdrop: "...", floor: "...", footprint: "...", props: [{name, pos_m: [x,y,z], size_m: [w,d,h]}]}
characters: [...]        # swap: character fields
product: {...}           # swap: product fields
env_by_variant: {...}    # swap: environment fields
shots:
  - id: S1
    frames: [0, 95]
    grammar: {size: MCU, angle: Eye-Level, lens: Normal, move: Slow Push, focus: [Shallow Depth of Field, Focus Lock], style: [Backlit, Warm Tone]}
    subject: product            # what the framing maths is solved for
    frame_m: 0.55               # larger frame dimension at the subject, from the size table
    camera: {lens_mm: 50, pos_m: [0,-0.76,1.15], target_m: [0,0,1.15], roll_deg: 0, fstop: 2.8, focus: product,
             move: {type: dolly, delta_m: [0,0.25,0], ease: in_out}}
    beats: [{f: [0,40], action: "..."}, {f: [41,95], action: "..."}]
    sync_risk: L
    why: "open on the hand + bottle; swap visible from frame 1"
overlay_safe: {logo: top-left, headline: lower-third, cta: bottom-center, switcher: right-rail}
supers: none   # Flam platform adds overlays; set to burn_in only if asked
```
- `swap_element` is the single phrase used in every replica prompt, e.g. "the matte black bottle", "the woman in the white shirt", "the sunny beach environment".
- Decide each variant's `method` here, using the swap playbook's default.
- `grammar` uses the exact Shot Grammar term names; `camera` is computed from them with the recipes and framing maths, never guessed.

## Phase 3: Shot sheet (replaces the Blender blockout)
There is no blockout and no clay video. Seedance gets the camera, framing, layout, cuts and motion only from the master start frame plus the written prompt, so the shot sheet must carry everything the clay video used to.
- Write `00_spec/shots.md` from the approved `shots:` block: one prompt paragraph per shot with its time range and cut point, shot size, angle, lens, move (direction, distance, duration, ease), focus, Style & Mood and timed beats, all in the Shot Grammar "Prompt as" phrasing.
- Turn the camera numbers into words Seedance can follow, e.g. "camera at chest height, about 0.8 m from the bottle, 50 mm, slowly pushes in about 25 cm over 4 s, easing in and out". The numbers stay in the spec; the prompt carries the description.
- Describe the layout the way the clay frame used to show it: where the subject and swap element sit in frame (centre, left third), what touches the frame edges, the horizon height, and that the right rail and lower third are clear.
- Keep motion simpler than with a blockout, because text-only direction drifts more: prefer Static, Slow Push, Truck, Pedestal and Orbit ≤45°, treat every **M** term as one step riskier, and put cuts on whole seconds.
- **Handheld / Steadicam texture:** prompt-only. Handheld: "subtle natural handheld shake". Steadicam: "smooth steadicam glide with slight human drift". Gimbal: "perfectly smooth gimbal move, no shake".
- **Easing in words:** moves "ease in and out" by default; tracking, rolling, follow and chase shots tied to a subject at constant speed move "at a constant speed matching the subject"; cuts are "hard cuts".
- **Master mode** (record it in the spec):
  - `single` (default): one Seedance generation with the cuts written in the prompt. Cheapest; cuts may land a few frames off and are fixed in Phase 7.
  - `per_shot`: one Seedance generation per shot, each from its own start frame, joined in Phase 7 on the exact spec frames. Use when cut precision or shot-to-shot framing matters more than credits. Needs a start frame per shot in Phase 4. Check the model's minimum duration in its settings; if a shot is shorter, generate it longer and trim in Phase 7.
- No separate gate: Ari reviews the shot sheet together with the master start frame at G2.

## Phase 4: Look frames (Higgsfield image, Nano Banana 2.1, 1:1, 2K, 2 images)
- Master start frame inputs: the swap refs (product packshot, identity portrait, or environment look ref) and any look ref. There is no clay frame, so the prompt carries the layout: "Photoreal advertising still, first frame of shot S1: <size>, <angle>, <lens>, <where the subject and swap element sit in frame, horizon height, right rail and lower third clear>…" plus set, light and wardrobe from the spec, the shot's Style & Mood terms in their prompt phrasing, then "No text, no logos."
- Check the frame against the S1 plan before showing Ari (this replaces the blockout camera check): the subject's size in frame matches the shot size, the angle reads right, the swap element is visible and unobstructed (≥25% of frame for product swaps), and the right rail and lower third are clear. If it misses, adjust the prompt and regenerate once rather than generating many candidates.
- `per_shot` mode: make a start frame for every shot the same way, and check that consecutive shots keep the 180° line and change size or angle enough to read as a cut.
- Variant start frames are made by editing the master start frame, using the swap playbook's edit line. Do not generate them from scratch.
- Pick frames where the swap element is clear and unobstructed and faces are visible. False NSFW flags happen; credits are refunded, so just pick another output.
- Gate G2: master frame (every shot's frame in `per_shot` mode), the shot sheet, and a thumbnail strip of all variant frames (check the variants are distinct at a glance).

## Phase 5: Master video (Seedance 2.5, References mode)
- URL: `higgsfield.ai/ai/video?model=seedance_2_5`. Settings: duration = spec length, 1:1, 1080p, audio Off (≈160 credits per 10 s at 1080p).
- References: the master start frame (@Image) and the swap refs. There is no @Video reference for the master.
- Insert mentions: type `@`, wait 1 s, press Down × n, then Return. Read back the mapping from the contenteditable `innerText` before generating.
- Prompt order:
  1. "Shot 1 starts on @Image as first frame; keep set/wardrobe/light/framing."
  2. `single` mode: "<N> shots with hard cuts at …s." `per_shot` mode: one shot per generation, duration = that shot's length (or the model minimum), its own start frame as @Image, no cut line.
  3. The swap element described exactly as `swap_element` + variant A look.
  4. Timed beats per shot from the shot sheet, each opening with its grammar in prompt phrasing, e.g. "0–4 s: medium close-up at eye level, 50 mm, slow push-in, shallow depth of field, backlit warm light — …".
  5. "Smooth stabilised camera. Avoid on-screen text, logos, watermarks, readable phone UI, extra people, camera shake, face morphing, wardrobe changes", plus the swap-specific risks. (Drop "camera shake" from AVOID only for an approved Handheld shot.)
- Download (see Mechanics), check the cuts against the spec, and make a contact sheet. In `per_shot` mode assemble the shots first (Phase 7 cut fix). Gate G3.

## Phase 6: Replicas
- **video_edit variants:** use Seedance 2.5 mode `video_edit` with the approved master as the only video. Always edit from the master, never from another replica. Use the swap playbook's replica prompt, naming the target exactly as `swap_element`.
- **regen variants:** use Phase 5 with that variant's edited start frame plus the approved master as @Video ("Follow @Video exactly for camera position, lens, framing, cuts, cut timing and blocking"), and the identical prompt except for the swap words. The approved master stands in for the clay video.
- If a replica drifts, re-run it from the master with the drifted item added to the keep-list. If it drifts twice, flag that the master is the problem (swap element too small, occluded or moving fast) and propose a simpler master, swapping the shot's highest-risk grammar term for its safe alternative from the Shot Grammar.

## Phase 7: Post + QA (cloud sandbox: ffmpeg, Python, cv2)
- Normalise every output: `fps=24, scale=1080:1080:flags=lanczos, setsar=1, tpad clone`, exactly the spec's frames.
- Cut fix: run scene detection (`select='gt(scene,0.2)'`) and compare with the spec. Seedance often lands a cut off the spec frame (±1 frame with a clay reference; expect more from text alone). In `per_shot` mode, trim each shot to its spec frame range and concatenate here. Rebuild each shot from its own range and clone-pad the start or end by 1 frame so every cut sits exactly on the spec frame with no stray frames.
- Supers: none by default. If burn-in is requested, build an RGBA overlay (white text via luminance over an inpainted background, logo via a filled colour mask, ROI clear of people), fade it in over 8 frames, and keep it inside `overlay_safe`.
- Grade-only Style & Mood terms (Desaturated, Warm/Cool Tone, Teal & Orange, Black & White) may be finished here with an ffmpeg curves/colorbalance pass when Seedance under-delivers them, applied identically to all variants (unless the grade is the swap).
- Encode H.264, CRF 14, slow preset, yuv420p, faststart.
- QA, all saved to `05_final/QA_*`:
  1. A cut table for every variant against the spec.
  2. A frame-1 thumbnail strip of all variants (must read as different at switcher size).
  3. An overlay test using the swap's QA region: a 50% onion-skin of master vs each variant at start, middle and end, plus the mean abs diff in the region that must stay constant; flag anything above about 6%.
  4. Contact sheets of the boundary frames.
- Deliver to `05_final/` and SendUserFile. Report credits used.

## Mechanics and gotchas (learned)
- **Uploads:** use Claude in Chrome. The built-in browser can't upload, and Higgsfield's CSP blocks localhost or bridge tricks. First `device_stage_files` the files, then `file_upload` using their `/mnt/user-data/uploads/...` paths. The prompt-box file input takes only one image; for several files open the `+` media library and use its multiple-file input, then click items to attach them.
- **Duration slider:** focus the dialog's `[role=slider]` via JS, then press Right/Left (1 s per step).
- **Downloads:** the cloud sandbox can't reach cloudfront. The original pipeline downloaded through Blender; without it, download on Ari's computer with a device shell (`curl -L -o <path> <url>`) if one is available, otherwise open the URL in Claude in Chrome and save it. This route is not yet tested here: confirm the first download plays and has the right frame count. Find the URLs with the Higgsfield connector `show_generations` (type video/image); the newest result comes first. Image URLs come from the page's `<img>` src with `_min.webp` swapped for `.png`.
- **Waiting on generations:** images take about 30–60 s; a 10 s Seedance video at 1080p takes about 3–6 min.
- **Seedance output:** 1440², 24 fps, frame count equal to the duration. Without a clay video, cuts and framing follow the prompt only loosely; the Phase 7 cut fix corrects timing.
- **Clean-up:** close the Chrome tabs you opened, and reset any viewport emulation.
- **Formats:** default 1:1 1080. Other library sizes are 1080x1920, 1920x1080, 1080x1350, 1024x768; set the look-frame aspect and Seedance aspect to match.

---

# Shot Grammar (Flam Shot Director vocabulary → camera recipe → Flicks risk)

**Risk** = how hard the term makes it to keep 3–4 replicas frame-synced: **L** safe default · **M** usable with care (one per shot) · **H** avoid unless Ari asks; flag it and give the mitigation. **Prompt as** = the phrase to use in Seedance/Nano Banana prompts.

## Framing maths
- `frame_m` = the larger frame dimension measured at the subject's distance. Camera distance `d = frame_m × lens_mm / 36` (36 mm full-frame sensor).
- Aim point: for people, put the eyes on the upper third (target ≈ eye height minus frame_m/6). For products, centre the product (or put it on the left-centre third if a person shares the frame), keeping the right rail clear.
- 9:16: frame_m is the frame height. 16:9: frame_m is the width (the height is 0.56 × frame_m).

## 1 · Shot Size (person ≈1.75 m; for products use the product rule)
| Term | Purpose (Flam) | frame_m (person) | Product rule | Typical lens | Risk |
|---|---|---|---|---|---|
| Extreme Wide Shot (EWS) | Scale and location | ≥15 m; subject <10% of frame | product is a speck: not a swap shot | 18–28 | M (swap element too small; env swap only) |
| Wide Shot (WS) | Context and setting | 4–6 m; subject ⅓–½ of frame height | product ≥25% only if large (car, appliance) | 24–35 | L env · M product/character |
| Full Shot (FS) | Full-body action and styling | 2.0–2.2 m (head to toe + 5–8% headroom) | — | 35–50 | L |
| Medium Wide Shot (MWS) | Body language with some environment | 1.3–1.4 m (knees up) | — | 35–50 | L |
| Medium Shot (MS) | Conversation and product interaction | 0.9–1.0 m (waist up) | product held at chest reads ~15–20% → push to MCU for product swaps | 35–50 | L |
| Medium Close-Up (MCU) | Emotion and expression | 0.55–0.65 m (chest up) | frame_m = product_h / 0.45 | 50–85 | L |
| Close-Up (CU) | Attention and product detail | 0.30–0.35 m (face fills) | frame_m = product_h / 0.75 | 85–100 | L |
| Extreme Close-Up (ECU) | Texture and sensory impact | 0.08–0.12 m (eyes / detail) | frame_m = detail size / 0.8 (label, bubble, droplet) | 100 macro | M (texture detail morphs between variants) |

## 2 · Camera Angle (height, pitch, yaw relative to the subject)
| Term | Purpose | Camera recipe | Prompt as | Risk |
|---|---|---|---|---|
| Eye-Level Shot | Natural, neutral, relatable | cam z = subject eye height (standing 1.6, seated 1.2) or product centre; pitch ≈0° | eye-level shot | L |
| Low-Angle Shot | Powerful, dominant, impressive | cam z = 0.3–0.6 m (≈⅓ subject height); pitch up 10–25° | low-angle shot looking up | L |
| High-Angle Shot | Smaller, or a broader view | cam z = subject top + 0.8–1.5 m; pitch down 25–40° | high-angle shot looking down | L |
| Bird's-Eye View | Graphic, clean, visually striking | cam straight above, pitch −90°; say which way is image-up in the prompt | top-down bird's-eye view | L (great for flat-lay product swaps) |
| Worm's-Eye View | Dramatic scale and power | cam z = 0.05–0.15 m; pitch up 30–60°; 14–24 mm | worm's-eye view from ground level | M (strong distortion; faces morph) |
| Dutch / Canted Angle | Tension, instability, energy | frame rolled 10–20°; never animate roll | dutch angle, canted frame | L if static roll |
| Over-the-Shoulder (OTS) | Intimacy and presence | cam 0.3–0.5 m behind foreground shoulder, 0.25 m lateral, 0.1 m above; the foreground shoulder fills ¼–⅓ of a frame edge (not the right rail) | over-the-shoulder shot | M (character swap: the swapped face must be the one facing camera) |
| POV / Point of View | Immersive and direct | cam at eye height 1.6 (seated 1.2), 24–28 mm, pitch −10 to −30°; hands in the lower third | first-person POV | M (hands morph; keep hand motion slow) |
| Profile / Side Angle | Clean silhouette, sense of movement | yaw 90° to the subject's facing direction | side profile shot | L product · M character (half face) |
| Three-Quarter Angle | Front and side, dimensional | yaw 30–45° off the subject's front axis | three-quarter angle | L (the default hero angle) |

## 3 · Camera Movement
| Term | Purpose | Camera recipe | Prompt as | Risk |
|---|---|---|---|---|
| Static / Locked-Off | Clean, controlled, premium | no camera movement | static locked-off camera | L (safest) |
| Pan | Reframe or reveal horizontally | cam fixed; yaw ≤30° over ≥3 s, ease-in-out | slow pan left/right | L–M |
| Tilt | Vertical reveal | cam fixed; pitch ≤25° over ≥3 s | slow tilt up/down | L–M |
| Push-In / Dolly-In | Builds attention or intensity | move along the view axis 0.3–1.0 m; ease-in-out; ≤0.2 m/s near the product | dolly in toward … | L |
| Pull-Out / Dolly-Out | Reveals environment or distance | reverse of push-in; 0.5–2 m | dolly out to reveal … | L–M (newly revealed edges vary in env swaps) |
| Tracking Shot | Motion and energy | cam translates parallel to the subject's path at the same speed, constant speed with no ease; 35 mm | camera tracks alongside … | M |
| Follow Shot | Places viewer in the movement | cam 2–3 m behind subject, 0.2–0.4 m higher, same velocity, constant speed | camera follows behind … | M (character swap: no face → avoid) |
| Orbit / Arc Shot | Premium product presentation | circle the subject at a fixed distance, 30–90° (180° = H); ease-in-out | slow orbit around … | L product (≤90°) · M env |
| Truck Left / Truck Right | Lateral movement and parallax | translate sideways 0.3–1.0 m, rotation fixed | camera trucks left/right | L |
| Pedestal Up / Down | Vertical reveal, same framing | translate z 0.3–1.0 m, rotation fixed | camera pedestals up/down | L |
| Crane Shot | Large-scale reveal | rise 2–6 m and pull back while staying aimed at the subject | crane up to reveal … | M |
| Jib Shot | Controlled vertical or sweeping reveal | smaller crane: +1–2 m rise with 0.5–1 m forward arc | jib up over … | M |
| Dolly Zoom / Vertigo Effect | Psychological or dramatic distortion | camera moves back while the lens zooms in so the subject size stays fixed (e.g. 1.0→2.9 m with 24→70 mm) | dolly zoom, vertigo effect, background stretches | H (background warps differently per replica) |
| Whip Pan | Energy and transition | yaw 60–90° in 4–6 frames, with motion blur; use as the cut | whip pan transition | H (blur breaks sync; use only as a cut between shots) |
| Handheld | Organic, documentary feel | small random drift and shake (prompt only; see Phase 3) | handheld camera, subtle natural shake | H |
| Steadicam | Smooth but human movement | smooth path with slight human drift | smooth steadicam glide | M |
| Gimbal Shot | Very smooth controlled movement | smooth path, no shake | smooth gimbal move | L–M |
| Snorricam | Intense and immersive | camera fixed to the actor's chest, 0.5 m in front, aimed at the face; the world moves | snorricam, camera rigged to the actor | H |

## 4 · Special Moves
| Term | Purpose | Camera recipe | Prompt as | Risk |
|---|---|---|---|---|
| Reveal Shot | Builds anticipation | start behind a foreground object, truck/push until the subject is clear | reveal from behind … | H product/character (swap not visible from frame 1); M env. Mitigation: occluder covers only ≤⅓ of frame and never the swap element |
| Parallax Shot | Adds depth | truck past a foreground object at 0.3–0.6 m from cam with a far background | parallax move past … | L–M |
| Foreground Wipe | Hides cuts, creates transitions | a foreground object crosses the full frame; cut at max coverage | foreground wipe transition | H (only as a cut device) |
| Push Through | Immersive product entry | cam passes through a gap in foreground objects (shelves, leaves) toward the product | push through … to the product | H (product hidden at start). Mitigation: product visible through the gap from frame 1 |
| Crash Zoom | Urgency, comedy, punch | lens 24→100 mm over 4–6 frames, ease-in | crash zoom onto … | H |
| Snap Zoom | Punchy emphasis | lens 35→70 mm over 3–4 frames | snap zoom onto … | M–H |
| Slow Push | Premium or emotional feel | dolly 0.1–0.3 m over the whole shot, ease-in-out | slow push-in | L (the Flicks default) |

## 5 · Lens & Perspective (full-frame equivalent, sensor 36 mm)
| Term | Range | Spec value | Use | Risk |
|---|---|---|---|---|
| Wide-Angle Lens | 14–35 mm | 24–28 | environment, auto, architecture, POV | L (keep faces ≥1.5 m away) |
| Ultra-Wide Lens | 12–20 mm | 14–18 | dramatic terrain, interiors | M (edge stretch morphs) |
| Fisheye Lens | — | spec 12–14 mm and say "fisheye lens" in the prompt | sports, POV, youth | H |
| Normal Lens | 40–50 mm | 50 | general product and lifestyle | L |
| Telephoto Lens | 70 mm+ | 85 | compresses background, isolates subject | L |
| Long Lens | 100–200 mm+ | 135–200; cam far back | strong compression, auto/fashion | L–M (needs a long set) |
| Macro | — | 100 mm, focus 0.15–0.3 m, f/2.8–4 | bubbles, droplets, texture, makeup, car details | M |

## 6 · Focus Technique
| Term | Purpose | Camera recipe | Risk |
|---|---|---|---|
| Rack Focus / Pull Focus | Directs attention | focus moves from subject A to B over 12–18 frames; f/1.8–2.8 | M (Seedance may shift the timing ±few frames; QA it) |
| Shallow Depth of Field | Separates subject from environment | f/1.4–2.8 on the subject | L (helps env swaps: less background to keep identical) |
| Deep Focus | Shows relationships across the frame | DoF off or f/11–16 | M for env swaps (more background must match) |
| Focus Lock | Keeps subject clear during movement | focus stays locked on the subject | L (default for any moving shot) |

## 7 · Automotive Terms (use when the product is a vehicle; the vehicle is a product swap)
Vehicle sizes (for the framing maths): pickup 5.9×2.0×1.9 m, SUV 4.8×1.9×1.75, sedan 4.8×1.85×1.45, hatch 4.1×1.8×1.5; wheel radius ≈0.38 m. Cameras that ride with the car stay fixed relative to it.
| Term | Purpose | Camera recipe | Risk |
|---|---|---|---|
| Rolling Shot | Dynamic driving presentation | cam 3–5 m lateral, z 0.8–1.2, same velocity, constant speed; 35 mm | M |
| Low Tracking Shot | Speed, size, road presence | as rolling, z 0.2–0.4, front three-quarter, 24 mm | M |
| Wheel-Level Shot | Mechanical detail and motion | cam z = wheel centre (≈0.4), 1–1.5 m off, 35–50 mm, rides with the car | M (spinning rims morph) |
| Front Three-Quarter Hero Shot | Classic product presentation | yaw 30–40° off the front, z 0.6–1.0, 35–50 mm, frame_m ≈ car length × 1.3; optional 15° slow orbit | L (the vehicle colourway hero) |
| Rear Three-Quarter Shot | Rear design and body lines | as front 3/4 from the rear | L |
| Chase Shot | Forward motion and road context | cam 6–10 m behind, z 1.5–2.5, same velocity | M |
| Lead Shot | Vehicle approaching through the scene | cam ahead, moving away slightly slower than the car (gap closes 10–20%) | M |
| Pass-By Shot | Speed and impact | static cam 1–2 m off the road edge; car passes in 12–20 frames; pan to follow | H (fast motion + blur) |
| Drone Tracking Shot | Large-scale movement and geography | cam z 20–60 m, pitch −30 to −60°, follows the car | M (env swap friendly) |
| Top-Down Driving Shot | Graphic route patterns | pitch −90°, z 30–80 m, over a curving road | L–M |
| Road-Level Shot | Speed, tire action, scale | cam z 0.05–0.1, car passes close | H |
| Interior POV | Immersive cabin experience | cam at driver eye (z ≈1.2, 0.5 m behind the wheel), 18–24 mm | M |
| Driver Profile Shot | Human connection, interior design | from the passenger side or outside the window, 50–85 mm, eye height | M (character swap: half face) |
| Through-Windshield Shot | Cabin and driving experience | cam ahead of the hood looking back at the driver, 35–50 mm, rides with the car | M |
| Mirror Shot | Layers and visual interest | cam near the side mirror, rides with the car | M (reflection content must also swap) |

## 8 · Style & Mood (look layer: look-frame and master prompts; never changes the camera)
"Light" = the lighting setup to describe in the look-frame and master prompts; "Prompt" = say the term itself in the look frame + master prompt. Best-swap notes say where the term is strongest.
| Term | Effect | Build | Risk / best use |
|---|---|---|---|
| Backlit | Silhouette edge and glow | Light: key behind subject 150–180° from cam + soft front fill | L · beverage, beauty, sports |
| Low Key Lighting | Dark, high-contrast, moody | Light: very dark ambient, one key, no fill | M (faces lose detail: weak for character swap) · tech, luxury, gaming |
| High Key Lighting | Bright, clean, airy | Light: bright ambient + large soft key + fill | L · beauty, family, FMCG |
| Silhouette | Dark shape vs bright background | Light: brightly lit backdrop, no front light | H for product/character swaps (swap unreadable) · env swap only |
| Lens Flare | Cinematic, dreamy light artifacts | Prompt only | M (flares vary per replica) |
| Chiaroscuro | Strong light-shadow drama | Light: one hard key at 60–90° | M · luxury, spirits |
| Desaturated | Muted, serious, realistic | Prompt + post grade | L (not with colourway swaps) |
| Warm Tone | Cozy, emotional | Prompt + light colour ~3200 K | L · env-swap variant axis |
| Cool Tone | Sleek, modern | Prompt + light colour ~6500 K+ | L · env-swap variant axis |
| Teal & Orange | Cinematic colour contrast | Prompt + post grade | L–M (shifts product colours: check colourway swaps) |
| Black & White | Emotion, contrast, composition | Post grade | H for colourway/product swaps (removes the swap) |
| Split Lighting | Half face lit, half shadow | Light: key at 90° side | M (character swap: half the identity hidden) |
| Dutch Angle | Tilted frame for unease/energy | Same as Camera Angle → Dutch / Canted Angle (one term, listed twice in Shot Director) | L if static |
| Frame Within a Frame | Natural frames add depth | Light: doorway/window/arch in the foreground framing the subject | L–M |
| Reflections | Layered, artistic | Light: glossy floor or glass surface | M (the reflected swap element must swap too) |
| Motion Blur | Speed, energy | Prompt, only with fast moves | M |
| Long Exposure | Light trails over time | Prompt only ("light trails"); not physical in video | H |
| Bokeh | Dreamy out-of-focus highlights | Light: f/1.4–2.0 + small light points behind the subject | L · beverage, beauty, night |
| Aerial View | Scale and epic storytelling | See Drone Tracking / Bird's-Eye | L–M · travel, auto |
| Underwater | Surreal, cinematic | Prompt + blue underwater haze | H (caustics drift) |
| Rain Effect | Atmosphere, drama | Prompt only | H for product/character swaps; L as an env-swap variant (dry vs rain) |
| Smoke / Fog | Mood, depth, mystery | Prompt (light haze) | M–H |
| Neon Light | Stylised, modern practicals | Light: coloured neon practicals | M · gaming, nightlife, env-swap variant |
| Minimalist | Clean, bold composition | Light: seamless backdrop, single subject, nothing else | L · product swaps, tech, beauty, FMCG |

## Swap modifiers (applied on top of the category default)
- **Product swap:** product ≥25% of frame and unobstructed in every shot; prefer Static, Slow Push, Pedestal, Truck, Orbit ≤90°; sizes MCU/CU/hero; Focus Lock on the product; avoid Reveal, Push Through, Silhouette, Black & White; ECU only on a part that carries the swap (colour/finish).
- **Character swap:** face visible and ≥8% of frame height in every shot; prefer MS/MCU/CU at Eye-Level or Three-Quarter; Static or Slow Push; avoid Follow (back of head), Profile-only shots, Split Lighting, Low Key, Worm's-Eye, Snorricam; OTS only over the constant character's shoulder.
- **Environment swap:** environment ≥50% of frame; prefer WS/MWS/FS with the subject on a third; Static, Slow Push, Truck, Pedestal, Drone; Shallow DoF reduces what must match, Deep Focus shows the swap best: pick per brief; keep the horizon line fixed; avoid Dolly Zoom, Whip Pan, Handheld.

## Category Playbooks (auto-detect → default plan)
Match on brand, product and brief words. Each default is ≤3 shots for 10–13 s; adapt with the swap modifier, then the editing grammar.

| Category | Signals | Usual best swap | Default shot plan (S1 → S2 → S3) | Lens / focus | Style & Mood | Avoid |
|---|---|---|---|---|---|---|
| Beverage (beer, soda, energy, coffee, spirits, juice, water) | bottle, can, glass, pour, sip, chilled | product (flavour/colourway) or environment (occasion) | MCU Eye-Level hand + bottle, Slow Push → ECU Macro condensation, Rack Focus label→bubbles → CU Three-Quarter low-ish hero, Orbit 45°, Focus Lock | 50 / 100 macro / 85; f/2.8 | Backlit, Bokeh, Warm or Cool Tone | pours across the label, hand covering the label |
| Food & QSR | burger, pizza, meal, menu, delivery, bite | product (menu item) or environment | Bird's-Eye spread, Static or 20° rotate → CU Slow Push with steam → MS Eye-Level reaction (constant person) | 35 / 85 / 50 | Warm Tone, High Key, Bokeh | bite shots in product swaps (mouth covers food) |
| Beauty & Skincare | serum, lipstick, foundation, glow, skin, fragrance | character (shade match) or product (shade) | MCU Eye-Level face, Slow Push → ECU Macro texture/swatch → CU Minimalist product on plinth, Pedestal Up | 85 / 100 / 85; f/2 | High Key, Backlit, Bokeh | hands across the face, Split Lighting for character swaps |
| Fashion & Apparel | outfit, collection, wear, style, drop | character (look) or product (colourway) | FS Eye-Level/Low pose, Slow Push or Orbit 30° → MWS Three-Quarter, Truck → MCU detail of the garment | 50 / 50 / 85 | High Key or Neon (night), Frame Within a Frame | twirls, flowing fabric |
| Footwear | sneaker, shoe, boot, run | product (colourway) | CU Low-Angle ground-level shoe on surface, Slow Push → ECU Macro sole/material → FS Low-Angle step, Truck (slow) | 50 / 100 / 35 | Backlit, Minimalist | fast running, feet crossing |
| Tech & Gadgets | phone, laptop, earbuds, watch-tech, launch | product (finish) | CU Three-Quarter hero, Orbit 60° → ECU Macro edge/port, Truck → MCU in hand Eye-Level, Slow Push (screen black or abstract) | 85 / 100 / 50; Focus Lock | Low Key + rim or Minimalist, Cool Tone, Reflections | readable screens, UI text |
| Automotive | car, SUV, EV, drive, ride | product (colourway) or environment (terrain/season) | Front Three-Quarter Hero, slow Orbit 15° → Rolling Shot or Low Tracking → Drone Tracking or Rear Three-Quarter | 35–50 / 35 / 24 | Backlit golden hour, Teal & Orange | Pass-By, Road-Level, Whip Pan |
| Travel & Hospitality | destination, hotel, trip, airline, resort | environment (destination/time of day) | EWS Aerial/Drone establishing, slow forward → WS subject from behind/three-quarter, Crane/Jib reveal → MCU Eye-Level reaction | 24 / 35 / 85 | Warm Tone, Backlit, Lens Flare (sparingly) | crowds, animals, moving water near the subject |
| Finance, Apps & Services | bank, card, pay, app, insurance, loan | character (persona) or environment | MS Eye-Level person, Slow Push → OTS onto a phone/card (no readable UI) → MCU Three-Quarter smile, Static | 50 / 50 / 85 | Warm Tone, High Key | readable UI, numbers on screen |
| Luxury, Jewellery & Watches | ring, necklace, watch, gold, diamond | product (metal/stone) | ECU Macro facet, Rack Focus → CU Three-Quarter on velvet, Orbit 45° → MCU on wrist/neck, Static | 100 / 85 / 85; f/2.8 | Low Key, Chiaroscuro, Reflections, Bokeh | sparkle variance: keep moves slow |
| Home & Appliances | sofa, kitchen, fridge, AC, décor, paint | environment (décor/palette) or product (finish) | WS Eye-Level room, Truck/Parallax → MS product in use, Static → CU detail, Slow Push | 28 / 50 / 85 | High Key, Warm Tone, Frame Within a Frame | moving pets/people in the background |
| FMCG & Packaged Goods | snack, detergent, soap, shampoo, pack | product (variant/flavour) | CU Minimalist pack hero, Pedestal Up → Bird's-Eye arrangement with ingredients, Static → MCU in hand, Slow Push | 85 / 35 / 50 | High Key, Minimalist, Warm Tone | ingredients flying across the pack |
| Sports & Fitness | gym, run, gear, energy, team | character (athlete) or product (gear colourway) | FS Low-Angle athlete, Slow Push → MCU Three-Quarter effort, Static → CU gear Slow Push, Backlit | 35 / 85 / 85 | Backlit, Low Key, Motion Blur (light) | fast action, Handheld, Whip Pan |
| Gaming & Entertainment | game, OTT, show, film, music | character or environment | MCU Eye-Level lit by screen glow, Slow Push → WS Neon set, Dutch static → CU device/controller, Orbit 30° | 50 / 24 / 85 | Neon Light, Low Key, Smoke/Fog (env only) | readable screens, logos |
| Family & Kids | toy, family, school, baby, parenting | environment or product | MS Eye-Level at the child's height (cam z ≈0.9), Static → CU toy Three-Quarter, Slow Push → WS family, Pedestal Up | 50 / 85 / 35 | High Key, Warm Tone | children moving fast, many people |

If the brief fits none of these, say so, build a plan from first principles with the same rules, and name the closest category used for defaults.