<script lang="ts">
	import type { LibraryBook } from '$lib/types';
	import CarbonTrashCan from '~icons/carbon/trash-can';
	import { fade } from 'svelte/transition';

	let { book, deleteBook }: { book: LibraryBook; deleteBook: (id: number) => void } = $props();

	let progressPercent = $derived(Math.round(book.totalProgress * 100));
	let bookCoverUrl = $state('');

	$effect(() => {
		if (book.cover) {
			const url = URL.createObjectURL(book.cover);
			bookCoverUrl = url;
			return () => URL.revokeObjectURL(url);
		} else {
			bookCoverUrl = '';
		}
	});
</script>

<div class="book" in:fade={{ duration: 200 }}>
	<button
		class="deleteBtn"
		onclick={(e) => {
			e.stopPropagation();
			if (book.id) deleteBook(book.id);
		}}>
		<CarbonTrashCan />
	</button>

	<img src={bookCoverUrl} alt="cover" />

	<div class="bookInfo">
		<h4>{book.authors.join(', ')}</h4>
		<h3>{book.title}</h3>
		<p>{progressPercent}%</p>
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
