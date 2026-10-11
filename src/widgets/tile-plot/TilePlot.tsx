import {useRef, useEffect, useState} from "react";
import Button from "@jetbrains/ring-ui-built/components/button/button.js";
import {compareContributionToRest, createAllWeekdaysMap, aggregateDaysByCategory, type SummaryItem} from "./helper.ts";
import ButtonGroup from "@jetbrains/ring-ui-built/components/button-group/button-group";
import ButtonToolbar from "@jetbrains/ring-ui-built/components/button-toolbar/button-toolbar";
import {DataPointRaw, ProcessedDataPoint} from "./types.ts";
import {
    select,
    union,
    rollup, flatRollup,
    sum, extent, max,
    utcMondays,
    scaleBand, scaleTime, scaleLinear, scaleQuantize, scaleDiverging,
    axisBottom, axisLeft,
    timeFormat, timeDays, InternMap,
    type Selection
} from "d3";
import type {AlertType} from "@jetbrains/ring-ui-built/components/alert/alert";
import {HostAPI} from "../../../@types/globals";
import Text from "@jetbrains/ring-ui-built/components/text/text";
import Toggle from "@jetbrains/ring-ui-built/components/toggle/toggle";
import {Grid} from "@jetbrains/ring-ui-built/components/grid/grid";
import Row from "@jetbrains/ring-ui-built/components/grid/row";
import Col from "@jetbrains/ring-ui-built/components/grid/col";

interface TilePlotOptions {
    from: Date;
    to: Date;
    host: HostAPI | null;
}

