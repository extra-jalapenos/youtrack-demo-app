import {scaleDiverging, type ScaleThreshold, scaleThreshold} from "d3";
export const colorScaleContributionLinear = scaleDiverging(["#ff1f6b", "#d15bff", "#0065ff"]);

const labels = {
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

export const contributionLabelScale = constructContributionLabelScale(labels.en)

const constructContributionCategoryColour = (labels: string[]) => {
    const colors: string[] = labels.map((_, i) => colorScaleContributionLinear(i / (labels.length - 1)));
    const bandCount = labels.length - 2;
    const thresholds: number[] = Array(bandCount+1).fill(0).map((_, idx) => (idx / bandCount) * (.98) + 0.01);
    return scaleThreshold([...thresholds, 1], colors)
}

export const contributionCategoryColour = constructContributionCategoryColour(labels.en);