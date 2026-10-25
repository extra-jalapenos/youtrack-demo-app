export type author = {
    id: string;
    login: string;
    name: string;
}

export type DataPointRaw = {
    duration: {
        minutes: number
    };
    category?: string;
    author: author;
    date: number;
}

export type ExtractedDataPoint = {
    minutes: number;
    authorId: string;
    date: Date;
}

export type TileChartDataPoint = {
    date: Date,
    minutes: number,
    avgMinutes: number,
    totalMinutes: number,
    contribution: number,
    contributionCategory: string,
    isWeekAggregate?: boolean
}

export type TileChartConfig = {
    viewBoxWidth?: number,
    viewBoxHeight?: number,
    data: TileChartDataPoint[],
    width: number,
    height: number,
    mode: "day" | "week"
}

export type CountChartDataPoint = {
    label: string;
    value: number;
    benchmark?: number;
}

export type CountChartConfig = {
    data: CountChartDataPoint[],
    viewBoxWidth: number,
    viewBoxHeight: number,
    width: number,
    height: number
}
