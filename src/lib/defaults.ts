import type { Inputs } from './calc';

/** When the default rates and rules below were last researched. */
export const RATES_AS_OF = 'Oktober 2026';

// Typical nominal offers for good credit in Austria, Oct 2026: Infina
// Kredit-Index 10/2026 (variable 3.66, 20 y 4.33; Q3 averages 10 y 4.21,
// 15 y 4.34), Optifin best rates (variable 3.20, 20 y 3.95, 30 y 4.35), OeNB
// average of new housing loans 3.61 (Aug 2026). 5/25 y interpolated.
const DEFAULT_RATES = {
	variable: 3.55,
	fix5: 3.75,
	fix10: 4.0,
	fix15: 4.15,
	fix20: 4.2,
	fix25: 4.3,
	fix30: 4.4
};

/** Defaults before Nov 2026, used to update values a user never changed. */
export const PREVIOUS_DEFAULTS = {
	rates: { variable: 3.45, fix5: 3.6, fix10: 3.8, fix15: 3.95, fix20: 4.1, fix25: 4.25, fix30: 4.4 },
	costs: { notar: 1.8, bankFee: 1.0 }
};

export function defaultInputs(): Inputs {
	return {
		persons: [
			{ name: 'Ich', netMonthly: 2800, payments: 14, equity: 60000 },
			{ name: 'Partnerin', netMonthly: 2600, payments: 14, equity: 40000 }
		],
		otherDebtMonthly: 0,
		priceMode: 'price',
		price: 420000,
		equityShare: 20,
		useAllEquity: true,
		termYears: 30,
		fixation: 'fix20',
		rates: { ...DEFAULT_RATES },
		costs: {
			grest: 3.5,
			grundbuch: 1.1,
			makler: 3.6,
			useMakler: true,
			notar: 1.5,
			pfand: 1.2,
			pfandFactor: 120,
			bankFee: 0.5
		},
		limits: {
			dsti: 40,
			ltv: 90,
			maxTerm: 35,
			stressAddon: 2
		}
	};
}
