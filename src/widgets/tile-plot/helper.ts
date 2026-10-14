import { InternMap, union, utcMondays, timeFormat } from "d3";
import { TilePlotDataContext } from "./types";

const DEFAULT_LOCALE = "en-US";

const _getWeekdayNames = (localeString: string) => Array(7)
    .fill(0)
    .map((_, i) => {
        const today = new Date();
        const newDate = new Date(today.getFullYear(), today.getMonth(), i)
        return newDate
    }).sort((a, b) => {
        const [indexA, indexB] = [a.getDay() || 7, b.getDay() || 7]
        return indexA - indexB
    }).map(d => d.toLocaleDateString(localeString || [], {weekday: "short"}))

const _monthNames = (localeString: string) => Array.from({length: 12}, (_, i) =>
    new Date(2000, i, 1).toLocaleDateString(localeString || [], {
        month: "long"
    })
);

const _getISOWeek = (date: Date) => {

    // Normalize to UTC midnight.
    const day: Date = new Date(
        Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        )
    );

    // ISO weeks start on Monday. Convert Sunday from 0 to 7.
    const dayNumber = day.getUTCDay() || 7;

    // Move to the Thursday of the current ISO week.
    day.setUTCDate(day.getUTCDate() + 4 - dayNumber);

    const isoYear = day.getUTCFullYear();

    // Find the first Thursday of the ISO year.
    const yearStart = new Date(Date.UTC(isoYear, 0, 1));
    const firstThursdayOffset =
        (4 - (yearStart.getUTCDay() || 7) + 7) % 7;

    const firstThursday: Date = new Date(yearStart);

    firstThursday.setUTCDate(
        yearStart.getUTCDate() + firstThursdayOffset
    );

    const week: number = Math.floor((day.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

    return {
        year: isoYear,
        week,
        label: `${String(week).padStart(2, "0")}`
    };
};

export const calculateAverageOtherContribution = (
    minutesByPerson: Map<string, number>,
    excludePerson: string
): number => {
    const otherPeople = Array.from(minutesByPerson.entries())
        .filter(([person]) => person !== excludePerson)
        .map(([, minutes]) => minutes);

    if (otherPeople.length === 0) return 0;
    return otherPeople.reduce((sum, minutes) => sum + minutes, 0) / otherPeople.length;
};

export const calculateContributionRatio = (
    personMinutes: number,
    otherAverageMinutes: number
): number => {
    return compareContributionToRest([personMinutes, otherAverageMinutes]);
};

export const compareContributionToRest = ([personalContribution = 0, otherContributions = 0]: [number, number]) => {
    if (
        !Number.isFinite(personalContribution) ||
        !Number.isFinite(otherContributions) ||
        personalContribution < 0 ||
        otherContributions < 0
    ) {
        throw new Error("Both values must be finite numbers greater than or equal to 0");
    }

    const total = personalContribution + otherContributions;

    // Undefined mathematically, but 0 is usually the most useful result.
    if (total === 0) return .5;


    return personalContribution / total;
}

export const giniIndex = (values: number[]) => {
    if (!Array.isArray(values) || values.length === 0) {
        throw new Error("values must be a non-empty array");
    }

    if (!values.every(Number.isFinite)) {
        throw new Error("values must contain only finite numbers");
    }

    if (values.every(value => value === 0)) {
        return 0
    }

    if (values.some(value => value < 0)) {
        throw new Error("Gini index requires non-negative values");
    }

    if (values.some(value => value === 0)) {
        const nonNullPosition = values.findIndex(value => value > 0)
        return [-1, 1][nonNullPosition]
    }

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const total = sorted.reduce((sum, value) => sum + value, 0);

    // If everyone earns zero, inequality is treated as zero.
    if (total === 0) return 0;

    const weightedSum = sorted.reduce(
        (sum, value, index) => sum + (index + 1) * value,
        0
    );

    return (2 * weightedSum) / (n * total) - (n + 1) / n;
}

export const createAllWeekdaysMap = (
    from: Date,
    to: Date,
    locale: string = DEFAULT_LOCALE
): InternMap<string, InternMap<string, any>> => {
    const formatDateYearISOWeek = timeFormat("%Y-%V");
    const weekdayNames = _getWeekdayNames(locale);

    const allWeeks = union([from, ...utcMondays(from, to, 1), to].map(d => formatDateYearISOWeek(d)));

    const result = new InternMap<string, InternMap<string, any>>();

    for (const week of allWeeks) {
        const weekdaysMap = new InternMap<string, any>();

        for (let weekday = 1; weekday <= 7; weekday++) {
            const weekdayStr = String(weekday);
            const weekdayName = weekdayNames[weekday - 1];

            weekdaysMap.set(weekdayStr, {
                label: `${weekdayName}`,
                minutesTotal: 0,
                minutesByPersonAndDay: new Map(),
                contribution: 0
            });
        }

        result.set(week, weekdaysMap);
    }

    return result;
};

export interface SummaryItem {
    category: string;
    days: number;
    minutes: number;
    percentage: number;
}

export const createSummaryStats = (
    dataContext: TilePlotDataContext,
    allDays: Date[],
    labelScale: (value: number) => string,
    contributionCategories: string[]
): SummaryItem[] => {
    const formatDateYearISOWeek = timeFormat("%Y-%V");
    const formatDateWeekday = timeFormat("%u");

    const categoryCounts: Record<string, SummaryItem> = {};
    contributionCategories.forEach(cat => {
        categoryCounts[cat] = { category: cat, days: 0, minutes: 0, percentage: 0 };
    });

    allDays.forEach(date => {
        const week = formatDateYearISOWeek(date);
        const weekday = formatDateWeekday(date);

        const weekData = dataContext.enrichedData.get(week);
        if (!weekData) return;

        const dayData = weekData.get(weekday);
        if (!dayData) return;

        if (dayData.minutesTotal <= 0) return;

        const category = labelScale(dayData.contribution);

        categoryCounts[category].days++;
        categoryCounts[category].minutes += dayData.personMinutes;
    });

    const totalDays = allDays.length;
    const results = contributionCategories.map(cat => {
        const item = categoryCounts[cat];
        return {
            ...item,
            percentage: totalDays > 0 ? Math.round((item.days / totalDays) * 100) : 0
        };
    });

    return results;
};

export const aggregateDaysByCategory = (
    renderedData: InternMap<string, InternMap<string, any>>,
    labelContribution: (value: number) => string,
    allDays: Date[],
    perspectivePerson: string,
    contributionCategories: string[]
): SummaryItem[] => {
    const formatDateYearISOWeek = timeFormat("%Y-%V");
    const formatDateWeekday = timeFormat("%u");

    const categoryCounts: Record<string, SummaryItem> = {};
    contributionCategories.forEach(cat => {
        categoryCounts[cat] = { category: cat, days: 0, minutes: 0, percentage: 0 };
    });

    allDays.forEach(date => {
        const week = formatDateYearISOWeek(date);
        const weekday = formatDateWeekday(date);

        const weekData = renderedData.get(week);
        if (!weekData) return;

        const dayData = weekData.get(weekday);
        if (!dayData) return;

        if (dayData.minutesTotal <= 0) return;

        const category = labelContribution(dayData.contribution);
        const personMinutes = dayData.minutesByPersonAndDay?.get(perspectivePerson) || 0;

        categoryCounts[category].days++;
        categoryCounts[category].minutes += personMinutes;
    });

    const totalDays = allDays.length;
    const results = contributionCategories.map(cat => {
        const item = categoryCounts[cat];
        return {
            ...item,
            percentage: totalDays > 0 ? Math.round((item.days / totalDays) * 100) : 0
        };
    });

    return results;
};
