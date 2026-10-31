<script lang="ts">
	import { onMount } from 'svelte';
	import {
		affordability,
		feasibleShareRange,
		FIXATIONS,
		scenario,
		snapShare,
		stressApplies,
		TERMS,
		type Inputs
	} from '#lib/calc.ts';
	import { defaultInputs, RATES_AS_OF } from '#lib/defaults.ts';
	import { clear, load, save } from '#lib/storage.ts';
	import { eur, pct, rate } from '#lib/format.ts';
	import NumField from '#lib/components/NumField.svelte';
	import YearChart from '#lib/components/YearChart.svelte';

	let inputs = $state<Inputs>(defaultInputs());
	let loaded = $state(false);
	let showTable = $state(false);

	onMount(() => {
		inputs = load();
		loaded = true;
	});

	$effect(() => {
		const snapshot = $state.snapshot(inputs) as Inputs;
		if (loaded) save(snapshot);
	});

	const aff = $derived(affordability(inputs));
	const sc = $derived(scenario(inputs));
	const range = $derived(feasibleShareRange(inputs));
	const stressed = $derived(stressApplies(inputs));
	const comparison = $derived(
		TERMS.map((t) => ({ t, s: scenario({ ...inputs, termYears: t }, t) }))
	);
	const splitRows = $derived(
		[10, 15, 20, 25, 30, 40, 50].map((share) => ({
			share,
			s: scenario({ ...inputs, priceMode: 'equity', equityShare: share })
		}))
	);
	const shareFmt = new Intl.NumberFormat('de-AT', { maximumFractionDigits: 1 });
	/** Own share vs. loan as a ratio of the price, e.g. "50 : 50". */
	const split = (share: number) => `${shareFmt.format(share)} : ${shareFmt.format(100 - share)}`;
	const allOk = $derived(Object.values(sc.checks).every(Boolean));
	const interestShare = $derived(sc.totalPaid > 0 ? (sc.totalInterest / sc.totalPaid) * 100 : 0);
	const anyFourteen = $derived(inputs.persons.some((p) => p.payments === 14));

	const pos = (v: number) => Math.min(100, Math.max(0, v));

	function setShare(v: number) {
		inputs.useAllEquity = false;
		inputs.equityShare = v;
	}

	function useMaxPrice() {
		inputs.priceMode = 'price';
		inputs.price = Math.floor(aff.maxPrice / 1000) * 1000;
		inputs.useAllEquity = true;
	}

	function snapToMin() {
		if (range) setShare(snapShare(range, 'min'));
	}

	function reset() {
		clear();
		inputs = defaultInputs();
	}
</script>

<svelte:head>
	<title>Hausnummer – Wohnkreditrechner für Wien</title>
	<meta
		name="description"
		content="Privater Wohnkreditrechner für den Immobilienkauf in und um Wien – nach den österreichischen Kreditvergaberegeln."
	/>
	<link rel="canonical" href="https://hausnummer.at/" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://hausnummer.at/" />
	<meta property="og:locale" content="de_AT" />
	<meta property="og:title" content="Hausnummer – Wohnkreditrechner für Wien" />
	<meta
		property="og:description"
		content="Was können wir uns leisten? Max. Kaufpreis, Kredit und Monatsrate nach österreichischen Kreditregeln. Kein Tracking, alles bleibt im Browser."
	/>
	<meta property="og:image" content="https://hausnummer.at/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<header>
	<div class="brand">
		<svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
			<path d="M4 15 16 5l12 10v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" fill="var(--accent)" />
			<path d="M12 28v-7a4 4 0 0 1 8 0v7" fill="var(--surface-1)" />
		</svg>
		<div>
			<h1>Hausnummer</h1>
			<p>Gebt eure Zahlen ein, ihr bekommt eine Hausnummer: was ihr euch in und um Wien leisten könnt. Alles bleibt in diesem Browser.</p>
			<span class="stand">Zinssätze &amp; Kreditregeln: Stand {RATES_AS_OF}</span>
		</div>
	</div>
</header>

