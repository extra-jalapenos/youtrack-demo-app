import {DataPointRaw, ExtractedDataPoint} from "./types.ts";
import {rollup, sum} from "d3";

export const extractRelevantInfo = (fetchedData: DataPointRaw[]) => fetchedData.map(d => ({
    author: d.author.login,
    minutes: d.duration.minutes,
    date: new Date(d.date)
}))

export const minutesByDay = (extractedDataPoints: ExtractedDataPoint[]) => {
    return rollup(extractedDataPoints,
        D => sum(D, d => d.minutes),
        d => d.date
    )
}

export const minutesByDayAndPerson = (extractedDataPoints: ExtractedDataPoint[]) => {
    return rollup(extractedDataPoints,
        D => sum(D, d => d.minutes),
        d => d.date,
        d => d.author
    )
}