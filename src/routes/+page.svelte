<script lang="ts">
	import { goto } from '$app/navigation';
	import { shouldSaveStore } from '$lib/stores';
	import type { Metadata } from '$lib/types';
	import { onMount } from 'svelte';
	import Topbar from '$lib/components/Topbar.svelte';
	import Drawer from '$lib/components/Drawer.svelte';
	import CarbonSettings from '~icons/carbon/settings';
	import ThemePicker from '$lib/components/ThemePicker.svelte';
	import { flip } from 'svelte/animate';
	import BookPreview from './BookPreview.svelte';
	import CarbonTrashCan from '~icons/carbon/trash-can';
	import CarbonSave from '~icons/carbon/save';
	import { getAllMetas, openLibraryDB } from '$lib/db.js';

	const clickFile = async () => {
		let input = document.createElement('input');
		const readFile = (await import('$lib/utils')).readFile;

		input.type = 'file';
		input.multiple = true;
		input.onchange = (e) => {
			const files = (e.target as HTMLInputElement).files;
			if (!files) return;
			for (const file of files) {
				readFile(file); // Perhaps want to pass saveBooksOn here
			}
		};

		input.click();
	};

	let bookList: Metadata[] = $state([]);

	const deleteBook = async (id: number) => {
		bookList = bookList.filter((book) => book.id !== id);
		try {
			const db = await openLibraryDB;
			const tx = db.transaction(['metadata', 'books'], 'readwrite');
			tx.objectStore('metadata').delete(id);
			tx.objectStore('books').delete(id);
			await tx.done;
		} catch (error) {
			console.error('Failed to delete book:', error);
		}
	};

	const deleteAllBooks = async () => {
		bookList = [];
		try {
			const db = await openLibraryDB;
			const tx = db.transaction(['metadata', 'books'], 'readwrite');
			tx.objectStore('metadata').clear();
			tx.objectStore('books').clear();
			await tx.done;
		} catch (error) {
			console.error('Failed to delete all books:', error);
		}
	};

	onMount(async () => {
		getAllMetas().then((books) => {
			bookList = books;
		});
	});
</script>

<svelte:head>
	<title>Essence Reader</title>
</svelte:head>

<Topbar>
	{#snippet toptext()}
		<h3>Essence Reader</h3>
	{/snippet}
	{#snippet rightbar()}
		<Drawer>
			{#snippet icon()}
				<CarbonSettings />
			{/snippet}
			<div class="librarySettings">
				<span>Library settings</span>
				<span class="libraryInfo">
					By default, imported books are stored locally across sessions in your browser.
					<br /> When disabled, new books are not saved.
				</span>
				<label class={$shouldSaveStore ? 'saveBooksSetting active' : 'saveBooksSetting'}>
					<CarbonSave style="vertical-align: middle; height: 1.5em; width: 1.5em;" />
					Save books
					<input type="checkbox" bind:checked={$shouldSaveStore} />
				</label>
				<button class="deleteAllBtn" onclick={deleteAllBooks}>
					<CarbonTrashCan style="vertical-align: middle; height: 1.5em; width: 1.5em;" />
					Delete all books
				</button>
				<ThemePicker />
			</div>
		</Drawer>
	{/snippet}
</Topbar>

<div id="parent">
	{#if bookList}
		{#each bookList as meta (meta.id)}
			<button
				class="libraryItem"
				onclick={() => goto(`reading/${meta.id}`)}
				animate:flip={{ duration: 200 }}>
				<BookPreview {meta} {deleteBook} />
			</button>
		{/each}
	{/if}

	<button class="libraryItem" onclick={() => clickFile()}>
		<h1 id="dropInfoIcon">📚</h1>

		<h2 style="color: gray">Drop anywhere or click to select a file</h2>
	</button>
</div>

<style>
	#parent {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		padding: 3.5em 1em 1em;
		gap: 1em;
	}

	#dropInfoIcon {
		font-size: 5em;
		margin: 0;
	}

	.libraryItem {
		color: inherit;
		border: none;
		overflow: hidden;
		font-size: inherit;
		font-family: inherit;
		flex: 1 1 100%;
		height: 15em;
		padding: 0;
		max-width: 30vw;
		min-width: 20em;
		border-radius: 0.5em;
		filter: drop-shadow(0 15px 15px rgb(0 0 0 / 0.15));
		background-color: rgb(var(--secondary-bg));
		transition: transform 0.25s;
	}

	.libraryItem:hover,
	.libraryItem:focus {
		cursor: pointer;
		transform: translateY(-0.5em);
	}

	.librarySettings {
		display: flex;
		flex-direction: column;
		gap: 0.25em;
		width: 100%;
	}

	.saveBooksSetting,
	.deleteAllBtn {
		all: unset;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5em;
		padding: 0 0.5em;
		border-radius: 10px;
		border: 1px solid rgba(var(--primary-color), 0.5);
		height: 2.5em;
		width: 100%;
		box-sizing: border-box;
	}

	.saveBooksSetting:hover,
	.saveBooksSetting.active:hover {
		background-color: rgba(var(--highlight-bg), 0.2);
	}

	.saveBooksSetting.active {
		background-color: rgba(var(--highlight-bg), 0.1);
	}

	.saveBooksSetting input[type='checkbox'] {
		width: 1.5em;
		height: 1.5em;
		margin-left: auto;
	}

	.deleteAllBtn:hover {
		background-color: rgba(255, 0, 0, 0.6);
	}

	.libraryInfo {
		font-size: 0.75em;
		color: rgba(var(--primary-color), 0.8);
		text-wrap: wrap;
		text-align: left;
		margin: auto;
		padding: 0 0.5em;
		line-height: 1em;
		padding-bottom: 0.5em;
	}
</style>
