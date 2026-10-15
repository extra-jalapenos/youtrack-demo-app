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

export type TileChartDataPoint = {
    date: Date,
    author: string,
    minutes: number
}

export type TileChartConfig = {
    viewBoxWidth: number,
    viewBoxHeight: number,
    data: TileChartDataPoint[]
}
