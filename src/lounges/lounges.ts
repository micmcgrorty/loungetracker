/** A lounge and the zone its occupancy feed reports on. Its capacity comes from the feed. */
export interface Lounge {
	name: string;
	zoneId: number;
}

/** Every lounge the page shows, in display order. */
export const LOUNGES: Lounge[] = [
	{ name: "Concorde Room", zoneId: 4111 },
	{ name: "First Lounge", zoneId: 4112 },
	{ name: "South Lounge", zoneId: 4113 },
	{ name: "North Lounge", zoneId: 4114 },
	{ name: "B Gates Lounge", zoneId: 4115 },
];
