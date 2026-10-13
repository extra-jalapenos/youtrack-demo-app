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
import {processDataForRendering} from "./processingData.ts";
import Text from "@jetbrains/ring-ui-built/components/text/text";

interface TilePlotOptions {
    from: Date;
    to: Date;
    width: number;
    height: number;
    host: HostAPI | null;
}


const TilePlot = ({from, to, host}: TilePlotOptions) => {
    const allDays = timeDays(from, to, 1);
    const locale = "de-DE"

    const formatDateYearISOWeek = timeFormat("%Y-%V")
    const formatDateWeekday = timeFormat("%u")

    const allWeeks = union([from, ...utcMondays(from, to, 1), to].map(d => formatDateYearISOWeek(d)))

    const margin = {
        left: 0, top: 5, right: 5, bottom: 25
    };

    const padding = 0.3;
    const [height, setHeight] = useState(0);
    const [width, setWidth] = useState(0);


    const svgTileGraphRef = useRef<SVGSVGElement>(null);
    useEffect(() => {
        if (!svgTileGraphRef)
            return
        setWidth(svgTileGraphRef.current.clientWidth);
        setHeight(svgTileGraphRef.current.clientHeight);
    }, []);
    const svgTileGraph = select(svgTileGraphRef.current);

    const canvasHeight: number = height - margin.top - margin.bottom;
    const squareSize = (canvasHeight / 7) / (1 + padding);

    const canvasWidth: number = width - margin.left - margin.right;
    const neededWidth: number = (allWeeks.size * squareSize * (1 + padding)) + margin.left + margin.right;
    const shownWeeksNumber: number = Math.floor(canvasWidth / squareSize);

    // store all sets
    const [fetchedData, setFetchedData] = useState<DataPointRaw[]>([])

    const [allPeople, setAllPeople] = useState<Set<string>>(new Set(["Ally", "niemand"]))
    const [me, setMe] = useState<{ key: string, login: string, name: string } | null>(null)

    // get Worklogs if from / to changes
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

    const [perspectivePerson, setPerspective] = useState<string>(me ? me.name : "")

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

    const processing = () => {

        const processedData = processDataForRendering(filteredData)

        const summaryData = aggregateDaysByCategory(
            processedData,
            labelContribution,
            allDays,
            perspectivePerson,
            contributionCategories
        );
        setSummary(summaryData);
        setRenderedData(processedData);
    }

    useEffect(() => console.log("hi"), [filteredData, perspectivePerson])
    let xScale = scaleBand()
        .domain(allWeeks)
        .range([0, neededWidth])
        .padding(0.3);

    let yScale = scaleBand()
        .domain(["1", "2", "3", "4", "5", "6", "7"])
        .range([0, canvasHeight])
        .padding(0.3);

    let xAxis
    let yAxis


    const firstRender = () => {
        if (renderedData === null)
            return

        const canvas = svgTileGraph.select("g.canvas");
        const axes = svgTileGraph.select("g.axes");
        const opacityScale = scaleLinear().domain([0, 60]).range([0, 1])
        opacityScale.clamp(true);

        xAxis = axes
            .append("g")
            .attr("class", "x")
            .attr("transform", `translate(0, ${canvasHeight})`)

        const colorScaleDistribution = scaleDiverging(["#ff1f6b", "#d15bff", "#0065ff"]);

        // A group for each series, and a rect for each element in the series
        const seriesGroups = canvas
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
        //
        // if (summary.length === 0)
        //     return
        //
        // const xScaleSummary = scaleBand()
        //     .domain(contributionCategories)
        //     .range([0, canvasWidth])
        //     .padding(0.3);
        //
        // const maxOfDays: number = Number(max(summary, d => d.days || 0))
        // if (maxOfDays === 0)
        //     return;
        //
        // const yScaleSummary = scaleLinear()
        //     .domain([0, maxOfDays])
        //     .range([canvasHeight, 0]);
        //
        // const xAxis = svgSummary.select("g.axes")
        //     .append("g")
        //     .attr("class", "x axis")
        //     .attr("transform", `translate(0, ${canvasHeight})`)
        //     .call(axisBottom(xScaleSummary))
        //
        // const yAxis = svgSummary.select("g.axes")
        //     .append("g")
        //     .attr("class", "y axis")
        //     .call(axisLeft(yScaleSummary));
        //
        // const bars = svgSummary.select("g.canvas")
        //     .selectAll("rect")
        //     .data(summary)
        //     .join(
        //         enter => enter.append("rect")
        //             .attr("y", yScaleSummary(0))
        //             .attr("height", 0)
        //             .transition()
        //             .duration(750)
        //             .attr("y", (d) => yScaleSummary(d.days))
        //             .attr("height", (d) => yScaleSummary(0) - yScaleSummary(d.days))
        //             .selection(),
        //         update => update
        //             .transition()
        //             .duration(750)
        //             .attr("y", (d) => yScaleSummary(d.days))
        //             .attr("height", (d) => yScaleSummary(0) - yScaleSummary(d.days)),
        //         exit => exit.remove()
        //     )
        //     .attr("x", (d) => xScaleSummary(d.category)!)
        //     .attr("width", xScaleSummary.bandwidth())
        //     .attr("fill", (d: any) => colorScaleDistribution(labelContribution.invertExtent(d.category)[0]))
        //     .append("title")
        //     .text((d: any) => `${d.days} days`)

    }

    useEffect(firstRender, []);
    useEffect(() => {
        console.log("rerendering")
    }, [renderedData, perspectivePerson]);
    return (
        <>
            <div
                id="controls"
                className="component"
            >
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

            <div
                className="component"
            >
                <svg
                    ref={svgTileGraphRef}
                    viewBox={`0 0 ${width} ${height}`}
                    width={width}
                    height={height}
                >

                    <g
                        className="axes"
                        transform={`translate(${margin.left}, ${margin.top})`}
                    >
                    </g>
                    <canvas
                        className="canvas"
                        transform={`translate(${margin.left}, ${margin.top})`}
                    >
                        <rect
                            x={-10}
                            y={-20}
                            width={30}
                            height={40}
                            fill="red"
                        >

                        </rect>
                        <Text>
                            {width}
                        </Text>

                    </canvas>
                </svg>
            </div>

        </>
    )
}

export default TilePlot;
