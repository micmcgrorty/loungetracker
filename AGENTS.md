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

The site is hosted on Surge: `npm run build`, then publish `dist/`. It will move to Netlify, with deploy previews tested by CI, as beerstyles does.

## Layout

`src/` is organised by feature. Each component has its CSS module beside it, and tests sit beside the code they test.

- `app/`: the shell. `main.tsx` mounts the app, and `global.css` holds the design tokens and base element styles.
- `lounges/`: everything about lounges and their occupancy.
  - `lounges.ts`: `LOUNGES`, the one table of lounges (name and feed zone) in display order. Adding or changing a lounge means changing this table only. Capacities are not hard-coded: the feed reports each zone's capacity with its occupancy.
  - `occupancy-feed.ts`: the feed protocol, with no React. `feedUrl(zoneId)` builds a zone's websocket URL and `parseReport(data)` reads a message into an `OccupancyReport` (occupancy and capacity), returning `null` for anything that isn't a complete report.
  - `use-occupancy.ts`: `useOccupancy(zoneId)`, a zone's latest report, or `null` until it sends one. It's the only code that opens a websocket.
  - `lounge-occupancy.tsx`: one lounge's line. Each lounge renders its own component, so each owns its own feed.
  - `lounges-page.tsx`: the page, one `LoungeOccupancy` per entry in `LOUNGES`.
- Root `public/` contains static files served unchanged from the app root, such as `favicon.svg`.

## Conventions

- The feed is a third-party API, so treat everything it sends as untrusted: `parseReport` never throws, and a message that isn't a complete report (including one without a capacity) leaves the last good report showing.
- 0 is an occupancy, not a missing one. Test for `null`, never for truthiness.
- `react-use-websocket` is CommonJS only, and its default export doesn't survive ES module interop, so `use-occupancy.ts` imports the hook by name from `react-use-websocket/dist/lib/use-websocket`. It's due to be replaced by a small native hook; don't import it anywhere else.
- Style with CSS modules and the tokens in `global.css`. Use the `style` prop only for per-item values.
- E2E tests are the behaviour contract, so they must not depend on the framework or on live data. They never contact the live feeds: each test answers every feed with `page.routeWebSocket` and sends its own messages. Locate by role and text, never by class or DOM shape.
- Write each e2e test with plain Playwright calls; don't add shared helper modules. Helpers local to a spec file are fine. Test user flows, not CSS.
