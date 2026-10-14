export type DataPointRaw = {
    duration: {
        minutes: number
    };
    category?: string;
    author: {
        login: string;
        name: string;
    };
    date: number;
}

export type ProcessedDataPoint = {
    series: string;
    date: Date;
    minutes: number
}

export type PreparedDataPoint = {
    series: string;
    date: Date;
    column: string; // ISO week
    row: string;    // weekday (Mon-Sun)
    minutes: number;
};

export type RawAggregation = {
    minutesTotal: number;
    minutesByPersonMap: Map<string, number>;
};

export type EnrichedDataPoint = RawAggregation & {
    label: string;
    contribution: number;     // perspective-specific: person's ÷ (person + avg_others)
    personMinutes: number;    // perspective-specific: this person's minutes
};

export type TilePlotDataContext = {
    rawData: Map<string, Map<string, RawAggregation>>;
    enrichedData: Map<string, Map<string, EnrichedDataPoint>>;
    allPeople: Set<string>;
    dateRange: { from: Date; to: Date };
    perspectivePerson: string;
};