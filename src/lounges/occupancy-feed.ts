const FEED_URL = "wss://api.livereachmedia.com/api/v1/marketing/displays/internal//ws";

/** The websocket URL that reports a zone's occupancy. */
function feedUrl(zoneId: number): string {
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
function parseReport(data: unknown): OccupancyReport | null {
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

// After a feed drops, wait this long before reconnecting, doubling after each failed attempt.
const FIRST_RETRY_MS = 1000;
const MAX_RETRY_MS = 30_000;

/** What a lounge's feed currently says: its latest report, and whether that report is live. */
export interface FeedState {
	report: OccupancyReport | null;
	live: boolean;
}

/** What a socket tells the feed. */
export interface FeedHandlers {
	onMessage(data: unknown): void;
	onClose(): void;
}

/**
 * The seam between a feed and its socket: opens a socket to `url`. Once the feed closes the
 * socket, the socket must not call its handlers again.
 */
export type ConnectFeed = (url: string, handlers: FeedHandlers) => { close(): void };

/** The browser's WebSocket, as a feed socket. */
export const connectWebSocket: ConnectFeed = (url, handlers) => {
	let socket = new WebSocket(url);
	let open = true;
	socket.addEventListener("message", (event) => {
		if (open) handlers.onMessage(event.data);
	});
	// A socket that fails to connect fires "error" then "close", so "close" covers both.
	socket.addEventListener("close", () => {
		if (open) handlers.onClose();
	});
	return {
		close() {
			open = false;
			socket.close();
		},
	};
};

/**
 * The seam for wake-ups: calls `onWake` whenever the browser has reason to think a socket may have
 * died without closing, and returns a function that stops listening.
 */
export type WatchWakes = (onWake: () => void) => () => void;

/** The browser's wake-ups: coming back online, or the page becoming visible again. */
export const browserWakes: WatchWakes = (onWake) => {
	let onVisibilityChange = () => {
		if (document.visibilityState === "visible") onWake();
	};
	window.addEventListener("online", onWake);
	document.addEventListener("visibilitychange", onVisibilityChange);
	return () => {
		window.removeEventListener("online", onWake);
		document.removeEventListener("visibilitychange", onVisibilityChange);
	};
};

/**
 * Watches a zone's occupancy feed, calling `onChange` whenever what it says changes.
 * Returns a function that stops watching for good.
 *
 * Messages that aren't complete reports are ignored, keeping the last good report. The feed only
 * sends when the figure changes, so silence is normal, never a sign of a drop. When the feed
 * closes or fails, the last report stays but is no longer live, and the feed reconnects after a
 * second, doubling the wait after each failed attempt up to 30 seconds. A report resets the wait.
 *
 * A socket can also die without closing, for example while a laptop sleeps. So whenever the
 * browser wakes (`wakes`), the feed reconnects straight away. The server sends the current figure
 * as soon as a socket opens, so the lounge stays live throughout.
 */
export function watchOccupancy(
	zoneId: number,
	onChange: (state: FeedState) => void,
	{
		connect = connectWebSocket,
		wakes = browserWakes,
	}: { connect?: ConnectFeed; wakes?: WatchWakes } = {},
): () => void {
	let state: FeedState = { report: null, live: false };
	let socket: { close(): void };
	let reconnect: ReturnType<typeof setTimeout> | undefined;
	let wait = FIRST_RETRY_MS;

	function update(next: FeedState) {
		state = next;
		onChange(state);
	}

	function dropped() {
		if (state.live) update({ ...state, live: false });
		reconnect = setTimeout(open, wait);
		wait = Math.min(wait * 2, MAX_RETRY_MS);
	}

	function open() {
		socket = connect(feedUrl(zoneId), {
			onMessage(data) {
				let report = parseReport(data);
				if (report === null) return;
				wait = FIRST_RETRY_MS;
				update({ report, live: true });
			},
			onClose: dropped,
		});
	}

	function woken() {
		clearTimeout(reconnect);
		socket.close();
		open();
	}

	open();
	let stopWakes = wakes(woken);
	return () => {
		stopWakes();
		clearTimeout(reconnect);
		socket.close();
	};
}
