import {DataPointRaw, ProcessedDataPoint} from "./types.ts";
import {flatRollup, InternMap, rollup, sum, extent, timeFormat, union, map} from "d3";
import {aggregateDaysByCategory, compareContributionToRest, createAllWeekdaysMap} from "./helper.ts";

const formatDateYearISOWeek = timeFormat("%Y-%V")
const formatDateWeekday = timeFormat("%u")

export const processDataForRendering = (filteredData: DataPointRaw[]) => {
    // extract the most needed points & name them appropriately
    const [from, to] = extent(filteredData, d => d.date)
    const allPeople = union(map(filteredData, d => d.author.login).sort())
    const preppedData: { series: string; date: Date; column: string; row: string; minutes: number }[] = filteredData
        .map((d: DataPointRaw) => {
            return (
                {
                    series: d.author.login,
                    date: new Date(d.date),
                    column: formatDateYearISOWeek(new Date(d.date)),
                    row: formatDateWeekday(new Date(d.date)),
                    minutes: d.duration.minutes
                }
            )
        });

    const rollupFunction = (entries: ProcessedDataPoint[]): any => flatRollup(entries,
        D => {
            const minutesTotal = sum(D, d => d.minutes)
            const minutesByPersonAndDay = rollup(entries,
                entriesOfPerson => {
                    return sum(entriesOfPerson, d => d.minutes)
                },
                d => d.series
            )
            const dateString = D[0].date.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })
            const allOtherPeople: string[] = Array.from(allPeople.keys())
                .filter(person => person !== perspectivePerson)

            const focusPersonContribution = minutesByPersonAndDay.get(perspectivePerson) || 0

            const allPeoplesContributions = allOtherPeople.map(person => minutesByPersonAndDay.get(person) || 0)
            const averageContribution = allOtherPeople.length === 0 ? 0 : sum(allPeoplesContributions) / allOtherPeople.length
            const contribution = compareContributionToRest([focusPersonContribution, averageContribution])


            const stringLabels = Array.from(minutesByPersonAndDay.entries())
                .map(([personName, minutes]) => `${personName}: ${minutes}m (${(minutes / minutesTotal * 100).toFixed(0)} %)`)
            const label = dateString + "\n" + stringLabels.join("\n")
            return {
                label,
                minutesTotal,
                minutesByPersonAndDay,
                contribution
            }
        }
    )

    const summedValuesBySeriesAndCategory: InternMap = rollup(preppedData,
        D => rollupFunction(D),
        d => d.column,
        d => d.row
    )
    const emptyMap = createAllWeekdaysMap(from, to, locale)

    for (const [week, weekdaysData] of summedValuesBySeriesAndCategory) {
        const weekdaysMapInEmpty = emptyMap.get(week)
        if (weekdaysMapInEmpty) {
            for (const [weekday, data] of weekdaysData) {
                weekdaysMapInEmpty.set(weekday, data)
            }
        }
    }
    return emptyMap;
}