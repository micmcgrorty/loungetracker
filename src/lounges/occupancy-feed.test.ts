import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { ConnectFeed, FeedHandlers, FeedState, WatchWakes } from "./occupancy-feed.ts";
import { watchOccupancy } from "./occupancy-feed.ts";

const ZONE_URL =
	"wss://api.livereachmedia.com/api/v1/marketing/displays/internal//ws?v=1&passive=true&zone_id=4111";

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

// The test adapter at the socket seam: records every socket the feed opens.
function fakeSockets() {
	let sockets: { url: string; handlers: FeedHandlers; closed: boolean }[] = [];
	let connect: ConnectFeed = (url, handlers) => {
		let socket = { url, handlers, closed: false };
		sockets.push(socket);
		return {
			close: () => {
				socket.closed = true;
			},
		};
	};
	return { connect, sockets, latest: () => sockets.at(-1)! };
}

// The test adapter for wake-ups: `wake()` plays the browser coming back online or into view.
function fakeWakes() {
	let listeners = new Set<() => void>();
	let wakes: WatchWakes = (onWake) => {
		listeners.add(onWake);
		return () => listeners.delete(onWake);
	};
	return { wakes, wake: () => listeners.forEach((onWake) => onWake()) };
}

function watch(zoneId = 4111) {
	let fake = fakeSockets();
	let { wakes, wake } = fakeWakes();
	let states: FeedState[] = [];
	let stop = watchOccupancy(zoneId, (state) => states.push(state), {
		connect: fake.connect,
		wakes,
	});
	return { ...fake, states, stop, wake, last: () => states.at(-1) };
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("watchOccupancy", () => {
	it("opens the zone's feed, exactly as the live API expects it", () => {
		let feed = watch(4111);

		expect(feed.sockets.map((socket) => socket.url)).toEqual([ZONE_URL]);
	});

	it("reports the occupancy and capacity the feed sends, as live", () => {
		let feed = watch();

		feed.latest().handlers.onMessage(LIVE_MESSAGE);

		expect(feed.last()).toEqual({ report: { occupancy: 46, capacity: 401 }, live: true });
	});

	it("reports an empty lounge as 0, not as no report", () => {
		let feed = watch();

		feed.latest().handlers.onMessage(report(0));

		expect(feed.last()).toEqual({ report: { occupancy: 0, capacity: 100 }, live: true });
	});

	it("ignores anything that isn't a complete report, keeping the last good one", () => {
		let feed = watch();
		feed.latest().handlers.onMessage(report(42));

		for (let data of [
			"not json",
			"null",
			"42",
			JSON.stringify({}),
			JSON.stringify({ args: {} }),
			JSON.stringify({ args: { camera: null } }),
			JSON.stringify({ args: { camera: { occupancy: 42 } } }),
			report("42"),
			report(-1),
			report(1.5),
			report(null),
			report(42, "401"),
			report(42, 0),
			report(42, -1),
			report(42, 1.5),
			report(42, null),
			new ArrayBuffer(8),
		]) {
			feed.latest().handlers.onMessage(data);
		}

		expect(feed.states).toEqual([{ report: { occupancy: 42, capacity: 100 }, live: true }]);
	});

	it("marks the last report not live when the feed closes, and reconnects after a second", () => {
		let feed = watch();
		feed.latest().handlers.onMessage(report(42));

		feed.latest().handlers.onClose();

		expect(feed.last()).toEqual({ report: { occupancy: 42, capacity: 100 }, live: false });
		vi.advanceTimersByTime(999);
		expect(feed.sockets).toHaveLength(1);
		vi.advanceTimersByTime(1);
		expect(feed.sockets).toHaveLength(2);
		expect(feed.latest().url).toBe(feed.sockets[0].url);

		feed.latest().handlers.onMessage(report(43));
		expect(feed.last()).toEqual({ report: { occupancy: 43, capacity: 100 }, live: true });
	});

	it("waits twice as long after each failed attempt, up to 30 seconds", () => {
		let feed = watch();
		let waits: number[] = [];

		for (let attempt = 0; attempt < 8; attempt++) {
			let sockets = feed.sockets.length;
			feed.latest().handlers.onClose();
			let waited = 0;
			while (feed.sockets.length === sockets) {
				vi.advanceTimersByTime(1000);
				waited += 1000;
			}
			waits.push(waited);
		}

		expect(waits).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000]);
	});

	it("waits a second again once a reconnected feed has reported", () => {
		let feed = watch();
		feed.latest().handlers.onClose();
		vi.advanceTimersByTime(1000);
		feed.latest().handlers.onClose();
		vi.advanceTimersByTime(2000);
		feed.latest().handlers.onMessage(report(42));

		feed.latest().handlers.onClose();
		vi.advanceTimersByTime(1000);

		expect(feed.sockets).toHaveLength(4);
	});

	it("stays live through a long silence, without reconnecting", () => {
		let feed = watch();
		feed.latest().handlers.onMessage(report(42));

		// The feed only sends when the figure changes, so a quiet hour is a healthy feed.
		vi.advanceTimersByTime(60 * 60_000);

		expect(feed.sockets).toHaveLength(1);
		expect(feed.sockets[0].closed).toBe(false);
		expect(feed.states).toEqual([{ report: { occupancy: 42, capacity: 100 }, live: true }]);
	});

	it("reconnects straight away when the browser wakes, staying live", () => {
		let feed = watch();
		feed.latest().handlers.onMessage(report(42));

		feed.wake();

		expect(feed.sockets).toHaveLength(2);
		expect(feed.sockets[0].closed).toBe(true);
		expect(feed.latest().url).toBe(feed.sockets[0].url);
		expect(feed.states).toEqual([{ report: { occupancy: 42, capacity: 100 }, live: true }]);
		feed.latest().handlers.onMessage(report(43));
		expect(feed.last()).toEqual({ report: { occupancy: 43, capacity: 100 }, live: true });
	});

	it("reconnects straight away when woken mid-wait, instead of waiting out the backoff", () => {
		let feed = watch();
		feed.latest().handlers.onClose();
		vi.advanceTimersByTime(500);

		feed.wake();

		expect(feed.sockets).toHaveLength(2);
		vi.advanceTimersByTime(10 * 60_000);
		expect(feed.sockets).toHaveLength(2);
	});

	it("stops listening for wake-ups once stopped", () => {
		let feed = watch();
		feed.stop();

		feed.wake();

		expect(feed.sockets).toHaveLength(1);
	});

	it("stops for good: closes its socket and never reconnects", () => {
		let feed = watch();
		feed.latest().handlers.onClose();

		feed.stop();
		vi.advanceTimersByTime(10 * 60_000);

		expect(feed.sockets).toHaveLength(1);

		let open = watch();
		open.stop();
		vi.advanceTimersByTime(10 * 60_000);

		expect(open.sockets).toHaveLength(1);
		expect(open.sockets[0].closed).toBe(true);
	});
});
