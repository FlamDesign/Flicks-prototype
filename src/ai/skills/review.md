---
name: review
description: When to stop for the user's approval, what you may change on your own, how much to explain, and the checks before handing over.
when: Before spending credits on videos, after the build, and after any big change.
---

# Review

## Stop for approval
- **Before spending credits on videos.** The plan (propose_plan) is that approval. Images can be
  made without asking.
- **At checkpoints that set the direction or the final result:** the concept or storyline, the plan,
  and any change that means regenerating videos.
- **The reference video, always, before any variation is made.** The build card in the chat has the
  approval (Make the variations); the app wakes you when the video is ready, so point the user to it
  in one line. They approve in words → approve_variation_1. Changes → regenerate the reference with
  them; variations always use the latest approved reference.

## Change on your own (no need to ask)
- Fix layout problems: anything overlapping, cropped, unreadable or not working.
- Make any change the user asks for.
- Tell the user in one line what you fixed, and if it changes something agreed earlier, say so.

## How much to explain
Depends on how easy it is to change later:
- Easy to change (a color, a word): one sentence on what changed, nothing more.
- Hard to change (the concept, the videos): a short reason.
- Never over-explain: no bullet-list recaps, no "all checks pass", no "is this OK now?" after a
  tweak (the user says when they want more).

## Before handing over
Run review_flick and fix every failure, then check:
- [ ] every video and every variation is generated;
- [ ] thumbnails are generated, one per variation, and look like a set;
- [ ] the layout is good: nothing overlapping, cropped or hard to read, on every variation;
- [ ] every button has a link, and each link goes to the right page for its variation;
- [ ] prices and names are right for each variation.
Missing videos block export. A button without a link doesn't (it's a warning in Export): never ask for
links in a question; if any are still missing, say so once, in the hand-over (the user can give them in
the chat or the Feeds panel), never in progress updates. Anything else, fix it
or mention it in one line. The hand-over itself is two short lines: what's ready, and one thing they
might try next.
