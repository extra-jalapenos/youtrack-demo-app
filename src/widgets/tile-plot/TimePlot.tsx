// we only feed raw data into the component.
import { useRef, useEffect } from "react";
import { DataPointRaw } from "./types.ts";
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
  data: DataPointRaw[];
  width: number;
  height: number;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const viewBoxHeight = height > 0 ? height : 0;
  const viewBoxWidth = width > 0 ? width : 0;

  // One effect builds the scales from the current data + size, then draws axes and bars with them.
  useEffect(() => {
    if (!svgRef.current) return;

    const canvasWidth = viewBoxWidth - margins.left - margins.right;
    const canvasHeight = viewBoxHeight - margins.top - margins.bottom;
    // not measured yet (or nothing to show): wait for the next width/height/data change
    if (canvasWidth <= 0 || canvasHeight <= 0 || data.length === 0) return;

    const svg = select(svgRef.current);

    // minutes per week, keyed by the timestamp of that week's Monday
    const minutesPerDay = rollup(
      data,
      (D: DataPointRaw[]) => sum(D, (d) => d.duration.minutes),
      (d: DataPointRaw) => timeDay.floor(new Date(d.date)),
    );

    // x: one band per week from the first week with data until now
    const minDate = new Date(min(data, (d) => d.date) as number);
    const days = timeDay
      .range(timeDay.floor(minDate), timeDay.offset(new Date(), 1))
      .map((d) => +d);

    const xScale = scaleBand<number>()
      .domain(days)
      .range([0, canvasWidth])
      .padding(0.2);

    // y: minutes
    const yScale = scaleLinear()
      .domain([0, max(minutesPerDay.values()) ?? 0])
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

    // bars, keyed by week so changed data updates in place instead of appending duplicates
    svg
      .select<SVGGElement>(".canvas")
      .selectAll<SVGRectElement, [number, number]>("rect")
      .data(Array.from(minutesPerDay), (d) => d[0])
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("fill", "steelblue")
            .attr("x", (d) => xScale(d[0]) ?? 0)
            .attr("width", xScale.bandwidth())
            .attr("y", canvasHeight)
            .attr("height", 0),
        (update) => update,
        (exit) =>
          exit
            .transition()
            .duration(TRANSITION_MS)
            .attr("y", canvasHeight)
            .attr("height", 0)
            .remove(),
      )
      .attr("data-value", (d) => JSON.stringify(d))
      .transition()
      .duration(TRANSITION_MS)
      .attr("x", (d) => xScale(d[0]) ?? 0)
      .attr("width", xScale.bandwidth())
      .attr("y", (d) => yScale(d[1]))
      .attr("height", (d) => canvasHeight - yScale(d[1]));
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
        <g className="x axis" transform={`translate(0, ${canvasHeight})`} />
        <g className="y axis" />
      </g>
      <g
        className="canvas"
        transform={`translate(${margins.left}, ${margins.top})`}
      />
    </svg>
  );
};

export default TimePlot;
