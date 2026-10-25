import { useEffect, useRef } from "react";
import type { CountChartConfig, CountChartDataPoint } from "./types"
import {
    select,
    axisLeft,
    scaleBand,
    scaleLinear,
    max, axisBottom
} from "d3";
import { margin } from "./helper.ts";
import {
    changeOpacity,
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
        .paddingInner(0.4)
        .paddingOuter(0.2);

    let yScale = scaleLinear()
        .domain([0, max(data, d => Math.max(d.value, d.benchmark) * (1+ 1/3)) || 100])
        .range([canvasHeight, 0])
        .nice();

    useEffect(() => {
        if (!svgRef.current) return;
        const svg = select(svgRef.current);

        const axes = svg.select(".axes")
        // first render
        if (axes.empty()) {
            const axes = svg.append("g")
                .attr("class", "axes")
                .attr("transform", `translate(${margin.left}, ${margin.top})`);

            axes.append("g")
                .attr("class", "grid")

            axes.append("g")
                .attr("class", "y axis")
                .attr("transform", `translate(${0}, 0)`)

            axes.append("g")
                .attr("class", "x axis")
                .attr("transform", `translate(${0}, ${canvasHeight})`);
        }

        // Always update the y-axis with current scale

        // Always update the y-axis with current scale
        axes.select<SVGGElement>("g.x.axis").call(axisBottom(xScale));
        axes.select<SVGGElement>("g.y.axis").call(axisLeft(yScale).ticks(5));

        if (svg.select(".canvas").empty()) {
            svg.append("svg")
                .attr("class", "canvas")
                .attr("transform", `translate(${margin.left}, ${margin.top})`);

        }

        const canvas = svg.select(".canvas");

        axes.select<SVGGElement>("g.grid")
            .selectAll("line")
            .data(yScale.ticks(5))
            .join(
                enter => enter.append("line")
                    .attr("x1", 0)
                    .attr("y1", (d: number) => yScale(d))
                    .attr("y2", (d: number) => yScale(d))
                    .attr("x2", 0)
                    .transition()
                    .duration(1000)
                    .attr("x2", canvasWidth)
                    .selection(),
                update => update
                    .transition()
                    .duration(250)
                    .attr("y1", (d: number) => yScale(d))
                    .attr("y2", (d: number) => yScale(d)),
                exit => exit.remove()
            )

        // because we have two bars per category we group them
        const singleBarWidth = xScale.bandwidth() / 2 * 0.9

        canvas.selectAll("rect.value")
            .data(data)
            .join(
                enter => {
                    const rects = enter
                        .append("rect")
                        .attr("class", "value")
                        .attr("x", (d: CountChartDataPoint) => xScale(d.label) || 0)
                        .attr("width", singleBarWidth)
                        .attr("y", canvasHeight)
                        .attr("height", 0)
                        .attr("fill", (d: CountChartDataPoint) => contributionCategoryColour.get(d.label) || "gray")
                        .attr("data-label", (d: CountChartDataPoint) => d.label!)
                        .attr("data-value", (d: CountChartDataPoint) => d.value);

                    rects.each(function(d: CountChartDataPoint) {
                        console.log(d)
                        select(this).append("title")
                            .text(`${d.value}`);
                    });

                    return rects;
                },
                update => {
                    update
                        .attr("data-label", (d: CountChartDataPoint) => d.label)
                        .attr("data-value", (d: CountChartDataPoint) => d.value)

                    update.select("title").text(d => d.value)
                    return update;
                },
                exit => exit.remove()
            )
            .transition()
            .duration(500)
            .attr("y", (d: CountChartDataPoint) => yScale(d.value))
            .attr("height", (d: CountChartDataPoint) => yScale(0) - yScale(d.value));

        canvas.selectAll("rect.benchmark")
            .data(data)
            .join(
                enter => {
                    const rects = enter
                        .append("rect")
                        .attr("class", "benchmark")
                        .attr("x", (d: CountChartDataPoint) => xScale(d.label)! + xScale.bandwidth() - singleBarWidth || 0)
                        .attr("width", singleBarWidth)
                        .attr("y", canvasHeight)
                        .attr("height", 0)
                        .attr("fill", (d: CountChartDataPoint) => contributionCategoryColour.get(d.label) || "gray")
                        .attr("data-label", (d: CountChartDataPoint) => d.label!)
                        .attr("data-benchmark", (d: CountChartDataPoint) => d.benchmark)

                    rects.each(function(d: CountChartDataPoint) {
                        select(this).append("title")
                            .text(d.benchmark);
                    });
                    return rects
                },
                update => {
                    update
                        .attr("data-label", (d: CountChartDataPoint) => d.label)
                        .attr("data-benchmark", (d: CountChartDataPoint) => d.benchmark)

                    update.select("title").text((d: CountChartDataPoint) => d.benchmark)
                    return update;
                },
                exit => exit.remove()
            )
            .transition()
            .duration(500)
            .attr("y", (d: CountChartDataPoint) => yScale(d.benchmark))
            .attr("height", (d: CountChartDataPoint) => yScale(0) - yScale(d.benchmark));

    }, [data]);

    if (data.length === 0)
        return

    return(
        <>
            <svg
                ref={svgRef}
                viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                width={width}
                height={height}
            >
            </svg>
        </>
    )
}

export default CountChart
