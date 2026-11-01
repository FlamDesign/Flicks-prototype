#!/bin/bash
# Flags drift from the shadcn preset (rhea · zinc · amber · Rethink Sans): hand-picked text sizes,
# raw status colours and new fonts. Illustrations (onboarding art) and template data are exempt.
cd "$(dirname "$0")/.."
fail=0
check() { local what="$1" pat="$2"; local hits; hits=$(grep -rnE "$pat" src --include=*.tsx | grep -vE "coach-art|email-gallery|/templates/|/data" || true)
  if [ -n "$hits" ]; then echo "✗ $what"; echo "$hits" | head -20; fail=1; fi }
check "text sizes outside the scale (use text-2xs, xs, sm, md, base… display, hero)" 'text-\[[0-9.]+px\]'
check "raw status colours (use text-success, text-warning, text-destructive)" '(text|bg|ring|border)-(emerald|green|amber|yellow|red)-[0-9]'
check "fonts other than the preset (use font-sans)" 'font-\[|fontFamily: *"(DM Sans|Inter)'
[ $fail = 0 ] && echo "✓ UI follows the preset"
exit $fail
