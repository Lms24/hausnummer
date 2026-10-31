<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, children }: { title: string; children: Snippet } = $props();
</script>

<svelte:head>
	<title>{title} – Hausnummer</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<a class="back" href="/">← Zurück zum Rechner</a>
	<article>
		<h1>{title}</h1>
		{@render children()}
	</article>
</main>

<style>
	main {
		max-width: 720px;
		margin: 0 auto;
		padding: 32px 16px 48px;
	}
	.back {
		color: var(--accent-text);
		font-weight: 600;
		text-decoration: none;
	}
	article {
		margin-top: 16px;
		background: var(--surface-1);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 24px;
		line-height: 1.6;
	}
	h1 {
		margin: 0 0 16px;
		font-size: 26px;
		letter-spacing: -0.02em;
	}
	article :global(h2) {
		font-size: 17px;
		margin: 24px 0 6px;
	}
	article :global(p),
	article :global(ul) {
		margin: 0 0 10px;
	}
	article :global(a) {
		color: var(--accent-text);
	}
</style>
