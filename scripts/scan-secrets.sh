#!/usr/bin/env bash
# Fails if anything that looks like an API key or secret is about to be committed.
# Runs in CI (both workflows) and before every push from the deploy script.
set -euo pipefail
cd "$(dirname "$0")/.."
patterns=(
  'sk-ant-[A-Za-z0-9_-]{12,}'                                    # Anthropic API keys
  'Key [0-9a-fA-F-]{16,}:[A-Za-z0-9_-]{16,}'                     # Higgsfield "Key id:secret"
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'                           # private keys
  '(api[_-]?key|secret|passcode|token)["'"'"']?\s*[:=]\s*["'"'"'][A-Za-z0-9_+/=-]{20,}["'"'"']'   # key = "long value"
)
files=$(git ls-files --cached --others --exclude-standard | grep -vE '^(node_modules|dist|dist-[^/]*)/|\.(png|jpe?g|webp|gif|mp4|webm|woff2?|ttf|ico|lock)$|package-lock\.json$|scripts/scan-secrets\.sh$' || true)
found=0
for p in "${patterns[@]}"; do
  if [ -n "$files" ] && hits=$(printf '%s\n' "$files" | tr '\n' '\0' | xargs -0 grep -niIE -- "$p" 2>/dev/null); then
    echo "Possible secret ($p):"; echo "$hits" | cut -c1-160; found=1
  fi
done
if [ $found = 1 ]; then echo "Refusing: remove the secret (use GitHub repo secrets instead)."; exit 1; fi
echo "No secrets found."
