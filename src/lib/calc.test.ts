import { describe, expect, it } from 'vitest';
import {
	affordability,
	allEquityShare,
	annuity,
	feasibleShareRange,
	FIXATIONS,
	presentValue,
	scenario,
	schedule,
	snapShare,
	stressApplies,
	TERMS,
	type Inputs
} from './calc';
import { defaultInputs } from './defaults';

const allPass = (inp: Inputs) => Object.values(scenario(inp).checks).every(Boolean);

/** Deterministic pseudo-random numbers so failures are reproducible. */
function rng(seed: number) {
	return () => {
		seed = (seed * 1664525 + 1013904223) % 4294967296;
		return seed / 4294967296;
	};
}

function randomHousehold(next: () => number): Inputs {
	const between = (lo: number, hi: number) => Math.round(lo + next() * (hi - lo));
	const inp = defaultInputs();
	inp.persons[0].netMonthly = between(1200, 6000);
	inp.persons[1].netMonthly = between(0, 5000);
	inp.persons[0].payments = next() < 0.5 ? 12 : 14;
	inp.persons[1].payments = next() < 0.5 ? 12 : 14;
	inp.persons[0].equity = between(10_000, 300_000);
	inp.persons[1].equity = between(0, 200_000);
	inp.otherDebtMonthly = next() < 0.3 ? between(0, 600) : 0;
	inp.termYears = TERMS[Math.floor(next() * TERMS.length)];
	const fixations = FIXATIONS.filter((f) => f.years <= inp.termYears);
	inp.fixation = fixations[Math.floor(next() * fixations.length)].id;
	inp.costs.useMakler = next() < 0.5;
	inp.price = between(150_000, 900_000);
	return inp;
}

describe('annuity', () => {
	it('matches a known value', () => {
		// 260,000 € over 25 years at 3.75 % nominal
		expect(annuity(260_000, 3.75, 25)).toBeCloseTo(1336.75, 1);
	});

	it('handles a zero interest rate', () => {
		expect(annuity(120_000, 0, 10)).toBeCloseTo(1000, 6);
	});

	it('is inverted by presentValue', () => {
		for (const rate of [0, 2.5, 4.2, 7]) {
			expect(presentValue(annuity(400_000, rate, 30), rate, 30)).toBeCloseTo(400_000, 4);
		}
	});

	it('pays the loan off exactly over the schedule', () => {
		const rows = schedule(300_000, 4.2, 25);
		expect(rows).toHaveLength(25);
		expect(rows.at(-1)!.balance).toBeCloseTo(0, 4);
		const principal = rows.reduce((s, r) => s + r.principal, 0);
		expect(principal).toBeCloseTo(300_000, 4);
	});
});

describe('stress test', () => {
	it('applies to variable rates and fixed periods under 10 years', () => {
		const inp = defaultInputs();
		expect(stressApplies({ ...inp, fixation: 'variable' })).toBe(true);
		expect(stressApplies({ ...inp, fixation: 'fix5' })).toBe(true);
		expect(stressApplies({ ...inp, fixation: 'fix10' })).toBe(false);
		// A 5-year fixed rate over a 5-year term is fixed for the whole loan.
		expect(stressApplies({ ...inp, fixation: 'fix5', termYears: 5 })).toBe(false);
	});
});

describe('scenario', () => {
	it('treats the share as a share of the purchase price', () => {
		const s = scenario({ ...defaultInputs(), useAllEquity: false, equityShare: 20, price: 400_000 });
		expect(s.loan).toBeCloseTo(320_000, 6);
		expect(s.ltvPct).toBeCloseTo(80, 6);
		// Own funds pay the remaining 20 % plus all purchase costs.
		expect(s.equityUsed).toBeCloseTo(80_000 + s.costs, 6);
	});

	it('uses exactly all own funds when asked to', () => {
		const inp = { ...defaultInputs(), useAllEquity: true, price: 420_000 };
		const s = scenario(inp);
		expect(s.equityUsed).toBeCloseTo(100_000, 4);
		expect(s.share).toBeCloseTo(allEquityShare(inp), 8);
	});

	it('round-trips between equity mode and price mode', () => {
		const inp = { ...defaultInputs(), priceMode: 'equity' as const, equityShare: 50 };
		const e = scenario(inp);
		expect(e.equityUsed).toBeCloseTo(100_000, 4);
		const p = scenario({ ...inp, priceMode: 'price', price: e.price, useAllEquity: false });
		expect(p.loan).toBeCloseTo(e.loan, 4);
		expect(p.equityUsed).toBeCloseTo(e.equityUsed, 4);
	});

	it('flags loans above the loan-to-value limit', () => {
		const s = scenario({ ...defaultInputs(), useAllEquity: false, equityShare: 5 });
		expect(s.checks.ltv).toBe(false);
	});
});

describe('affordability', () => {
	it('the max price uses all own funds and passes every rule', () => {
		const next = rng(1);
		for (let k = 0; k < 500; k++) {
			const inp = randomHousehold(next);
			const a = affordability(inp);
			const s = scenario({ ...inp, priceMode: 'price', price: a.maxPrice, useAllEquity: true });
			expect(s.loan).toBeCloseTo(a.maxLoan, 2);
			expect(s.equityUsed).toBeCloseTo(a.equity, 2);
			expect(Object.values(s.checks).every(Boolean)).toBe(true);
		}
	});

	it('a slightly higher price breaks a rule', () => {
		const next = rng(2);
		for (let k = 0; k < 200; k++) {
			const inp = randomHousehold(next);
			const a = affordability(inp);
			const over = { ...inp, priceMode: 'price' as const, useAllEquity: true, price: a.maxPrice * 1.01 };
			expect(allPass(over)).toBe(false);
		}
	});

	it('equity mode at the minimum share reaches the max price when own funds bind', () => {
		const inp = defaultInputs();
		const a = affordability(inp);
		expect(a.binding).toBe('equity');
		const s = scenario({ ...inp, priceMode: 'equity', equityShare: 100 - inp.limits.ltv });
		expect(s.price).toBeCloseTo(a.maxPrice, 2);
	});
});

describe('feasibleShareRange', () => {
	it('snapped shares always pass every rule', () => {
		const next = rng(3);
		for (let k = 0; k < 500; k++) {
			const inp = { ...randomHousehold(next), useAllEquity: false };
			for (const priceMode of ['price', 'equity'] as const) {
				const range = feasibleShareRange({ ...inp, priceMode });
				if (!range) continue;
				for (const to of ['min', 'max'] as const) {
					if (priceMode === 'equity' && to === 'max') continue;
					const share = snapShare(range, to);
					expect(allPass({ ...inp, priceMode, equityShare: share })).toBe(true);
				}
			}
		}
	});

	it('the "use max price" flow passes every rule', () => {
		const next = rng(4);
		for (let k = 0; k < 500; k++) {
			const inp = randomHousehold(next);
			const price = Math.floor(affordability(inp).maxPrice / 1000) * 1000;
			expect(allPass({ ...inp, priceMode: 'price', price, useAllEquity: true })).toBe(true);
		}
	});
});
