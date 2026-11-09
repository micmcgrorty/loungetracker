import { useEffect, useState } from "react";

import { watchOccupancy, type FeedState } from "./occupancy-feed.ts";

const WAITING: FeedState = { report: null, live: false };

/** What a zone's occupancy feed currently says. See `watchOccupancy` for how it behaves. */
export function useOccupancy(zoneId: number): FeedState {
	let [state, setState] = useState(WAITING);
	useEffect(() => watchOccupancy(zoneId, setState), [zoneId]);
	return state;
}
