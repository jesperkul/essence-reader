import type { ActiveBook, Progress } from '$lib/types';

class ReadingState {
	activeBook = $state.raw<ActiveBook | undefined>(undefined);

	spineIndex = $state(0);
	sectionProgress = $state(0);
	totalProgress = $state(0);

	setState({ activeBook, progress }: { activeBook: ActiveBook; progress?: Progress }) {
		this.activeBook = activeBook;
		this.spineIndex = progress?.spineIndex ?? 0;
		this.sectionProgress = progress?.sectionProgress ?? 0;
		this.totalProgress = progress?.totalProgress ?? 0;
	}
}

export const readingState = new ReadingState();
