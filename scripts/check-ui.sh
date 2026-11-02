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
check "custom shadows (use the preset's shadow-xs…2xl)" 'shadow-\[[^]]*px'
hits=$(grep -rnE "(bg|text|ring|border)-\[color-mix" src --include=*.tsx | grep -vE "components/ui/|/dev/" || true); [ -n "$hits" ] && { echo "✗ mixed colours in classes (use preset tokens with an opacity, like bg-primary/10)"; echo "$hits"; fail=1; }
# black and white overlays stay on one opacity ladder
hits=$(grep -rnP '\b(bg|text|ring|border|from|via|to)-(black|white)/(?!(0|10|20|30|50|70|90)\b)[0-9]+' src --include=*.tsx | grep -vE "coach-art|email-gallery|/templates/|/data" || true)
if [ -n "$hits" ]; then echo "✗ black/white opacities off the ladder (10, 20, 30, 50, 70, 90)"; echo "$hits" | head -20; fail=1; fi
# approved: motion only through components/arrive.tsx (one timing for the whole app)
hits=$(grep -rln 'from "motion' src --include=*.tsx | grep -v "components/arrive.tsx" || true)
if [ -n "$hits" ]; then echo "✗ motion used outside components/arrive.tsx"; echo "$hits"; fail=1; fi
[ $fail = 0 ] && echo "✓ UI follows the preset"
exit $fail
