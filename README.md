# Lounge Tracker

Live occupancy of five airport lounges (Concorde Room, First, South, North and B Gates), against each lounge's capacity. Each lounge's figure comes from its own live websocket feed and updates as the feed reports.

## Stack

- React 19, in TypeScript
- CSS modules, with design tokens as CSS custom properties
- [Vite+](https://viteplus.dev): Vite for dev and build, Vitest for unit tests, Oxlint and Oxfmt for linting and formatting
- Playwright for end-to-end tests on desktop and mobile Chromium, with every feed mocked
- GitHub Actions for CI, and Surge for hosting

## How it works

- **Each lounge is defined once.** `LOUNGES` lists each lounge's name, feed zone and capacity; the page renders one component per entry, and each component opens its own feed.
- **The feed is untrusted.** Messages are parsed by one function that never throws. Anything that isn't an occupancy report is ignored, so a bad message never blanks a lounge or breaks the page.
- **Tests don't need the live feeds.** The e2e suite plays the websocket server for every lounge, so it can test empty lounges, updates and bad messages on demand.

## Development

Needs Node 24.3 or later.

```sh
npm i
npm run dev        # start the dev server
npm run check      # format, lint and type check
npm test           # unit tests
npm run test:e2e   # end-to-end tests (first: npx playwright install chromium)
```

See [AGENTS.md](AGENTS.md) for the layout and conventions.
