import type { ReaderSettings } from '$lib/types';

export type ReaderTarget = { type: 'start' } | { type: 'end' } | { type: 'element'; id: string };

export interface ReaderFrameOptions {
	onKeydown: (data: { key: string }) => void;
	onRequestSectionChange: (direction: number) => void;
	onLinkClick: (href: string) => void;
	settings: ReaderSettings;
}

export class ReaderFrame {
	public iframe: HTMLIFrameElement;
	public settings: ReaderSettings | null = null;
	public currentPage = 0;

	private onKeydown: (data: { key: string }) => void;
	private onLinkClick: (href: string) => void;
	private onRequestSectionChange: (direction: number) => void;
	private resizeTimeout: number | null = null;

	constructor(iframe: HTMLIFrameElement, options: ReaderFrameOptions) {
		this.iframe = iframe;
		this.settings = options.settings;
		this.onKeydown = options.onKeydown;
		this.onRequestSectionChange = options.onRequestSectionChange;
		this.onLinkClick = options.onLinkClick;
	}

	public loadHTML(html: string, target?: ReaderTarget): Promise<void> {
		return new Promise((resolve) => {
			const handleLoad = () => {
				this.addListeners();

				if (target) {
					this.goToTarget(target);
				}
				resolve();
			};

			this.iframe.addEventListener('load', handleLoad, { once: true });
			this.iframe.srcdoc = html;
		});
	}

	public prev() {
		if (this.settings?.paginated) {
			if (this.currentPage > 0) {
				this.goToPage(this.currentPage - 1);
			} else {
				this.onRequestSectionChange(-1);
			}
		} else {
			this.onRequestSectionChange(-1);
		}
	}

	public next() {
		if (this.settings?.paginated) {
			const clientWidth = this.getClientWidth();
			const scrollWidth = this.getScrollWidth();

			if ((this.currentPage + 1) * clientWidth < scrollWidth) {
				this.goToPage(this.currentPage + 1);
			} else {
				this.onRequestSectionChange(1);
			}
		} else {
			this.onRequestSectionChange(1);
		}
	}

	public goToTarget(target: ReaderTarget) {
		const iframeDocument = this.iframe.contentWindow?.document;
		if (!iframeDocument) return;

		switch (target.type) {
			case 'start':
				this.goToPage(0);
				break;
			case 'end':
				const lastPage = Math.max(0, this.getPageCount() - 1);
				this.goToPage(lastPage);
				break;
			case 'element': {
				const el = iframeDocument.getElementById(target.id);
				if (!el) return;
				this.goToElement(el);
				break;
			}
		}
	}

	public onResize() {
		if (!this.settings?.paginated) return;

		if (this.resizeTimeout) {
			clearTimeout(this.resizeTimeout);
		}

		this.resizeTimeout = window.setTimeout(() => {
			this.iframe.contentWindow?.scrollTo({
				left: this.currentPage * this.getClientWidth(),
				behavior: this.settings?.animations ? 'smooth' : 'instant'
			});
		}, 100);
	}

	public setSettings(settings: ReaderSettings, theme: string, themeColor: string) {
		this.settings = settings;

		const iframeDocument = this.iframe.contentWindow?.document;
		if (!iframeDocument) return;

		const root = iframeDocument.documentElement;

		root.style.setProperty(
			'--essence-scale',
			this.settings?.scale ? (this.settings.scale / 10).toString() : '1'
		);
		root.style.setProperty('--essence-font', this.settings?.fontFamily || 'sans-serif');
		root.style.setProperty('--essence-color', `rgb(${themeColor})`);

		root.setAttribute('data-essence-mode', this.settings?.paginated ? 'paginated' : 'scrolled');
		root.setAttribute('data-essence-font', this.settings?.fontFamily || 'sans-serif');
		root.setAttribute('data-essence-theme', theme);
	}

	private addListeners = () => {
		const iframeDocument = this.iframe.contentWindow?.document;
		if (!iframeDocument) return;

		iframeDocument.addEventListener('keydown', (e) => {
			this.onKeydown({ key: e.key });
		});

		iframeDocument.addEventListener('click', (e) => {
			const anchor = (e.target as HTMLElement).closest('a');

			if (anchor) {
				const href = anchor.getAttribute('href');
				if (href) {
					if (href.startsWith('http://') || href.startsWith('https://')) {
						e.preventDefault();
						window.open(href, '_blank', 'noopener,noreferrer');
						return;
					}
					if (href.startsWith('mailto:')) return;

					e.preventDefault();
					this.onLinkClick(href);
				}
			}

			this.iframe.dispatchEvent(
				new MouseEvent('click', {
					bubbles: true,
					cancelable: true,
					clientX: e.clientX,
					clientY: e.clientY
				})
			);
		});

		iframeDocument.addEventListener('dragenter', (e: DragEvent) => e.preventDefault());
		iframeDocument.addEventListener('dragover', (e: DragEvent) => e.preventDefault());

		iframeDocument.addEventListener('drop', (e: DragEvent) => {
			e.preventDefault();

			const files = e.dataTransfer?.files;
			if (files && files.length > 0) {
				this.iframe.dispatchEvent(
					new CustomEvent('reader-drop', {
						bubbles: true,
						detail: { files: Array.from(files) }
					})
				);
			}
		});
	};

	private getClientWidth = () => this.iframe.clientWidth || 0;
	private getScrollWidth = () =>
		this.iframe.contentWindow?.document.documentElement.scrollWidth || 0;

	private getPageCount(): number {
		const width = this.getClientWidth();
		const total = this.getScrollWidth();
		return Math.max(1, Math.ceil(total / width));
	}

	private goToPage(page: number) {
		const width = this.getClientWidth();
		const lastPage = Math.max(0, this.getPageCount() - 1);

		this.currentPage = Math.max(0, Math.min(page, lastPage));

		this.iframe.contentWindow?.scrollTo({
			left: this.currentPage * width,
			behavior: this.settings?.animations ? 'smooth' : 'instant'
		});
	}

	private goToElement(el: Element) {
		if (this.settings?.paginated) {
			const left = el.getBoundingClientRect().left + this.iframe.contentWindow!.scrollX;
			const page = Math.floor(left / this.getClientWidth());
			this.goToPage(page);
		} else {
			el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
		}
	}
}
