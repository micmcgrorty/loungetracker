const FEED_URL = "wss://api.livereachmedia.com/api/v1/marketing/displays/internal//ws";

/** The websocket URL that reports a zone's occupancy. */
export function feedUrl(zoneId: number): string {
	let url = new URL(FEED_URL);
	url.search = new URLSearchParams({ v: "1", passive: "true", zone_id: String(zoneId) }).toString();
	return url.toString();
}

/** What a zone's feed reports: how many people are in the lounge, and how many it holds. */
export interface OccupancyReport {
	occupancy: number;
	capacity: number;
}

/**
 * Reads a feed message, or null if the message isn't an occupancy report.
 * Never throws: the feed is a third-party API, so anything it sends is untrusted.
 */
export function parseReport(data: unknown): OccupancyReport | null {
	if (typeof data !== "string") return null;
	let message: unknown;
	try {
		message = JSON.parse(data);
	} catch {
		return null;
	}
	let args = field(message, "args");
	let occupancy = field(field(args, "camera"), "occupancy");
	let capacity = field(field(args, "zone"), "max_capacity");
	return isCount(occupancy, 0) && isCount(capacity, 1) ? { occupancy, capacity } : null;
}

function isCount(value: unknown, min: number): value is number {
	return typeof value === "number" && Number.isInteger(value) && value >= min;
}

function field(value: unknown, key: string): unknown {
	return typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined;
}
