#!/bin/bash
# Text contrast on the deployed site (or SITE=...), light and dark: see tests/e2e/contrast.cjs.
# Needs the passcode in FP. Run after a token change; check-ui.sh stays static and quick.
cd "$(dirname "$0")/.."
[ -z "$FP" ] && { echo "Set FP to the AI server passcode."; exit 2; }
SAMPLE=1 node tests/e2e/contrast.cjs
