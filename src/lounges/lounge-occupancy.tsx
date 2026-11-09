import type { Lounge } from "./lounges.ts";
import { useOccupancy } from "./use-occupancy.ts";

/**
 * One lounge's occupancy, once its feed has reported. While the feed reconnects, the last figure
 * stays, marked as not live. Each lounge owns its own feed.
 */
export function LoungeOccupancy({ lounge }: { lounge: Lounge }) {
	let { report, live } = useOccupancy(lounge.zoneId);
	if (report === null) return null;
	return (
		<p>
			{live
				? `${lounge.name} occupancy is currently ${report.occupancy} out of ${report.capacity}.`
				: `${lounge.name} occupancy was ${report.occupancy} out of ${report.capacity} (reconnecting…).`}
		</p>
	);
}
