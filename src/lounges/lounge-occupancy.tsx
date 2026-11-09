import type { Lounge } from "./lounges.ts";
import { useOccupancy } from "./use-occupancy.ts";

/** One lounge's occupancy, once its feed has reported. Each lounge owns its own feed. */
export function LoungeOccupancy({ lounge }: { lounge: Lounge }) {
	let occupancy = useOccupancy(lounge.zoneId);
	if (occupancy === null) return null;
	return <p>{`${lounge.name} occupancy is currently ${occupancy} out of ${lounge.capacity}.`}</p>;
}
