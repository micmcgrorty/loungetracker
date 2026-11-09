import type { Lounge } from "./lounges.ts";
import { useOccupancy } from "./use-occupancy.ts";

/** One lounge's occupancy, once its feed has reported. Each lounge owns its own feed. */
export function LoungeOccupancy({ lounge }: { lounge: Lounge }) {
	let report = useOccupancy(lounge.zoneId);
	if (report === null) return null;
	return (
		<p>{`${lounge.name} occupancy is currently ${report.occupancy} out of ${report.capacity}.`}</p>
	);
}
