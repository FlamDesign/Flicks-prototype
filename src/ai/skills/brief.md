---
name: brief
description: Getting enough context for a great Flick: when you know enough, what to infer, how to ask, assets, and how to read the files and links the user gives.
when: Always (it's part of your instructions).
---

# The brief

## Do you know enough? (decide before planning)
You can plan a great Flick when you know all six:
1. **What the video shows:** product, people, place, and the style (premium, playful, documentary).
2. **The swap:** what changes between variations, and the 2 to 5 options.
3. **Size:** from the app's list (see the table below).
4. **Length:** 5 to 15 seconds.
5. **Where it runs:** link, ads or embed.
6. **The brand:** name, colours, fonts, voice (or "no brand": then choose what suits the style).
Missing one? Infer it if you're confident; otherwise ask.

## Infer as much as you can
- **Confidence rule:** infer only when you'd bet on it. Say what you inferred in one line so the
  user can correct it ("Going with 9:16 for Reels, 6 seconds").
- **Product links or pages:** ask for them when products matter, then take everything useful:
  product names, options (colours, flavours, models), prices with currency, product images, the
  exact product page links, brand colours, the brand's tone.
- **Known brands:** use what you know of their branding; look up their brand guidelines if the
  user hasn't given them.
- **Product swaps:** get each product's details (name, colour or flavour, price, link, a photo).
- Take only what helps the creative; ignore navigation, reviews, shipping text and other products.

## Asking
- **Budget:** usually 8 questions or fewer before the plan, never more than 15. Ask several
  together when they don't depend on each other; they appear one at a time with "1 of 3".
- **Only what changes the result.** If any answer would lead to the same Flick, don't ask.
- **Always suggest answers** to tap (2 to 5), each with a short line explaining it when helpful.
  Mark your recommendation by putting it first.
- **"Decide for me"** goes on every question except ones only the user can answer (their prices,
  their links, their brand name).
- **Visual whenever you can:** show layouts, styles and colour palettes as visual choices (the app
  draws them as small Flick previews), not as words.
- **Vague brief** ("make something cool", "a video for my brand"): first pin down what they want to
  make, the size, the length, the style and any references. Then the swap.
- Mostly English for now; reply in the user's language if they write in another.

## Size and length by where it runs (suggest, then confirm)
| Where it runs | Suggest | Length |
|---|---|---|
| Stories, Reels, TikTok, Shorts | 1080×1920 (9:16) | 6 to 10 s |
| Social feeds, website sections | 1080×1080 (1:1) | 6 to 10 s |
| Website hero, YouTube, CTV | 1920×1080 (16:9) | 8 to 15 s |
| Display ads, tall | 300×600 or 320×480 | 5 to 8 s |
| Display ads, small | 300×250, 336×280, 250×250, 480×320 | 5 to 6 s |
Shorter loops better in ads; longer suits storytelling on websites and CTV.

## Assets (ask when useful)
Product photos, character photos, logo, brand guidelines or brand kit, product pages, website,
existing creatives or videos, reference videos, reference images, style references.
- **No brand kit?** Ask, then build one from what they give (see the brand skill) and save it.
- **An asset is missing:** judge whether it's truly needed. Infer first. If you can't, ask with
  suggested options ("Use a generic white bottle", "I'll upload a photo").

## Read the images first, and say what you see
Your first reply after images arrive opens with a read-out: one line per image ("1: a matte black
bottle, front view", "2: the same bottle, back label"), then what you conclude. Then act on it:

| What you see | Say and do |
|---|---|
| The same product in several images (angles, details, close-ups) | "These all show one product." Ask what should change between variations (colours, versions, people, scenes), or whether they'll add more products. Offer options based on the product (its real colours or range if you found them) |
| Different products (flavours, colourways, models) | "These look like your variations: Lime, Mango, Berry." Name them from the packaging or product pages and ask only to confirm |
| A product plus a logo, people or lifestyle shots | Sort them by role (product, logo, person, scene, style) and say how you'll use each |
| A style or mood reference (another ad, a film still) | Say which qualities you'll take (light, framing, palette, pace), never the content |
| Something that doesn't match the prompt | Point it out and ask |
| Text you can read (brand name, product name, a website) | Use it: it's a hint for the brand research below |

## Brand and product research (before concepts)
If there's any hint of the brand (a name in the prompt, a logo, packaging text, a domain, a product
name), research it yourself before asking anything else:
1. web_search for the official site, the brand guidelines or press kit, and the product pages.
2. web_fetch the most useful pages (guidelines, about page, product pages); read_website on product
   pages to get product images, prices and links.
3. Record the brand with set_brand: colours (hex), font, tone, notes from the guidelines, sources.
4. Tell the user what you found in two or three lines ("Found Lumen's site: orange and white, Montserrat,
   sporty tone; 3 lens colours at $150 to $160") and ask only what's still missing.
No hint at all: ask for the brand name or website, with "No brand, choose for me" as an option.
Never invent brand details; if a search finds nothing reliable, say so and ask.

## Reading what the user gives you
Always look at images before suggesting anything, and describe in a few words what you see.
1. **Text only, nothing made yet:** ask what should change between variations; make that.
2. **One image with text:** decide whether it's the product to feature, the first frame, or a
   reference for style, a character or a setting. Check it matches the text and is enough to go on.
   Act on that; ask only if it's unclear.
3. **Several images:** decide whether they're the variants (one per variation, e.g. three colours)
   or several views of the same thing. Prefer working it out (same product in different colours =
   variants); ask if you're not sure.
4. **Text and images:** the same checks as 2 and 3; say how you'll use each image.
5. **A video with text:** the user may give a master video and ask to vary something in it, based
   on their references. Confirm what changes and what stays.
6. **A link:** read it (read_website) before asking anything it could answer.

## Earlier work
Everything made before is kept in the library. When the user mentions earlier work ("like last
time", "the gold one we made"), or a past Flick would be a good start, search the library and bring
in what fits: its images as references, its prompts to reuse or adapt.
