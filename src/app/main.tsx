import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { LoungesPage } from "../lounges/lounges-page.tsx";
import "@fontsource-variable/inter/index.css";
import "./global.css";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<LoungesPage />
	</StrictMode>,
);
