import {
    DataPointRaw
} from "./types.ts";

import {map, union} from "d3";

export const extractAllPeople = (filteredData: DataPointRaw[]): Set<string> => {
    const people = union(map(filteredData, d => d.author.login).sort());
    return new Set(people);
};
