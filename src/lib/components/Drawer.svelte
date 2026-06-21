<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';

	let { icon, children }: { icon: Snippet; children: Snippet } = $props();
	let visible: boolean = $state(false);

	let button: Element;

	function clickOutside(node: Node) {
		const handleClick = (event: Event) => {
			if (event.target instanceof Element) {
				if (!node.contains(event.target) && event.target !== button) {
					visible = false;
				}
			}
		};

		document.addEventListener('click', handleClick, true);

		return {
			destroy() {
				document.removeEventListener('click', handleClick, true);
			}
		};
	}

	function portal(node: HTMLElement) {
		document.body.appendChild(node);

		return {
			destroy() {
				if (node.parentNode) {
					node.parentNode.removeChild(node);
				}
			}
		};
	}
</script>

<button class="drawerBtn" bind:this={button} onclick={() => (visible = !visible)}>
	{@render icon()}
</button>

{#if visible}
	<div transition:fly={{ x: 50, duration: 200 }} class="drawer" use:clickOutside use:portal>
		<!-- Wrapper needed since WebKit on iOS cuts off content when scrolling otherwise -->
		<!-- See: https://stackoverflow.com/questions/26704903/only-in-safari-positionfixed-child-cut-off-when-parent-is-positionfixed-and -->
		<div class="wrapper">
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.drawer {
		position: fixed;
		padding: 1em;
		background: rgba(var(--secondary-bg), 0.8);
		-webkit-backdrop-filter: blur(15px);
		backdrop-filter: blur(15px);
		text-align: center;
		color: rgb(var(--primary-color));
		filter: drop-shadow(0 20px 13px rgb(0 0 0 / 0.03)) drop-shadow(0 8px 5px rgb(0 0 0 / 0.08));
		border-radius: 0.25em;
		z-index: 10;
		right: 0;
		top: 2em;
		width: 20em;
		max-width: 100%;
		height: calc(100vh - 2em);
		border-top: 1px solid rgba(var(--primary-color), 0.5);
		box-sizing: border-box;
	}
	.wrapper {
		overflow: auto;
		height: 100%;
	}

	.drawerBtn > :global(*) {
		pointer-events: none;
	}

	@media (max-width: 600px) {
		.drawer {
			width: 100%;
			border-radius: 0;
		}
	}

	@supports not ((-webkit-backdrop-filter: blur(5px)) or (backdrop-filter: blur(5px))) {
		.drawer {
			background-color: rgb(var(--secondary-bg));
		}
	}
</style>
