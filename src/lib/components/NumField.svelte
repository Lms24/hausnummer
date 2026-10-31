<script lang="ts">
	let {
		label,
		value = $bindable(),
		suffix = '',
		step = 1,
		min = 0,
		max,
		hint
	}: {
		label: string;
		value: number;
		suffix?: string;
		step?: number;
		min?: number;
		max?: number;
		hint?: string;
	} = $props();

	const id = $props.id();
</script>

<div class="field">
	<label for={id}>{label}</label>
	<div class="input">
		<input
			{id}
			type="number"
			inputmode="decimal"
			{step}
			{min}
			{max}
			bind:value={() => value, (v) => (value = Number.isFinite(v) ? v : 0)}
		/>
		{#if suffix}<span class="suffix">{suffix}</span>{/if}
	</div>
	{#if hint}<small>{hint}</small>{/if}
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}
	label {
		font-size: 13px;
		color: var(--text-secondary);
	}
	.input {
		display: flex;
		align-items: center;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--surface-input);
		padding: 0 10px;
	}
	.input:focus-within {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-ring);
	}
	input {
		flex: 1;
		min-width: 0;
		border: 0;
		background: transparent;
		color: var(--text-primary);
		font: inherit;
		font-variant-numeric: tabular-nums;
		padding: 9px 0;
		outline: none;
	}
	.suffix {
		color: var(--text-muted);
		font-size: 14px;
		padding-left: 6px;
	}
	small {
		color: var(--text-muted);
		font-size: 12px;
	}
</style>
