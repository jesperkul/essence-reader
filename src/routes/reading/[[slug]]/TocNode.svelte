<script lang="ts">
	import type { TableOfContentsItem } from '$lib/types';
	import TocNode from './TocNode.svelte';

	let {
		tocitem,
		onClick,
		spineIndex
	}: { tocitem: TableOfContentsItem; onClick: (href: string) => void; spineIndex: number } =
		$props();

	const toggleExpansion = (e: Event) => {
		e.stopPropagation();
		expanded = !expanded;
	};

	let expanded: boolean = $state(false);

	let selected: boolean = $state(false);

	$effect(() => {
		if (tocitem.index === spineIndex) {
			selected = true;
		} else if (tocitem.children) {
			selected = tocitem.children.some((child) => child.index === spineIndex);
			if (selected) expanded = true; // Auto-Expanded if any child is selected
		} else {
			selected = false;
		}
	});
</script>

<div class="tocNode" class:selected>
	{#if tocitem.children}
		<button class="expansionBtn" class:expanded onclick={toggleExpansion}>▶</button>
	{/if}
	<button class="tocButton" onclick={() => onClick(tocitem.href)}>
		{tocitem.title}
	</button>
</div>
{#if expanded && tocitem.children}
	<div style="margin-left: 1em;">
		{#each tocitem.children as tocsection}
			<TocNode tocitem={tocsection} {onClick} {spineIndex} />
		{/each}
	</div>
{/if}

<style>
	button {
		border: none;
		font-family: inherit;
		background-color: transparent;
		color: inherit;
		cursor: pointer;
	}

	.tocButton {
		text-align: left;
		width: 100%;
		height: 100%;
		font-size: 0.8em;
	}

	.tocNode {
		padding: 0 0.5em;
		height: 2em;
		text-align: left;
		display: flex;
		align-items: center;
		border-radius: 0.5em;
		margin: 0.25em 0;
	}

	.selected {
		background-color: rgba(var(--highlight-bg), 0.2);
	}

	.expansionBtn {
		padding-right: 0.5em;
		transform: rotate(0deg);
		transition: transform 0.2s;
		height: 100%;
	}

	.expansionBtn:hover {
		filter: invert(0.6);
	}

	.expanded {
		transform: rotate(90deg);
	}

	.tocNode:hover {
		cursor: pointer;
		background-color: rgba(var(--highlight-bg), 0.1);
	}
</style>
