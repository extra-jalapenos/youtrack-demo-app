// we only feed raw data into the component.
import { useRef, useEffect } from "react";
import { TimeChartDataPoint } from "./types.ts";

import {
    changeOpacity,
    colorScaleContributionLinear, intensityScale
} from "./colorScales.ts";

import { max, rollup, sum, min } from "d3-array";
import { select } from "d3-selection";
import { scaleBand, scaleLinear } from "d3-scale";
import { axisLeft, axisBottom } from "d3-axis";
import { timeDay, timeMonday } from "d3-time";
import "d3-transition";

const margins = { top: 20, right: 20, bottom: 30, left: 40 };
const TRANSITION_MS = 500;
const MIN_TICK_SPACING_PX = 48;

const formatWeekTick = (ms: number) =>
  new Date(ms).toLocaleDateString([], { day: "numeric", month: "short" });

const TimePlot = ({
  data,
  width,
  height,
}: {
  data: TimeChartDataPoint[];
  width: number;
  height: number;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  console.log("TimePlot data", data);

  const viewBoxHeight = height > 0 ? height : 0;
  const viewBoxWidth = width > 0 ? width : 0;

  useEffect(() => {
    if (!svgRef.current) {
        return;
    }

    const canvasWidth = viewBoxWidth - margins.left - margins.right;
    const canvasHeight = viewBoxHeight - margins.top - margins.bottom;
    // not measured yet (or nothing to show): wait for the next width/height/data change
    if (canvasWidth <= 0 || canvasHeight <= 0 || data.length === 0) {
        return;
    }

    const svg = select(svgRef.current);

    // x: one band per week from the first week with data until now
    const minDate = data[0].date;
    const days = timeDay
      .range(timeDay.floor(minDate), new Date())
      .map((d) => +d);

    const xScale = scaleBand<number>()
      .domain(days)
      .range([0, canvasWidth])
      .padding(0.2);

    const yScale = scaleLinear()
      .domain([0, max(data, (d) => d.totalMinutes) as number])
      .range([canvasHeight, 0])
      .nice();

    // axes
    const tickEvery = Math.max(
      1,
      Math.ceil(MIN_TICK_SPACING_PX / xScale.step()),
    );
    const visibleTicks = days.filter(
      (_, i) => (days.length - 1 - i) % tickEvery === 0,
    );

    svg
      .select<SVGGElement>(".x.axis")
      .transition()
      .duration(TRANSITION_MS)
      .call(
        axisBottom(xScale)
          .tickValues(visibleTicks)
          .tickFormat((d) => formatWeekTick(+d)),
      );

    svg
      .select<SVGGElement>(".y.axis")
      .transition()
      .duration(TRANSITION_MS)
      .call(axisLeft(yScale));

    const canvas = svg.select(".canvas");
    // bars, keyed by week so changed data updates in place instead of appending duplicates
    canvas
      .selectAll<SVGRectElement, [number, number]>("rect")
      .data(Array.from(data))
      .join(
        (enter) => {
            const totalMinuteRects = enter
                .append("rect")
                .attr("class", "total-minutes")
                .attr("data-value", (d: TimeChartDataPoint) => d.totalMinutes)
                .attr("x", (d) => xScale(d.date.getTime()) ?? 0)
                .attr("width", xScale.bandwidth())
                .attr("y", canvasHeight)
                .attr("height", 0)

            totalMinuteRects
                .append("title")
                .text((d: TimeChartDataPoint) => `${d.date.toLocaleDateString()}: ${d.totalMinutes} minutes`);
            return totalMinuteRects;
        },
        (update) => update,
        (exit) =>
          exit
            .transition()
            .duration(TRANSITION_MS)
            .attr("y", canvasHeight)
            .attr("height", 0)
            .remove(),
      )
      .transition()
      .duration(TRANSITION_MS)
      .attr("x", (d) => xScale(d.date.getTime()) ?? 0)
      .attr("width", xScale.bandwidth())
      .attr("y", (d) => yScale(d.totalMinutes))
      .attr("height", (d) => canvasHeight - yScale(d.totalMinutes));


    canvas.selectAll<SVGRectElement, [number, number]>("rect.own-contribution")
        .data(Array.from(data))
        .join(
            (enter) => {
                const ownContributionRects = enter
                    .append("rect")
                    .attr("class", "own-contribution")
                    .attr("data-value", (d: TimeChartDataPoint) => d.contribution)
                    .attr("x", (d) => xScale(d.date.getTime()) ?? 0)
                    .attr("width", xScale.bandwidth())
                    .attr("y", canvasHeight)
                    .attr("height", 0)

                ownContributionRects
                    .append("title")
                    .text((d: TimeChartDataPoint) => `${d.date.toLocaleDateString()}: ${d.contribution} minutes`);
                return ownContributionRects;
            },
            (update) => update,
            (exit) =>
                exit
                    .transition()
                    .duration(TRANSITION_MS)
                    .attr("y", canvasHeight)
                    .attr("height", 0)
                    .remove(),
        )
        .transition()
        .duration(TRANSITION_MS)
        .attr("x", (d) => xScale(d.date.getTime()) ?? 0)
        .attr("width", xScale.bandwidth())
        .attr("y", (d) => yScale(d.minutes))
        .attr("height", (d) => yScale(0) - yScale(d.minutes))
        .attr("fill", (d) => colorScaleContributionLinear(d.contribution));
  }, [data, viewBoxWidth, viewBoxHeight]);

  const canvasHeight = viewBoxHeight - margins.top - margins.bottom;

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
        <g className="x axis" transform={`translate(0, ${canvasHeight})`}/>
        <g className="y axis"/>
      </g>
      <g
        className="canvas"
        transform={`translate(${margins.left}, ${margins.top})`}
      />
    </svg>
  );
};

export default TimePlot;
