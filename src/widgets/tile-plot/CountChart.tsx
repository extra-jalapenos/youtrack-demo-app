import { useEffect, useRef } from "react";
import type { CountChartConfig, CountChartDataPoint } from "./types"
import {
    select,
    axisLeft,
    scaleBand,
    scaleLinear,
    sum, axisRight, axisBottom
} from "d3";
import Loader from "@jetbrains/ring-ui-built/components/loader/loader";
import { margin } from "./helper.ts";
import {
    contributionCategoryColour, contributionLabelScale
} from "./colorScales.ts";

const CountChart = ({ data, width, height }: CountChartConfig) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const viewBoxHeight = height > 0 ? height : 0;
    const viewBoxWidth = width > 0 ? width : 0;

    let canvasWidth = viewBoxWidth - margin.left - margin.right;
    let canvasHeight = viewBoxHeight - margin.top - margin.bottom;

    let xScale = scaleBand()
        .domain(contributionLabelScale.range())
        .range([0, canvasWidth])
        .padding(0.3);

    let yScale = scaleLinear()
        .domain([0, sum(data, d => d.count)])
        .range([canvasHeight, 0])
        .nice();

    useEffect(() => {
        if (!svgRef.current) return;
        const svg = select(svgRef.current);

        if (svg.select(".axes").empty()) {
            const axes = svg.append("g")
                .attr("class", "axes")
                .attr("transform", `translate(${margin.left}, ${margin.top})`);

            axes.append("g")
                .attr("class", "grid")
                .selectAll("line")
                .data(yScale.ticks(5))
                .join("line")
                .attr("x1", 0)
                .attr("x2", canvasWidth)
                .attr("y1", (d: number) => yScale(d))
                .attr("y2", (d: number) => yScale(d));

            axes.append("g")
                .attr("class", "y axis")
                .attr("transform", `translate(${0}, 0)`)
                .call(axisLeft(yScale).ticks(5));

            axes.append("g")
                .attr("class", "x axis")
                .attr("transform", `translate(${0}, ${canvasHeight})`)
                .call(axisBottom(xScale));
        }

        if (svg.select(".canvas").empty()) {
            svg.append("svg")
                .attr("class", "canvas")
                .attr("transform", `translate(${margin.left}, ${margin.top})`);

        }

        const canvas = svg.select(".canvas");
        const rects = canvas.selectAll("rect")
            .data(data)
            .join(
                enter => {
                    const newRects = enter
                        .append("rect")
                        .attr("x", (d: CountChartDataPoint) => xScale(d.label) || 0)
                        .attr("width", xScale.bandwidth())
                        .attr("y", canvasHeight)
                        .attr("height", 0)
                        .attr("fill", (d: CountChartDataPoint) => contributionCategoryColour.get(d.label) || "gray")
                        .attr("data-label", (d: CountChartDataPoint) => d.label!)
                        .attr("data-count", (d: CountChartDataPoint) => d.count);
                    const titles = newRects
                            .append("title")
                            .text(d => d.count)
                    return newRects
                        .transition()
                        .duration(750)
                        .attr("y", (d: CountChartDataPoint) => yScale(d.count))
                        .attr("height", (d: CountChartDataPoint) => yScale(0) - yScale(d.count))
                        .selection();
                },
                update => {
                    update.select("title")
                        .text(d => d.count);
                    return update
                        .attr("data-label", (d: CountChartDataPoint) => d.label)
                        .attr("data-count", (d: CountChartDataPoint) => d.count)
                        .transition()
                        .duration(500)
                        .attr("y", (d: CountChartDataPoint) => yScale(d.count))
                        .attr("height", (d: CountChartDataPoint) => yScale(0) - yScale(d.count))
                        .selection();
                },
                exit => exit.remove()
            )
    }, [data]);

    if (data.length === 0) {
        return <Loader />
    }

    return(
        <>
            <svg
                ref={svgRef}
                viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            >
            </svg>
        </>
    )
}

export default CountChart
