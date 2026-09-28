import { useEffect, useRef } from "react";
import * as d3 from "d3";

type PopulationDatum = {
    state: string;
    age: string;
    population: number;
};

type RadialChartProps = {
    data: PopulationDatum[];
};
import { useEffect, useRef } from "react";
import * as d3 from "d3";

type PopulationDatum = {
    state: string;
    age: string;
    population: number;
};

type RadialChartProps = {
    data: PopulationDatum[];
};

// The structure produced by d3.index(data, d => d.state, d => d.age)
type IndexedData = d3.InternMap<
    string,
    d3.InternMap<string, PopulationDatum>
>;

// Each item passed to d3.stack()
type StackInput = [string, d3.InternMap<string, PopulationDatum>];

// Each stacked radial bar
type StackedDatum = d3.SeriesPoint<StackInput> & {
    key: string;
};

export default function RadialChart({
                                        data,
                                    }: RadialChartProps) {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (data.length === 0 || !svgRef.current) return;

        const width = 928;
        const height = width;
        const innerRadius = 180;
        const outerRadius = Math.min(width, height) / 2;

        const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);

        svg.selectAll("*").remove();

        const indexedData: IndexedData = d3.index(
            data,
            (d) => d.state,
            (d) => d.age
        );

        const ageKeys = Array.from(
            new Set(data.map((d) => d.age))
        );

        const series = d3
            .stack<StackInput, string>()
            .keys(ageKeys)
            .value(
                (
                    [, values]: StackInput,
                    key: string
                ): number => {
                    return values.get(key)?.population ?? 0;
                }
            )(indexedData as unknown as Iterable<StackInput>);

        const x = d3
            .scaleBand<string>()
            .domain(data.map((d) => d.state))
            .range([0, 2 * Math.PI])
            .align(0);

        const maximum = d3.max(
            series,
            (stackedSeries) =>
                d3.max(stackedSeries, (d) => d[1]) ?? 0
        );

        const y = d3
            .scaleRadial<number>()
            .domain([0, maximum])
            .range([innerRadius, outerRadius]);

        const arc = d3
            .arc<StackedDatum>()
            .innerRadius((d) => y(d[0]))
            .outerRadius((d) => y(d[1]))
            .startAngle((d) => x(d.data[0]) ?? 0)
            .endAngle(
                (d) => (x(d.data[0]) ?? 0) + x.bandwidth()
            )
            .padAngle(1.5 / innerRadius)
            .padRadius(innerRadius);

        const colors =
            d3.schemeSpectral[series.length] ??
            d3.schemeSpectral[11];

        const color = d3
            .scaleOrdinal<string, string>()
            .domain(series.map((d) => d.key))
            .range(colors)
            .unknown("#ccc");

        const formatValue = (value: number): string =>
            Number.isNaN(value)
                ? "N/A"
                : value.toLocaleString("en");

        svg
            .attr("width", width)
            .attr("height", height)
            .attr(
                "viewBox",
                `${-width / 2} ${-height / 2} ${width} ${height}`
            )
            .style("width", "100%")
            .style("height", "auto")
            .style("font", "10px sans-serif");

        // Radial bars
        svg
            .append("g")
            .selectAll<SVGGElement, d3.Series<StackInput, string>>("g")
            .data(series)
            .join("g")
            .attr("fill", (d) => color(d.key))
            .selectAll<SVGPathElement, StackedDatum>("path")
            .data((seriesData) =>
                seriesData.map((d) => ({
                    ...d,
                    key: seriesData.key,
                }))
            )
            .join("path")
            .attr("d", (d) => arc(d) ?? "")
            .append("title")
            .text((d) => {
                const state = d.data[0];
                const age = d.key;
                const population =
                    d.data[1].get(age)?.population ?? NaN;

                return `${state} ${age}\n${formatValue(population)}`;
            });

        // X axis
        svg
            .append("g")
            .attr("text-anchor", "middle")
            .selectAll<SVGGElement, string>("g")
            .data(x.domain())
            .join("g")
            .attr("transform", (state) => {
                const angle =
                    ((x(state) + x.bandwidth() / 2) * 180) /
                    Math.PI -
                    90;

                return `
                    rotate(${angle})
                    translate(${innerRadius},0)
                `;
            })
            .call((g) =>
                g
                    .append("line")
                    .attr("x2", -5)
                    .attr("stroke", "#000")
            )
            .call((g) =>
                g
                    .append("text")
                    .attr("transform", (state) =>
                        (x(state) +
                            x.bandwidth() / 2 +
                            Math.PI / 2) %
                        (2 * Math.PI) <
                        Math.PI
                            ? "rotate(90)translate(0,16)"
                            : "rotate(-90)translate(0,-9)"
                    )
                    .text((state) => state)
            );

        // Y axis
        svg
            .append("g")
            .attr("text-anchor", "middle")
            .call((g) =>
                g
                    .append("text")
                    .attr("y", () => {
                        const tick = y.ticks(5).pop() ?? 0;
                        return -y(tick);
                    })
                    .attr("dy", "-1em")
                    .text("Population")
            )
            .call((g) =>
                g
                    .selectAll<SVGGElement, number>("g")
                    .data(y.ticks(5).slice(1))
                    .join("g")
                    .attr("fill", "none")
                    .call((tickGroup) =>
                        tickGroup
                            .append("circle")
                            .attr("stroke", "#000")
                            .attr("stroke-opacity", 0.5)
                            .attr("r", (tick) => y(tick))
                    )
                    .call((tickGroup) =>
                        tickGroup
                            .append("text")
                            .attr("y", (tick) => -y(tick))
                            .attr("dy", "0.35em")
                            .attr("stroke", "#fff")
                            .attr("stroke-width", 5)
                            .text(y.tickFormat(5, "s"))
                            .clone(true)
                            .attr("fill", "#000")
                            .attr("stroke", "none")
                    )
            );

        // Legend
        svg
            .append("g")
            .selectAll<SVGGElement, string>("g")
            .data(color.domain())
            .join("g")
            .attr(
                "transform",
                (age, index, nodes) =>
                    `translate(-40,${
                        (nodes.length / 2 - index - 1) * 20
                    })`
            )
            .call((g) =>
                g
                    .append("rect")
                    .attr("width", 18)
                    .attr("height", 18)
                    .attr("fill", (age) => color(age))
            )
            .call((g) =>
                g
                    .append("text")
                    .attr("x", 24)
                    .attr("y", 9)
                    .attr("dy", "0.35em")
                    .text((age) => age)
            );
    }, [data]);

    return <svg ref={svgRef} />;
}