const TilePlot = ({from, to, host}: TilePlotOptions) => {
    const allDays = timeDays(from, to, 1);
    const locale = "de-DE"

    const formatDateYearISOWeek = timeFormat("%Y-%V")
    const formatDateWeekday = timeFormat("%u")

    const allWeeks = union([from, ...utcMondays(from, to, 1), to].map(d => formatDateYearISOWeek(d)))

    const margin = {
        left: 0,
        top: 5,
        right: 5,
        bottom: 25
    };

    const padding = 0.3;
    const clientHeight = document.documentElement.clientHeight;
    const svgHeight = clientHeight * 0.35;
    const canvasHeight: number = svgHeight - margin.top - margin.bottom;
    const squareSize = (canvasHeight / 7) / (1 + padding);

    const clientWidth: number = document.documentElement.clientWidth;
    const svgWidth: number = clientWidth;
    const canvasWidth: number = clientWidth - margin.left - margin.right;
    const neededWidth: number = (allWeeks.size * squareSize * (1+padding)) + margin.left + margin.right;
    const shownWeeksNumber: number = Math.floor(canvasWidth / squareSize);

    // store all sets
    const [fetchedData, setFetchedData] = useState<DataPointRaw[]>([])

    const [allPeople, setAllPeople] = useState<Set<string>>(new Set())
    const [me, setMe] = useState<{ key: string, login: string, name: string } | null>(null)


    useEffect(() => {
        const getWorklogs = async (from: Date, to: Date) => {
            if (host === null) {
                console.log("host is null")
                return
            }
            setMe(YTApp.me)
            try {
                const configYoutrackWorkitems = {
                    query: {
                        query: "Subtask of: TODO-380",
                        from: from.toISOString().slice(0, 10),
                        to: to.toISOString().slice(0, 10),
                        fields: "id,author(name,login),duration(minutes),date,text,issue(id,customFields(id,name,value(id,name)))"
                    }
                }
                const responseYoutrack: any = await host.fetchYouTrack(`workItems`, configYoutrackWorkitems)
                const allPeopleArray = responseYoutrack.map((d: DataPointRaw) => d.author.login).sort()
                setAllPeople(new Set(allPeopleArray));
                setPerspective(allPeopleArray[0])
                setFetchedData(responseYoutrack)
            } catch {
                host.alert('YTApp: could not request custom HTTP endpoint', 'error' as AlertType.ERROR)
            }
        }
        getWorklogs(from, to)
    }, [from, to]);


    // filtering for e.g. ranges
    const [filteredData, setFilteredData] = useState<DataPointRaw[]>([])

    useEffect(() => {
        const filtered: DataPointRaw[] = fetchedData.filter(d => d)
        setFilteredData(filtered)
    }, [fetchedData]);

    const [perspectivePerson, setPerspective] = useState<string>(me ? me.name : "Robert")

    // process data
    const [renderedData, setRenderedData] = useState<InternMap<string, InternMap>>(new InternMap())

    const [summary, setSummary] = useState<SummaryItem[]>([])

    const contributionCategories = [
        "nothing",
        "very little",
        "less",
        "equally",
        "more",
        "most",
        "everything"
    ];

    const labelContribution = scaleQuantize([0, 1], contributionCategories);

    const processDataForRendering = () => {
        // extract the most needed points & name them appropriately
        const preppedData: { series: string; date: Date; column: string; row: string; minutes: number }[] = filteredData
            .map((d: DataPointRaw) => {
                return (
                    {
                        series: d.author.login,
                        date: new Date(d.date),
                        column: formatDateYearISOWeek(new Date(d.date)),
                        row: formatDateWeekday(new Date(d.date)),
                        minutes: d.duration.minutes
                    }
                )
            });

        const rollupFunction = (entries: ProcessedDataPoint[]): any => flatRollup(entries,
            D => {
                const minutesTotal = sum(D, d => d.minutes)
                const minutesByPersonAndDay = rollup(entries,
                    entriesOfPerson => {
                        return sum(entriesOfPerson, d => d.minutes)
                    },
                    d => d.series
                )
                const dateString = D[0].date.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })
                const allOtherPeople: string[] = Array.from(allPeople.keys())
                    .filter(person => person !== perspectivePerson)

                const focusPersonContribution = minutesByPersonAndDay.get(perspectivePerson) || 0

                const allPeoplesContributions = allOtherPeople.map(person => minutesByPersonAndDay.get(person) || 0)
                const averageContribution = allOtherPeople.length === 0 ? 0 : sum(allPeoplesContributions) / allOtherPeople.length
                const contribution = compareContributionToRest([focusPersonContribution, averageContribution])


                const stringLabels = Array.from(minutesByPersonAndDay.entries())
                    .map(([personName, minutes]) => `${personName}: ${minutes}m (${(minutes / minutesTotal * 100).toFixed(0)} %)`)
                const label = dateString + "\n" + stringLabels.join("\n")
                return {
                    label,
                    minutesTotal,
                    minutesByPersonAndDay,
                    contribution
                }
            }
        )

        const summedValuesBySeriesAndCategory: InternMap = rollup(preppedData,
            D => rollupFunction(D),
            d => d.column,
            d => d.row
        )
        const emptyMap = createAllWeekdaysMap(from, to, locale)

        for (const [week, weekdaysData] of summedValuesBySeriesAndCategory) {
            const weekdaysMapInEmpty = emptyMap.get(week)
            if (weekdaysMapInEmpty) {
                for (const [weekday, data] of weekdaysData) {
                    weekdaysMapInEmpty.set(weekday, data)
                }
            }
        }

        const summaryData = aggregateDaysByCategory(
            emptyMap,
            labelContribution,
            allDays,
            perspectivePerson,
            contributionCategories
        );
        setSummary(summaryData);

        setRenderedData(emptyMap);
    }

    useEffect(processDataForRendering, [filteredData, perspectivePerson])
    const svgTileGraphRef = useRef<SVGSVGElement>(null);
    const svgSummaryRef = useRef<SVGSVGElement>(null);

    const render = () => {
        if (renderedData === null)
            return

        const svgTileGraph = select(svgTileGraphRef.current);
        const svgSummary = select(svgSummaryRef.current);

        const canvas = svgTileGraph.select("g.canvas");
        canvas.selectChildren().remove()

        svgTileGraph.select(".axes g.x").selectChildren().remove()
        svgTileGraph.select(".axes g.y").selectChildren().remove()
        svgSummary.select("g.canvas").selectChildren().remove()
        svgSummary.select(".axes").selectChildren().remove()

        const xScale = scaleBand()
            .domain(allWeeks)
            .range([0, neededWidth]);

        xScale.padding(0.3)

        const xScaleTime = scaleTime()
            .domain([from, to])
            .range([0, neededWidth]);

        const opacityScale = scaleLinear().domain([0, 60]).range([0, 1])
        opacityScale.clamp(true);

        const yScale = scaleBand()
            .domain(["1", "2", "3", "4", "5", "6", "7"])
            .range([0, canvasHeight])
            .padding(0.3);

        svgTileGraph.select("g.axes")
            .append("g")
            .attr("class", "x")
            .attr("transform", `translate(0, ${canvasHeight})`)
            .call(axisBottom(xScaleTime).ticks(5))

        const colorScaleDistribution = scaleDiverging(["#ff1f6b", "#d15bff", "#0065ff"]);

        // A group for each series, and a rect for each element in the series
        const seriesGroups = svgTileGraph
            .select("g.canvas")
            .selectAll("g.columns")
            .data(renderedData.keys())
            .join(
                enter => enter.append("g"),
                update => update.attr("class", "updated"),
                exit => exit.remove()
            )
            .attr("id", d => d)
            .attr("transform", d => `translate(${xScale(d)}, 0)`)

        // now we have the weeks
        seriesGroups.selectAll("rect")
            .data((d: string): any => renderedData.get(d)) // rows
            .join(enter => enter.append("rect")
                .attr("opacity", 0)
                .attr("fill", "grey")
                .transition()
                .duration(d => Math.random() * 750 + 250)
                .attr("opacity", (d: any) => opacityScale(d[1].minutesTotal))
                .attr("fill", (d: any) => colorScaleDistribution(d[1].contribution))
                .selection(),
                update => update,
                exit => exit.remove()
            )
            .attr("transform", (d: any) => `translate(0, ${yScale(d[0])})`)
            .attr("x", 0)
            .attr("y", 0)
            .attr("rx", squareSize / 5)
            .attr("ry", squareSize / 5)
            .attr("width", squareSize)
            .attr("height", squareSize)
            .attr("class", (d: any) => labelContribution(d[1].contribution))
            .append("title")
                .text((d: any) => d[1].label)

        if (summary.length === 0)
            return
        
        const xScaleSummary = scaleBand()
            .domain(contributionCategories)
            .range([0, canvasWidth])
            .padding(0.3);

        const maxOfDays: number = Number(max(summary, d => d.days || 0))
        if (maxOfDays === 0)
            return;

        const yScaleSummary = scaleLinear()
            .domain([0, maxOfDays])
            .range([canvasHeight, 0]);

        const xAxis = svgSummary.select("g.axes")
            .append("g")
            .attr("class", "x axis")
            .attr("transform", `translate(0, ${canvasHeight})`)
            .call(axisBottom(xScaleSummary))

        const yAxis = svgSummary.select("g.axes")
            .append("g")
            .attr("class", "y axis")
            .call(axisLeft(yScaleSummary));

        const bars = svgSummary.select("g.canvas")
            .selectAll("rect")
            .data(summary)
            .join(
                enter => enter.append("rect")
                    .attr("y", yScaleSummary(0))
                    .attr("height", 0)
                    .transition()
                    .duration(750)
                    .attr("y", (d) => yScaleSummary(d.days))
                    .attr("height", (d) => yScaleSummary(0) - yScaleSummary(d.days))
                    .selection(),
                update => update
                    .transition()
                    .duration(750)
                    .attr("y", (d) => yScaleSummary(d.days))
                    .attr("height", (d) => yScaleSummary(0) - yScaleSummary(d.days)),
                exit => exit.remove()
            )
            .attr("x", (d) => xScaleSummary(d.category)!)
            .attr("width", xScaleSummary.bandwidth())
            .attr("fill", (d: any) => colorScaleDistribution(labelContribution.invertExtent(d.category)[0]))
            .append("title")
            .text((d: any) => `${d.days} days`)

    }

    useEffect(render, [renderedData, filteredData, perspectivePerson]);
    return (
        <>
            <div id="controls">
                <ButtonGroup>
                    {Array.from(allPeople)
                        .map((person: string) => {
                            return (
                                <Button
                                    onClick={() => setPerspective(person)}
                                    key={person}
                                    active={perspectivePerson === person}
                                >
                                    {person}
                                </Button>
                            )
                        })
                    }
                </ButtonGroup>
            </div>

            <div id="tile-chart">
                <svg
                    ref={svgTileGraphRef}
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    width={svgWidth}
                    height={svgHeight}
                >

                <g
                    className="axes"
                    transform={`translate(${margin.left}, ${margin.top})`}
                >
                </g>
                <g
                    className="canvas"
                    transform={`translate(${margin.left}, ${margin.top})`}
                >

                </g>
            </svg>
            </div>

            <div id="summary-chart">
                <svg
                    ref={svgSummaryRef}
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    width={svgWidth}
                    height={svgHeight}
                    preserveAspectRatio={"xMaxYMinmeet"}
                >

                    <g
                        className="axes"
                        transform={`translate(${margin.left}, ${margin.top})`}
                    >
                    </g>
                    <g
                        className="canvas"
                        transform={`translate(${margin.left}, ${margin.top})`}
                    >

                    </g>
                </svg>
            </div>
        </>
    )
}

export default TilePlot;
