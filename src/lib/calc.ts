// Mortgage maths for Austrian residential loans (Wohnkredite).
//
// Austrian rules (see README for sources):
// - Beleihungsquote (loan-to-value) max. 90 % of the property value. Purchase
//   costs (Nebenkosten) are on top, so in practice ~20 % own funds are needed.
// - Schuldendienstquote (debt-service-to-income) max. 40 % of net household
//   income, including all other loan payments.
// - Max. term 35 years.
// Since 1 July 2025 these are no longer the legally binding KIM-Verordnung but
// an FMA circular plus the FMSG's expectation that banks stick to them (with
// at most 20 % exceptions per quarter). Banks still apply them by default.

export const TERMS = [5, 10, 15, 20, 25, 30, 35] as const;

export type Fixation = 'variable' | 'fix5' | 'fix10' | 'fix15' | 'fix20' | 'fix25' | 'fix30';

export const FIXATIONS: { id: Fixation; label: string; years: number }[] = [
	{ id: 'variable', label: 'Variabel', years: 0 },
	{ id: 'fix5', label: '5 J. fix', years: 5 },
	{ id: 'fix10', label: '10 J. fix', years: 10 },
	{ id: 'fix15', label: '15 J. fix', years: 15 },
	{ id: 'fix20', label: '20 J. fix', years: 20 },
	{ id: 'fix25', label: '25 J. fix', years: 25 },
	{ id: 'fix30', label: '30 J. fix', years: 30 }
];

export interface Person {
	name: string;
	/** Net monthly salary in EUR */
	netMonthly: number;
	/** Austrian salaries are usually paid 14× (13th/14th = Sonderzahlungen) */
	payments: 12 | 14;
	/** Savings available as own funds (Eigenmittel) */
	equity: number;
}

export interface Costs {
	/** Grunderwerbsteuer, % vom Kaufpreis */
	grest: number;
	/** Grundbucheintragungsgebühr (ownership), % vom Kaufpreis */
	grundbuch: number;
	/** Maklerprovision incl. 20 % USt, % vom Kaufpreis */
	makler: number;
	useMakler: boolean;
	/** Vertragserrichtung + Treuhand incl. USt, % vom Kaufpreis */
	notar: number;
	/** Pfandrechtseintragungsgebühr, % of the registered mortgage amount */
	pfand: number;
	/** Registered Höchstbetragshypothek as % of the loan (usually 120–130 %) */
	pfandFactor: number;
	/** Bank processing fee (Bearbeitungsgebühr), % of the loan */
	bankFee: number;
}

export interface Limits {
	/** Max debt-service-to-income, % */
	dsti: number;
	/** Max loan-to-value, % */
	ltv: number;
	maxTerm: number;
	/** Extra percentage points used to assess affordability of short fixations */
	stressAddon: number;
}

export interface Inputs {
	persons: [Person, Person];
	otherDebtMonthly: number;
	priceMode: 'price' | 'equity';
	price: number;
	/** Share of the total cost (price + Nebenkosten) paid with own funds, % */
	equityShare: number;
	termYears: number;
	fixation: Fixation;
	/** Nominal interest rates, % p.a. */
	rates: Record<Fixation, number>;
	costs: Costs;
	limits: Limits;
}

/** Monthly annuity payment for a loan amount. */
export function annuity(loan: number, ratePct: number, years: number): number {
	const n = years * 12;
	if (loan <= 0 || n <= 0) return 0;
	const i = ratePct / 100 / 12;
	if (i === 0) return loan / n;
	return (loan * i) / (1 - Math.pow(1 + i, -n));
}

/** Loan amount a monthly payment can service (inverse of annuity). */
export function presentValue(payment: number, ratePct: number, years: number): number {
	const n = years * 12;
	if (payment <= 0 || n <= 0) return 0;
	const i = ratePct / 100 / 12;
	if (i === 0) return payment * n;
	return (payment * (1 - Math.pow(1 + i, -n))) / i;
}

export interface YearRow {
	year: number;
	interest: number;
	principal: number;
	balance: number;
}

export function schedule(loan: number, ratePct: number, years: number): YearRow[] {
	const pay = annuity(loan, ratePct, years);
	const i = ratePct / 100 / 12;
	const rows: YearRow[] = [];
	let balance = loan;
	for (let y = 1; y <= years; y++) {
		let interest = 0;
		let principal = 0;
		for (let m = 0; m < 12; m++) {
			const int = balance * i;
			const pr = Math.min(pay - int, balance);
			interest += int;
			principal += pr;
			balance -= pr;
		}
		rows.push({ year: y, interest, principal, balance: Math.max(0, balance) });
	}
	return rows;
}

