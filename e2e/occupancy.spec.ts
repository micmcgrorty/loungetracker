import { expect, test, type Page, type WebSocketRoute } from "@playwright/test";

// The lounges and the zone each one's occupancy feed is read from. This is the contract the app
// must keep: the live feeds are never contacted, each test plays the server for every zone.
const LOUNGES = [
	{ name: "Concorde Room", zoneId: "4111", capacity: 188 },
	{ name: "First Lounge", zoneId: "4112", capacity: 418 },
	{ name: "South Lounge", zoneId: "4113", capacity: 627 },
	{ name: "North Lounge", zoneId: "4114", capacity: 305 },
	{ name: "B Gates Lounge", zoneId: "4115", capacity: 216 },
];

function occupancyMessage(occupancy: number) {
	return JSON.stringify({ args: { camera: { occupancy } } });
}

function occupancyText(lounge: (typeof LOUNGES)[number], occupancy: number) {
	return `${lounge.name} occupancy is currently ${occupancy} out of ${lounge.capacity}.`;
}

// Answers every occupancy feed the page opens, and returns each zone's socket once it's open.
async function mockFeeds(page: Page) {
	let sockets = new Map<string, WebSocketRoute>();
	await page.routeWebSocket(
		(url) => url.searchParams.has("zone_id"),
		(ws) => {
			sockets.set(new URL(ws.url()).searchParams.get("zone_id")!, ws);
		},
	);
	return async (zoneId: string) => {
		await expect(() => expect(sockets.has(zoneId)).toBe(true)).toPass();
		return sockets.get(zoneId)!;
	};
}

test("shows each lounge's occupancy from its own feed", async ({ page }) => {
	let feed = await mockFeeds(page);
	await page.goto("/");

	// A different value per zone, so a lounge reading another lounge's feed fails.
	for (let [index, lounge] of LOUNGES.entries()) {
		(await feed(lounge.zoneId)).send(occupancyMessage(10 + index));
	}

	for (let [index, lounge] of LOUNGES.entries()) {
		await expect(page.getByText(occupancyText(lounge, 10 + index))).toBeVisible();
	}
});

test("shows nothing for a lounge until its feed reports", async ({ page }) => {
	let feed = await mockFeeds(page);
	await page.goto("/");
	let [reporting, ...silent] = LOUNGES;

	(await feed(reporting.zoneId)).send(occupancyMessage(42));

	await expect(page.getByText(occupancyText(reporting, 42))).toBeVisible();
	for (let lounge of silent) {
		await expect(page.getByText(lounge.name)).toHaveCount(0);
	}
});

test("updates a lounge when its feed reports again", async ({ page }) => {
	let feed = await mockFeeds(page);
	await page.goto("/");
	let lounge = LOUNGES[0];
	let ws = await feed(lounge.zoneId);

	ws.send(occupancyMessage(42));
	await expect(page.getByText(occupancyText(lounge, 42))).toBeVisible();
	ws.send(occupancyMessage(57));

	await expect(page.getByText(occupancyText(lounge, 57))).toBeVisible();
	await expect(page.getByText(occupancyText(lounge, 42))).toHaveCount(0);
});

test("shows an empty lounge", async ({ page }) => {
	test.fail(true, "A lounge with 0 occupancy is hidden; fixed in the architecture change.");
	let feed = await mockFeeds(page);
	await page.goto("/");
	let lounge = LOUNGES[0];

	(await feed(lounge.zoneId)).send(occupancyMessage(0));

	await expect(page.getByText(occupancyText(lounge, 0))).toBeVisible();
});

test("keeps showing lounges when a feed sends something unreadable", async ({ page }) => {
	let feed = await mockFeeds(page);
	await page.goto("/");
	let [broken, healthy] = LOUNGES;
	let brokenWs = await feed(broken.zoneId);
	brokenWs.send(occupancyMessage(42));
	await expect(page.getByText(occupancyText(broken, 42))).toBeVisible();

	brokenWs.send("not json");
	brokenWs.send(JSON.stringify({ args: {} }));
	(await feed(healthy.zoneId)).send(occupancyMessage(7));

	await expect(page.getByText(occupancyText(healthy, 7))).toBeVisible();
	await expect(page.getByText(occupancyText(broken, 42))).toBeVisible();
});

test("ignores unreadable messages without throwing", async ({ page }) => {
	test.fail(true, "Unreadable messages throw in the page; fixed in the architecture change.");
	let errors: Error[] = [];
	page.on("pageerror", (error) => errors.push(error));
	let feed = await mockFeeds(page);
	await page.goto("/");
	let lounge = LOUNGES[0];
	let ws = await feed(lounge.zoneId);

	ws.send("not json");
	ws.send(JSON.stringify({ args: {} }));
	ws.send(occupancyMessage(42));

	await expect(page.getByText(occupancyText(lounge, 42))).toBeVisible();
	expect(errors).toEqual([]);
});
