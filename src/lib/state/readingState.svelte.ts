class ReadingState {
	sectionIndex = $state(0);
	sectionProgress = $state(0);
	totalProgress = $state(0);
}

export const readingState = new ReadingState();
