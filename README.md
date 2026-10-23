# Flicks prototype

The Flicks Create web-app prototype by Flam: create Flicks, templates, campaigns and placements, embeds, Analytics, and the in-app dev tools (State manager, Components gallery, PRD, Emails).

Built with Vite, React 19, TypeScript, Tailwind v4, shadcn/ui and Hugeicons.

```bash
npm install
npm run dev          # local dev server
npm run build        # single self-contained HTML in dist/
npm run build:site   # multi-file site in dist-artifact/ (what GitHub Pages serves)
```

Every push to `main` builds the site and deploys it to GitHub Pages (`.github/workflows/pages.yml`).
