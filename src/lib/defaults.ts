import type { Inputs } from './calc';

/** When the default rates and rules below were last researched. */
export const RATES_AS_OF = 'Oktober 2026';

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
		termYears: 30,
		fixation: 'fix20',
		// Typical offers for good credit in Austria, Oct 2026. Best-case broker
		// rates: variable 3.20, 10 y 3.75, 20 y 3.95, 30 y 4.35 (Optifin,
		// 21.10.2026); market index: variable 3.66, 20 y 4.33 (Infina, Oct 2026);
		// OeNB average of new housing loans 3.61 (Aug 2026). 5/15/25 y are
		// interpolated.
		rates: {
			variable: 3.45,
			fix5: 3.6,
			fix10: 3.8,
			fix15: 3.95,
			fix20: 4.1,
			fix25: 4.25,
			fix30: 4.4
		},
		costs: {
			grest: 3.5,
			grundbuch: 1.1,
			makler: 3.6,
			useMakler: true,
			notar: 1.8,
			pfand: 1.2,
			pfandFactor: 120,
			bankFee: 1.0
		},
		limits: {
			dsti: 40,
			ltv: 90,
			maxTerm: 35,
			stressAddon: 2
		}
	};
}