export default function RadialChart({ data }: RadialChartProps) {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!data?.length) return;

        const width = 928;
        const height = width;
        const innerRadius = 180;
        const outerRadius = Math.min(width, height) / 2;

        const svg = d3.select(svgRef.current);

        // Clear the previous chart before redrawing
        svg.selectAll("*").remove();

        // Stack the data into series by age
        const series = d3
            .stack()
            .keys(d3.union(data.map((d) => d.age)))
            .value(([, values], key) => values.get(key).population)(
                d3.index(data, (d) => d.state, (d) => d.age)
            );

        // Angular x-scale
        const x = d3
            .scaleBand()
            .domain(data.map((d) => d.state))
            .range([0, 2 * Math.PI])
            .align(0);

        // Radial y-scale
        const y = d3
            .scaleRadial()
            .domain([0, d3.max(series, (d) => d3.max(d, (d) => d[1]))])
            .range([innerRadius, outerRadius]);

        const arc = d3
            .arc()
            .innerRadius((d) => y(d[0]))
            .outerRadius((d) => y(d[1]))
            .startAngle((d) => x(d.data[0]))
            .endAngle((d) => x(d.data[0]) + x.bandwidth())
            .padAngle(1.5 / innerRadius)
            .padRadius(innerRadius);

        const color = d3
            .scaleOrdinal()
            .domain(series.map((d) => d.key))
            .range(d3.schemeSpectral[series.length])
            .unknown("#ccc");

        const formatValue = (value) =>
            Number.isNaN(value) ? "N/A" : value.toLocaleString("en");

        svg
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [-width / 2, -height / 2, width, height])
            .style("width", "100%")
            .style("height", "auto")
            .style("font", "10px sans-serif");

        // Radial bars
        svg
            .append("g")
            .selectAll("g")
            .data(series)
            .join("g")
            .attr("fill", (d) => color(d.key))
            .selectAll("path")
            .data((seriesData) =>
                seriesData.map((d) => {
                    d.key = seriesData.key;
                    return d;
                })
            )
            .join("path")
            .attr("d", arc)
            .append("title")
            .text(
                (d) =>
                    `${d.data[0]} ${d.key}\n${formatValue(
                        d.data[1].get(d.key).population
                    )}`
            );

        // X axis
        svg
            .append("g")
            .attr("text-anchor", "middle")
            .selectAll("g")
            .data(x.domain())
            .join("g")
            .attr(
                "transform",
                (d) => `
          rotate(${((
                    x(d) +
                    x.bandwidth() / 2
                ) * 180) / Math.PI - 90})
          translate(${innerRadius},0)
        `
            )
            .call((g) =>
                g
                    .append("line")
                    .attr("x2", -5)
                    .attr("stroke", "#000")
            )
            .call((g) =>
                g
                    .append("text")
                    .attr("transform", (d) =>
                        (x(d) + x.bandwidth() / 2 + Math.PI / 2) %
                        (2 * Math.PI) <
                        Math.PI
                            ? "rotate(90)translate(0,16)"
                            : "rotate(-90)translate(0,-9)"
                    )
                    .text((d) => d)
            );

        // Y axis
        svg
            .append("g")
            .attr("text-anchor", "middle")
            .call((g) =>
                g
                    .append("text")
                    .attr("y", () => -y(y.ticks(5).pop()))
                    .attr("dy", "-1em")
                    .text("Population")
            )
            .call((g) =>
                g
                    .selectAll("g")
                    .data(y.ticks(5).slice(1))
                    .join("g")
                    .attr("fill", "none")
                    .call((g) =>
                        g
                            .append("circle")
                            .attr("stroke", "#000")
                            .attr("stroke-opacity", 0.5)
                            .attr("r", y)
                    )
                    .call((g) =>
                        g
                            .append("text")
                            .attr("y", (d) => -y(d))
                            .attr("dy", "0.35em")
                            .attr("stroke", "#fff")
                            .attr("stroke-width", 5)
                            .text(y.tickFormat(5, "s"))
                            .clone(true)
                            .attr("fill", "#000")
                            .attr("stroke", "none")
                    )
            );

        // Legend
        svg
            .append("g")
            .selectAll("g")
            .data(color.domain())
            .join("g")
            .attr(
                "transform",
                (d, i, nodes) =>
                    `translate(-40,${(nodes.length / 2 - i - 1) * 20})`
            )
            .call((g) =>
                g
                    .append("rect")
                    .attr("width", 18)
                    .attr("height", 18)
                    .attr("fill", color)
            )
            .call((g) =>
                g
                    .append("text")
                    .attr("x", 24)
                    .attr("y", 9)
                    .attr("dy", "0.35em")
                    .text((d) => d)
            );
    }, [data]);

    return <svg ref={svgRef} />;
}
