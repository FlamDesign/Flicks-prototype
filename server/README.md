# Flicks AI server

A small Cloudflare Worker that lets the prototype talk to Claude (chat) and Higgsfield (images)
without putting any key in this public repo or in the browser.

```
GitHub Pages site  ──(passcode)──>  flicks-ai Worker  ──(keys)──>  Claude API, Higgsfield API
```

## One-time setup

1. **Cloudflare** (free plan is fine)
   - Account ID: Cloudflare dashboard > Workers & Pages > right column.
   - API token: My Profile > API Tokens > Create Token > "Edit Cloudflare Workers" template.
     Add **Account > Workers KV Storage > Edit** to it.
2. **Keys**
   - Anthropic API key: console.anthropic.com > API keys. Set a monthly spend limit there too.
   - Higgsfield API key: open.higgsfield.ai > API keys > Create API key > Copy API key (one key). A separate key with a small balance is safest.
   - A passcode: any long random phrase. People type it into the prototype's dev tools.
3. **GitHub repo secrets** (Settings > Secrets and variables > Actions > New repository secret):

   | Secret | Value |
   |---|---|
   | `CLOUDFLARE_API_TOKEN` | the token from step 1 |
   | `CLOUDFLARE_ACCOUNT_ID` | the account ID |
   | `ANTHROPIC_API_KEY` | Anthropic key |
   | `HIGGSFIELD_API_KEY` | the whole Higgsfield key, as copied |
   | `AI_PASSCODE` | the passcode |

4. **Deploy**: Actions > "Deploy AI server" > Run workflow. The run summary shows the server address.
5. **Point the site at it**: Settings > Secrets and variables > Actions > **Variables** > `AI_SERVER_URL` = that address.
   The next push rebuilds the site with it. (Or paste the address in dev tools > State manager > AI.)
6. In the prototype: dev tools > State manager > AI > enter the passcode > Test connection.

## Limits (server/wrangler.toml)

- `DAILY_IMAGE_CAP` (default 50) and `DAILY_CHAT_CAP` (default 500) per day, across everyone.
- Replies are capped at 4,096 tokens; only Claude Sonnet, Opus and Haiku models are accepted.
- `ALLOWED_ORIGINS`: only these websites can call it from a browser. The passcode is required from everywhere.

Change the caps or the image model (`HF_IMAGE_PATH`) in `wrangler.toml` and push; the action redeploys.

## Safety

- Keys live only in GitHub's encrypted secrets and the Worker's secrets. Never commit them.
- `scripts/scan-secrets.sh` runs on every deploy and push, and fails if anything key-like is in the code.
- Keep "Require approval for workflows from outside collaborators" on (Settings > Actions).
- Rotate the passcode by changing `AI_PASSCODE` and re-running the workflow.

## Local test

```
cd server
printf 'PASSCODE=dev\nANTHROPIC_API_KEY=...\n' > .dev.vars   # git-ignored
npx wrangler dev
```
