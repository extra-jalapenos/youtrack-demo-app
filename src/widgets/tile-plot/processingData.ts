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

export const calculateMinutesByWeek = (extractedDataPoints: ExtractedDataPoint[]): InternMap<Date, { totalMinutes: number, uniquePersons: number }> => {
    return rollup(extractedDataPoints,
        D =>  {
            return {
                totalMinutes: sum(D, d => d.minutes),
                uniquePersons: union(D.map(d => d.authorId)).size
            }
        },
        d => timeMonday(d.date)
    )
}

export const calculateMinutesByDayAndPersonId = (extractedDataPoints: ExtractedDataPoint[]): InternMap<Date, InternMap<string, number>> => {
    return rollup(extractedDataPoints,
        D => sum(D, d => d.minutes),
        d => d.date,
        d => d.authorId
    )
}


export const calculateMinutesByWeekAndPersonId = (extractedDataPoints: ExtractedDataPoint[]): InternMap<Date, InternMap<string, number>> => {
    return rollup(extractedDataPoints,
        D => sum(D, d => d.minutes),
        d => timeMonday(d.date),
        d => d.authorId
    )
}

export const evaluateFromPOV = (authorId: string,
                                extractedDataPoints: ExtractedDataPoint[],
                                from: Date,
                                to: Date,
                                by: "day" | "week" = "day"): TileChartDataPoint[] => {
    const calculateMinutesByTimeframe = () => {
        if (by === "day") {
            return calculateMinutesByDay(extractedDataPoints);
        } else {
            return calculateMinutesByWeek(extractedDataPoints);
        }
    };

    const calculateMinutesByTimeframeAndPersonId = () => {
        if (by === "day") {
            return calculateMinutesByDayAndPersonId(extractedDataPoints);
        } else {
            return calculateMinutesByWeekAndPersonId(extractedDataPoints);
        }
    }

    const minutesByTimeframe = calculateMinutesByTimeframe();
    const minutesByTimeframeAndPersonId = calculateMinutesByTimeframeAndPersonId();

    const allDays = getEmptyMap(from, to)
    const fillDates = allDays.map(date => {
        const getDateToCheck = () => by === "day" ? date : timeMonday(date);
        const dateToCheck = getDateToCheck();
        const somebodyDidSomething = minutesByTimeframe.has(dateToCheck);

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
        const { totalMinutes, uniquePersons } = minutesByTimeframe.get(dateToCheck)!;
        const ownContribution: number = minutesByTimeframeAndPersonId.get(dateToCheck)!.get(authorId) || 0;
        const avgMinutes = calculateAverageOtherContribution(minutesByTimeframeAndPersonId.get(dateToCheck)!, authorId) || 0 as number;
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
                avgMinutes: sum(D, d => d.avgMinutes),
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
    // to get the average contribution of e.g. "little" we have to look at avg minutes on category "most" for perspective Person!
    const averageContributionByLabel = rollup(evaluatedDataPoints,
        D => {
            const allNonZeroDays = D.filter(d => d.totalMinutes)
            return median(allNonZeroDays, d => d.avgMinutes)
        },
        d => contributionLabelScale(1 - d.contribution))

    const medianContributionByLabel = rollup(evaluatedDataPoints,
        D => {
            const allNonZeroDays = D.filter(d => d.totalMinutes)
            return {
                value: median(allNonZeroDays, d => d.minutes),
                benchmark: averageContributionByLabel.get(D[0].contributionCategory)
            }
        },
        d => d.contributionCategory
    )
    const dummyResult = { value: 0, benchmark: 0 }
    return contributionLabels.en.map((label: string) => {
        const labelIsPresent = medianContributionByLabel.has(label)
            if (labelIsPresent) {
                const values = medianContributionByLabel.get(label)
                return { label, ...dummyResult, ...values }
            }
        return  { label, ...dummyResult }
    })
}

export const getDayCountContributionCategories = (evaluatedDataPoints: TileChartDataPoint[]): CountChartDataPoint[] => {
    const allNonZeroDays = evaluatedDataPoints.filter(d => d.totalMinutes)
    // to get the average contribution of e.g. "little" we have to look at avg minutes on category "most" for perspective Person!
    const otherContributionByLabel = rollup(allNonZeroDays,
        D => {
            const allNonZeroDays = D.filter(d => d.totalMinutes)
            return allNonZeroDays.length
        },
        d => contributionLabelScale(1 - d.contribution)
    )

    const countsByLabel = rollup(allNonZeroDays,
        D => D.length,
        d => d.contributionCategory
    )

    return contributionLabels.en.map((label: string) => {
        return (
            {
                label,
                value: countsByLabel.get(label) || 0,
                benchmark: otherContributionByLabel.get(label) || 0,
            })
    })
}