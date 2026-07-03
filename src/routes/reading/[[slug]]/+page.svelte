<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { Book, Metadata, ReaderSettings } from '$lib/types';
	import Topbar from '$lib/components/Topbar.svelte';
	import ReaderSettingsComponent from './ReaderSettings.svelte';
	import Drawer from '$lib/components/Drawer.svelte';
	import { assembleChapter } from './reader';
	import { themeStore } from '$lib/stores';
	import { readingState } from '$lib/state/readingState.svelte.js';
	import type { ZipInfo } from 'unzipit';
	import { openLibraryDB } from '$lib/db.js';
	import TocNode from './TocNode.svelte';
	import { ReaderFrame, type ReaderTarget } from './ReaderFrame.js';
	import { relativeToAbs } from '$lib/utils.js';

	// Icons:
	import CarbonSettings from '~icons/carbon/settings';
	import CarbonTableOfContents from '~icons/carbon/table-of-contents';
	import CarbonArrowRight from '~icons/carbon/arrow-right';
	import CarbonArrowLeft from '~icons/carbon/arrow-left';
	import CarbonChevronLeft from '~icons/carbon/chevron-left';
	import CarbonDirectionLoopLeft from '~icons/carbon/direction-loop-left';

	const { data } = $props();
	let meta: Metadata = $derived(data.meta);
	let book: Book = $derived(data.book);
	let entries: ZipInfo['entries'] = $derived(data.entries);

	let progressPercent = $derived(Math.round(readingState.totalProgress * 100));
	let toneTopbar = $state(false);
	let previousJumps: number[] = $state([]);
	let iframeElement: HTMLIFrameElement | undefined = $state();
	let frame: ReaderFrame | undefined = $state();

	let storedSettingsJson = localStorage.getItem('settings');
	let settings: ReaderSettings = $state(
		storedSettingsJson
			? JSON.parse(storedSettingsJson)
			: {
					scale: 10,
					fontFamily: 'Default',
					paginated: window.innerWidth > 1000, // Default to paginated if screen is big enough
					animations: false
				}
	);

	let blobUrls: string[] = [];

	const sectionWeights = $derived(book.spine.map((path) => entries[path]?.size || 0));

	const weightBeforeSection = $derived.by(() => {
		let total = 0;
		return sectionWeights.map((weight) => {
			const start = total;
			total += weight;
			return start;
		});
	});

	const totalBookWeight = $derived(sectionWeights.reduce((a, b) => a + b, 0));

	let updateProgress = (sectionProgress: number) => {
		const shouldToneTopbar = !settings.paginated && sectionProgress > 0;
		if (shouldToneTopbar !== toneTopbar) {
			toneTopbar = shouldToneTopbar;
		}

		const currentWeight =
			weightBeforeSection[readingState.sectionIndex] +
			sectionProgress * sectionWeights[readingState.sectionIndex];
		const newTotalProgress = totalBookWeight > 0 ? currentWeight / totalBookWeight : 0;

		readingState.sectionProgress = sectionProgress;
		readingState.totalProgress = newTotalProgress;
	};

	onMount(() => {
		if (!iframeElement) return;
		frame = new ReaderFrame(iframeElement, {
			onKeydown: handleKeydown,
			onRequestSectionChange: handleSectionChange,
			onLinkClick: jumpTo,
			settings: settings,
			onProgressChange: updateProgress
		});
	});

	$effect(() => {
		void book; // Run effect when book changes.

		untrack(() => {
			if (frame) {
				previousJumps = [];
				updateSection(meta.progress);
			}
		});
	});

	onDestroy(() => {
		blobUrls.forEach(URL.revokeObjectURL);
	});

	const handleSectionChange = (direction: number) => {
		if (direction < 0 && readingState.sectionIndex > 0) {
			updateSection(readingState.sectionIndex - 1, { type: 'end' });
		} else if (direction > 0 && readingState.sectionIndex + 1 < book.spine.length) {
			updateSection(readingState.sectionIndex + 1, { type: 'start' });
		}
	};

	const registerBlobUrl = (url: string) => blobUrls.push(url);

	const updateSection = async (index: number, target?: ReaderTarget) => {
		if (0 <= index && index < book.spine.length) {
			blobUrls.forEach(URL.revokeObjectURL);
			blobUrls = [];

			readingState.sectionIndex = index;
			meta.progress = index;
			if (meta.id) {
				(await openLibraryDB).put('metadata', $state.snapshot(meta));
			}

			const computedStyles = getComputedStyle(document.documentElement);
			const primaryColor = computedStyles.getPropertyValue('--primary-color') || '0, 0, 0';

			let readerCSS = `
				:root {
					--essence-scale: ${settings.scale / 10};
					--essence-font: ${settings.fontFamily};
					--essence-color: rgb(${primaryColor});
				}

				html {
					box-sizing: border-box !important;
					width: 100% !important;
					height: 100% !important;
					overflow-x: hidden !important;
					padding: 3em 0 2em 0 !important;
				}

				body {
					margin: 0 !important;
					box-sizing: border-box !important;
					zoom: var(--essence-scale) !important;
					column-gap: 4em !important;
				}

				img,
				svg {
					max-height: calc(100vh - 6em) !important;
					max-width: 100% !important;
					object-fit: scale-down !important;
				}

				html,
				body {
					color: var(--essence-color) !important;
					background: transparent !important;
				}

				html[data-essence-mode='paginated'] {
					overflow-y: hidden !important;
				}

				html[data-essence-mode='paginated'] body {
					width: 100% !important;
					height: 100% !important;
					padding: 0 2em !important;
					column-count: 2 !important;
					column-fill: auto !important;
				}

				html[data-essence-mode='scrolled'] {
					overflow-y: auto !important;
				}

				html[data-essence-mode='scrolled'] body {
					margin: 0 auto !important;
					width: 50% !important;
					height: auto !important;
					padding: 0 0 2em 0 !important;
				}

				@media (max-width: 1000px) {
					html[data-essence-mode='scrolled'] body {
						width: 90% !important;
					}
				}

				html[data-essence-font]:not([data-essence-font='Default']) * {
					font-family: var(--essence-font) !important;
					line-height: normal !important;
				}

				html[data-essence-theme]:not([data-essence-theme='light']) * {
					background-color: transparent !important;
					color: var(--essence-color) !important;
				}
			`;

			const rootAttributes: Record<string, string> = {
				'data-essence-mode': settings.paginated ? 'paginated' : 'scrolled',
				'data-essence-font': settings.fontFamily,
				'data-essence-theme': $themeStore
			};

			let chapterHTML = await assembleChapter(
				book.spine[index],
				entries,
				registerBlobUrl,
				readerCSS,
				rootAttributes
			);

			await frame?.loadHTML(chapterHTML, target);
		}
	};

	const jumpTo = async (href: string) => {
		previousJumps = [...previousJumps, readingState.sectionIndex];
		const [chapterPath, elemId] = href.split('#');

		let targetIndex = readingState.sectionIndex;
		if (chapterPath) {
			targetIndex = book.spine.indexOf(chapterPath);

			if (targetIndex === -1) {
				const absPath = relativeToAbs(chapterPath, book.spine[readingState.sectionIndex]);
				targetIndex = book.spine.indexOf(absPath);
			}
		}

		const target: ReaderTarget = elemId ? { type: 'element', id: elemId } : { type: 'start' };

		if (targetIndex === readingState.sectionIndex) {
			frame?.goToTarget(target);
			return;
		}

		if (targetIndex !== -1) {
			await updateSection(targetIndex, target);
		}
	};

	const handleKeydown = ({ key }: { key: string }) => {
		switch (key) {
			case 'ArrowLeft':
				previousJumps = [];
				frame?.prev();
				break;
			case 'ArrowRight':
				previousJumps = [];
				frame?.next();
				break;
			default:
				break;
		}
	};

	$effect(() => {
		const computedStyles = getComputedStyle(document.documentElement);
		const primaryColor = computedStyles.getPropertyValue('--primary-color') || '0, 0, 0';

		frame?.setSettings(settings, $themeStore, primaryColor);
	});
