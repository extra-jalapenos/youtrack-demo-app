import {
    ExtractedDataPoint
} from "./types.ts";

import {map, union} from "d3";

export const extractAllPeople = (filteredData: ExtractedDataPoint[]): string[] => {
    const people = union(map(filteredData, d => d.author).sort());
    return Array.from(people);
};
