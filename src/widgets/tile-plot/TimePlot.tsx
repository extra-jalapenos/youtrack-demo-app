// we only feed raw data into the component.
import { useRef, useState, useEffect } from "react";
import {author, CountChartDataPoint, DataPointRaw, TileChartDataPoint} from "./types.ts";
import { InternMap, max, rollup, sum, min } from "d3-array";
import { select } from "d3-selection";
import { scaleLinear, scaleTime } from "d3-scale";
import { axisLeft, axisBottom } from "d3-axis";
import { transition } from "d3";

const processData = (data: DataPointRaw[]): InternMap<string, number> => {
    return rollup(data,
        (D: DataPointRaw[]) => sum(D.map(d => d.duration.minutes)),
        (d: DataPointRaw) => d.author.id)
}

const margins = {top: 20, right: 20, bottom: 30, left: 40};

const TimePlot = ({ data, width, height }: { data: DataPointRaw[]; width: number; height: number }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [to, _setTo] = useState(new Date());

    const viewBoxHeight = height > 0 ? height : 0;
    const viewBoxWidth = width > 0 ? width : 0;

    const xScale = scaleTime()
        .domain([new Date(), new Date()])
        .range([0, viewBoxWidth - margins.left - margins.right]);

    const yScale = scaleLinear()
        .domain([0, 0])
        .range([viewBoxHeight - margins.bottom - margins.top, 0]);

    const renderAxes = () => {
        if (!svgRef.current) return;
        if (!data || data.length === 0) return;
        const axes = select(svgRef.current).select(".axes");
        const xAxis = axes.select("g.x.axis");
        const minDate = min(data, d => d.date);

        xScale
            .domain([minDate || new Date(), new Date()])
            .range([0, viewBoxWidth - margins.left - margins.right]);

        const yAxis = axes.select("g.y.axis");

        const sumPerDate = rollup(data, (D: DataPointRaw[]) => sum(D.map(d => d.duration.minutes)), (d: DataPointRaw) => d.date);
        const maxValueOnDate = max(sumPerDate.values());

        yScale
            .domain([0, maxValueOnDate || 0])
            .range([viewBoxHeight - margins.bottom, 0]);
            
        xAxis
            .transition()
            .duration(500)
            .call(axisBottom(xScale));

        yAxis
            .transition()
            .duration(500)
            .call(axisLeft(yScale));
    }

    const intializeAxes = () => {
        if (!svgRef.current) return;
        if (!data || data.length === 0) return;
        const axes = select(svgRef.current).select(".axes");
        const hasXAxis = axes.select(".x.axis");
        const hasYAxis = axes.select(".y.axis");

        if (hasXAxis.empty()) {
            axes.append("g")
                .attr("class", "x axis")
                .attr("transform", `translate(${0}, ${viewBoxHeight - margins.bottom - margins.top})`);
            console.log("x axis created");
        } else {
            console.log("x axis already exists");
        }

        if (hasYAxis.empty()) {
            axes.append("g")
                .attr("class", "y axis")
                .attr("transform", `translate(${margins.left}, ${0})`);
            console.log("y axis created");
        } else {
            console.log("y axis already exists");
        }
    };

    const updateCanvas = () => {
        if (!svgRef.current) return;
        if (!data || data.length === 0) return;
        const canvas = select(svgRef.current).select<SVGGElement>("#canvas");
        const t = transition().duration(500);
        
        const sumPerDate = rollup(data,
            (D: DataPointRaw[]) => sum(D.map(d => d.duration.minutes)), 
            (d: DataPointRaw) => new Date(d.date).setHours(0, 0, 0, 0)
        );
        const rects = canvas.selectAll("rect")
            .data(sumPerDate)
            .enter()
            .append("rect")
            .attr("fill", "steelblue") 
            .attr("data-value", (d => JSON.stringify(d)))
            .attr("x", d => xScale(d[0])) 
            .attr("y", d => yScale(10))
            .attr("width", 10) // placeholder, will be updated in transition
            .attr("height", d => 10); // placeholder, will be updated in transition
    }

    useEffect(() => {
        intializeAxes();
        renderAxes();
    }, [data, viewBoxHeight, viewBoxWidth]);

    useEffect(() => {
        renderAxes();
        updateCanvas();
    }, [data,xScale, yScale]);

    return (
        <svg
            ref={svgRef}
            width={viewBoxWidth}
            height={viewBoxHeight}
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        >
            <g 
                className="axes"
                transform={`translate(${margins.left}, ${margins.top})`}
            >
                // axes will be drawn here
            </g>
            <g 
                id="canvas"
                transform={`translate(${margins.left}, ${margins.top})`}
            >
                // canvas will be drawn here
            </g>
        </svg>
    )
}

export default TimePlot;