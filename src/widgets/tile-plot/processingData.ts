import {DataPointRaw, PreparedDataPoint, RawAggregation} from "./types.ts";
import {InternMap, rollup, sum, timeFormat} from "d3";
import {createAllWeekdaysMap} from "./helper.ts";

const formatDateYearISOWeek = timeFormat("%Y-%V")
const formatDateWeekday = timeFormat("%u")

export const prepareRawDataPoints = (filteredData: DataPointRaw[]): PreparedDataPoint[] => {
    return filteredData.map((d: DataPointRaw) => ({
        series: d.author.login,
        date: new Date(d.date),
        column: formatDateYearISOWeek(new Date(d.date)),
        row: formatDateWeekday(new Date(d.date)),
        minutes: d.duration.minutes
    }));
};

export const rollupByWeekAndDay = (
    preppedData: PreparedDataPoint[]
): Map<string, Map<string, RawAggregation>> => {
    const rollupFunction = (entries: PreparedDataPoint[]): RawAggregation => {
        const minutesTotal = sum(entries, d => d.minutes)
        const minutesByPersonMap = rollup(entries,
            entriesOfPerson => sum(entriesOfPerson, d => d.minutes),
            d => d.series
        )
        return {
            minutesTotal,
            minutesByPersonMap
        }
    }

    const result: InternMap = rollup(preppedData,
        D => rollupFunction(D),
        d => d.column,
        d => d.row
    )

    return result;
};

export const fillEmptyDateSlots = (
    rolledupData: Map<string, Map<string, RawAggregation>>,
    from: Date | undefined,
    to: Date | undefined
): Map<string, Map<string, RawAggregation>> => {
    if (!from || !to) {
        return rolledupData;
    }

    const emptyMap = createAllWeekdaysMap(from, to, YTApp.locale)

    for (const [week, weekdaysData] of rolledupData) {
        const weekdaysMapInEmpty = emptyMap.get(week)
        if (weekdaysMapInEmpty) {
            for (const [weekday, data] of weekdaysData) {
                weekdaysMapInEmpty.set(weekday, data)
            }
        }
    }
    return emptyMap;
};