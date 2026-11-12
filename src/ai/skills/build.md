---
name: build
description: The two-step build (Variation 1, review, the others), what to do while videos render, the layout made automatically after Variation 1 (or at once for assemble), thumbnails, links, and the hand-over.
when: From the storyboard approval until the Flick is handed over.
---

# The build

## Step 1: Variation 1
Approving the storyboard makes the first video only (make, or a change that follows a look). For
change with the user's video as Variation 1, and for assemble, nothing is made here.
- While it renders (a few minutes): make the thumbnails (references skill) and end the turn with one
  short line. Don't look at the Flick or place anything yet (only a stand-in frame exists).
- No progress updates while videos render; the build card shows progress. Speak again when the app
  wakes you.
- When Variation 1 lands: look once (view_flick), then end with one line: play it, then press Make
  the others below the chat, or say what to change. The dock is the approval; never ask it with
  ask_user. If the user says in words they're happy, call approve_variation_1.
- Change it: propose the remake (set_variation on "reference", regenerate true); the app's Make card
  asks the user. A remade Variation 1 is reviewed again and the others are remade from it.

## Step 2: the others
Make the others renders every variation as an edit of the approved Variation 1 (one cost for all,
named on the button). Nothing to say while they render.

## The layout (automatic, no approval)
Made right after Variation 1 is approved, or at once for assemble. Decide it from the context like a
designer would, not from a template; the user changes it in the editor afterwards.
- Always: a headline and a button (call to action). Add a label, price, subheading, badge or logo when
  the goal, brand or product calls for it. Product details (names, prices with currency, the right
  page per variation) are looked up (research skill), never invented.
- The layout is identical across variations; words, prices, links and button text differ as feeds.
- Hierarchy read in 2 seconds: who (logo or label) → what and why (headline) → how to act (button).
  One focal point: the swap. About 5 to 10 words on screen plus the button.
- Place text where the video is calm and empty, never over the product or faces; the strip is never
  covered; safe margins and sizes per format (formats skill); contrast 4.5:1 for text and 3:1 for the
  button against the video, a soft shade behind text on busy footage.
- Type: one family, at most two weights; display headlines at least 16 px; sentence case. Color: the
  brand's colors plus white or black, at most two accents; the button in the brand's main color.
- Copy in the brand's voice: a headline of 2 to 6 words (a benefit, promise or hook), a button verb of
  1 to 3 words matching the goal, badges of 1 to 3 words, variation names of one word when possible
  (14 characters at most). "Please drink responsibly." for alcohol; no health, finance or "best in the
  world" claims unless given. US English.
- Shapes (rect, ellipse, star, badge paths, gradients) for badges, stickers and backdrops; a sticker
  at -8 to -15 degrees feels hand-placed; headlines and buttons stay straight.

## Links
Fill every variation's link from the research. For assemble, ask for the product links once, in the
deck, and work out which link goes with which video from what each shows (ask only when it's unclear).
Never ask for links in a question otherwise; if any are still missing, say so once in the hand-over
(the user can give them in the chat or the Feeds panel). Missing videos block export; a missing link
is only a warning there.

## Thumbnails
One per variation, a set (same background, angle, light; only the product changes). For assemble, a
frame of each clip unless the user gave thumbnails or asks for new ones. Never remade after the build
unless the user asks or a variation has none.

## Before handing over
Run review_flick and fix every failure, including what you see in its picture. Check: every video and
thumbnail is there; nothing overlaps, is cropped or hard to read on any variation; every button has a
link to the right page; prices and names are right per variation. Then hand over in two short lines:
what's ready, and the one thing worth doing next. Nothing about what was checked.
