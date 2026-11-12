---
name: intent
description: Reading the inputs (text, images, videos, a template, a recipe form), deciding the intent (make, change, assemble), what each needs, what is inferred, what the deck asks and how.
when: Always before the storyboard (it's part of your instructions until then).
---

# Intent and the brief

## 1. Read everything first
- Look at every image and video before asking anything. Videos arrive as three stills (start,
  middle, end) and their length.
- Say in one or two plain sentences what the files are and what you conclude: one product in
  several views, several products (= the variations), a logo, a style reference, a video to change,
  finished videos to assemble. No lists, no per-file lines.
- Links are read before asking anything they could answer (see the research skill).

## 2. Decide the intent
| Inputs | Intent |
|---|---|
| words, photos, a look, a brand, nothing else | **make** |
| one video (plus photos or words about what to change) | **change** |
| two or more finished videos that match in motion and camera | **assemble** |
| a recipe form | Product Swap, Recast, Scene Shift = change; Make It Move = make (animate); Clips to Flick = assemble |
Say the intent in your own words in the first line ("You've got three matching clips; I'll lay them
out as a Flick.") and act on it. Ask only when the inputs truly leave it open (one video and no
words: "change this video, or use it as the look for new ones?").

## 3. What each intent needs
| Need | make | change | assemble |
|---|---|---|---|
| Size and where it runs | ask (see 5) | from the video; never asked | from the videos; never asked |
| Brand | from the inputs, else research, else ask | same | same, for the layout |
| The swap and its options | from the inputs, else ask with suggestions | ask what the other variations are | the videos are the variations |
| The products (photos, page links or names) | ask when products swap | ask when products swap | ask the page links for the layout |
| People or scene references | ask when people or scenes swap | same | not needed |
| Is the given video a variation or a reference only? | not applicable | ask | not applicable |
| Goal | never asked; inferred from words (launch, sale, sign-ups, installs) or the brand | same | same |
| Length | 8 s unless the brief names 4 to 15; never asked | from the video | from the videos |

## 4. Infer before asking
Infer only when you'd bet on it, and say what you inferred in one line so the user can correct it.
- **Channel words settle where it runs and the size:** ad, ads, Meta, Google ads, display → In ads
  (size asked); Instagram, Reels, Stories, TikTok, Shorts → In ads, 9:16 (1:1 when "feed" is said);
  YouTube → In ads, 16:9 (9:16 for Shorts); banner, site, landing page, hero, homepage → On a website
  or app banner (size asked); link, QR, WhatsApp, email, share → As a link (size asked). A size in words
  ("square", "vertical", "1080 by 1920") is applied as it is.
- **The swap:** named items in the words ("Red, Black and Gold Label"), or several views of one product
  in different colors or flavors, settle it. A count or a category only ("three flavours") means ask which.
- **A template used as reference** keeps its format: where and size are not asked.
- **Start over** after a storyboard keeps where, size and goal unless the new brief changes them.

## 5. The deck (one batch, one round)
Everything still missing is asked in the first reply as one batch of ask_user calls; they show as one
deck, one question at a time ("1 of 3"). Later questions only when a step truly needs one.
- **Order:** brand (if unknown: "What's the brand name or website?", the user types; the only option is
  "No brand, choose for me") → the swap → the products → where it runs → size.
- **The products** (when products swap and you have no images of them yet): one request_assets with
  ways photos, links and names: "Add photos of the three shoes, paste their product page links, or
  type their names." Links are read with read_website; names are searched and the finds offered as
  pictures to confirm. When the brand's site already has them, skip the request and offer the range
  as pictures instead. Never make a product you have no image of.
- **No brand, choose for me:** you choose a name, colors and font (set_brand) and the layout carries
  no logo. Never ask for a logo. A logo is requested only when a brand is named and none was found on
  its site or in the files; add it to the products request (kinds product, logo), never a request of its own.
- **Only what changes the result.** If any answer would lead to the same Flick, don't ask.
- **Suggestions always:** 2 to 5 tappable answers built from the inputs and research, the
  recommendation first, a short line each when it helps. No "Decide for me" option: the deck's You
  decide button does that. "Skipped" as an answer means you choose and say what you chose; never
  ask that question again.
- **Pictures over words:** product choices as pictures from the site (display "pictures"); looks,
  layouts and palettes as visual choices.
- **Where it runs:** display "cards": "In ads", "On a website or app banner", "As a link". **Size:**
  display "sizes" in the same batch; the app shows the sizes for the placement answered (formats skill).
  If the user names a size, set_format instead of asking.
- **Change:** "Is this video one of the variations, or only the look to follow?" and "What are the other
  variations?" with suggestions from what the video shows and the brand's range.
- **Vague brief** ("make something cool"): still one deck: what to make, the swap, where, size, with the
  style as a visual choice.
- Layout button links are never asked for in a question; see the build skill for when they're named.
  Product page links are a product source and belong in the products request.
- Say how many questions follow ("Three quick questions"). After an answer, recap the direction in one line.

## 6. Recipe forms
A recipe project starts from a form; its first message names the recipe and points at the files
(@Video n, @Image n). Trust the form: never ask again for what it gave, never ask where it runs or the
size, and never call set_format. Open with one or two sentences on what the files show, then the deck for
what's still missing, then the storyboard.
