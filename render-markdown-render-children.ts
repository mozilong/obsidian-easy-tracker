import { MarkdownRenderChild, ButtonComponent } from "obsidian";
import type EasyTrackerPlugin from "./main";
import CalendarHeatmap, { CalendarHeatmapOptions } from './calendar-heatmap/index.js';
import { parseEntries } from './utils';
import { computeDailyOverview, buildDailyOverview } from './daily-overview';

export class HeatmapRenderChild extends MarkdownRenderChild {
    plugin: EasyTrackerPlugin;
    source: string;
    heatmap: CalendarHeatmap | null = null;
    container: HTMLElement;

    constructor(plugin: EasyTrackerPlugin, containerEl: HTMLElement, source: string) {
        super(containerEl);
        this.plugin = plugin;
        this.source = source;
        this.container = containerEl;
    }

    onload() {
        this.display();

        // only need to update on data refresh
        this.registerEvent(this.plugin.app.workspace.on('easy-tracker:refresh', this.update.bind(this)));

        // If the week start setting changes, need to re-render
        this.registerEvent(this.plugin.app.workspace.on('easy-tracker-setting:refresh', this.display.bind(this)));
    }

    onunload() {
        if (this.heatmap) {
            this.heatmap.destroy();
            this.heatmap = null;
        }
    }

    display() {
        this.container.empty();
        const data = parseEntries(this.plugin.getActiveContent());
        const options = this.parseHeatmapOptions(this.source);
        
        const cardTitle = this.container.createDiv({ cls: 'easy-tracker-card' });
        cardTitle.createEl('div', { cls: 'easy-tracker-card-title', text: this.plugin.t('card.activityHistoryTitle') });
        const heatmapElement = cardTitle.createDiv({ cls: 'easy-tracker-year-calendar-heatmap' });

        this.onunload()
        this.heatmap = new CalendarHeatmap(heatmapElement, data, {
            weekStart: this.plugin.settings.weekStart,
            view: "year",
            year: new Date().getFullYear(),
            legend: false,
            language: this.plugin.locale,
            ...options,
        });
    }

    update() {
        if (this.heatmap) {
            const data = parseEntries(this.plugin.getActiveContent());
            this.heatmap.replaceData(data);
        } else {
            this.display();
        }
    }

    private parseHeatmapOptions(source: string): Partial<CalendarHeatmapOptions> {
        try {
            return source.trim() ? JSON.parse(source) : {};
        } catch {
            console.warn('calendar-heatmap: unable to parse options JSON, using defaults');
            return {};
        }
    }
}

export class DailyOverviewRenderChild extends MarkdownRenderChild {
    plugin: EasyTrackerPlugin;
    container: HTMLElement;

    constructor(plugin: EasyTrackerPlugin, containerEl: HTMLElement) {
        super(containerEl);
        this.plugin = plugin;
        this.container = containerEl;
    }

    onload() {
        this.display();
        this.registerEvent(this.plugin.app.workspace.on('easy-tracker:refresh', this.display.bind(this)));
    }

    display() {
        this.container.empty();
        const entries = parseEntries(this.plugin.getActiveContent());
        const overview = computeDailyOverview(entries);
        buildDailyOverview(this.container, overview, this.plugin.translator);
    }
}

export class ButtonsRenderChild extends MarkdownRenderChild {
    plugin: EasyTrackerPlugin;
    source: string;
    container: HTMLElement;

    constructor(plugin: EasyTrackerPlugin, containerEl: HTMLElement, source: string) {
        super(containerEl);
        this.plugin = plugin;
        this.source = source;
        this.container = containerEl;
    }

    onload() {
        this.display();
        this.registerEvent(this.plugin.app.workspace.on('easy-tracker:refresh', this.display.bind(this)));
    }

    display() {
        this.container.empty();
        const container = this.container.createDiv({ cls: "easy-tracker-card" });
        container.setAttr('id', 'easy-tracker-buttons');
        container.createEl('div', { cls: 'easy-tracker-card-title', text: this.plugin.t('card.buttonsTitle') });

        if (this.plugin.isTodayCheckedIn()) {
            container.createEl('div', { cls: 'easy-tracker-card-message', text: this.plugin.t('card.checkInCongrats') });
            return;
        }

        const wrap = container.createDiv({ cls: "easy-tracker-button-group" });
        const lines = this.source.split("\n").map(s => s.trim()).filter(Boolean);

        for (const [index, line] of lines.entries()) {
            const [text, val] = line.split('|').map(s => s.trim());
            const btn = new ButtonComponent(wrap);
            btn.buttonEl.addClass("btn");
            btn.setButtonText(text || this.plugin.t('card.defaultButton'));
            btn.onClick(() => {
                const n = Number(val);
                const valueToInsert = Number.isFinite(n) ? n : index + 1; 
                this.plugin.insertEntry(valueToInsert);
            });
        }
    }
}
