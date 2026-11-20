# Flicks prototype

Prototype of Flam's Flicks "Create" web app: React + Vite + Tailwind v4 + shadcn/ui (preset `radix-rhea`) + Hugeicons, with a Cloudflare Worker as the AI server. Owner: Divyansh (Head of Product & Design, Flam).

## Branches and deploys

- Work on `dev`. `main` is production: push to it only when the owner says so explicitly in that message ("push to main", "deploy to production"); a standing "push everything to main" from earlier never carries over. Experiments go on their own short-lived branch off `dev`, deleted when merged or dropped.
- After each change: commit, `git push origin dev`. Pushing is fine; GitHub API writes (deleting branches, etc.) are blocked by the proxy.
- Commit trailer on every commit:
  ```
  Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Jhbj6G6tfy9W4mReeecGGH
  ```
- Site deploys on push via `.github/workflows/cf-pages.yml` to Cloudflare Pages project `flam-flicks`: `main` → https://flam-flicks.pages.dev, `dev` → https://dev.flam-flicks.pages.dev. Other branches deploy only when the workflow is run on them by hand (`gh workflow run cf-pages.yml -R FlamDesign/Flicks-prototype --ref <branch>`) and get `https://<branch>.flam-flicks.pages.dev`. Short-lived branches are deleted the day they merge; research lives in `research/`, not on a branch. Build config: `vite.pages.config.ts` (base `/`, outDir `dist-pages`). GitHub Pages is retired.
- Wait for a deploy: `id=$(gh run list -R FlamDesign/Flicks-prototype -w cf-pages.yml -b dev -L 1 --json databaseId -q '.[0].databaseId'); gh run watch $id -R FlamDesign/Flicks-prototype --exit-status`
- Worker deploy: `gh workflow run ai-server.yml -R FlamDesign/Flicks-prototype --ref dev`. Worker: https://flicks-ai.flick-prototype.workers.dev (`server/worker.ts`, `server/wrangler.toml`, KV).

## Secrets

- The app passcode is given by the owner in chat and must never be written to any file, commit, log or doc. Use it only in the shell for the current call: `read -r FP <<< "<passcode>"; export FP`.
- API keys (Anthropic, Flicks API) live only as Worker secrets, set via the ai-server workflow from repo secrets. Never in the browser bundle or the repo.
- `scripts/scan-secrets.sh` must pass before every push.

## Checks before pushing

- `npm run build` (tsc + vite).
- `scripts/check-ui.sh` and `scripts/scan-secrets.sh` must pass.
- `scripts/check-contrast.sh` (needs `FP`) after any token or colour change.
- Keep the PRD (`src/dev/prd.tsx`) and the Components gallery (`src/dev/component-gallery.tsx`) updated with every feature or UI change.
- e2e drivers in `tests/e2e/` (`lib.cjs`, `brief.cjs`, `rejoin.cjs`, `agent-setup.cjs`, `contrast.cjs`); `SITE` defaults to the dev deploy, `SAMPLE=1` uses sample videos, `LIVE_EXPORT=1` the Flicks API export (off by default), `MANAGED=0` the browser chat loop (the managed agent is the default). `tests/e2e/cases.cjs <c1..c11>` runs the real-brand example cases (`FULL=1` real videos, kept; `RESUME=<project id>`, `EXPORT_ONLY=<project id>` with optional `SAY="…"`). Run at most 3 browsers at once on an 8 GB machine.

## Design system

- shadcn preset `radix-rhea` (rhea · zinc · amber · DM Sans · Hugeicons). Use its tokens and components only; no new colours, no hand-rolled controls when a `ui/` component exists. Opacity ladder: 10/20/30/50/70/90.
- Light and dark must both pass contrast; check both whenever tokens or `ui/` files change.

## Product rules

- Chat is the only creation flow. Templates are view-only.
- Never generate a video without an explicit press by the user. No automatic retries.
- The user's credits are the only credits; no dollar figures anywhere.
- When the AI server is unreachable: "Couldn't connect to the AI server."
- Keep the Sample videos dev switch.
- Flicks (the format): every variation's video is loaded and plays muted; a switch carries the playhead over with an **instant cut**. Never a cross-fade, slide, zoom or any transition on a variation switch, on the video or the thumbnail strip, anywhere a Flick plays (canvas, Flick page, viewer, templates, previews). Settled for good; `FlickPlayer` (`src/components/flick-player.tsx`) is the only player and has no option for one.

