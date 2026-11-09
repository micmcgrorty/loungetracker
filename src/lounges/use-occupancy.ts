import { useState } from "react";
// The package is CommonJS only, and its default export doesn't survive ES module interop, so
// import the hook by name from its own file. Replace the package rather than add to this.
import { useWebSocket } from "react-use-websocket/dist/lib/use-websocket";

import { feedUrl, parseOccupancy } from "./occupancy-feed.ts";

/**
 * A zone's latest reported occupancy, or null until its feed reports one.
 * Messages that aren't occupancy reports are ignored, keeping the last good value.
 */
export function useOccupancy(zoneId: number): number | null {
	let [occupancy, setOccupancy] = useState<number | null>(null);
	useWebSocket(feedUrl(zoneId), {
		onMessage: (event) => {
			let reported = parseOccupancy(event.data);
			if (reported !== null) setOccupancy(reported);
		},
	});
	return occupancy;
}
