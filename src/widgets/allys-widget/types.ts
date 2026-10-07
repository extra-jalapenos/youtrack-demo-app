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