## Architecture notes

- Routes in `src/lib/route.ts`, active only when `import.meta.env.BASE_URL === "/"`; `public/_redirects` serves `index.html` for every path. Public media paths get `BASE_URL` prefixed (`pub()` in `src/recipes.ts`, `src/templates/real-media.ts`).
- AI: `src/ai/agent.ts` (tools, system prompt, turn loop), `src/ai/managed.ts` (Anthropic Managed Agents: agent, environment, sessions, streaming, rejoin), `src/ai/client.ts` (`apiCall`), skills in `src/ai/skills/*.md` uploaded as Skills. Agent config stored at Worker `/store/agent-config`.
- Worker routes: `/chat`, `/library` (backed by `lib:index`), `/file`, `/store`, `/requests`, `/media`, `/health`, `/agent/v1/*` proxy. `ALLOWED_ORIGINS` supports `*` patterns.
- Saved library (`src/ai/sync.ts`): the list of projects and Flicks is the Worker record `library`; each project's canvas and versions is its own record `proj-<id>` (it also carries the project's line from the list, so a project can be opened from it alone). A new chat project's record is written with its first message. The earlier single record `state` is read on start and merged in, never written: production still saves there until `main` is deployed with the split; after that the read can go.
- Library: `LibraryState { projects, flicks, synced }`; always starts empty and fills from the server. There is no sample library, no sample project and no mode without a server: a device without the passcode sees the passcode gate (`src/components/passcode-gate.tsx`) first. Campaigns, embeds and analytics are a sample built from the account's own finished Flicks on each visit (`src/sample-data.ts`). The only sample media are the five stand-in clips for the Sample videos switch (`SAMPLE_CLIPS` in `src/ai/client.ts`, kept on the Worker), used nowhere else.
- Videos are referenced by a stable key (`VideoKey`, `src/components/editor/elements.ts`), never by a position: a made or uploaded video by its address (the Worker's kept copy `/file/<id>.mp4`), a template's video by its name (`gap-1-denim`, `coach-1`). `videoAt(key)` is the only lookup; the saved library's `made` list carries names, sizes and stills by address. Never reintroduce indices, per-device lists or renumbering. `scripts/migrate-video-keys.cjs` converted the saved state once (Nov 17, 2026). A made video's still is a file on the Worker, never a `data:` image in the library (`scripts/migrate-made-stills.cjs` moved the old ones).
- A Flick's videos share size, length and motion. The user's own clips are grouped by exact size and length (`clipGroups` in `src/ai/agent.ts`) and compared for motion from their frames (`src/lib/motion.ts`: `same`, `different` blocks the Flick, `unclear` goes to the chat to judge from stills). No "go on anyway".
- Size and length change at any time through `setFormat` (`generation-canvas.tsx`): a new length after videos exist only proposes a remake (Make card; the format rides on the proposal and applies on the press); a new size applies at once and reports whether the made videos fit.
- The chat's final check runs once per set of videos, remembered on Variation 1 (`checked`), so it runs on the next open if the tab was closed. A video wait that runs out (45 min) keeps its job id in `failed.jobId`; Try again resumes that job.
- A project keeps named and exported versions plus the latest five (`trimVersions` in `src/library.ts`).
- Held by the app, not left to the chat: process narration and repeated replies are not shown, a reply over five sentences folds behind Show more, export blockers are docked after hand-over, the storyboard's approve waits for its frames. `arrange_elements` action `clear` solves overlaps in one call.
- Dev test switches in `localStorage`: `flam.mockFail` (next N sample videos fail), `flam.mockTimeout` (next N run past the wait and keep a job id).
- Cloudflare's own Git build is disconnected (Nov 19, 2026): the GitHub Action is the only deployer. If the site serves one 24 MB `index.html` with no routing, a second builder is back.
- Dev tools: floating pill `DevWidget` (⌘.) with switches and the State / AI / Docs dialogs (`src/dev/`).

## Working style

- Plan first when asked; ask about doubts before expensive or irreversible work; otherwise do the work and report briefly.
- Writing: brief, direct, US English, no em dashes.
- Flam copy never uses "get used", "can enter", "reach into", "AR/VR/MR" or "immersive".
