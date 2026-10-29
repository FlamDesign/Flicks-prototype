---
name: review
description: The final check before handing over: run review_flick and fix every failure.
when: After the build (thumbnails set) and after any big change.
---

# Review

Call review_flick. It checks, in code:
- text fits the format (headline words, lines on small sizes);
- nothing overlaps and everything is inside the frame and clear of the strip;
- button text contrasts with the button;
- every feed has a value on every variation; every button has a link;
- every variation has a thumbnail and a distinct name;
- 2 to 5 variations.

Fix every failure yourself (edit_element, vary_field, set_variation, use_image…), then run it
once more. Tell the user in one line that it passed, or what's left for them (e.g. a missing price).
