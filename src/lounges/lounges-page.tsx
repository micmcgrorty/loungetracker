import { LoungeOccupancy } from "./lounge-occupancy.tsx";
import { LOUNGES } from "./lounges.ts";
import styles from "./lounges-page.module.css";

export function LoungesPage() {
	return (
		<main className={styles.page}>
			{LOUNGES.map((lounge) => (
				<LoungeOccupancy key={lounge.zoneId} lounge={lounge} />
			))}
		</main>
	);
}