<main>
	<!-- 1. Haushalt -->
	<section class="card">
		<h2><span class="num">1</span> Euer Haushalt</h2>
		<div class="people">
			{#each inputs.persons as p, i (i)}
				<fieldset>
					<legend>
						<input class="name" aria-label="Name von Person {i + 1}" bind:value={p.name} />
					</legend>
					<NumField
						label="Nettogehalt pro Monat"
						suffix="€"
						step={50}
						bind:value={p.netMonthly}
						hint="Normales Monatsnetto, ohne 13./14. Gehalt"
					/>
					<div class="field">
						<span class="lbl">Gehälter pro Jahr</span>
						<div class="seg">
							{#each [14, 12] as n (n)}
								<button
									class:active={p.payments === n}
									onclick={() => (p.payments = n as 12 | 14)}
									aria-pressed={p.payments === n}>{n}×</button
								>
							{/each}
						</div>
					</div>
					<NumField label="Eigenmittel (Erspartes)" suffix="€" step={1000} bind:value={p.equity} />
				</fieldset>
			{/each}
		</div>
		<div class="row">
			<NumField
				label="Andere Kredit-/Leasingraten pro Monat"
				suffix="€"
				step={10}
				bind:value={inputs.otherDebtMonthly}
				hint="Autokredit, Leasing, Konsumkredit: Sie zählen zur 40-%-Grenze dazu."
			/>
		</div>
		<dl class="facts">
			<div><dt>Haushaltsnettoeinkommen</dt><dd>{eur(aff.income)}<small>/Monat{anyFourteen ? ' (13./14. auf 12 Monate verteilt)' : ''}</small></dd></div>
			<div><dt>Eigenmittel gesamt</dt><dd>{eur(aff.equity)}</dd></div>
		</dl>
	</section>

	<!-- 2. Grenzen -->
	<section class="card highlight">
		<h2><span class="num">2</span> Was die Regeln erlauben</h2>
		<div class="kpis">
			<div class="kpi main">
				<span>Max. Kaufpreis</span>
				<strong>{eur(aff.maxPrice)}</strong>
				<small>Nebenkosten schon aus Eigenmitteln bezahlt</small>
			</div>
			<div class="kpi">
				<span>Max. Kredit für euch</span>
				<strong>{eur(aff.maxLoan)}</strong>
				<small>{pct((aff.maxLoan / aff.maxPrice) * 100)} des Kaufpreises</small>
			</div>
			<div class="kpi">
				<span>Max. Kredit laut Einkommen</span>
				<strong>{eur(aff.maxLoanByIncome)}</strong>
				<small>{inputs.termYears} J., {rate(inputs.rates[inputs.fixation])}, ohne Blick auf Eigenmittel</small>
			</div>
			<div class="kpi">
				<span>Max. Rate laut 40-%-Regel</span>
				<strong>{eur(aff.maxPayment)}</strong>
				<small>
					{#if stressed}
						geprüft mit Stresszins {rate(aff.assessRate)}; tatsächliche Rate beim Maximalkredit:
						{eur(aff.actualPaymentAtMaxIncomeLoan)}
					{:else}
						{inputs.limits.dsti} % des Nettoeinkommens{inputs.otherDebtMonthly ? ', abzüglich anderer Kredite' : ''}
					{/if}
				</small>
			</div>
		</div>

		<div class="why">
			{#if aff.binding === 'equity'}
				<p>
					<strong>Eure Eigenmittel begrenzen den Kaufpreis, nicht euer Einkommen.</strong> Die Bank finanziert
					max. {inputs.limits.ltv} % des Kaufpreises, die Nebenkosten zahlt ihr selbst. Von euren
					{eur(aff.equity)} gehen beim Maximalpreis {eur(aff.costsAtMax)} an Nebenkosten und
					{eur(aff.maxPrice - aff.maxLoan)} sind Eigenanteil am Kaufpreis. Euer Einkommen würde einen Kredit bis
					{eur(aff.maxLoanByIncome)} tragen.
				</p>
				{#if aff.maxPriceWithoutMakler}
					<p class="muted">
						Ohne Makler (−{pct(inputs.costs.makler)} Provision) wären es bis zu {eur(aff.maxPriceWithoutMakler)}.
					</p>
				{/if}
			{:else}
				<p>
					<strong>Euer Einkommen begrenzt den Kaufpreis.</strong> Die Rate darf {inputs.limits.dsti} % eures
					Nettoeinkommens nicht übersteigen. Gerechnet mit {inputs.termYears} Jahren Laufzeit und
					{rate(inputs.rates[inputs.fixation])}{inputs.otherDebtMonthly ? ', abzüglich eurer anderen Kredite' : ''}.
					Längere Laufzeit oder ein niedrigerer Zinssatz erhöhen den Maximalpreis.
				</p>
			{/if}
			{#if stressed}
				<p class="muted">
					Variable Zinsen und Fixzinsphasen unter 10 Jahren prüfen Banken mit einem Aufschlag von
					{shareFmt.format(inputs.limits.stressAddon)} %-Punkten. Deshalb ist der Maximalkredit hier niedriger als
					bei längerer Fixzinsbindung, obwohl der Zinssatz günstiger ist.
				</p>
			{/if}
		</div>
		<button class="link" onclick={useMaxPrice}>Diesen Kaufpreis unten übernehmen →</button>
	</section>

	<!-- 3. Szenario -->
	<section class="card">
		<h2><span class="num">3</span> Euer Szenario</h2>

		<div class="seg wide" role="group" aria-label="Berechnungsart">
			<button class:active={inputs.priceMode === 'price'} onclick={() => (inputs.priceMode = 'price')}>
				Wir haben einen Kaufpreis
			</button>
			<button class:active={inputs.priceMode === 'equity'} onclick={() => (inputs.priceMode = 'equity')}>
				Alle Eigenmittel einsetzen
			</button>
		</div>

		{#if inputs.priceMode === 'price'}
			<div class="row">
				<NumField label="Kaufpreis" suffix="€" step={5000} bind:value={inputs.price} />
			</div>
		{/if}

		<div class="slider">
			<div class="slider-head">
				<span>Eigenanteil <strong>{pct(sc.share)}</strong></span>
				<span>Kredit <strong>{pct(100 - sc.share)}</strong> des Kaufpreises</span>
			</div>
			<div class="track-wrap">
				{#if range}
					<div
						class="ok-band"
						style:left="{pos(range.min)}%"
						style:width="{Math.max(0.5, pos(range.max) - pos(range.min))}%"
						title="Bereich, der alle Regeln erfüllt"
					></div>
				{/if}
				<input
					type="range"
					min="0"
					max="100"
					step="0.5"
					aria-label="Eigenanteil am Kaufpreis"
					value={sc.share}
					oninput={(e) => setShare(Number(e.currentTarget.value))}
				/>
			</div>
			<p class="slider-note">
				Anteil des <em>Kaufpreises</em>, den ihr selbst zahlt. Die Nebenkosten ({eur(sc.costs)}) kommen zusätzlich
				aus euren Eigenmitteln.
				{#if range}
					<span class="okc">Grün = zulässig</span>: {pct(range.min)}{inputs.priceMode === 'price'
						? ` – ${pct(range.max)}`
						: ' und mehr'}.
				{:else}
					<span class="bad">Bei diesem Kaufpreis erfüllt kein Anteil alle Regeln.</span>
				{/if}
			</p>
			{#if inputs.priceMode === 'price'}
				<div class="slider-actions">
					<label class="check">
						<input
							type="checkbox"
							checked={inputs.useAllEquity}
							onchange={(e) => {
								if (e.currentTarget.checked) inputs.useAllEquity = true;
								else setShare(Math.round(sc.share * 2) / 2);
							}}
						/>
						Alle Eigenmittel einsetzen (kleinster Kredit)
					</label>
					{#if range}
						<button class="link" onclick={snapToMin}>Mindest-Eigenanteil wählen (größter Kredit)</button>
					{/if}
				</div>
			{/if}
		</div>

		{#if inputs.priceMode === 'equity'}
			<div class="afford" class:warn={!allOk}>
				<p class="afford-q">
					Bei <strong>{split(sc.share)}</strong> (Eigenanteil : Kredit am Kaufpreis) könnt ihr euch eine Immobilie
					leisten um bis zu
				</p>
				<strong class="afford-price">{eur(sc.price)} <small>Kaufpreis</small></strong>
				<p class="afford-break">
					Kaufpreis = {eur(sc.price - sc.loan)} Eigenanteil + {eur(sc.loan)} Kredit · dazu {eur(sc.costs)} Nebenkosten
					aus Eigenmitteln · Rate {eur(sc.monthly)}/Monat ({inputs.termYears} J., {rate(sc.rate)})
				</p>
				{#if !sc.checks.ltv}
					<p class="bad">
						✗ Die Bank finanziert max. {inputs.limits.ltv} % des Kaufpreises. Ihr braucht mindestens
						{split(range ? snapShare(range, 'min') : aff.minEquitySharePct)}.
					</p>
				{:else if !sc.checks.dsti}
					<p class="bad">
						✗ Die Rate übersteigt {inputs.limits.dsti} % eures Einkommens{sc.stressed ? ' (mit Stresszins geprüft)' : ''}.
						Mit eurem Einkommen geht sich höchstens {eur(aff.maxPrice)} aus{range
							? ` (bei ${split(snapShare(range, 'min'))})`
							: ''}.
					</p>
				{:else}
					<p class="okc">✓ Erfüllt alle Kreditvergaberegeln.</p>
				{/if}
			</div>

			<div class="scroll">
				<table class="data splits">
					<thead>
						<tr><th>Eigenanteil : Kredit</th><th>Kaufpreis</th><th>Kredit</th><th>Monatsrate</th><th>Regeln</th></tr>
					</thead>
					<tbody>
						{#each splitRows as { share, s } (share)}
							<tr class:current={share === sc.share} onclick={() => setShare(share)}>
								<td>{split(share)}</td>
								<td>{eur(s.price)}</td>
								<td>{eur(s.loan)}</td>
								<td>{eur(s.monthly)}</td>
								<td class:bad={!s.checks.ltv || !s.checks.dsti}>
									{!s.checks.ltv ? '✗ Eigenmittel' : !s.checks.dsti ? '✗ Einkommen' : '✓'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="muted small">
				Alle {eur(aff.equity)} Eigenmittel werden eingesetzt: Eigenanteil am Kaufpreis plus Nebenkosten. Klickt
				auf eine Zeile, um die Aufteilung zu übernehmen.
			</p>
		{/if}

		<div class="field">
			<span class="lbl">Laufzeit</span>
			<div class="chips">
				{#each TERMS as t (t)}
					<button
						class:active={inputs.termYears === t}
						onclick={() => (inputs.termYears = t)}
						aria-pressed={inputs.termYears === t}>{t} J.</button
					>
				{/each}
			</div>
		</div>

		<div class="field">
			<span class="lbl">Zinsbindung</span>
			<div class="chips">
				{#each FIXATIONS as f (f.id)}
					<button
						class:active={inputs.fixation === f.id}
						onclick={() => (inputs.fixation = f.id)}
						aria-pressed={inputs.fixation === f.id}
						disabled={f.years > inputs.termYears}
						title={f.years > inputs.termYears ? 'Fixzinsphase länger als die Laufzeit' : ''}
					>
						{f.label}<small>{rate(inputs.rates[f.id])}</small>
					</button>
				{/each}
			</div>
			<div class="row narrow">
				<NumField
					label="Sollzinssatz p.a. für „{FIXATIONS.find((f) => f.id === inputs.fixation)?.label}“"
					suffix="%"
					step={0.05}
					bind:value={inputs.rates[inputs.fixation]}
					hint="Vorgabe: typisches Angebot bei guter Bonität, {RATES_AS_OF}. Tragt hier den Zinssatz eurer Bank ein."
				/>
			</div>
		</div>
	</section>

	<!-- 4. Ergebnis -->
	<section class="card result" class:warn={!allOk}>
		<h2><span class="num">4</span> Ergebnis</h2>
		<div class="hero">
			<div>
				<span>Monatliche Rate</span>
				<strong>{eur(sc.monthly)}</strong>
				<small>über {inputs.termYears} Jahre zu {rate(sc.rate)}</small>
			</div>
			<div class="split">
				<span>Aufteilung im 1. Monat</span>
				<div class="bar" aria-hidden="true">
					<i class="p" style:flex-grow={sc.firstPrincipal}></i>
					<i class="i" style:flex-grow={sc.firstInterest}></i>
				</div>
				<div class="split-legend">
					<span><i class="sw p"></i>Tilgung {eur(sc.firstPrincipal)}</span>
					<span><i class="sw i"></i>Zinsen {eur(sc.firstInterest)}</span>
				</div>
			</div>
		</div>

		<ul class="checks">
			<li class:ok={sc.checks.ltv}>
				<b>{sc.checks.ltv ? '✓' : '✗'}</b>
				Beleihungsquote {pct(sc.ltvPct)} <span>max. {inputs.limits.ltv} %</span>
			</li>
			<li class:ok={sc.checks.dsti}>
				<b>{sc.checks.dsti ? '✓' : '✗'}</b>
				{#if sc.stressed}
					Schuldendienstquote {pct(sc.assessedDstiPct)} mit Stresszins
					<span>
						max. {inputs.limits.dsti} % · geprüft mit {rate(sc.rate + inputs.limits.stressAddon)}:
						{eur(sc.assessedMonthly)}/Monat · mit eurer echten Rate: {pct(sc.dstiPct)}
					</span>
				{:else}
					Schuldendienstquote {pct(sc.dstiPct)} des Einkommens <span>max. {inputs.limits.dsti} %</span>
				{/if}
			</li>
			<li class:ok={sc.checks.equity}>
				<b>{sc.checks.equity ? '✓' : '✗'}</b>
				Eingesetzte Eigenmittel {eur(sc.equityUsed)} <span>vorhanden: {eur(aff.equity)}</span>
			</li>
			{#if !sc.checks.term}
				<li><b>✗</b> Laufzeit über {inputs.limits.maxTerm} Jahre</li>
			{/if}
		</ul>

		<div class="grid2">
			<div>
				<h3>Finanzierung</h3>
				<table class="kv">
					<tbody>
						<tr><td>Kaufpreis</td><td>{eur(sc.price)}</td></tr>
						<tr><td>+ Kaufnebenkosten</td><td>{eur(sc.costs)}</td></tr>
						<tr class="sum"><td>Gesamtkosten</td><td>{eur(sc.totalCost)}</td></tr>
						<tr><td>− Eigenmittel</td><td>{eur(sc.equityUsed)}</td></tr>
						<tr class="sum"><td>Kreditbetrag</td><td>{eur(sc.loan)}</td></tr>
					</tbody>
				</table>
			</div>
			<div>
				<h3>Über die gesamte Laufzeit</h3>
				<table class="kv">
					<tbody>
						<tr><td>Getilgt</td><td>{eur(sc.loan)}</td></tr>
						<tr><td>Zinsen bezahlt</td><td>{eur(sc.totalInterest)}</td></tr>
						<tr class="sum"><td>Gesamt an die Bank</td><td>{eur(sc.totalPaid)}</td></tr>
					</tbody>
				</table>
				<div class="bar big" aria-hidden="true">
					<i class="p" style:flex-grow={sc.loan}></i>
					<i class="i" style:flex-grow={sc.totalInterest}></i>
				</div>
				<p class="muted small">{pct(interestShare)} von allem, was ihr zahlt, sind Zinsen.</p>
			</div>
		</div>

		<details>
			<summary>Kaufnebenkosten im Detail</summary>
			<table class="kv">
				<tbody>
					{#each sc.costItems as c (c.label)}
						<tr><td>{c.label} <small>{c.detail}</small></td><td>{eur(c.amount)}</td></tr>
					{/each}
					<tr class="sum"><td>Summe</td><td>{eur(sc.costs)}</td></tr>
				</tbody>
			</table>
		</details>
	</section>

	<!-- 5. Tilgungsplan -->
	<section class="card">
		<div class="title-row">
			<h2><span class="num">5</span> Jahr für Jahr</h2>
			<div class="seg small-seg">
				<button class:active={!showTable} onclick={() => (showTable = false)}>Diagramm</button>
				<button class:active={showTable} onclick={() => (showTable = true)}>Tabelle</button>
			</div>
		</div>
		{#if showTable}
			<div class="scroll">
				<table class="data">
					<thead>
						<tr><th>Jahr</th><th>Tilgung</th><th>Zinsen</th><th>Bezahlt</th><th>Restschuld</th></tr>
					</thead>
					<tbody>
						{#each sc.schedule as r (r.year)}
							<tr>
								<td>{r.year}</td>
								<td>{eur(r.principal)}</td>
								<td>{eur(r.interest)}</td>
								<td>{eur(r.principal + r.interest)}</td>
								<td>{eur(r.balance)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<YearChart rows={sc.schedule} />
		{/if}
		{#if inputs.fixation === 'variable' || FIXATIONS.find((f) => f.id === inputs.fixation)!.years < inputs.termYears}
			<p class="muted small">
				Gerechnet mit dem heutigen Zinssatz über die gesamte Laufzeit. Bei {inputs.fixation === 'variable'
					? 'variabler Verzinsung'
					: 'kürzerer Fixzinsphase'} ändern sich Zinssatz und Rate später.
			</p>
		{/if}
	</section>

	<!-- 6. Laufzeiten vergleichen -->
	<section class="card">
		<h2><span class="num">6</span> Laufzeiten im Vergleich</h2>
		<div class="scroll">
			<table class="data">
				<thead>
					<tr><th>Laufzeit</th><th>Monatsrate</th><th>Zinsen gesamt</th><th>Gesamt bezahlt</th><th>Schuldendienstquote (Prüfung)</th></tr>
				</thead>
				<tbody>
					{#each comparison as { t, s } (t)}
						<tr class:current={t === inputs.termYears} onclick={() => (inputs.termYears = t)}>
							<td>{t} Jahre</td>
							<td>{eur(s.monthly)}</td>
							<td>{eur(s.totalInterest)}</td>
							<td>{eur(s.totalPaid)}</td>
							<td class:bad={!s.checks.dsti}>
								{pct(s.assessedDstiPct)}{s.stressed ? '*' : ''}
								{s.checks.dsti ? '' : '✗'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="muted small">
			Gleicher Kredit und gleicher Zinssatz der gewählten Zinsbindung ({rate(sc.rate)}) für jede Laufzeit.
			{#if comparison.some(({ s }) => s.stressed)}
				* Mit Stresszins (+{shareFmt.format(inputs.limits.stressAddon)} %-Pkt.) geprüft, weil die Fixzinsphase
				kürzer als die Laufzeit und unter 10 Jahren ist.
			{/if}
			Klickt auf eine Zeile, um sie auszuwählen.
		</p>
	</section>

	<!-- 7. Annahmen -->
	<section class="card">
		<details>
			<summary><h2 class="inline"><span class="num">7</span> Annahmen &amp; Regeln (anpassbar)</h2></summary>
			<h3>Kaufnebenkosten Wien &amp; Niederösterreich</h3>
			<div class="fields">
				<NumField label="Grunderwerbsteuer" suffix="% v. Kaufpreis" step={0.1} bind:value={inputs.costs.grest} />
				<NumField label="Grundbucheintragung" suffix="% v. Kaufpreis" step={0.1} bind:value={inputs.costs.grundbuch} />
				<NumField label="Vertragserrichtung + Treuhand" suffix="% v. Kaufpreis" step={0.1} bind:value={inputs.costs.notar} />
				<div class="field">
					<NumField label="Maklerprovision inkl. USt." suffix="% v. Kaufpreis" step={0.1} bind:value={inputs.costs.makler} />
					<label class="check"><input type="checkbox" bind:checked={inputs.costs.useMakler} /> Kauf über Makler</label>
				</div>
				<NumField label="Pfandrechtseintragung" suffix="%" step={0.1} bind:value={inputs.costs.pfand} />
				<NumField label="Eingetragene Höchstbetragshypothek" suffix="% v. Kredit" step={5} bind:value={inputs.costs.pfandFactor} />
				<NumField label="Bearbeitungsgebühr der Bank" suffix="% v. Kredit" step={0.25} bind:value={inputs.costs.bankFee} />
			</div>

			<h3>Kreditvergaberegeln</h3>
			<div class="fields">
				<NumField label="Max. Schuldendienstquote" suffix="% v. Netto" step={1} bind:value={inputs.limits.dsti} />
				<NumField label="Max. Beleihungsquote" suffix="%" step={1} bind:value={inputs.limits.ltv} />
				<NumField label="Max. Laufzeit" suffix="Jahre" step={1} bind:value={inputs.limits.maxTerm} />
				<NumField
					label="Stresszins-Aufschlag"
					suffix="%-Pkt."
					step={0.25}
					bind:value={inputs.limits.stressAddon}
					hint="Für variable Zinsen und Fixzinsphasen unter 10 Jahren"
				/>
			</div>

			<h3>Zinssätze ({RATES_AS_OF})</h3>
			<div class="fields">
				{#each FIXATIONS as f (f.id)}
					<NumField label={f.label} suffix="%" step={0.05} bind:value={inputs.rates[f.id]} />
				{/each}
			</div>

			<div class="notes">
				<h3>So funktioniert die Kreditvergabe in Österreich</h3>
				<ul>
					<li>
						<b>90 % Beleihungsquote, 40 % Schuldendienstquote, max. 35 Jahre.</b> Diese Grenzen stammen aus
						der <em>KIM-Verordnung</em> (August 2022 bis 30. Juni 2025). Seit Juli 2025 gelten sie nicht
						mehr als verbindliche Verordnung, sondern als Rundschreiben der FMA. Banken dürfen pro Quartal
						bei bis zu 20 % ihrer neuen Kredite abweichen, halten sich aber standardmäßig daran.
					</li>
					<li>
						<b>Die Nebenkosten zahlt ihr aus Eigenmitteln.</b> Der Kredit darf höchstens 90 % des
						Immobilienwerts betragen, die rund 7–12 % Kaufnebenkosten kommen noch dazu. Mit euren Annahmen
						braucht ihr deshalb mindestens {pct(aff.minOwnFundsPctOfPrice)} des Kaufpreises an Eigenmitteln
						(oft als „20 % Eigenkapital“ bezeichnet). Am meisten macht die Maklerprovision aus.
					</li>
					<li>
						<b>Maßgeblich ist das Nettoeinkommen.</b> 13. und 14. Gehalt dürfen auf 12 Monate verteilt
						werden. Manche Banken rechnen nur mit 12 Gehältern: Stellt auf 12× um, um den vorsichtigen Fall
						zu prüfen. Banken machen außerdem eine Haushaltsrechnung (Lebenshaltungskosten, Auto, Kinder)
						und wollen den Kredit meist bis zum Alter von 75–80 Jahren zurückgezahlt haben.
					</li>
					<li>
						<b>Variable Zinsen und kurze Fixzinsphasen</b> werden mit einem Stresszins geprüft, typischerweise
						2–3 Prozentpunkte über dem angebotenen Zinssatz.
					</li>
					<li>
						<b>Die Gebührenbefreiung ist ausgelaufen.</b> Grundbuch- und Pfandrechtseintragungsgebühr
						entfielen für den Hauptwohnsitz bis 500.000 € nur bei Anträgen bis 30. Juni 2026. Dieser
						Rechner geht von den vollen Gebühren aus.
					</li>
					<li>
						<b>Nicht berücksichtigt:</b> Schätzgebühr, Kontoführung, verpflichtende Versicherungen und die
						Wohnbauförderung. Ein Wiener Wohnbauförderungsdarlehen kann einen Teil der Eigenmittel ersetzen.
					</li>
				</ul>
				<p class="muted small">
					Quellen: FMA/FMSG (Auslaufen der KIM-V, Rundschreiben, 20-%-Ausnahmekontingent);
					OeNB-Zinsstatistik (August 2026: 3,61 % durchschnittlich für neue Wohnbaukredite); Zinsübersichten
					von Optifin und Infina (Oktober 2026); BMF und GGG zum Ende der Gebührenbefreiung am 30. Juni 2026.
					Dies ist ein Planungswerkzeug, keine Finanzberatung. Holt verbindliche Angebote von mindestens zwei
					Banken oder einem Kreditvermittler ein.
				</p>
			</div>
			<button class="danger" onclick={reset}>Alle Eingaben zurücksetzen</button>
		</details>
	</section>
</main>

<footer>
	<p>
		<strong>Unverbindliche Schätzung, keine Finanzberatung.</strong> Zinssätze und Regeln: Stand {RATES_AS_OF}.
		Verbindliche Konditionen bekommt ihr nur von eurer Bank.
	</p>
	<p>
		Hausnummer speichert eure Eingaben nur in diesem Browser (localStorage). Keine Konten, keine Cookies,
		keine Analyse, kein Tracking.
	</p>
	<nav>
		<a href="/impressum">Impressum</a>
		<a href="/datenschutz">Datenschutz</a>
		<a href="https://github.com/Lms24/hausnummer" rel="noopener">Quellcode</a>
	</nav>
</footer>

<style>
	header,
	main,
	footer {
		max-width: 960px;
		margin: 0 auto;
		padding: 0 16px;
	}
	header {
		padding-top: 32px;
		padding-bottom: 8px;
	}
	.brand {
		display: flex;
		gap: 12px;
		align-items: center;
	}
	h1 {
		margin: 0;
		font-size: 28px;
		letter-spacing: -0.02em;
	}
	header p {
		margin: 2px 0 0;
		color: var(--text-secondary);
	}
	main {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding-top: 16px;
		padding-bottom: 16px;
	}
	.card {
		background: var(--surface-1);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 20px;
	}
	.card.highlight {
		background: var(--surface-accent);
		border-color: var(--accent-border);
	}
	.card.result.warn {
		border-color: var(--bad-border);
	}
	h2 {
		margin: 0 0 16px;
		font-size: 18px;
		display: flex;
		align-items: center;
		gap: 10px;
	}
	h2.inline {
		display: inline-flex;
		margin: 0;
	}
	h3 {
		font-size: 14px;
		margin: 20px 0 8px;
		color: var(--text-secondary);
		font-weight: 600;
	}
	.num {
		display: inline-grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--accent);
		color: var(--on-accent);
		font-size: 13px;
	}
	.people {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 16px;
	}
	fieldset {
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 12px 14px 14px;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	legend {
		padding: 0 4px;
	}
	.name {
		font: inherit;
		font-weight: 600;
		border: 0;
		border-bottom: 1px dashed var(--border-strong);
		background: transparent;
		color: var(--text-primary);
		width: 12ch;
	}
	.row {
		margin-top: 16px;
		max-width: 420px;
	}
	.row.narrow {
		max-width: 320px;
		margin-top: 12px;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-top: 16px;
	}
	fieldset .field {
		margin-top: 0;
	}
	.lbl {
		font-size: 13px;
		color: var(--text-secondary);
	}
	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: 24px;
		margin: 16px 0 0;
	}
	.facts dt {
		font-size: 13px;
		color: var(--text-secondary);
	}
	.facts dd {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.facts small {
		font-size: 12px;
		font-weight: 400;
		color: var(--text-muted);
		margin-left: 4px;
	}
	.kpis {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
		gap: 12px;
	}
	.kpi {
		display: flex;
		flex-direction: column;
		gap: 2px;
		background: var(--surface-1);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 12px 14px;
	}
	.kpi span,
	.hero span {
		font-size: 13px;
		color: var(--text-secondary);
	}
	.kpi strong {
		font-size: 22px;
		font-variant-numeric: tabular-nums;
	}
	.kpi small,
	.hero small {
		color: var(--text-muted);
		font-size: 12px;
	}
	button {
		font: inherit;
		cursor: pointer;
		color: inherit;
	}
	.link {
		border: 0;
		background: none;
		color: var(--accent-text);
		padding: 0;
		margin-top: 12px;
		font-weight: 600;
	}
	.seg,
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.seg button,
	.chips button {
		border: 1px solid var(--border);
		background: var(--surface-input);
		border-radius: 8px;
		padding: 7px 12px;
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		line-height: 1.2;
	}
	.chips button small {
		font-size: 11px;
		color: var(--text-muted);
	}
	.seg button.active,
	.chips button.active {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--on-accent);
	}
	.chips button.active small {
		color: inherit;
		opacity: 0.85;
	}
	.chips button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.seg.wide button {
		flex: 1;
		min-width: 180px;
	}
	.small-seg button {
		padding: 4px 10px;
		font-size: 13px;
	}
	.title-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
	}
	.slider {
		margin-top: 20px;
	}
	.slider-head {
		display: flex;
		justify-content: space-between;
		font-size: 14px;
		color: var(--text-secondary);
	}
	.slider-head strong {
		color: var(--text-primary);
		font-size: 18px;
		font-variant-numeric: tabular-nums;
	}
	.track-wrap {
		position: relative;
		padding: 10px 0;
	}
	.ok-band {
		position: absolute;
		bottom: 0;
		height: 5px;
		background: var(--good-band);
		border-radius: 5px;
		pointer-events: none;
	}
	input[type='range'] {
		position: relative;
		width: 100%;
		margin: 0;
		accent-color: var(--accent);
		background: transparent;
	}
	.kpi.main {
		border-color: var(--accent-border);
	}
	.why {
		margin-top: 14px;
		font-size: 14px;
		line-height: 1.5;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.why p {
		margin: 0;
	}
	.slider-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 20px;
		margin-top: 10px;
	}
	.slider-actions .link {
		margin: 0;
	}
	.afford {
		margin-top: 16px;
		padding: 16px 18px;
		border-radius: 12px;
		background: var(--surface-accent);
		border: 1px solid var(--accent-border);
	}
	.afford.warn {
		background: var(--bad-bg);
		border-color: var(--bad-border);
	}
	.afford p {
		margin: 0;
	}
	.afford-q {
		color: var(--text-secondary);
	}
	.afford-q strong {
		color: var(--text-primary);
	}
	.afford-price {
		display: block;
		font-size: 40px;
		line-height: 1.15;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		margin: 2px 0 6px;
	}
	.afford-price small {
		font-size: 15px;
		font-weight: 400;
		letter-spacing: 0;
		color: var(--text-secondary);
	}
	.afford-break {
		font-size: 13px;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
		margin-bottom: 8px !important;
	}
	.splits {
		margin-top: 12px;
	}
	.splits tbody tr {
		cursor: pointer;
	}
	.slider-note {
		font-size: 13px;
		color: var(--text-muted);
		margin: 4px 0 0;
	}
	.okc {
		color: var(--good-text);
		font-weight: 600;
	}
	.bad {
		color: var(--bad-text);
		font-weight: 600;
	}
	.hero {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 20px;
		align-items: end;
	}
	.hero > div {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.hero strong {
		font-size: 40px;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
	}
	.bar {
		display: flex;
		gap: 2px;
		height: 14px;
		border-radius: 4px;
		overflow: hidden;
	}
	.bar.big {
		margin-top: 12px;
	}
	.bar i,
	.sw {
		display: block;
		min-width: 0;
	}
	.p {
		background: var(--series-principal);
	}
	.i {
		background: var(--series-interest);
	}
	.split-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 16px;
		font-size: 13px;
		color: var(--text-secondary);
	}
	.split-legend span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-variant-numeric: tabular-nums;
		color: var(--text-primary);
	}
	.sw {
		width: 10px;
		height: 10px;
		border-radius: 2px;
	}
	.checks {
		list-style: none;
		padding: 0;
		margin: 20px 0 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.checks li {
		display: flex;
		gap: 8px;
		align-items: baseline;
		flex-wrap: wrap;
		padding: 8px 12px;
		border-radius: 8px;
		background: var(--bad-bg);
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}
	.checks li.ok {
		background: var(--good-bg);
	}
	.checks b {
		color: var(--bad-text);
	}
	.checks li.ok b {
		color: var(--good-text);
	}
	.checks span {
		color: var(--text-muted);
		font-size: 13px;
	}
	.grid2 {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 8px 32px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-variant-numeric: tabular-nums;
	}
	.kv td {
		padding: 6px 0;
		border-bottom: 1px solid var(--grid);
	}
	.kv td:last-child {
		text-align: right;
	}
	.kv td small {
		color: var(--text-muted);
		font-size: 12px;
		margin-left: 4px;
	}
	.kv tr.sum td {
		font-weight: 600;
		border-bottom-color: var(--border-strong);
	}
	.scroll {
		overflow-x: auto;
	}
	.data th,
	.data td {
		padding: 7px 10px;
		text-align: right;
		border-bottom: 1px solid var(--grid);
		white-space: nowrap;
	}
	.data th:first-child,
	.data td:first-child {
		text-align: left;
	}
	.data th {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
	}
	.data tbody tr {
		cursor: default;
	}
	.data tr.current td {
		background: var(--surface-accent);
		font-weight: 600;
	}
	details {
		margin-top: 16px;
	}
	.card > details:only-child {
		margin-top: 0;
	}
	summary {
		cursor: pointer;
		color: var(--text-secondary);
		font-weight: 600;
	}
	.fields {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
		gap: 12px;
	}
	.fields .field {
		margin-top: 0;
	}
	.check {
		font-size: 13px;
		display: flex;
		gap: 6px;
		align-items: center;
		color: var(--text-secondary);
	}
	.notes ul {
		padding-left: 18px;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
		line-height: 1.5;
	}
	.muted {
		color: var(--text-muted);
	}
	.small {
		font-size: 13px;
	}
	.danger {
		margin-top: 16px;
		border: 1px solid var(--bad-border);
		background: transparent;
		color: var(--bad-text);
		border-radius: 8px;
		padding: 7px 12px;
	}
	footer {
		padding-bottom: 40px;
		color: var(--text-muted);
		font-size: 13px;
	}
	footer p {
		margin: 0 0 6px;
	}
	footer nav {
		display: flex;
		gap: 16px;
		margin-top: 10px;
	}
	footer a {
		color: var(--text-secondary);
	}
	.stand {
		display: inline-block;
		margin-top: 4px;
		font-size: 12px;
		color: var(--text-muted);
	}
</style>
