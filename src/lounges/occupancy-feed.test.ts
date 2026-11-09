import { describe, expect, it } from "vite-plus/test";

import { feedUrl, parseOccupancy } from "./occupancy-feed.ts";

function report(occupancy: unknown) {
	return JSON.stringify({ args: { camera: { occupancy } } });
}

describe("feedUrl", () => {
	it("is the zone's feed, exactly as the live API expects it", () => {
		expect(feedUrl(4111)).toBe(
			"wss://api.livereachmedia.com/api/v1/marketing/displays/internal//ws?v=1&passive=true&zone_id=4111",
		);
	});
});

describe("parseOccupancy", () => {
	it("reads the occupancy from a report", () => {
		expect(parseOccupancy(report(42))).toBe(42);
	});

	it("reads an empty lounge as 0, not as no report", () => {
		expect(parseOccupancy(report(0))).toBe(0);
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
			expect(parseOccupancy(data)).toBeNull();
		}
	});
});
