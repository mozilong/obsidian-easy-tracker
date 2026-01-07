import { App, PluginSettingTab, Setting } from 'obsidian';
import EasyTrackerPlugin from './main';

// Plugin settings: weekStart (0 = Sunday, 1 = Monday)
export interface EasyTrackerPluginSettings {
	weekStart: 0 | 1;
}

export const DEFAULT_SETTINGS: EasyTrackerPluginSettings = {
	weekStart: 1,
};

export class EasyTrackerSettingTab extends PluginSettingTab {
	plugin: EasyTrackerPlugin;

	constructor(app: App, plugin: EasyTrackerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

			new Setting(containerEl)
				.setName(this.plugin.t('setting.weekStartName'))
				.setDesc(this.plugin.t('setting.weekStartDescription'))
				.addDropdown(drop => {
					// 1 = Monday (default); 0 = Sunday
					drop.addOption('1', this.plugin.t('setting.weekStart.monday'));
					drop.addOption('0', this.plugin.t('setting.weekStart.sunday'));
					drop.setValue(String(this.plugin.settings.weekStart));
					drop.onChange(async (value) => {
						this.plugin.settings.weekStart = value === '0' ? 0 : 1;
						await this.plugin.saveSettings();
					});
				});
	}
}
