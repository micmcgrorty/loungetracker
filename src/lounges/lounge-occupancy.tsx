import styles from "./lounge-occupancy.module.css";
import type { Lounge } from "./lounges.ts";
import { useOccupancy } from "./use-occupancy.ts";

/** One lounge's row. Each lounge owns its own feed. */
export function LoungeOccupancy({ lounge }: { lounge: Lounge }) {
	let { report, live } = useOccupancy(lounge.zoneId);
	let state = report === null ? "waiting" : live ? "live" : "reconnecting";
	let full = report === null ? 0 : report.occupancy / report.capacity;
	return (
		<li className={`${styles.row} ${styles[state]}`}>
			<div className={styles.summary}>
				<div className={styles.identity}>
					<h2 className={styles.name}>{lounge.name}</h2>
					<p className={styles.status}>
						<span className={styles.dot} aria-hidden="true" />
						<span>
							{state === "waiting"
								? "Waiting for first report"
								: state === "live"
									? `Live · ${Math.round(full * 100)}% full`
									: "Reconnecting · last figure shown"}
						</span>
					</p>
				</div>
				{report === null ? (
					<p className={styles.figure} aria-hidden="true">
						<span className={styles.occupancy}>–</span>
					</p>
				) : (
					<p className={styles.figure}>
						<span className={styles.occupancy}>{report.occupancy}</span>
						<span className={styles.capacity}> / {report.capacity}</span>
					</p>
				)}
			</div>
			<div className={styles.track} aria-hidden="true">
				<div className={styles.fill} style={{ width: `${Math.min(full, 1) * 100}%` }} />
			</div>
		</li>
	);
}
