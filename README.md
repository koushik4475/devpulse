# DevPulse

A personal developer control center for monitoring public GitHub repositories, pull requests, issues, releases, and GitHub Actions. Built as a static React + TypeScript PWA; no backend, paid API, GitHub OAuth, or token required.

## Features
- Watch public repositories by owner/name or GitHub URL; pin, label, remove, and search them.
- Repository metadata, stars, forks, language, default branch, and push metadata from GitHub REST API.
- Open pull requests, issues (excluding PRs), latest Actions runs, and releases.
- IndexedDB persistence, cache timestamps, manual refresh, rate-limit feedback, and four themes.
- Responsive dashboard and installable PWA shell.

## Stack
React 18, TypeScript, Vite, React Router, Dexie/IndexedDB, Zod, lucide-react, Vitest, Playwright, and vite-plugin-pwa.

## Local development
```bash
npm install
npm run dev
```

## Quality checks
```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## GitHub API and privacy
DevPulse uses unauthenticated public REST endpoints for repository metadata, pull requests, issues, Actions runs, and releases. Public unauthenticated API quotas are limited; quota information and rate-limit errors are surfaced. Actions visibility may be restricted; unavailable data is not inferred. Private repositories, OAuth, tokens, write operations, PR merging, issue creation, and workflow reruns are out of scope for V1.

The watchlist, labels, settings, and cached public API responses are stored in this browser's IndexedDB. No backend or analytics are used. No GitHub token is requested or shipped.

## Cloudflare Pages
The Cloudflare Pages project is connected to this GitHub repository and configured for automatic deployments from `main`.

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Production branch: `main`
- Environment variables: none required

Project URL: https://devpulse-2wg.pages.dev

## License
MIT. See [LICENSE](LICENSE).
