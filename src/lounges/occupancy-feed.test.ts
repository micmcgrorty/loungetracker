import { describe, expect, it } from "vite-plus/test";

import { feedUrl, parseReport } from "./occupancy-feed.ts";

// A message captured from the live feed for zone 4114.
const LIVE_MESSAGE = JSON.stringify({
	id: "00000000-0000-0000-0000-000000000000",
	type: "command",
	display_id: 565,
	cmd: "METRICS",
	args: {
		iap: { headcount: 0, dwelltime: 0 },
		camera: { occupancy: 46 },
		timestamp: "2026-11-09T21:30:49.572687646Z",
		mask: { positive: 0, total: 0 },
		zone: { id: 4114, max_capacity: 401, comfort_factor: 0.8 },
		valid: true,
	},
});

function report(occupancy: unknown, capacity: unknown = 100) {
	return JSON.stringify({ args: { camera: { occupancy }, zone: { max_capacity: capacity } } });
}

describe("feedUrl", () => {
	it("is the zone's feed, exactly as the live API expects it", () => {
		expect(feedUrl(4111)).toBe(
			"wss://api.livereachmedia.com/api/v1/marketing/displays/internal//ws?v=1&passive=true&zone_id=4111",
		);
	});
});

describe("parseReport", () => {
	it("reads the occupancy and capacity from a live report", () => {
		expect(parseReport(LIVE_MESSAGE)).toEqual({ occupancy: 46, capacity: 401 });
	});

	it("reads an empty lounge as 0, not as no report", () => {
		expect(parseReport(report(0))).toEqual({ occupancy: 0, capacity: 100 });
	});

	it("returns null for anything that isn't an occupancy report", () => {
		for (let data of [
			"not json",
			"null",
			"42",
			JSON.stringify({}),
			JSON.stringify({ args: {} }),
			JSON.stringify({ args: { camera: null } }),
			report("42"),
			report(-1),
			report(1.5),
			report(null),
			new ArrayBuffer(8),
		]) {
			expect(parseReport(data)).toBeNull();
		}
	});

	it("returns null for a report without a usable capacity", () => {
		for (let data of [
			JSON.stringify({ args: { camera: { occupancy: 42 } } }),
			JSON.stringify({ args: { camera: { occupancy: 42 }, zone: {} } }),
			report(42, "401"),
			report(42, 0),
			report(42, -1),
			report(42, 1.5),
			report(42, null),
		]) {
			expect(parseReport(data)).toBeNull();
		}
	});
});
