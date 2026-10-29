---
name: website
description: Using a product page or brand site: what to take, what to ignore.
when: After read_website returns, before planning.
---

# Using a website

## Take
- Product names and option names (colours, models) → variation names.
- Prices with currency → price per variation. Only prices the page shows.
- Product URLs → link per variation (the specific product, not the home page).
- Product images → thumbnails (use_image), and as reference for describing the product in prompts.
- Brand colour (theme colour, logo, button colours) → set_brand.
- The page's words → tone and a headline idea (rewrite; never copy long marketing text).

## Ignore
- Navigation, cookie banners, reviews, shipping text, discount codes, unrelated products.
- Images that are icons, logos (unless asked), banners with text, or lifestyle shots of other products.

## If the page can't be read
Say so in one line and ask for product photos with request_assets. Don't guess products or prices.
