import {color, InternMap, scaleBand, scaleDiverging, scaleLinear, scaleThreshold, zip} from "d3";

export const colorScaleContributionLinear = scaleDiverging(["#ff1f6b", "#d15bff", "#0065ff"]);
export const intensityScale = scaleLinear().domain([0, 60]).range([0, 100]);

export const changeOpacity = (colorString: string, opacity: number): string => {
    if (colorString.length === 0) {
        return "transparent";
    }
    if (color(colorString) === null) {
        return colorString
    }
    return color(colorString)!.copy({ opacity }).formatHex8()
}

export const contributionLabels = {
    "en": [
        "nothing",
        "little",
        "less",
        "average",
        "more",
        "most",
        "everything"
    ]
}

const constructContributionLabelScale = (labels: string[]) => {
    const labelCount = labels.length;
    // without borders
    const bandCount = labels.length - 2;
    const thresholds: number[] = Array(bandCount+1).fill(0).map((_, idx) => (idx / bandCount) * (.98) + 0.01);
    return scaleThreshold([...thresholds, 1], labels);
}

export const contributionLabelScale = constructContributionLabelScale(contributionLabels.en)

const constructContributionCategoryColour = (labels: string[]) => {
    const colors: string[] = labels.map((_, i) => colorScaleContributionLinear(i / (labels.length - 1)));
    const pairs = zip(labels, colors) as [string, string][]
    return new InternMap(pairs)
}

export const contributionCategoryColour: InternMap<string, string> = constructContributionCategoryColour(contributionLabels.en);