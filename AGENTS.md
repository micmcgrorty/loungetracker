# Lounge Tracker Agent Guide

A React single-page app built with Vite+ (the `vp` CLI: Vite, Vitest, Oxlint, Oxfmt). It shows the live occupancy of each lounge, read from one websocket feed per lounge. Vite+ ships its docs at `node_modules/vite-plus/docs`.

## Commands

```sh
npm i
npm run dev        # vp dev
npm run build      # vp build → dist/
npm run preview    # vp preview, serves dist/ on port 4173
npm run check      # vp check: format, lint and type check
npm run fix        # vp check --fix: format and apply lint fixes
npm test           # Vitest unit tests in src/
npm run test:e2e   # Playwright suite in e2e/
```

Run `npm run check` and `npm test` before committing. `check` must pass with no warnings. Lint, format and test settings live in `vite.config.ts` (`lint`, `fmt` and `test` blocks); there are no separate `.oxlintrc` or `.oxfmtrc` files. The `lint` block also loads React Doctor (`oxlint-plugin-react-doctor`) as a JS plugin with its recommended rules, minus its copies of Oxlint's native `react` and `jsx-a11y` rules. Fix what it reports; if a rule is wrong for this codebase, turn it off in the `lint` block with a comment saying why, never with an inline disable comment.

`npm run test:e2e` builds the app, serves it with `vp preview` on port 4173, and runs on desktop and mobile Chromium. Set `E2E_BASE_URL` to run it against a deployed site instead. Install the browser once with `npx playwright install chromium`.

npm scripts must not use `&&` or inline env vars, because they need to run under any `script-shell`, including Windows PowerShell.

`package.json` `overrides` alias `vite` to the Vite+ core and pin `vitest` to the version Vite+ bundles. Keep them in step with the `vite-plus` version when upgrading. `oxlint-plugin-react-doctor` is pinned exactly; after upgrading either it or `vite-plus`, check that the Oxlint bundled with Vite+ still loads it (`npm run check` reports `react-doctor(...)` findings on code that breaks its rules).

## Deploying

Netlify builds and hosts the site (`netlify.toml`): `npm run build` publishes `dist/`, and the build writes the commit SHA to `/version.txt`. There's one page, so Netlify's default routing is enough: anything that isn't a file in `dist/` gets a 404. Each PR gets a deploy preview, and the "Deploy preview" workflow waits for the preview to serve the PR's commit, checks status codes and asset caching, then runs the e2e suite against it. It needs the repository variable `NETLIFY_SITE_NAME`.

## Layout

`src/` is organised by feature. Each component has its CSS module beside it, and tests sit beside the code they test.

- `app/`: the shell. `main.tsx` mounts the app, and `global.css` holds the `@font-face` rule for Inter, the design tokens (including one colour per lounge status) and base element styles.
- `lounges/`: everything about lounges and their occupancy.
  - `lounges.ts`: `LOUNGES`, the one table of lounges (name and feed zone) in display order. Adding or changing a lounge means changing this table only. Capacities are not hard-coded: the feed reports each zone's capacity with its occupancy.
  - `occupancy-feed.ts`: the occupancy feed module, with no React. `watchOccupancy(zoneId, onChange)` owns everything about a zone's feed: its URL, reading messages, keeping the last good report, and the connection's lifecycle (reconnecting with backoff, treating a minute's silence as a drop). It reports a `FeedState`: the latest `report` (occupancy and capacity, or `null` before the first) and whether it's `live`. The socket sits behind a seam, `ConnectFeed`: `connectWebSocket` (the browser's `WebSocket`) in the app, and a fake in `occupancy-feed.test.ts`, which tests the module with fake timers.
  - `use-occupancy.ts`: `useOccupancy(zoneId)`, the React hook around `watchOccupancy`. It holds no rules of its own.
  - `lounge-occupancy.tsx`: one lounge's row, in one of three states: waiting (no report yet: a dash and "Waiting for first report"), live (the figure, "Live · N% full" and a bar showing how full it is) and reconnecting (the last figure greyed, "Reconnecting · last figure shown"). Each state is a class in `lounge-occupancy.module.css` that sets the row's dot, figure and bar colours. Every lounge always has a row, so the list doesn't move as feeds report. Each lounge renders its own component, so each owns its own feed.
  - `lounges-page.tsx`: the page: a heading, then the lounges as a list, one `LoungeOccupancy` per entry in `LOUNGES`.
- Root `public/` contains static files served unchanged from the app root: `favicon.svg`, and the self-hosted Inter in `public/fonts/` (the latin subset of the variable font, with its OFL licence). `index.html` preloads it. The font isn't fingerprinted but is cached for a year (`netlify.toml`), so a changed font needs a new file name.

## Conventions

- The feed is a third-party API, so treat everything it sends as untrusted: reading a message never throws, and a message that isn't a complete report (including one without a capacity) leaves the last good report showing.
- Feed behaviour (what counts as a report, reconnect timing, silence) belongs in `occupancy-feed.ts` and is tested through `watchOccupancy`'s interface, not in the hook or the page.
- 0 is an occupancy, not a missing one. Test for `null`, never for truthiness.
- Style with CSS modules and the tokens in `global.css`. Use the `style` prop only for per-item values.
- The page fits a laptop or phone screen without scrolling (down to about 1280×600 and 390×640). Keep its height in `dvh`, not `vh`, which on phones includes the hidden address bar, and check new content doesn't push it past those sizes.
- E2E tests are the behaviour contract, so they must not depend on the framework or on live data. They never contact the live feeds: each test answers every feed with `page.routeWebSocket` and sends its own messages. Locate by role and text, never by class or DOM shape: a lounge's row is the list item headed by its name. To test a drop, close a feed's `WebSocketRoute` and wait for the page to open a new one.
- Write each e2e test with plain Playwright calls; don't add shared helper modules. Helpers local to a spec file are fine. Test user flows, not CSS.
