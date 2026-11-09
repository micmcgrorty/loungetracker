import { useState } from "react";
// The package is CommonJS only, and its default export doesn't survive ES module interop, so
// import the hook by name from its own file. Replace the package rather than add to this.
import { useWebSocket } from "react-use-websocket/dist/lib/use-websocket";

import { feedUrl, parseReport, type OccupancyReport } from "./occupancy-feed.ts";

/**
 * A zone's latest occupancy report, or null until its feed sends one.
 * Messages that aren't occupancy reports are ignored, keeping the last good report.
 */
export function useOccupancy(zoneId: number): OccupancyReport | null {
	let [report, setReport] = useState<OccupancyReport | null>(null);
	useWebSocket(feedUrl(zoneId), {
		onMessage: (event) => {
			let reported = parseReport(event.data);
			if (reported !== null) setReport(reported);
		},
	});
	return report;
}
