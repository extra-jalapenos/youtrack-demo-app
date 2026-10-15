import { InternMap, union, timeMonday, timeMondays, timeDays, timeFormat, utcMonday, utcMondays } from "d3"

export const getMondays = (from: Date, to: Date) => {
    return union([timeMonday.floor(from), ...timeMondays(from, to, 1), utcMonday.floor(to)])
}

export const getEmptyMap = (from: Date, to: Date) => timeDays(timeMonday(from), to)

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