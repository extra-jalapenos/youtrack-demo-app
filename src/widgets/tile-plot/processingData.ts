import {DataPointRaw, ExtractedDataPoint, TileChartDataPoint} from "./types.ts";
import {color, InternMap, rollup, scaleDiverging, scaleLinear, scaleQuantize, sum, timeDay, union} from "d3";
import {calculateAverageOtherContribution, compareContributionToRest, getEmptyMap} from "./helper.ts";

export const extractRelevantInfo = (fetchedData: DataPointRaw[]): ExtractedDataPoint[] => fetchedData.map(d => {
    const date = timeDay.floor(new Date(d.date));
    return {
        authorId: d.author.id,
        minutes: d.duration.minutes,
        date
    };
})

export const calculateMinutesByDay = (extractedDataPoints: ExtractedDataPoint[]): InternMap<Date, { totalMinutes: number, uniquePersons: number }> => {
    return rollup(extractedDataPoints,
        D =>  {
            return {
                totalMinutes: sum(D, d => d.minutes),
                uniquePersons: union(D.map(d => d.authorId)).size
            }
        },
        d => d.date
    )
}

export const calculateMinutesByDayAndPersonId = (extractedDataPoints: ExtractedDataPoint[]): InternMap<Date, InternMap<string, number>> => {
    return rollup(extractedDataPoints,
        D => sum(D, d => d.minutes),
        d => d.date,
        d => d.authorId
    )
}

export const evaluateFromPOV = (authorId: string, extractedDataPoints: ExtractedDataPoint[], from: Date, to: Date): TileChartDataPoint[] => {
    const minutesPerDay = calculateMinutesByDay(extractedDataPoints);
    const minutesByDayAndPersonId = calculateMinutesByDayAndPersonId(extractedDataPoints);

    const allDays = getEmptyMap(from, to)
    const fillDates = allDays.map(date => {
        const somebodyDidSomething = minutesPerDay.has(date);

        if (somebodyDidSomething === false) {
            return {
                date,
                minutes: 0,
                totalMinutes: 0,
                contribution: 0.5
            }
        }
        const { totalMinutes, uniquePersons } = minutesPerDay.get(date)!;
        const ownContribution: number = minutesByDayAndPersonId.get(date)!.get(authorId) || 0;
        const avgContribution = calculateAverageOtherContribution(minutesByDayAndPersonId.get(date)!, authorId)
        const contribution = compareContributionToRest([ownContribution, avgContribution])

        return {
            date,
            totalMinutes,
            contribution,
            minutes: ownContribution
        }
    })
    return fillDates
}