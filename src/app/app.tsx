import { useState } from "react";
// The package is CommonJS only, and its default export doesn't survive ES module interop, so
// import the hook by name from its own file. Replace the package rather than add to this.
import { useWebSocket } from "react-use-websocket/dist/lib/use-websocket";
import "./app.css";

const CONCORDE_WS_URL =
	"wss://api.livereachmedia.com/api/v1/marketing/displays/internal//ws?v=1&passive=true&zone_id=4111";
const FIRST_WS_URL =
	"wss://api.livereachmedia.com/api/v1/marketing/displays/internal//ws?v=1&passive=true&zone_id=4112";
const SOUTH_WS_URL =
	"wss://api.livereachmedia.com/api/v1/marketing/displays/internal//ws?v=1&passive=true&zone_id=4113";
const NORTH_WS_URL =
	"wss://api.livereachmedia.com/api/v1/marketing/displays/internal//ws?v=1&passive=true&zone_id=4114";
const B_WS_URL =
	"wss://api.livereachmedia.com/api/v1/marketing/displays/internal//ws?v=1&passive=true&zone_id=4115";

function App() {
	const [concordeOccupancy, setConcordeOccupancy] = useState<number | null>(null);
	const [firstOccupancy, setFirstOccupancy] = useState<number | null>(null);
	const [southOccupancy, setSouthOccupancy] = useState<number | null>(null);
	const [northOccupancy, setNorthOccupancy] = useState<number | null>(null);
	const [bOccupancy, setBOccupancy] = useState<number | null>(null);

	useWebSocket(CONCORDE_WS_URL, {
		onMessage: (payload) => {
			const data = JSON.parse(payload.data);
			setConcordeOccupancy(data.args.camera.occupancy);
		},
	});
	useWebSocket(FIRST_WS_URL, {
		onMessage: (payload) => {
			const data = JSON.parse(payload.data);
			setFirstOccupancy(data.args.camera.occupancy);
		},
	});
	useWebSocket(SOUTH_WS_URL, {
		onMessage: (payload) => {
			const data = JSON.parse(payload.data);
			setSouthOccupancy(data.args.camera.occupancy);
		},
	});
	useWebSocket(NORTH_WS_URL, {
		onMessage: (payload) => {
			const data = JSON.parse(payload.data);
			setNorthOccupancy(data.args.camera.occupancy);
		},
	});
	useWebSocket(B_WS_URL, {
		onMessage: (payload) => {
			const data = JSON.parse(payload.data);
			setBOccupancy(data.args.camera.occupancy);
		},
	});

	return (
		<div>
			{concordeOccupancy && (
				<p>Concorde Room occupancy is currently {concordeOccupancy} out of 188.</p>
			)}
			{firstOccupancy && <p>First Lounge occupancy is currently {firstOccupancy} out of 418.</p>}
			{southOccupancy && <p>South Lounge occupancy is currently {southOccupancy} out of 627.</p>}
			{northOccupancy && <p>North Lounge occupancy is currently {northOccupancy} out of 305.</p>}
			{bOccupancy && <p>B Gates Lounge occupancy is currently {bOccupancy} out of 216.</p>}
		</div>
	);
}

export default App;
