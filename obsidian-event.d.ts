import 'obsidian';

declare module 'obsidian' {
	interface Workspace {
		on(
			name: 'easy-tracker:refresh',
			callback: () => void
		): EventRef;
	}
}
