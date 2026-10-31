import type { Inputs } from './calc';
import { defaultInputs, PREVIOUS_DEFAULTS } from './defaults';

// Everything stays in this browser's localStorage. Nothing is sent anywhere.
const KEY = 'hausnummer:v1';
// The app was called Eigenheimlich before; still read inputs saved under that name.
const LEGACY_KEY = 'eigenheimlich:v1';

/** Deep-merge saved values over defaults so new fields survive old saves. */
function merge<T>(base: T, saved: unknown): T {
	if (Array.isArray(base)) {
		if (!Array.isArray(saved)) return base;
		return base.map((b, i) => merge(b, saved[i])) as T;
	}
	if (base && typeof base === 'object') {
		if (!saved || typeof saved !== 'object') return base;
		const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
		for (const k of Object.keys(out)) out[k] = merge(out[k], (saved as Record<string, unknown>)[k]);
		return out as T;
	}
	return typeof saved === typeof base ? (saved as T) : base;
}

export function load(): Inputs {
	try {
		const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
		if (raw) {
			const saved = JSON.parse(raw);
			const inputs = merge(defaultInputs(), saved);
			if (!('useAllEquity' in saved)) migrateDefaults(inputs);
			// The UI used to be English; translate untouched default names.
			const renamed: Record<string, string> = { Me: 'Ich', Her: 'Partnerin' };
			for (const p of inputs.persons) p.name = renamed[p.name] ?? p.name;
			return inputs;
		}
	} catch {
		// Private mode or corrupted data: fall back to defaults.
	}
	return defaultInputs();
}

/**
 * Saves from before Nov 2026 hold the old default rates and fees, and an
 * own-funds share measured against price + costs. Replace values the user
 * never changed with the current defaults.
 */
function migrateDefaults(inputs: Inputs): void {
	const fresh = defaultInputs();
	for (const k of Object.keys(PREVIOUS_DEFAULTS.rates) as (keyof typeof PREVIOUS_DEFAULTS.rates)[]) {
		if (inputs.rates[k] === PREVIOUS_DEFAULTS.rates[k]) inputs.rates[k] = fresh.rates[k];
	}
	for (const k of Object.keys(PREVIOUS_DEFAULTS.costs) as (keyof typeof PREVIOUS_DEFAULTS.costs)[]) {
		if (inputs.costs[k] === PREVIOUS_DEFAULTS.costs[k]) inputs.costs[k] = fresh.costs[k];
	}
	inputs.equityShare = fresh.equityShare;
}

export function save(inputs: Inputs): void {
	try {
		localStorage.setItem(KEY, JSON.stringify(inputs));
	} catch {
		// Storage unavailable; values just won't persist.
	}
}

export function clear(): void {
	try {
		localStorage.removeItem(KEY);
		localStorage.removeItem(LEGACY_KEY);
	} catch {
		// ignore
	}
}
