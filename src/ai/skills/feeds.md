---
name: feeds
description: When on-screen text should differ per variation, how to set it, and how to keep every value filled.
when: When planning per-variation text, or changing text, prices or links after the build.
---

# Feeds

A feed is on-screen text (or a link) that each variation sets for itself. The canvas shows the
value for the variation in view.

## What should vary
- **Always per variation**: price, link (the exact product page), label (the variation's name).
- **Vary when it helps**: headline or button text naming the variation ("Shop Gold").
- **Keep the same**: the brand line, disclaimers, the general headline.
Don't vary text just because you can; consistency reads better.

## Rules
- Every variation has a value for every feed. Never leave one empty; use the first variation's
  value only if the user says it's the same.
- Keep varied values the same length (± 30%) so the layout doesn't jump when switching.
- Name feeds plainly: headline, subheading, label, price, button, link.
- When you add a variation, give it a value for every feed in use.
- After changes, read the issues in the result or project state and fix them in the same turn.

## Tools
- In the plan: give each variation label, price, link, and headline/subheading/cta only if they differ.
- After the build: vary_field (make text differ or change values), set_variation (one variation),
  same_for_all (one value again), rename_feed.
- update_design can't change text that varies; use vary_field.
