/** A lounge and the zone its occupancy feed reports on. */
export interface Lounge {
	name: string;
	zoneId: number;
	capacity: number;
}

/** Every lounge the page shows, in display order. */
export const LOUNGES: Lounge[] = [
	{ name: "Concorde Room", zoneId: 4111, capacity: 188 },
	{ name: "First Lounge", zoneId: 4112, capacity: 418 },
	{ name: "South Lounge", zoneId: 4113, capacity: 627 },
	{ name: "North Lounge", zoneId: 4114, capacity: 305 },
	{ name: "B Gates Lounge", zoneId: 4115, capacity: 216 },
];
