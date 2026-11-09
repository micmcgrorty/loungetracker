import { expect, test, type Page, type WebSocketRoute } from "@playwright/test";

// The lounges and the zone each one's occupancy feed is read from. This is the contract the app
// must keep: the live feeds are never contacted, each test plays the server for every zone.
// Capacities come from the feed too; these are made up, so a capacity the app knew in advance fails.
const LOUNGES = [
	{ name: "Concorde Room", zoneId: "4111", capacity: 101 },
	{ name: "First Lounge", zoneId: "4112", capacity: 202 },
	{ name: "South Lounge", zoneId: "4113", capacity: 303 },
	{ name: "North Lounge", zoneId: "4114", capacity: 404 },
	{ name: "B Gates Lounge", zoneId: "4115", capacity: 505 },
];

type Lounge = (typeof LOUNGES)[number];

// A report in the live feed's shape, trimmed to what the page reads.
function occupancyMessage(lounge: Lounge, occupancy: number, capacity = lounge.capacity) {
	return JSON.stringify({
		cmd: "METRICS",
		args: {
			camera: { occupancy },
			zone: { id: Number(lounge.zoneId), max_capacity: capacity },
		},
	});
}

// A lounge's row on the page: the list item headed by its name.
function loungeRow(page: Page, lounge: Lounge) {
	return page
		.getByRole("listitem")
		.filter({ has: page.getByRole("heading", { name: lounge.name, exact: true }) });
}

// Checks a lounge's row shows a figure ("42 / 101") and a status line.
async function expectRow(
	page: Page,
	lounge: Lounge,
	status: string | RegExp,
	occupancy: number,
	capacity = lounge.capacity,
) {
	let row = loungeRow(page, lounge);
	await expect(row.getByText(`${occupancy} / ${capacity}`, { exact: true })).toBeVisible();
	await expect(row.getByText(status)).toBeVisible();
}

// Answers every occupancy feed the page opens, and returns each zone's socket once it's open.
// Pass the socket a zone had before to wait for the page to reconnect.
async function mockFeeds(page: Page) {
	let sockets = new Map<string, WebSocketRoute>();
	await page.routeWebSocket(
		(url) => url.searchParams.has("zone_id"),
		(ws) => {
			sockets.set(new URL(ws.url()).searchParams.get("zone_id")!, ws);
		},
	);
	return async (zoneId: string, replacing?: WebSocketRoute) => {
		await expect(() => {
			expect(sockets.has(zoneId)).toBe(true);
			expect(sockets.get(zoneId)).not.toBe(replacing);
		}).toPass();
		return sockets.get(zoneId)!;
	};
}

test("shows each lounge's occupancy from its own feed", async ({ page }) => {
	let feed = await mockFeeds(page);
	await page.goto("/");

	// A different value per zone, so a lounge reading another lounge's feed fails.
	for (let [index, lounge] of LOUNGES.entries()) {
		(await feed(lounge.zoneId)).send(occupancyMessage(lounge, 10 + index));
	}

	for (let [index, lounge] of LOUNGES.entries()) {
		await expectRow(page, lounge, /^Live/, 10 + index);
	}
});

test("shows every lounge, in order, as waiting until its feed reports", async ({ page }) => {
	let feed = await mockFeeds(page);
	await page.goto("/");

	await expect(page.getByRole("listitem").getByRole("heading")).toHaveText(
		LOUNGES.map((lounge) => lounge.name),
	);
	for (let lounge of LOUNGES) {
		await expect(loungeRow(page, lounge).getByText("Waiting for first report")).toBeVisible();
	}

	let [reporting, ...silent] = LOUNGES;
	(await feed(reporting.zoneId)).send(occupancyMessage(reporting, 42));

	await expectRow(page, reporting, /^Live/, 42);
	for (let lounge of silent) {
		await expect(loungeRow(page, lounge).getByText("Waiting for first report")).toBeVisible();
	}
});

