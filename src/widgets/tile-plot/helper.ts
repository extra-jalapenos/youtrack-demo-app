import {
    InternMap,
    union,
    timeMonday,
    timeMondays,
    timeDays,
    timeDay,
    scaleThreshold,
    scaleDiverging,
    range, scaleQuantize, interpolateArray, interpolateBasis
} from "d3"
import {TileChartDataPoint} from "./types.ts";
import {formatDuration} from "date-fns/formatDuration";

export const getMondays = (from: Date, to: Date) => {
    return union([timeMonday.floor(from), ...timeMondays(from, to, 1), timeDay.floor(to)])
}

export const describeDataPoint = (d: TileChartDataPoint) => {
    const dateString = `${d.date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric", weekday: "short" })}`
    if (d.totalMinutes === 0) {
        return `${dateString}\nno work done by anybody`
    }
    return (
        `${dateString}\n` +
        `${formatDuration({ minutes: d.minutes || 0 })} out of ${formatDuration({ minutes: d.totalMinutes || 0 })} (${(d.contribution * 100).toFixed(0)}%)`
    )
}

export const getEmptyMap = (from: Date, to: Date) => timeDays(timeMonday.floor(from), timeDay.floor(to))

export const calculateAverageOtherContribution = (
    minutesByPerson: InternMap<string, number>,
    excludePerson: string
): number => {
    const otherPeople = Array.from(minutesByPerson.entries())
        .filter(([person]) => person !== excludePerson)
        .map(([, minutes]) => minutes);

    if (otherPeople.length === 0) return 0;
    return otherPeople.reduce((sum, minutes) => sum + minutes, 0) / otherPeople.length;
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
};

export const createQuantizedColorScale = () => {
    const divergingScale = scaleDiverging(["#ff1f6b", "#d15bff", "#0065ff"]);
    const colors = range(7).map(i => divergingScale(i / 6));

    const labels = {
        "en": ["nothing", "very little", "less", "average", "more", "much more", "everything"]
    }

    return scaleQuantize<string>().domain([0, 1]).range(labels.en)
};