<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let { children } = $props();
	let dragging = $state(false);
	let dragCounter = 0;
	let readFile: ((file: File) => Promise<void>) | null = null;

	const handleDragEnter = (e: DragEvent) => {
		if (e.dataTransfer?.types.includes('Files')) {
			dragCounter++;
			dragging = true;
		}
	};

	const handleDragLeave = (e: DragEvent) => {
		dragCounter--;
		if (dragCounter === 0) {
			dragging = false;
		}
		e.preventDefault();
	};

	const handleDragOver = (e: DragEvent) => e.preventDefault();

	const handleDrop = (e: DragEvent) => {
		e.preventDefault();
		dragCounter = 0;
		dragging = false;

		const files = e.dataTransfer?.files;
		if (!files || !readFile) return;

		for (const file of files) {
			readFile(file);
		}
	};

	const handleReaderDrop = (e: Event) => {
		dragCounter = 0;
		dragging = false;

		const files = (e as CustomEvent<{ files: File[] }>).detail?.files;
		if (!files || !readFile) return;

		for (const file of files) {
			readFile(new File([file], file.name, { type: file.type, lastModified: file.lastModified }));
		}
	};

	onMount(async () => {
		readFile = (await import('$lib/utils')).readFile;

		window.addEventListener('dragenter', handleDragEnter);
		window.addEventListener('dragleave', handleDragLeave);
		window.addEventListener('dragover', handleDragOver);
		window.addEventListener('drop', handleDrop);
		window.addEventListener('reader-drop', handleReaderDrop);
	});

	onDestroy(() => {
		window.removeEventListener('dragenter', handleDragEnter);
		window.removeEventListener('dragleave', handleDragLeave);
		window.removeEventListener('dragover', handleDragOver);
		window.removeEventListener('drop', handleDrop);
		window.removeEventListener('reader-drop', handleReaderDrop);
	});
</script>

{@render children()}
