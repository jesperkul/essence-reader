<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		toned,
		leftbar,
		toptext,
		rightbar
	}: {
		toned?: boolean;
		leftbar?: Snippet;
		toptext?: Snippet;
		rightbar?: Snippet;
	} = $props();
</script>

<div id="topbar" style={toned ? 'color: rgba(var(--primary-color), 0.6);' : ' '}>
	<div class="buttonbar" id="leftbar">
		{#if leftbar}
			{@render leftbar()}
		{/if}
	</div>

	<div id="toptext">
		{#if toptext}
			{@render toptext()}
		{/if}
	</div>

	<div class="buttonbar" id="rightbar">
		{#if rightbar}
			{@render rightbar()}
		{/if}
	</div>
</div>

<style>
	#rightbar {
		margin-right: 1%;
		text-align: right;
		min-width: max-content;
	}

	#leftbar {
		margin-left: 1%;
		text-align: left;
		min-width: max-content;
	}

	.buttonbar > :global(a) {
		padding: 0.25em 0.15em;
		display: inline-block;
		color: inherit;
	}

	.buttonbar > :global(button),
	.buttonbar > :global(a) {
		margin: 0;
		padding: 0 0.15em;
		border: none;
		background-color: transparent;
		cursor: pointer;
		color: inherit;
		vertical-align: middle;
		line-height: 1em;
		font-size: 1em;
	}

	.buttonbar > :global(button:hover),
	.buttonbar > :global(a:hover) {
		filter: invert(0.5);
	}

	#topbar {
		display: grid;
		gap: 1%;
		grid-template-columns: 1fr auto 1fr;
		text-align: center;
		line-height: 2em;
		height: 2em;
		width: 100%;
		font-size: 1.25em;
		position: fixed;
		background: rgba(var(--secondary-bg), 0.8);
		touch-action: manipulation;
		-webkit-backdrop-filter: blur(15px);
		backdrop-filter: blur(15px);
		transition:
			background-color 0.5s,
			color 0.5s;
		filter: drop-shadow(0 20px 13px rgb(0 0 0 / 0.03)) drop-shadow(0 8px 5px rgb(0 0 0 / 0.08));
		z-index: 100;
		user-select: none;
	}

	@supports not ((-webkit-backdrop-filter: blur(5px)) or (backdrop-filter: blur(5px))) {
		#topbar {
			background-color: rgb(var(--secondary-bg));
		}
	}

	#toptext {
		min-width: 0;
	}

	#toptext {
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
		display: inline;
		user-select: text;
	}

	#toptext > :global(*) {
		display: inline;
	}
</style>
