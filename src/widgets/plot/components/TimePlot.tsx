// we only feed raw data into the component.
import { useRef, useEffect } from "react";
import { ChartDataPoint } from "../utils/types.d.ts";

import { colorScaleContributionLinear } from "../utils/colorScales.ts";

import { max, union } from "d3-array";
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

const keyByDate = (d: ChartDataPoint) => d.date.getTime();

const TimePlot = ({
  data,
  width,
  height,
  activeCategories,
}: {
  data: ChartDataPoint[];
  width: number;
  height: number;
  activeCategories: Set<string>;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const previousDataRef = useRef<ChartDataPoint[] | null>(null);
  const previousActiveRef = useRef<Set<string> | null>(null);

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

    // animate only when the data or category toggles changed (and it is not the first paint);
    // resizes must update instantly, otherwise every resize tick restarts all transitions
    const dataChanged = previousDataRef.current !== null && previousDataRef.current !== data;
    const categoriesChanged = previousActiveRef.current !== null && previousActiveRef.current !== activeCategories;
    previousDataRef.current = data;
    previousActiveRef.current = activeCategories;

    const duration = dataChanged || categoriesChanged ? TRANSITION_MS : 0;

    const svg = select(svgRef.current);

    // x: one band per day from the first day with data until now
    const minDate = data[0].date;
    const days: Date[] = timeDay
      .range(timeDay.floor(minDate), new Date());

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

    const tickValues: Set<Date> = union(days.map((d: Date) => timeMonday(d)))
    svg
      .select<SVGGElement>(".x.axis")
      .transition()
      .duration(duration)
      .call(
        axisBottom(xScale)
          .tickValues(tickValues.values())
          .tickFormat((d) => formatWeekTick(+d)),
      );

    svg
      .select<SVGGElement>(".y.axis")
      .transition()
      .duration(duration)
      .call(axisLeft(yScale));

    const canvas = svg.select(".canvas");

    // bars, keyed by day so changed data updates in place instead of appending duplicates
    canvas
      .selectAll<SVGRectElement, ChartDataPoint>("rect.total-minutes")
      .data(data, keyByDate)
      .join(
        (enter) => {
            const rects = enter
                .append("rect")
                .attr("class", "total-minutes")
                .attr("x", (d) => xScale(d.date.getTime()) ?? 0)
                .attr("width", xScale.bandwidth())
                .attr("y", canvasHeight)
                .attr("height", 0);
            rects.append("title");
            return rects;
        },
        (update) => update,
        (exit) =>
          exit
            .transition()
            .duration(duration)
            .attr("y", canvasHeight)
            .attr("height", 0)
            .remove(),
      )
      .attr("data-value", (d) => d.totalMinutes)
      .call((rects) =>
        rects
          .select("title")
          .text((d) => `${d.date.toLocaleDateString()}: ${d.totalMinutes} minutes`),
      )
      .transition()
      .duration(duration)
      .attr("x", (d) => xScale(d.date.getTime()) ?? 0)
      .attr("width", xScale.bandwidth())
      .attr("y", (d) => yScale(d.totalMinutes))
      .attr("height", (d) => canvasHeight - yScale(d.totalMinutes));

    canvas
      .selectAll<SVGRectElement, ChartDataPoint>("rect.own-contribution")
      .data(data, keyByDate)
      .join(
        (enter) => {
            const rects = enter
                .append("rect")
                .attr("class", "own-contribution")
                .attr("x", (d) => xScale(d.date.getTime()) ?? 0)
                .attr("width", xScale.bandwidth())
                .attr("y", canvasHeight)
                .attr("height", 0);
            rects.append("title");
            return rects;
        },
        (update) => update,
        (exit) =>
            exit
                .transition()
                .duration(duration)
                .attr("y", canvasHeight)
                .attr("height", 0)
                .remove(),
      )
      .attr("data-value", (d) => d.contribution)
      .call((rects) =>
        rects
          .select("title")
          .text((d) => `${d.date.toLocaleDateString()}: ${d.minutes} minutes`),
      )
      .transition()
      .duration(duration)
      .attr("x", (d) => xScale(d.date.getTime()) ?? 0)
      .attr("width", xScale.bandwidth())
      .attr("y", (d) => (activeCategories.has(d.contributionCategory) ? yScale(d.minutes) : canvasHeight))
      .attr("height", (d) =>
        activeCategories.has(d.contributionCategory) ? yScale(0) - yScale(d.minutes) : 0,
      )
      .attr("fill", (d) => colorScaleContributionLinear(d.contribution));
  }, [data, activeCategories, viewBoxWidth, viewBoxHeight]);

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
