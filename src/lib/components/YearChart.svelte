<script lang="ts">
	import type { YearRow } from '../calc';
	import { eur, eurShort } from '../format';

	let { rows }: { rows: YearRow[] } = $props();

	let width = $state(640);
	const height = 260;
	const pad = { top: 12, right: 8, bottom: 28, left: 68 };
	let hover = $state<number | null>(null);

	const innerW = $derived(Math.max(0, width - pad.left - pad.right));
	const innerH = height - pad.top - pad.bottom;
	const max = $derived(Math.max(1, ...rows.map((r) => r.interest + r.principal)));
	const ticks = $derived(niceTicks(max));
	const top = $derived(ticks[ticks.length - 1] || max);
	const slot = $derived(rows.length ? innerW / rows.length : 0);
	const barW = $derived(Math.max(2, Math.min(28, slot * 0.7)));
	const y = (v: number) => pad.top + innerH - (v / top) * innerH;
	const labelEvery = $derived(rows.length > 20 ? 5 : rows.length > 10 ? 2 : 1);

	function niceTicks(m: number): number[] {
		const step = Math.pow(10, Math.floor(Math.log10(m / 4)));
		const nice = [1, 2, 2.5, 5, 10].map((f) => f * step).find((s) => m / s <= 5) ?? step * 10;
		const out: number[] = [];
		for (let v = 0; v <= m + nice * 0.999; v += nice) out.push(v);
		return out;
	}

	/** Bar top with 4px rounded upper corners. */
	function roundedTop(x: number, yTop: number, w: number, h: number): string {
		const r = Math.min(4, w / 2, h);
		return `M${x},${yTop + h}V${yTop + r}Q${x},${yTop} ${x + r},${yTop}H${x + w - r}Q${x + w},${yTop} ${x + w},${yTop + r}V${yTop + h}Z`;
	}
</script>

<div class="chart" bind:clientWidth={width}>
	<div class="legend" aria-hidden="true">
		<span><i class="sw principal"></i>Tilgung</span>
		<span><i class="sw interest"></i>Zinsen</span>
	</div>
	<svg
		{width}
		{height}
		role="img"
		aria-label="Jährliche Zahlungen, aufgeteilt in Tilgung und Zinsen"
		onmouseleave={() => (hover = null)}
	>
		{#each ticks as t (t)}
			<line class="grid" x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} />
			<text class="tick" x={pad.left - 8} y={y(t)} dy="0.32em" text-anchor="end">{eurShort(t)}</text>
		{/each}

		{#each rows as r, i (r.year)}
			{@const x = pad.left + i * slot + (slot - barW) / 2}
			{@const yP = y(r.principal)}
			{@const yI = y(r.principal + r.interest)}
			{@const gap = 2}
			<g class:dim={hover !== null && hover !== i}>
				<rect class="principal" {x} y={yP} width={barW} height={Math.max(0, pad.top + innerH - yP)} />
				{#if yP - yI - gap > 0.5}
					<path class="interest" d={roundedTop(x, yI, barW, yP - yI - gap)} />
				{/if}
			</g>
			{#if (i + 1) % labelEvery === 0 || i === 0}
				<text class="tick" x={x + barW / 2} y={height - 8} text-anchor="middle">{r.year}</text>
			{/if}
			<rect
				class="hit"
				x={pad.left + i * slot}
				y={pad.top}
				width={slot}
				height={innerH}
				role="presentation"
				onmouseenter={() => (hover = i)}
			/>
		{/each}
		<line class="axis" x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} />
	</svg>

	{#if hover !== null && rows[hover]}
		{@const r = rows[hover]}
		{@const left = pad.left + hover * slot + slot / 2}
		<div class="tip" style:left="{Math.min(Math.max(left, 90), width - 90)}px">
			<strong>Jahr {r.year}</strong>
			<div><i class="sw principal"></i>Tilgung <span>{eur(r.principal)}</span></div>
			<div><i class="sw interest"></i>Zinsen <span>{eur(r.interest)}</span></div>
			<div class="muted">Restschuld <span>{eur(r.balance)}</span></div>
		</div>
	{/if}
</div>

<style>
	.chart {
		position: relative;
		width: 100%;
		min-width: 0;
	}
	svg {
		display: block;
		width: 100%;
		overflow: visible;
	}
	.legend {
		display: flex;
		gap: 16px;
		font-size: 13px;
		color: var(--text-secondary);
		margin-bottom: 8px;
	}
	.legend span,
	.tip div {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.sw {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 2px;
	}
	.sw.principal,
	rect.principal {
		background: var(--series-principal);
		fill: var(--series-principal);
	}
	.sw.interest,
	path.interest {
		background: var(--series-interest);
		fill: var(--series-interest);
	}
	g {
		transition: opacity 120ms;
	}
	g.dim {
		opacity: 0.35;
	}
	.grid {
		stroke: var(--grid);
		stroke-width: 1;
	}
	.axis {
		stroke: var(--border-strong);
	}
	.tick {
		font-size: 11px;
		fill: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}
	.hit {
		fill: transparent;
	}
	.tip {
		position: absolute;
		top: 24px;
		transform: translateX(-50%);
		pointer-events: none;
		background: var(--surface-raised);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 8px 10px;
		font-size: 13px;
		min-width: 170px;
		box-shadow: 0 4px 16px rgb(0 0 0 / 0.12);
	}
	.tip span {
		margin-left: auto;
		font-variant-numeric: tabular-nums;
		color: var(--text-primary);
	}
	.tip .muted {
		color: var(--text-muted);
		margin-top: 2px;
	}
</style>