</script>

<svelte:head>
	<title>
		{meta.title + ' - ' + meta.authors.join(', ')}
	</title>
</svelte:head>

<div in:fade={{ duration: 200 }}>
	<Topbar toned={toneTopbar}>
		{#snippet leftbar()}
			<a href="/">
				<CarbonChevronLeft />
			</a>
		{/snippet}

		{#snippet toptext()}
			<h4>
				<b>{meta.title} - </b>
				{meta.authors.join(', ')}
			</h4>
			<p>{progressPercent}%</p>
		{/snippet}

		{#snippet rightbar()}
			{#if previousJumps.length !== 0}
				<button
					transition:fade={{ duration: 200 }}
					id="jumpbtn"
					onclick={() => {
						let lastJump = previousJumps.pop();
						previousJumps = previousJumps;
						if (lastJump !== undefined) {
							updateSection(lastJump);
						}
					}}>
					<CarbonDirectionLoopLeft />
					{previousJumps[previousJumps.length - 1]}
				</button>
			{/if}
			<Drawer>
				{#snippet icon()}
					<CarbonTableOfContents />
				{/snippet}
				{#each book.toc as tocitem}
					<TocNode {tocitem} onClick={jumpTo} currentSection={readingState.sectionIndex} />
				{/each}
			</Drawer>
			<Drawer>
				{#snippet icon()}
					<CarbonSettings />
				{/snippet}
				<ReaderSettingsComponent bind:settings onScaleChange={() => frame?.onResize()} />
			</Drawer>
			<button onclick={() => frame?.prev()}><CarbonArrowLeft /></button>
			<button onclick={() => frame?.next()}><CarbonArrowRight /></button>
		{/snippet}
	</Topbar>

	<div class="iframe-container" class:paginated={settings.paginated}>
		<iframe bind:this={iframeElement} title="Book"></iframe>
	</div>
</div>

<svelte:window onresize={() => frame?.onResize()} onkeydown={handleKeydown} />

<style>
	.iframe-container {
		width: 100%;
		height: 100vh;
		overflow: hidden;
	}

	.iframe-container.paginated {
		width: 90%;
		margin: auto;
	}

	iframe {
		width: 100%;
		height: 100%;
		border: none;
		background: transparent;
	}

	#jumpbtn {
		border-radius: 0.25em;
		font-size: 1em;
		line-height: 1em;
	}
</style>
