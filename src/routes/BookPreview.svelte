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
	<a href={`reading/${book.id}`} class="bookLink">
		<img class="bookCover" src={bookCoverUrl} alt="cover" />

		<div class="bookInfo">
			<h4>{book.authors?.join(', ')}</h4>
			<h3>{book.title}</h3>
			<p>{progressPercent}%</p>
		</div>
	</a>

	<button
		class="deleteBtn"
		onclick={(e) => {
			e.stopPropagation();
			if (book.id) deleteBook(book.id);
		}}>
		<CarbonTrashCan />
	</button>
</div>

<style>
	.bookLink {
		width: 100%;
		height: 100%;
		display: grid;
		grid-template-columns: auto 1fr;
		text-decoration: none;
		color: inherit;
		text-align: center;
		outline: none;
	}

	.bookCover {
		height: 15em;
		width: 10em;
		object-fit: cover;
		background-color: gray;
	}

	.deleteBtn {
		display: none;
		position: absolute;
		top: 0;
		right: 0;
		background-color: transparent;
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
</style>
