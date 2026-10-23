import {CountChartDataPoint, DataPointRaw, ExtractedDataPoint, TileChartDataPoint} from "./types.ts";
import {count, InternMap, median, rollup, sum, timeDay, union, timeMonday} from "d3";
import {calculateAverageOtherContribution, compareContributionToRest, getEmptyMap} from "./helper.ts";
import {contributionLabels, contributionLabelScale} from "./colorScales.ts";

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
                contribution: 0.5,
                avgMinutes: 0,
                contributionCategory: contributionLabelScale(0.5)
            }
        }
        const { totalMinutes, uniquePersons } = minutesPerDay.get(date)!;
        const ownContribution: number = minutesByDayAndPersonId.get(date)!.get(authorId) || 0;
        const avgMinutes = calculateAverageOtherContribution(minutesByDayAndPersonId.get(date)!, authorId) || 0 as number;
        const contribution = compareContributionToRest([ownContribution, avgMinutes])

        return {
            date,
            totalMinutes,
            contribution,
            avgMinutes: avgMinutes,
            contributionCategory: contributionLabelScale(contribution),
            minutes: ownContribution
        }
    })
    return fillDates
}

export const addWeekAggregates = (dayPoints: TileChartDataPoint[]): TileChartDataPoint[] => {
    const minutesByWeek = rollup(dayPoints,
        D => {
            return {
                totalMinutes: sum(D, d => d.totalMinutes),
                minutes: sum(D, d => d.minutes),
                avgMinutes: sum(D, d => d.avgMinutes)
            }
        },
        d => timeMonday(d.date).getTime()
    )

    const weekAggregates: TileChartDataPoint[] = Array.from(minutesByWeek.entries()).map(([weekTimestamp, { totalMinutes, minutes, avgMinutes }]) => {
        const weekDate = new Date(weekTimestamp);
        const contribution = compareContributionToRest([minutes, avgMinutes])

        return {
            date: weekDate,
            minutes,
            avgMinutes,
            totalMinutes,
            contribution,
            contributionCategory: contributionLabelScale(contribution),
            isWeekAggregate: true
        }
    })

    return [...dayPoints, ...weekAggregates]
}

export const getAverageContributionPerCategory = (evaluatedDataPoints: TileChartDataPoint[]): CountChartDataPoint[] => {
    const medianContributionByLabel = rollup(evaluatedDataPoints,
        D => {
            const allNonZeroDays = D.filter(d => d.totalMinutes)
            return {
                count: median(allNonZeroDays, d => d.minutes),
                benchmark: median(allNonZeroDays, d => d.avgMinutes)
            }
        },
        d => d.contributionCategory
    )
    const dummyResult = { count: 0, benchmark: 0 }
    return contributionLabels.en.map((label: string) => {
        const labelIsPresent = medianContributionByLabel.has(label)
            if (labelIsPresent) {
                const values = medianContributionByLabel.get(label)
                return { label, ...dummyResult, ...values }
            }
        return  { label, ...dummyResult }
    })
}

export const countContributionCategories = (evaluatedDataPoints: TileChartDataPoint[]): CountChartDataPoint[] => {
    const allNonZeroDays = evaluatedDataPoints.filter(d => d.totalMinutes)
    // calculation of avg contributionlabel
    const otherPerspective = allNonZeroDays.map(d => {
        return {
            date: d.date,
            minutes: d.avgMinutes,
            contributionCategory: contributionLabelScale(d.avgMinutes)
        }
    })

    const benchmarkCounts = rollup(otherPerspective, D => D.length, d => d.contributionCategory)

    const countsByLabel = rollup(allNonZeroDays,
        D => D.length,
        d => d.contributionCategory
    )

    return contributionLabels.en.map((label: string) => {
        return (
            {
                label,
                count: countsByLabel.get(label) || 0,
                benchmark: benchmarkCounts.get(label) || 0,
            })
    })
}