export function fixationYears(f: Fixation): number {
	return FIXATIONS.find((x) => x.id === f)?.years ?? 0;
}

/**
 * Banks assess variable and short fixed-rate loans at a higher "stress" rate,
 * because the rate can rise once the fixed period ends.
 */
export function stressApplies(inp: Inputs): boolean {
	const fy = fixationYears(inp.fixation);
	return fy < 10 && fy < inp.termYears;
}

export function householdIncome(inp: Inputs): number {
	return inp.persons.reduce((s, p) => s + (p.netMonthly * p.payments) / 12, 0);
}

export function totalEquity(inp: Inputs): number {
	return inp.persons.reduce((s, p) => s + p.equity, 0);
}

/** Purchase costs as fractions: cp scales with the price, cl with the loan. */
function costFractions(c: Costs) {
	const cp = (c.grest + c.grundbuch + c.notar + (c.useMakler ? c.makler : 0)) / 100;
	const cl = ((c.pfand / 100) * c.pfandFactor) / 100 + c.bankFee / 100;
	return { cp, cl };
}

export interface CostItem {
	label: string;
	detail: string;
	amount: number;
}

export function costItems(c: Costs, price: number, loan: number): CostItem[] {
	const n = (v: number) => v.toLocaleString('de-AT');
	const items: CostItem[] = [
		{ label: 'Grunderwerbsteuer', detail: `${n(c.grest)} % vom Kaufpreis`, amount: (price * c.grest) / 100 },
		{
			label: 'Grundbucheintragung',
			detail: `${n(c.grundbuch)} % vom Kaufpreis`,
			amount: (price * c.grundbuch) / 100
		},
		{
			label: 'Vertragserrichtung + Treuhand',
			detail: `${n(c.notar)} % vom Kaufpreis`,
			amount: (price * c.notar) / 100
		}
	];
	if (c.useMakler)
		items.push({
			label: 'Maklerprovision',
			detail: `${n(c.makler)} % vom Kaufpreis`,
			amount: (price * c.makler) / 100
		});
	items.push(
		{
			label: 'Pfandrechtseintragung',
			detail: `${n(c.pfand)} % von ${n(c.pfandFactor)} % des Kredits`,
			amount: (((loan * c.pfandFactor) / 100) * c.pfand) / 100
		},
		{ label: 'Bearbeitungsgebühr', detail: `${n(c.bankFee)} % vom Kredit`, amount: (loan * c.bankFee) / 100 }
	);
	return items;
}

export interface Affordability {
	income: number;
	equity: number;
	/** Max monthly payment for this loan (40 % rule minus other debts) */
	maxPayment: number;
	assessRate: number;
	/** Max loan by income alone */
	maxLoanByIncome: number;
	/** Max loan considering income AND own funds */
	maxLoan: number;
	maxPrice: number;
	binding: 'income' | 'equity';
	/** Minimum own-funds share of total cost permitted by the LTV rule, % */
	minEquitySharePct: number;
}

export function affordability(inp: Inputs, termYears = inp.termYears): Affordability {
	const { limits } = inp;
	const income = householdIncome(inp);
	const equity = totalEquity(inp);
	const rate = inp.rates[inp.fixation];
	const assessRate = rate + (stressApplies(inp) ? limits.stressAddon : 0);
	const maxPayment = Math.max(0, (income * limits.dsti) / 100 - inp.otherDebtMonthly);
	const maxLoanByIncome = presentValue(maxPayment, assessRate, Math.min(termYears, limits.maxTerm));

	const { cp, cl } = costFractions(inp.costs);
	const ltv = limits.ltv / 100;
	// Price where own funds exactly cover (1 - LTV) of the price plus all costs.
	const priceByEquity = equity / (1 - ltv + cp + ltv * cl);
	// Price when borrowing the full income-based maximum.
	const priceByIncome = (equity + maxLoanByIncome * (1 - cl)) / (1 + cp);

	const binding = priceByEquity <= priceByIncome ? 'equity' : 'income';
	const maxPrice = Math.min(priceByEquity, priceByIncome);
	const maxLoan = binding === 'equity' ? ltv * priceByEquity : maxLoanByIncome;

	const minEquitySharePct = (1 - ltv / (1 + cp + ltv * cl)) * 100;

	return {
		income,
		equity,
		maxPayment,
		assessRate,
		maxLoanByIncome,
		maxLoan,
		maxPrice,
		binding,
		minEquitySharePct
	};
}

