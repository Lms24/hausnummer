const eurFmt = new Intl.NumberFormat('de-AT', {
	style: 'currency',
	currency: 'EUR',
	maximumFractionDigits: 0
});
const pctFmt = new Intl.NumberFormat('de-AT', { maximumFractionDigits: 1 });

export const eur = (v: number) => (Number.isFinite(v) ? eurFmt.format(v) : '–');
export const pct = (v: number) => (Number.isFinite(v) ? `${pctFmt.format(v)} %` : '–');

export function eurShort(v: number): string {
	if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('de-AT', { maximumFractionDigits: 1 })} Mio. €`;
	if (v >= 1000) return `${Math.round(v / 1000)} Tsd. €`;
	return `${Math.round(v)} €`;
}

const rateFmt = new Intl.NumberFormat('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Interest rates always with two decimals, e.g. "3,45 %". */
export const rate = (v: number) => (Number.isFinite(v) ? `${rateFmt.format(v)} %` : '–');
