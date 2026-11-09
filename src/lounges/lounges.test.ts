import { expect, it } from "vite-plus/test";

import { LOUNGES } from "./lounges.ts";

it("reads each lounge from its own zone", () => {
	let zones = LOUNGES.map((lounge) => lounge.zoneId);
	expect(new Set(zones).size).toBe(zones.length);
});
