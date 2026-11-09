import react from "@vitejs/plugin-react";
import { REACT_DOCTOR_RULES, RECOMMENDED_RULES } from "oxlint-plugin-react-doctor";
import { defineConfig } from "vite-plus";

// React Doctor re-implements Oxlint's react and jsx-a11y rules, which run natively here, so its
// ports of other plugins' rules are dropped, except these, which Oxlint has no equivalent of.
const REACT_DOCTOR_PORTS_TO_KEEP = new Set([
	"no-adjust-state-on-prop-change",
	"no-chain-state-updates",
	"no-derived-state",
	"no-event-handler",
	"no-initialize-state",
	"no-pass-data-to-parent",
	"no-pass-live-state-to-parent",
	"no-reset-all-state-on-prop-change",
]);
const reactDoctorPorts = new Set(
	REACT_DOCTOR_RULES.filter(
		(rule) => rule.originallyExternal && !REACT_DOCTOR_PORTS_TO_KEEP.has(rule.id),
	).map((rule) => rule.key),
);
const reactDoctorRules = Object.fromEntries(
	Object.entries(RECOMMENDED_RULES).filter(([key]) => !reactDoctorPorts.has(key)),
);

export default defineConfig({
	plugins: [react()],
	preview: {
		port: 4173,
		strictPort: true,
	},
	test: {
		include: ["src/**/*.test.ts"],
	},
	fmt: {
		useTabs: true,
		printWidth: 100,
		ignorePatterns: ["package-lock.json", "dist/**"],
	},
	lint: {
		plugins: ["typescript", "unicorn", "oxc", "import", "react", "jsx-a11y", "vitest"],
		jsPlugins: [{ name: "react-doctor", specifier: "oxlint-plugin-react-doctor" }],
		categories: {
			correctness: "error",
			suspicious: "warn",
		},
		rules: {
			...reactDoctorRules,
			"react/react-in-jsx-scope": "off",
			"import/no-unassigned-import": ["warn", { allow: ["**/*.css"] }],
		},
		env: {
			browser: true,
			builtin: true,
		},
		ignorePatterns: ["dist/**"],
		options: {
			typeAware: true,
			typeCheck: true,
		},
	},
});
