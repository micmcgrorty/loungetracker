import { defineConfig, devices } from "@playwright/test";

// Matches the port `npm run preview` serves on.
const PORT = 4173;

// Set E2E_BASE_URL to run the suite against a deployed site instead of a local server.
const externalBaseURL = process.env.E2E_BASE_URL;

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	// expect(...).toPass() retries for up to 5s, like other assertions, instead of until the test times out.
	expect: { toPass: { timeout: 5_000 } },
	reporter: process.env.CI
		? [["github"], ["html", { open: "never" }]]
		: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL: externalBaseURL ?? `http://localhost:${PORT}`,
		trace: "on-first-retry",
	},
	projects: [
		{ name: "desktop", use: { ...devices["Desktop Chrome"] } },
		{ name: "mobile", use: { ...devices["Pixel 7"] } },
	],
	webServer: externalBaseURL
		? undefined
		: {
				// Test the production build, as deployed.
				command: "npm run build && npm run preview",
				url: `http://localhost:${PORT}`,
				// Always build and serve fresh code; fail if the port is taken rather than test a stale server.
				reuseExistingServer: false,
			},
});
