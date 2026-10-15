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
    scaleDiverging
} from "d3";
import { getEmptyMap } from "./helper";

const TileChart = ({ data, viewBoxWidth, viewBoxHeight }: TileChartConfig) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [from, setFrom] = useState(new Date(2025, 10, 3));
    const [to, setTo] = useState(new Date());

    const emptyMap = getEmptyMap(from, to)

    const margin = {
        left: 40,
        right: 10,
        bottom: 20,
        top: 10,
    }

    let canvasWidth = viewBoxWidth - margin.left - margin.right;
    let canvasHeight = viewBoxHeight - margin.top - margin.bottom;
    const colorScale = scaleDiverging(["#ff1f6b", "#d15bff", "#0065ff"]);

    const changeOpacity = (colorString: string, opacity: number): string => {
       if (colorString.length === 0) {
           return "transparent";
       }
        if (color(colorString) === null) {
           return colorString
       }
       return color(colorString)!.copy({ opacity }).formatHex8()
    }

    const lastMonday = timeMonday(new Date())
    const formatAsLocalWeekday = (d: Date) => d.toLocaleDateString([], { weekday: "short" })
    const weekdays = timeDays(lastMonday, timeDay.offset(lastMonday, 7)).map(d => formatAsLocalWeekday(d))
    let yScale = scaleBand()
        .domain(weekdays)
        .range([0, canvasHeight])
        .padding(0.2);

    // now we know how high one rect is and therefore how wide
    const getWeekOffset = (date: Date) => timeMonday.count(timeMonday(date), to)


    useEffect(() => {
        if (!svgRef.current) return;
        const svg = select(svgRef.current);
        svg.selectChildren().remove();

        const axes = svg.append("g")
            .attr("class", "axes")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // axes.append("g")
        // 	.attr("class", "x axis")
        // 	.attr("transform", `translate(0, ${canvasHeight})`)
        // 	.call(axisBottom(xScale).ticks(4));

        axes.append("g")
            .attr("class", "y axis")
            .attr("transform", `translate(${0}, 0)`)
            .call(axisLeft(yScale));

        const canvas = svg.append("svg")
            .attr("class", "canvas")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        const weekColumns = canvas.selectAll("rect")
            .data(emptyMap)
            .join(
                enter => enter
                    .append("rect")
                    .attr("fill", "transparent"),
                update => update,
                exit => exit.remove()
            )
            .transition()
            .duration((_: Date) => 250 + Math.random() * 750 )
            .attr("fill", (_: Date) => changeOpacity(colorScale(Math.random()), Math.random()))
            .attr("rx", yScale.step() * 0.2)
            .attr("ry", yScale.step() * 0.2)
            .attr("x", (d: Date) => (canvasWidth - yScale.step()) - getWeekOffset(d) * yScale.step())
            .attr("y", (d: Date) => yScale(formatAsLocalWeekday(d))!)
            .attr("width", yScale.bandwidth())
            .attr("height", yScale.bandwidth())


    }, [svgRef.current, viewBoxWidth, viewBoxHeight]);

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
