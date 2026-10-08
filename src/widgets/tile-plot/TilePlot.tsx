import {useRef, useEffect, useState} from "react";
import Button from "@jetbrains/ring-ui-built/components/button/button.js";
import {compareContributionToRest} from "./helper.ts";
import ButtonGroup from "@jetbrains/ring-ui-built/components/button-group/button-group";
import ButtonToolbar from "@jetbrains/ring-ui-built/components/button-toolbar/button-toolbar";
import {DataPointRaw, ProcessedDataPoint} from "./types.ts";
import {
    select,
    union,
    rollup, flatRollup,
    sum, extent,
    utcMondays,
    scaleBand, scaleTime, scaleLinear, scaleQuantize, scaleDiverging,
    axisBottom, axisLeft,
    timeFormat, timeDays, InternMap
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
    squareSize: number;
    host: HostAPI;
}

const TilePlot = ({from, to, squareSize, host}: TilePlotOptions) => {
    const allDays = timeDays(from, to, 1);

    const formatDateYearISOWeek = timeFormat("%Y-%V")
    const formatDateWeekday = timeFormat("%u")

    const allWeeks = union([from, ...utcMondays(from, to, 1), to].map(d => formatDateYearISOWeek(d)))


    const margin = {
        left: 25,
        top: 25,
        right: 25,
        bottom: 25
    };

    const padding = 0.3;

    const canvasHeight: number = squareSize * 7 * (1 + padding);
    const canvasWidth: number = allWeeks.size * squareSize * (1 + padding);
    const height = canvasHeight + margin.top + margin.bottom;
    const width: number = canvasWidth + margin.left + margin.right;

    // store all sets
    const [fetchedData, setFetchedData] = useState<DataPointRaw[]>([])

    const [allPeople, setAllPeople] = useState<Set<string>>(new Set())
    const [useOpacity, setUseOpacity] = useState<boolean>(false)
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
                        fields: "id,author(name,login),duration(minutes),date,text,issue(id,customFields(id,name,value(id,name)))"
                    }
                }
                const responseYoutrack: any = await host.fetchYouTrack(`workItems`, configYoutrackWorkitems)
                console.log(responseYoutrack[0])
                const allPeopleArray = responseYoutrack.map((d: DataPointRaw) => d.author.name).sort()
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

    const processDataForRendering = () => {
        // extract the most needed points & name them appropriately
        const preppedData: { series: string; date: Date; column: string; row: string; minutes: number }[] = filteredData
            //.filter((d: DataPointRaw) => showPeople.includes(d.author.name))
            .map((d: DataPointRaw) => {
                return (
                    {
                        series: d.author.name,
                        date: new Date(d.date),
                        column: formatDateYearISOWeek(new Date(d.date)),
                        row: formatDateWeekday(new Date(d.date)),
                        minutes: d.duration.minutes
                    }
                )
            });

        const series = union(preppedData.map((d: ProcessedDataPoint) => d.series).sort())

        type rolledUp = {
            minutesTotal: number,
            label: string
        }

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
                const averageContribution = sum(allPeoplesContributions) / allOtherPeople.length
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

        setRenderedData(summedValuesBySeriesAndCategory);
    }

    useEffect(processDataForRendering, [filteredData, perspectivePerson])

    const svgRef = useRef<SVGSVGElement>(null);

    const render = () => {
        if (renderedData === null)
            return

        const svg = select(svgRef.current);
        const canvas = svg.select("g.canvas");
        canvas.selectChildren().remove()

        svg.select(".axes g.x").selectChildren().remove()
        svg.select(".axes g.y").selectChildren().remove()

        const xScale = scaleBand()
            .domain(allWeeks)
            .range([0, canvasWidth]);

        xScale.padding(0.3)

        const xScaleTime = scaleTime()
            .domain([from, to])
            .range([0, canvasWidth]);

        const contributionCategories = [
            "nothing",
            "very little",
            "less",
            "equally",
            "more",
            "most",
            "everything"
        ];

        const labelContribution = scaleQuantize([0, 1], contributionCategories)

        const opacityScale = scaleLinear().domain([0, 60]).range([0, 1])
        opacityScale.clamp(true);

        const yScale = scaleBand()
            .domain(["1", "2", "3", "4", "5", "6", "7"])
            .range([0, canvasHeight])
            .padding(0.3);
        //
        // svg.select("g.axes")
        //     .append("g")
        //     .attr("class", "y")
        //     .call(axisLeft(yScale))

        svg.select("g.axes")
            .append("g")
            .attr("class", "x")
            .attr("transform", `translate(0, ${canvasHeight})`)
            .call(axisBottom(xScaleTime))

        // const colorScale = d3.scaleOrdinal()
        //     .domain(renderedData.keys())
        //     .range(renderedData.keys().map((_, i) =>
        //         d3.interpolateRdYlBu(i / (series.size - 1))
        //     ))
        //     .unknown("grey");

        //const colorScaleDistribution = scaleDiverging(["#00061F", "#00FF41", "white"]);
        const colorScaleDistribution = scaleDiverging(["#ff1f6b", "#d15bff", "#0065ff"]);
        // svg.select(".axes g.y").append("g").attr("class", "x").call(d3.axisLeft(yScale));

        // A group for each series, and a rect for each element in the series
        const seriesGroups = svg
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
            .join(enter => enter.append("rect"))
            .attr("transform", (d: any) => `translate(0, ${yScale(d[0])})`)
            .attr("x", 0)
            .attr("y", 0)
            .attr("rx", squareSize / 5)
            .attr("ry", squareSize / 5)
            .attr("width", squareSize)
            .attr("height", squareSize)
            .attr("fill", (d: any) => colorScaleDistribution(d[1].contribution))
            .attr("opacity", (d: any) => useOpacity ? opacityScale(d[1].minutesTotal) : 1)
            .append("title")
            .text((d: any) => d[1].label)
    }

    useEffect(render, [renderedData, filteredData, perspectivePerson, useOpacity]);

    return (
        <>
            <Grid>
                <Row>
                    <Col xs>
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
                    </Col>
                    <Col xs>
                        <Toggle onClick={() => setUseOpacity(!useOpacity)} /> <Text size={Text.Size.S}>variable opacity</Text>
                    </Col>
                </Row>
            </Grid>

            <svg
                ref={svgRef}
                viewBox={`0 0 ${width} ${height}`}
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
            <Text  size={Text.Size.S} info >
                {`red: ${perspectivePerson} didn't contribute | lilac: ${perspectivePerson} did their share. | blue: ${perspectivePerson} did everything.`}
            </Text>
        </>
    )
}

export default TilePlot;
