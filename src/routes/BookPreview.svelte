<script lang="ts">
	import type { Metadata } from '$lib/types';
	import CarbonTrashCan from '~icons/carbon/trash-can';
	import { fade } from 'svelte/transition';

	let { meta, deleteBook }: { meta: Metadata; deleteBook: (id: number) => void } = $props();
</script>

<div class="book" in:fade={{ duration: 200 }}>
	<button
		class="deleteBtn"
		onclick={(e) => {
			e.stopPropagation();
			if (meta.id) deleteBook(meta.id);
		}}>
		<CarbonTrashCan />
	</button>

	<img src={meta.cover !== undefined ? URL.createObjectURL(meta.cover) : ''} alt="cover" />

	<div class="bookInfo">
		<h4>{meta.authors.join(', ')}</h4>
		<h3>{meta.title}</h3>
		<p>{meta.progress} / {meta.length}</p>
	</div>
</div>

<style>
	.book {
		width: 100%;
		display: grid;
		padding: 0;
		grid-template-columns: auto 1fr;
	}

	.book > img,
	.book > div {
		height: 15em;
		width: 10em;
		object-fit: cover;
	}

	.book > img {
		background-color: gray;
	}

	.deleteBtn {
		display: none;
		position: absolute;
		background-color: transparent;
		right: 0;
		font-size: 1.3em;
		padding: 0.25em;
		border-radius: 0 0.5em;
		color: inherit;
		cursor: pointer;
		border: none;
		transition: background-color 0.2s;
	}

	.deleteBtn:hover {
		background-color: rgba(255, 10, 50, 1);
		color: white;
	}

	.book:hover .deleteBtn {
		display: inline-block;
	}

	.bookInfo > h3 {
		font-weight: 500;
		color: gray;
	}

	.bookInfo {
		min-width: 100%;
	}
</style>
