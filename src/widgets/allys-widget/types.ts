const firstNames = [
    "alex",
    "jordan",
    "taylor",
    "morgan",
    "casey",
    "riley",
    "jamie",
    "sam",
    "avery",
    "quinn",
];

function randomInteger(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateWithinPastThreeYears(): Date {
    const now = Date.now();
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const timestamp = randomInteger(threeYearsAgo.getTime(), now);
    return new Date(timestamp);
}


export type dataPointRaw = {
    duration: {
        minutes: number
    };
    category?: string;
    author: {
        login: string;
    };
    date: Date
}

class DataPointRaw implements dataPointRaw {
    duration: {
        minutes: number;
    };

    author: {
        login: string;
    };

    date: Date;

    constructor() {
        this.duration = {
            minutes: randomInteger(1, 90),
        };

        this.author = {
            login: firstNames[randomInteger(0, firstNames.length - 1)],
        };

        this.date = randomDateWithinPastThreeYears();
    }
}

export default DataPointRaw
