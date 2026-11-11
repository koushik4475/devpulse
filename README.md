# DevPulse

A personal developer control center for monitoring public GitHub repositories, pull requests, issues, releases, and GitHub Actions. Built as a static React + TypeScript PWA; no backend, database service, paid API, GitHub OAuth, or token required.

## Features

- Watch public repositories by `owner/name` or GitHub URL; pin, label, remove, reorder, and search them.
- Repository metadata, stars, forks, language, default branch, license, open issue count, last push, and API-backed GitHub links.
- Open pull requests with draft state, author, labels, age, filters, and direct GitHub links.
- Open issues with pull requests explicitly excluded from issue counts.
- Latest Actions workflow runs with API-provided status, conclusion, branch, event, and duration. Missing or inaccessible data is never fabricated.
- Releases with tag, published time, draft/pre-release state, and direct links.
- Cross-repository dashboard counts, latest activity, latest workflow health, search, and filters.
- Per-repository and all-repository refresh, visible loading/freshness state, stale-cache warnings, and API quota information.
- IndexedDB persistence, validated versioned JSON import/export, four themes, configurable refresh/cache behavior, and installable PWA shell.
- Responsive desktop/mobile navigation and keyboard-focus styling.

## Stack

React 18, TypeScript, Vite, React Router, Dexie/IndexedDB, Zod, lucide-react, Vitest, Testing Library, Playwright, and vite-plugin-pwa.

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

## GitHub API policy and limitations

DevPulse uses documented unauthenticated public REST endpoints: `GET /repos/{owner}/{repo}`, `GET /repos/{owner}/{repo}/pulls`, `GET /repos/{owner}/{repo}/issues`, `GET /repos/{owner}/{repo}/actions/runs`, and `GET /repos/{owner}/{repo}/releases`. The API version and Accept headers are centralized in `src/lib/api.ts`. Requests use timeouts, bounded retry/backoff, pagination, error normalization, conditional metadata requests with ETags, and rate-limit header parsing. Public unauthenticated GitHub API quotas are limited; DevPulse shows quota information and rate-limit failures. Actions visibility may be restricted by GitHub permissions or repository settings; unavailable workflow data is reported rather than inferred.

This V1 supports public repositories only. It does not support private repositories, OAuth, personal access tokens, organization administration, write operations, PR merging, issue creation, or workflow reruns. Refreshes occur on initial load and manual refresh; an optional interval can run only while the page is open. Cached responses are stored in IndexedDB with timestamps; the service worker caches the app shell, not all API responses.

## Privacy and storage

The watchlist, user labels, settings, and cached public API responses are stored in this browser's IndexedDB. No application backend or external analytics are used. No GitHub token is requested or shipped. Clearing this browser's site data removes local DevPulse data; export a backup first if you need to preserve it.

## Cloudflare Pages deployment

- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`
- Environment variables: none

Cloudflare Pages serves this React single-page application with its native SPA fallback; no custom redirect rule is required. The public repository is connected to the `devpulse` Pages project. Production URL: <https://devpulse-2wg.pages.dev>.

## Screenshots

The GitHub Actions browser smoke suite captures a rendered application screenshot as a workflow artifact named `devpulse-playwright-report`. E2E fixtures are deterministic test data and are not evidence of live GitHub API responses.

## License

MIT. See [LICENSE](LICENSE).
