import {
    DataPointRaw,
    RawAggregation,
    EnrichedDataPoint,
    TilePlotDataContext
} from "./types.ts";
import {prepareRawDataPoints, rollupByWeekAndDay, fillEmptyDateSlots} from "./processingData.ts";
import {calculateAverageOtherContribution, compareContributionToRest} from "./helper.ts";
import {map, union} from "d3";

export const extractAllPeople = (filteredData: DataPointRaw[]): Set<string> => {
    const people = union(map(filteredData, d => d.author.login).sort());
    return new Set(people);
};

export const enrichWithMetrics = (
    rawData: Map<string, Map<string, RawAggregation>>,
    perspectivePerson: string
): Map<string, Map<string, EnrichedDataPoint>> => {
    const result = new Map<string, Map<string, EnrichedDataPoint>>();

    for (const [week, weekdaysMap] of rawData) {
        const enrichedWeekdays = new Map<string, EnrichedDataPoint>();

        for (const [weekday, rawAgg] of weekdaysMap) {
            const personMinutes = rawAgg.minutesByPersonMap.get(perspectivePerson) || 0;
            const avgOther = calculateAverageOtherContribution(
                rawAgg.minutesByPersonMap,
                perspectivePerson
            );

            const contribution = compareContributionToRest([
                personMinutes,
                avgOther
            ]);

            // Build label from raw data
            const PERCENTAGE_MULTIPLIER = 100;
            const stringLabels = Array.from(rawAgg.minutesByPersonMap.entries())
                .map(([personName, minutes]) => {
                    const percentage = (minutes / rawAgg.minutesTotal * PERCENTAGE_MULTIPLIER).toFixed(0);
                    return `${personName}: ${minutes}m (${percentage} %)`;
                })
            const label = stringLabels.join("\n");

            enrichedWeekdays.set(weekday, {
                ...rawAgg,
                label,
                contribution,
                personMinutes
            });
        }

        result.set(week, enrichedWeekdays);
    }

    return result;
};

export const processDataForRendering = (
    filteredData: DataPointRaw[],
    perspectivePerson: string,
    from: Date,
    to: Date
): TilePlotDataContext => {
    // 1. Raw aggregation (no perspective)
    const prepared = prepareRawDataPoints(filteredData);
    const rolled = rollupByWeekAndDay(prepared);
    const filled = fillEmptyDateSlots(rolled, from, to);

    // 2. Enrich with perspective-dependent metrics
    const enrichedData = enrichWithMetrics(filled, perspectivePerson);

    // 3. Extract all people
    const allPeople = extractAllPeople(filteredData);

    // 4. Return context container
    return {
        rawData: filled,
        enrichedData,
        allPeople,
        dateRange: { from, to },
        perspectivePerson
    };
};
