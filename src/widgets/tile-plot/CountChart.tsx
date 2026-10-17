import {useEffect, useRef, useState} from "react";
import type { TileChartConfig, TileChartDataPoint } from "./types"
import {
    select,
    axisLeft,
    timeMonday,
    scaleBand,
    timeDays,
    timeDay,
    color,
    scaleDiverging, scaleLinear
} from "d3";
import Loader from "@jetbrains/ring-ui-built/components/loader/loader";
import {describeDataPoint} from "./helper.ts";
import {colorScale} from "./app.tsx";

const TileChart = ({ data, width = 200, height = 300 }: TileChartConfig) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const viewBoxHeight = height > 0 ? height : 300;
    const viewBoxWidth = width > 0 ? width : 200;

    const margin = {
        left: 25,
        right: 10,
        bottom: 20,
        top: 10,
    }

    let canvasWidth = viewBoxWidth - margin.left - margin.right;
    let canvasHeight = viewBoxHeight - margin.top - margin.bottom;

    let yScale = scaleBand()
        .domain([0, 100])
        .range([0, canvasHeight])
        .padding(0.2);

    useEffect(() => {
        if (!svgRef.current) return;
        const svg = select(svgRef.current);

        if (svg.select(".axes").empty()) {
            const axes = svg.append("g")
                .attr("class", "axes")
                .attr("transform", `translate(${margin.left}, ${margin.top})`);

            axes.append("g")
                .attr("class", "y axis")
                .attr("transform", `translate(${0}, 0)`)
                .call(axisLeft(yScale));
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
                    const newRects = enter.append("rect").attr("fill", "transparent");
                    newRects.append("title").text((d: TileChartDataPoint) => describeDataPoint(d));
                    return newRects
                        .transition()
                        .duration((_: TileChartDataPoint) => 250 + Math.random() * 750)
                        .attr("fill", (d: TileChartDataPoint) => changeOpacity(colorScale(d.contribution), intensityScale(d.totalMinutes)))
                        .attr("data-total-minutes", (d: TileChartDataPoint) => d.totalMinutes)
                        .attr("data-contribution", (d: TileChartDataPoint) => d.contribution)
                        .attr("data-minutes", (d: TileChartDataPoint) => d.minutes)
                        .selection();
                },
                update => {
                    update.select("title").text((d: TileChartDataPoint) => describeDataPoint(d));
                    return update
                        .transition()
                        .duration(500)
                        .attr("fill", (d: TileChartDataPoint) => changeOpacity(colorScale(d.contribution), intensityScale(d.totalMinutes)))
                        .attr("data-total-minutes", (d: TileChartDataPoint) => d.totalMinutes)
                        .attr("data-contribution", (d: TileChartDataPoint) => d.contribution)
                        .attr("data-minutes", (d: TileChartDataPoint) => d.minutes)
                        .selection();
                },
                exit => exit.remove()
            )
            .attr("rx", yScale.step() * 0.2)
            .attr("ry", yScale.step() * 0.2)
            .attr("x", (d: TileChartDataPoint) => (canvasWidth - yScale.step()) - getWeekOffset(d.date) * yScale.step())
            .attr("y", (d: TileChartDataPoint) => yScale(formatAsLocalWeekday(d.date))!)
            .attr("width", yScale.bandwidth())
            .attr("height", yScale.bandwidth());
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

export default TileChart