test("updates a lounge when its feed reports again", async ({ page }) => {
	let feed = await mockFeeds(page);
	await page.goto("/");
	let lounge = LOUNGES[0];
	let ws = await feed(lounge.zoneId);

	ws.send(occupancyMessage(lounge, 42));
	await expectRow(page, lounge, /^Live/, 42);
	ws.send(occupancyMessage(lounge, 57));

	await expectRow(page, lounge, /^Live/, 57);
	await expect(
		loungeRow(page, lounge).getByText(`42 / ${lounge.capacity}`, { exact: true }),
	).toHaveCount(0);
});

test("says how full a live lounge is, to the nearest percent", async ({ page }) => {
	let feed = await mockFeeds(page);
	await page.goto("/");
	let lounge = LOUNGES[0];
	let ws = await feed(lounge.zoneId);

	for (let [occupancy, capacity, status] of [
		[50, 200, "Live · 25% full"],
		[1, 3, "Live · 33% full"],
		[2, 3, "Live · 67% full"],
		[250, 200, "Live · 125% full"],
	] as const) {
		ws.send(occupancyMessage(lounge, occupancy, capacity));
		await expectRow(page, lounge, status, occupancy, capacity);
	}
});

test("follows the capacity the feed reports", async ({ page }) => {
	let feed = await mockFeeds(page);
	await page.goto("/");
	let lounge = LOUNGES[0];
	let ws = await feed(lounge.zoneId);

	ws.send(occupancyMessage(lounge, 42, 150));
	await expectRow(page, lounge, /^Live/, 42, 150);
	ws.send(occupancyMessage(lounge, 42, 175));

	await expectRow(page, lounge, /^Live/, 42, 175);
});

test("marks a lounge not live while its feed reconnects, then recovers", async ({ page }) => {
	let feed = await mockFeeds(page);
	await page.goto("/");
	let lounge = LOUNGES[0];
	let ws = await feed(lounge.zoneId);
	ws.send(occupancyMessage(lounge, 42));
	await expectRow(page, lounge, /^Live/, 42);

	await ws.close();

	await expectRow(page, lounge, "Reconnecting · last figure shown", 42);
	let reopened = await feed(lounge.zoneId, ws);
	reopened.send(occupancyMessage(lounge, 43));
	await expectRow(page, lounge, /^Live/, 43);
});

test("shows an empty lounge", async ({ page }) => {
	let feed = await mockFeeds(page);
	await page.goto("/");
	let lounge = LOUNGES[0];

	(await feed(lounge.zoneId)).send(occupancyMessage(lounge, 0));

	await expectRow(page, lounge, /^Live/, 0);
});

test("keeps showing lounges when a feed sends something unreadable", async ({ page }) => {
	let feed = await mockFeeds(page);
	await page.goto("/");
	let [broken, healthy] = LOUNGES;
	let brokenWs = await feed(broken.zoneId);
	brokenWs.send(occupancyMessage(broken, 42));
	await expectRow(page, broken, /^Live/, 42);

	brokenWs.send("not json");
	brokenWs.send(JSON.stringify({ args: {} }));
	(await feed(healthy.zoneId)).send(occupancyMessage(healthy, 7));

	await expectRow(page, healthy, /^Live/, 7);
	await expectRow(page, broken, /^Live/, 42);
});

test("ignores unreadable messages without throwing", async ({ page }) => {
	let errors: Error[] = [];
	page.on("pageerror", (error) => errors.push(error));
	let feed = await mockFeeds(page);
	await page.goto("/");
	let lounge = LOUNGES[0];
	let ws = await feed(lounge.zoneId);

	ws.send("not json");
	ws.send(JSON.stringify({ args: {} }));
	ws.send(occupancyMessage(lounge, 42));

	await expectRow(page, lounge, /^Live/, 42);
	expect(errors).toEqual([]);
});
