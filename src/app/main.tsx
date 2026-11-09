import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { LoungesPage } from "../lounges/lounges-page.tsx";
import "./global.css";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<LoungesPage />
	</StrictMode>,
);
