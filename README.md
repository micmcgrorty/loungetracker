# Lounge Tracker

Live occupancy of five airport lounges (Concorde Room, First, South, North and B Gates), against each lounge's capacity. Both figures come from each lounge's own live websocket feed, and update as it reports.

Live at [loungetracker.netlify.app](https://loungetracker.netlify.app).

## Stack

- React 19, in TypeScript
- CSS modules, with design tokens as CSS custom properties
- [Vite+](https://viteplus.dev): Vite for dev and build, Vitest for unit tests, Oxlint and Oxfmt for linting and formatting
- Playwright for end-to-end tests on desktop and mobile Chromium, with every feed mocked
- GitHub Actions for CI, and Netlify for hosting and deploy previews

## How it works

- **Each lounge is defined once.** `LOUNGES` lists each lounge's name and feed zone (capacity comes from the feed); the page renders one component per entry, and each component opens its own feed.
- **The feed is untrusted.** Messages are parsed by one function that never throws. Anything that isn't an occupancy report is ignored, so a bad message never blanks a lounge or breaks the page.
- **Feeds recover on their own.** A feed that closes, fails or goes quiet for a minute reconnects, waiting a second and doubling up to 30 seconds between attempts. Meanwhile its lounge keeps the last figure, greyed and marked as reconnecting rather than shown as live.
- **Every lounge always has a row.** Before its first report a lounge shows as waiting, so the list keeps its order and doesn't move as feeds arrive. A live lounge shows its figure, how full it is as a percentage, and a bar.
- **Tests don't need the live feeds.** The e2e suite plays the websocket server for every lounge, so it can test empty lounges, updates, bad messages and dropped feeds on demand. The feed module's timing rules are unit tested with a fake socket and fake timers.

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