export interface Scenario {
	price: number;
	loan: number;
	costs: number;
	costItems: CostItem[];
	totalCost: number;
	equityUsed: number;
	ltvPct: number;
	rate: number;
	monthly: number;
	firstInterest: number;
	firstPrincipal: number;
	totalInterest: number;
	totalPaid: number;
	dstiPct: number;
	/** Payment at the stress rate, used for the 40 % check */
	assessedMonthly: number;
	assessedDstiPct: number;
	schedule: YearRow[];
	checks: { ltv: boolean; dsti: boolean; equity: boolean; term: boolean };
}

export function scenario(inp: Inputs, termYears = inp.termYears): Scenario {
	const { cp, cl } = costFractions(inp.costs);
	const s = Math.min(Math.max(inp.equityShare, 0), 100) / 100;
	const equity = totalEquity(inp);

	let price: number;
	let loan: number;
	if (inp.priceMode === 'price') {
		price = Math.max(0, inp.price);
		// loan = (1 - s) * total, total = price(1 + cp) + loan * cl
		loan = ((1 - s) * price * (1 + cp)) / (1 - (1 - s) * cl);
	} else {
		// Use all own funds; the share determines how big the purchase gets.
		const total = s > 0 ? equity / s : 0;
		loan = total - equity;
		price = (total - loan * cl) / (1 + cp);
	}
	const costs = price * cp + loan * cl;
	const totalCost = price + costs;
	const equityUsed = totalCost - loan;

	const rate = inp.rates[inp.fixation];
	const monthly = annuity(loan, rate, termYears);
	const firstInterest = (loan * rate) / 100 / 12;
	const sched = schedule(loan, rate, termYears);
	const totalPaid = monthly * termYears * 12;

	const income = householdIncome(inp);
	const assessRate = rate + (stressApplies({ ...inp, termYears }) ? inp.limits.stressAddon : 0);
	const assessedMonthly = annuity(loan, assessRate, termYears);
	const dstiPct = income > 0 ? ((monthly + inp.otherDebtMonthly) / income) * 100 : Infinity;
	const assessedDstiPct =
		income > 0 ? ((assessedMonthly + inp.otherDebtMonthly) / income) * 100 : Infinity;
	const ltvPct = price > 0 ? (loan / price) * 100 : 0;
	const eps = 1e-6;

	return {
		price,
		loan,
		costs,
		costItems: costItems(inp.costs, price, loan),
		totalCost,
		equityUsed,
		ltvPct,
		rate,
		monthly,
		firstInterest: loan > 0 ? firstInterest : 0,
		firstPrincipal: loan > 0 ? monthly - firstInterest : 0,
		totalInterest: totalPaid - loan,
		totalPaid,
		dstiPct,
		assessedMonthly,
		assessedDstiPct,
		schedule: sched,
		checks: {
			ltv: ltvPct <= inp.limits.ltv + eps,
			dsti: loan === 0 || assessedDstiPct <= inp.limits.dsti + eps,
			equity: equityUsed <= equity + 0.5,
			term: termYears <= inp.limits.maxTerm
		}
	};
}

/**
 * Range of own-funds shares (%) that satisfy all rules for the current
 * inputs, or null if none does. Each check is monotone in the share, so we
 * can bisect for its boundary.
 */
export function feasibleShareRange(inp: Inputs): { min: number; max: number } | null {
	const at = (s: number) => scenario({ ...inp, equityShare: s });
	const bisect = (ok: (s: number) => boolean, okAtHigh: boolean) => {
		let lo = 0;
		let hi = 100;
		if (okAtHigh ? !ok(hi) : !ok(lo)) return null;
		if (okAtHigh ? ok(lo) : ok(hi)) return okAtHigh ? lo : hi;
		for (let k = 0; k < 40; k++) {
			const mid = (lo + hi) / 2;
			if (ok(mid) === okAtHigh) hi = mid;
			else lo = mid;
		}
		return okAtHigh ? hi : lo;
	};
	const lowFloor = inp.priceMode === 'equity' ? 1 : 0;
	const minLtv = bisect((s) => s >= lowFloor && at(s).checks.ltv, true);
	const minDsti = bisect((s) => s >= lowFloor && at(s).checks.dsti, true);
	if (minLtv === null || minDsti === null) return null;
	const min = Math.max(minLtv, minDsti);
	let max = 100;
	if (inp.priceMode === 'price') {
		const m = bisect((s) => at(s).checks.equity, false);
		if (m === null) return null;
		max = m;
	}
	return min <= max ? { min, max } : null;
}
