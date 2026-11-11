import {
    author, DataPointRaw,
    ExtractedDataPoint
} from "./types.ts";

import {indexes, map, rollup, union} from "d3";

export const extractAllPeople = (fetchedData: DataPointRaw[]): author[] => {
    const lookup = rollup(fetchedData, D => D[0].author, d => d.author.id);
    return Array.from(lookup.values());
};
