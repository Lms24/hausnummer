import type { Inputs } from './calc';
import { defaultInputs } from './defaults';

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
			const inputs = merge(defaultInputs(), JSON.parse(raw));
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
