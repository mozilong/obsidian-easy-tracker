/*
 * CalendarHeatmap
 * Lightweight calendar-style heatmap renderer with GitHub-like layout.
 * Supports multiple time windows (year, month, week, rolling range) and custom color scales.
 * Github: https://github.com/hunter-ji/calendar-heatmap
 * Author: Hunter Ji
 */

(function (globalFactory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = globalFactory();
    } else if (typeof define === 'function' && define.amd) {
        define(globalFactory);
    } else {
        const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;
        globalScope.CalendarHeatmap = globalFactory();
    }
})(function calendarHeatmapFactory() {
    const DEFAULT_COLORS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
    const STYLE_ID = 'calendar-heatmap-style';

    const DEFAULT_OPTIONS = {
        view: 'year',
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
        weekStart: 0, // 0 Sunday, 1 Monday
        recentDays: 7,
        squareSize: 14,
        squareGap: 2,
        colorScale: DEFAULT_COLORS,
        maxValue: null,
        legend: false,
        tooltip: true,
        locale: undefined,
        language: 'en'
    };

    const LANGUAGE_CONFIG = {
        en: {
            locale: 'en-US',
            legend: { less: 'Less', more: 'More' },
            weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            tooltip: (value, date) => `${value} on ${date}`
        },
        'zh-cn': {
            locale: 'zh-CN',
            legend: { less: '较少', more: '较多' },
            weekdays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
            tooltip: (value, date) => `${date}：${value}`
        },
        'zh-tw': {
            locale: 'zh-TW',
            legend: { less: '較少', more: '較多' },
            weekdays: ['週日', '週一', '週二', '週三', '週四', '週五', '週六'],
            tooltip: (value, date) => `${date}：${value}`
        },
        ja: {
            locale: 'ja-JP',
            legend: { less: '少ない', more: '多い' },
            weekdays: ['日', '月', '火', '水', '木', '金', '土'],
            tooltip: (value, date) => `${date}：${value}`
        },
        fr: {
            locale: 'fr-FR',
            legend: { less: 'Moins', more: 'Plus' },
            weekdays: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
            tooltip: (value, date) => `${value} le ${date}`
        },
        de: {
            locale: 'de-DE',
            legend: { less: 'Weniger', more: 'Mehr' },
            weekdays: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
            tooltip: (value, date) => `${value} am ${date}`
        },
        ko: {
            locale: 'ko-KR',
            legend: { less: '적음', more: '많음' },
            weekdays: ['일', '월', '화', '수', '목', '금', '토'],
            tooltip: (value, date) => `${date} ${value}`
        },
        es: {
            locale: 'es-ES',
            legend: { less: 'Menos', more: 'Más' },
            weekdays: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
            tooltip: (value, date) => `${value} el ${date}`
        },
        it: {
            locale: 'it-IT',
            legend: { less: 'Meno', more: 'Più' },
            weekdays: ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'],
            tooltip: (value, date) => `${value} il ${date}`
        }
    };

    const LANGUAGE_ALIASES = {
        en: 'en',
        'en-us': 'en',
        'en-gb': 'en',
        english: 'en',
        zh: 'zh-cn',
        'zh-cn': 'zh-cn',
        'zh-hans': 'zh-cn',
        'zh-sg': 'zh-cn',
        'zh-tw': 'zh-tw',
        'zh-hant': 'zh-tw',
        'zh-hk': 'zh-tw',
        ja: 'ja',
        'ja-jp': 'ja',
        japanese: 'ja',
        fr: 'fr',
        'fr-fr': 'fr',
        french: 'fr',
        de: 'de',
        'de-de': 'de',
        german: 'de',
        ko: 'ko',
        'ko-kr': 'ko',
        korean: 'ko',
        es: 'es',
        'es-es': 'es',
        spanish: 'es',
        it: 'it',
        'it-it': 'it',
        italian: 'it'
    };

    function resolveLanguageConfig(language) {
        const key = String(language || 'en').toLowerCase();
        const matched = LANGUAGE_ALIASES[key] || key;
        return LANGUAGE_CONFIG[matched] || LANGUAGE_CONFIG.en;
    }

    function normalizeContainer(container) {
        if (!container) {
            throw new Error('CalendarHeatmap: container is required.');
        }
        if (typeof container === 'string') {
            const node = document.querySelector(container);
            if (!node) {
                throw new Error(`CalendarHeatmap: container selector "${container}" not found.`);
            }
            return node;
        }
        return container;
    }

    function ensureStyles() {
        if (typeof document === 'undefined') return;
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            ".ch-root { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; --ch-size: 14px; --ch-gap: 2px; }",
            '.ch-grid { display: grid; grid-auto-flow: column; grid-auto-columns: max-content; column-gap: var(--ch-gap); }',
            '.ch-week { display: grid; grid-template-rows: repeat(7, 1fr); row-gap: var(--ch-gap); }',
            `.ch-day { width: var(--ch-size); height: var(--ch-size); box-sizing: border-box; border-radius: 2px; background-color: ${DEFAULT_COLORS[0]}; position: relative; }`,
            `.ch-day[data-level="0"] { background-color: ${DEFAULT_COLORS[0]}; }`,
            '.ch-tooltip { position: absolute; pointer-events: none; z-index: 9999; padding: 4px 6px; border-radius: 4px; font-size: 12px; background: rgba(17, 24, 39, 0.9); color: #fff; }',
            '.ch-legend { display: flex; align-items: center; gap: 4px; font-size: 12px; margin-top: 8px; color: #555; }',
            '.ch-legend .ch-swatch { display: inline-block; width: var(--ch-size); height: var(--ch-size); border-radius: 2px; }',
            '.ch-labels { display: grid; grid-template-rows: repeat(7, var(--ch-size)); row-gap: var(--ch-gap); margin-right: 6px; font-size: 10px; color: #555; }'
        ].join('\n');
        document.head.appendChild(style);
    }

    function dateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function parseKey(input) {
        if (input instanceof Date) {
            return dateKey(input);
        }
        if (typeof input === 'string') {
            const s = input.trim();
            const d = new Date(s);
            if (!Number.isNaN(d.getTime())) {
                return dateKey(d);
            }
        }
        return null;
    }

    function normalizeData(data) {
        // Collapse incoming records into a date -> value map for quicker lookup during rendering.
        const map = new Map();
        if (!Array.isArray(data)) {
            return map;
        }
        data.forEach((item) => {
            if (!item) return;
            const date = new Date(item.date || item.day || item.dateString);
            if (Number.isNaN(date.getTime())) return;
            const key = dateKey(date);
            const value = typeof item.value === 'number' ? item.value : Number(item.count);
            if (Number.isNaN(value)) return;
            map.set(key, value);
        });
        return map;
    }

    function addDays(base, amount) {
        const next = new Date(base);
        next.setDate(base.getDate() + amount);
        return next;
    }

    function startOfWeek(date, weekStart) {
        const current = new Date(date);
        const diff = (current.getDay() - weekStart + 7) % 7;
        current.setDate(current.getDate() - diff);
        current.setHours(0, 0, 0, 0);
        return current;
    }

    function endOfWeek(date, weekStart) {
        const start = startOfWeek(date, weekStart);
        return addDays(start, 6);
    }

    function generateRange(view, options) {
        const weekStart = options.weekStart % 7;
        let start;
        let end;

        if (view === 'year') {
            const year = Number(options.year);
            start = new Date(year, 0, 1);
            end = new Date(year, 11, 31);
        } else if (view === 'month') {
            const year = Number(options.year);
            const month = Number(options.month);
            start = new Date(year, month, 1);
            end = new Date(year, month + 1, 0);
        } else if (view === 'week') {
            const base = options.startDate ? new Date(options.startDate) : new Date();
            if (Number.isNaN(base.getTime())) {
                throw new Error('CalendarHeatmap: invalid startDate for week view.');
            }
            start = startOfWeek(base, weekStart);
            end = endOfWeek(base, weekStart);
        } else if (view === 'recent') {
            const days = Math.max(Number(options.recentDays) || 7, 1);
            end = new Date();
            end.setHours(0, 0, 0, 0);
            start = addDays(end, -days + 1);
        } else {
            throw new Error(`CalendarHeatmap: unsupported view "${view}".`);
        }

        // Expand range to full weeks for grid alignment.
        const alignedStart = startOfWeek(start, weekStart);
        const alignedEnd = endOfWeek(end, weekStart);

        const dates = [];
        let cursor = new Date(alignedStart);
        while (cursor <= alignedEnd) {
            dates.push(new Date(cursor));
            cursor = addDays(cursor, 1);
        }

        return { start, end, alignedStart, alignedEnd, dates };
    }

    function computeColor(value, maxValue, colors) {
        const scale = Array.isArray(colors) && colors.length ? colors : DEFAULT_COLORS;
        if (typeof colors === 'function') {
            const result = colors(value, maxValue);
            if (typeof result === 'string') {
                return { color: result, level: value > 0 ? 1 : 0 };
            }
            if (result && typeof result === 'object') {
                const levelValue = Number(result.level);
                const safeLevel = Number.isFinite(levelValue) ? Math.max(0, Math.min(levelValue, scale.length - 1)) : value > 0 ? 1 : 0;
                return {
                    color: result.color || scale[safeLevel] || scale[0],
                    level: result.level != null ? safeLevel : value > 0 ? 1 : 0
                };
            }
        }
        if (!value || maxValue <= 0) {
            return { color: scale[0], level: 0 };
        }
        const levels = scale.length - 1;
        if (levels <= 0) {
            return { color: scale[0], level: value > 0 ? 1 : 0 };
        }
        const ratio = Math.min(value / maxValue, 1);
        const level = Math.max(1, Math.round(ratio * levels));
        return { color: scale[level], level };
    }

    function createLabels(options, languageConfig, locale) {
        if (typeof document === 'undefined') return null;
        const labels = document.createElement('div');
        labels.className = 'ch-labels';
        const customWeekdays = Array.isArray(languageConfig.weekdays) && languageConfig.weekdays.length === 7 ? languageConfig.weekdays : null;
        const formatter = customWeekdays ? null : new Intl.DateTimeFormat(locale, { weekday: 'short' });
        for (let i = 0; i < 7; i += 1) {
            const weekdayIndex = (i + options.weekStart) % 7;
            const text = customWeekdays ? customWeekdays[weekdayIndex] : formatter.format(new Date(2021, 7, weekdayIndex + 1));
            const label = document.createElement('span');
            label.textContent = text;
            labels.appendChild(label);
        }
        return labels;
    }

    function createLegend(colors, legendTexts) {
        if (typeof document === 'undefined') return null;
        const scale = Array.isArray(colors) && colors.length ? colors : DEFAULT_COLORS;
        const legend = document.createElement('div');
        legend.className = 'ch-legend';
        const captionLow = document.createElement('span');
        captionLow.textContent = legendTexts.less;
        legend.appendChild(captionLow);
        scale.forEach((color) => {
            const swatch = document.createElement('span');
            swatch.className = 'ch-swatch';
            swatch.style.backgroundColor = color;
            legend.appendChild(swatch);
        });
        const captionHigh = document.createElement('span');
        captionHigh.textContent = legendTexts.more;
        legend.appendChild(captionHigh);
        return legend;
    }

    function attachTooltip(root, formatter) {
        if (typeof document === 'undefined') return;
        let tooltip = document.createElement('div');
        tooltip.className = 'ch-tooltip';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);

        const handleMouseMove = (event) => {
            const target = event.target.closest('.ch-day');
            if (!target || !root.contains(target)) {
                tooltip.style.display = 'none';
                return;
            }
            tooltip.innerHTML = formatter(target.dataset);
            tooltip.style.display = 'block';
            tooltip.style.left = `${event.pageX + 10}px`;
            tooltip.style.top = `${event.pageY + 10}px`;
        };

        const handleMouseLeave = () => {
            tooltip.style.display = 'none';
        };

        root.addEventListener('mousemove', handleMouseMove);
        root.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            root.removeEventListener('mousemove', handleMouseMove);
            root.removeEventListener('mouseleave', handleMouseLeave);
            if (tooltip && tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
            tooltip = null;
        };
    }

    class CalendarHeatmap {
        constructor(container, data = [], options = {}) {
            if (typeof document === 'undefined') {
                throw new Error('CalendarHeatmap: browser environment required.');
            }
            this.container = normalizeContainer(container);
            this.options = Object.assign({}, DEFAULT_OPTIONS, options);
            this.data = normalizeData(data);
            this.tooltipDisposer = null;
            ensureStyles();
            this.render();
        }

        setOptions(options = {}) {
            this.options = Object.assign({}, this.options, options);
            ensureStyles();
            this.render();
        }

        setData(data = []) {
            this.data = normalizeData(data);
            this.render();
        }

        replaceData(data = []) {
            this.setData(data);
        }

        render() {
            const { dates, start, end } = generateRange(this.options.view, this.options);
            const languageConfig = resolveLanguageConfig(this.options.language || this.options.locale);
            const locale = this.options.locale || languageConfig.locale || undefined;
            let dateFormatter;
            try {
                dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
            } catch (error) {
                dateFormatter = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' });
            }
            const values = Array.from(this.data.values());
            const maxValue = this.options.maxValue != null ? this.options.maxValue : values.reduce((acc, value) => Math.max(acc, value), 0);

            const root = document.createElement('div');
            root.className = 'ch-root';
            root.style.setProperty('--ch-size', `${this.options.squareSize}px`);
            root.style.setProperty('--ch-gap', `${this.options.squareGap}px`);

            const gridWrapper = document.createElement('div');
            gridWrapper.style.display = 'flex';

            const labels = createLabels(this.options, languageConfig, locale);
            if (labels) {
                gridWrapper.appendChild(labels);
            }

            const grid = document.createElement('div');
            grid.className = 'ch-grid';

            // Track week columns for grouping.
            let currentWeek = [];
            let currentWeekNumber = null;
            const isYearView = this.options.view === 'year';

            const today = new Date();
            const weekStart = this.options.weekStart % 7;

            for (let index = 0; index < dates.length; index += 1) {
                const dayDate = dates[index];
                const key = dateKey(dayDate);
                if (isYearView && key > dateKey(today)) {
                    break;
                }

                const weekNumber = Math.floor(index / 7);
                if (currentWeekNumber !== weekNumber) {
                    if (currentWeek.length) {
                        grid.appendChild(buildWeekColumn(currentWeek));
                        currentWeek = [];
                    }
                    currentWeekNumber = weekNumber;
                }

                const value = this.data.get(key) || 0;
                const { color, level } = computeColor(value, maxValue, this.options.colorScale);
                const weekdayIndex = (dayDate.getDay() - weekStart + 7) % 7;

                const dayNode = document.createElement('div');
                dayNode.className = 'ch-day';
                dayNode.style.backgroundColor = color;
                dayNode.dataset.level = String(level);
                dayNode.dataset.value = String(value);
                dayNode.dataset.date = key;
                dayNode.dataset.rangeStart = dateKey(start);
                dayNode.dataset.rangeEnd = dateKey(end);
                dayNode.title = '';
                dayNode.style.gridRowStart = String(weekdayIndex + 1);

                currentWeek.push(dayNode);
            };

            if (currentWeek.length) {
                grid.appendChild(buildWeekColumn(currentWeek));
            }

            gridWrapper.appendChild(grid);
            root.appendChild(gridWrapper);
            if (this.options.view === 'year') {
				scheduleTrimToFit(this.container, grid);
			}

            if (this.options.legend) {
                const legendTexts = Object.assign({}, LANGUAGE_CONFIG.en.legend, languageConfig.legend);
                const legend = createLegend(this.options.colorScale, legendTexts);
                if (legend) {
                    root.appendChild(legend);
                }
            }

            this.container.innerHTML = '';
            this.container.appendChild(root);

            if (this.tooltipDisposer) {
                this.tooltipDisposer();
                this.tooltipDisposer = null;
            }
            if (this.options.tooltip) {
                const tooltipFormatter = (dataset) => {
                    const value = Number(dataset.value) || 0;
                    const parsed = new Date(dataset.date);
                    const dateLabel = Number.isNaN(parsed.getTime()) ? dataset.date : dateFormatter.format(parsed);
                    return languageConfig.tooltip ? languageConfig.tooltip(value, dateLabel) : LANGUAGE_CONFIG.en.tooltip(value, dateLabel);
                };
                this.tooltipDisposer = attachTooltip(root, tooltipFormatter);
            }
        }

        destroy() {
            if (this.tooltipDisposer) {
                this.tooltipDisposer();
                this.tooltipDisposer = null;
            }
            this.container.innerHTML = '';
        }
    }

    function buildWeekColumn(days) {
        const column = document.createElement('div');
        column.className = 'ch-week';
        days.forEach((day) => {
            column.appendChild(day);
        });
        return column;
    }

    function scheduleTrimToFit(container, grid) {
        if (typeof window === 'undefined') return;
        const executeTrim = () => {
            const availableWidth = container.clientWidth || container.getBoundingClientRect().width || 0;
            if (!availableWidth) return;
            while (grid.scrollWidth > availableWidth - 40 && grid.children.length > 1) {
                const firstColumn = grid.firstElementChild;
                if (!firstColumn) break;
                grid.removeChild(firstColumn);
            }
        };
        if (typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(executeTrim);
        } else {
            executeTrim();
        }
    }

    CalendarHeatmap.defaults = Object.assign({}, DEFAULT_OPTIONS);
    CalendarHeatmap.languages = LANGUAGE_CONFIG;

    return CalendarHeatmap;
});
