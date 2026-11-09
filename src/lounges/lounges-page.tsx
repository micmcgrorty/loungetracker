import { LoungeOccupancy } from "./lounge-occupancy.tsx";
import { LOUNGES } from "./lounges.ts";
import styles from "./lounges-page.module.css";

export function LoungesPage() {
	return (
		<main className={styles.page}>
			<header className={styles.header}>
				<p className={styles.eyebrow}>Heathrow Terminal 5</p>
				<h1 className={styles.title}>Lounge occupancy</h1>
			</header>
			<ul className={styles.list}>
				{LOUNGES.map((lounge) => (
					<LoungeOccupancy key={lounge.zoneId} lounge={lounge} />
				))}
			</ul>
			<p className={styles.footnote}>Each lounge updates about every 15 seconds.</p>
		</main>
	);
}
