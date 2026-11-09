const FEED_URL = "wss://api.livereachmedia.com/api/v1/marketing/displays/internal//ws";

/** The websocket URL that reports a zone's occupancy. */
export function feedUrl(zoneId: number): string {
	let url = new URL(FEED_URL);
	url.search = new URLSearchParams({ v: "1", passive: "true", zone_id: String(zoneId) }).toString();
	return url.toString();
}

/**
 * Reads the occupancy from a feed message, or null if the message isn't an occupancy report.
 * Never throws: the feed is a third-party API, so anything it sends is untrusted.
 */
export function parseOccupancy(data: unknown): number | null {
	if (typeof data !== "string") return null;
	let message: unknown;
	try {
		message = JSON.parse(data);
	} catch {
		return null;
	}
	let occupancy = field(field(field(message, "args"), "camera"), "occupancy");
	return typeof occupancy === "number" && Number.isInteger(occupancy) && occupancy >= 0
		? occupancy
		: null;
}

function field(value: unknown, key: string): unknown {
	return typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined;
}
