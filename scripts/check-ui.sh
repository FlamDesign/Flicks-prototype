#!/bin/bash
# Flags drift from the shadcn preset (b3mPrj55k: rhea · zinc · amber · DM Sans): hand-picked text sizes,
# raw status colours and new fonts. Illustrations (onboarding art) and template data are exempt.
cd "$(dirname "$0")/.."
fail=0
check() { local what="$1" pat="$2"; local hits; hits=$(grep -rnE "$pat" src --include=*.tsx | grep -vE "coach-art|email-gallery|/templates/|/data" || true)
  if [ -n "$hits" ]; then echo "✗ $what"; echo "$hits" | head -20; fail=1; fi }
check "text sizes outside the scale (use the preset scale: text-xs, sm, base, lg…)" 'text-\[[0-9.]+px\]'
check "raw palette colours (use the preset's tokens: primary, muted, destructive…)" '(text|bg|ring|border)-(emerald|green|amber|yellow|red|blue|sky)-[0-9]'
check "custom type sizes or tokens outside the preset" 'text-(2xs|md|display|hero)\b'
check "fonts other than the preset (use font-sans)" 'font-\[|fontFamily: *"(DM Sans|Inter)'
[ $fail = 0 ] && echo "✓ UI follows the preset"
exit $fail
