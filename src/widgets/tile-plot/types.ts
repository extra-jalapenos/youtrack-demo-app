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

export type ExtractedDataPoint = {
    minutes: number;
    author: string;
    date: Date;
}

export type TileChartDataPoint = {
    date: Date,
    author: string,
    minutes: number
}

export type TileChartConfig = {
    viewBoxWidth?: number,
    viewBoxHeight?: number,
    data: TileChartDataPoint[],
    width?: number,
    height?: number
}
