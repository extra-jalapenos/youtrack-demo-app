import React, {memo, useEffect, useRef, useState} from 'react';
import * as d3 from "d3";
import "./app.css"
import type {HostAPI} from "../../../@types/globals";
import "@jetbrains/ring-ui-built/components/style.css";
import {sub} from "date-fns"
import TilePlot from "./TilePlot.tsx";
import {ControlsHeight, ControlsHeightContext} from '@jetbrains/ring-ui-built/components/global/controls-height';
import Heading from "@jetbrains/ring-ui-built/components/heading/heading";
import Loader from "@jetbrains/ring-ui-built/components/loader/loader";
import type {AlertType} from "@jetbrains/ring-ui-built/components/alert/alert";
import {extractAllPeople} from "./dataService.ts";
import {
    calculateMinutesByDay,
    calculateMinutesByDayAndPersonId, countContributionCategories,
    evaluateFromPOV,
    extractRelevantInfo, getAverageContributionPerCategory
} from "./processingData.ts";
import ButtonGroup from "@jetbrains/ring-ui-built/components/button-group/button-group";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import {author, CountChartDataPoint, ExtractedDataPoint, TileChartDataPoint} from "./types.ts";
import {getEmptyMap} from "./helper.ts";
import CountChart from "./CountChart.tsx";
import DatePicker from "@jetbrains/ring-ui-built/components/date-picker/date-picker";
import ButtonToolbar from "@jetbrains/ring-ui-built/components/button-toolbar/button-toolbar";

const AppComponent = ({ host }: { host: HostAPI }) => {
    const [loading, setLoading] = useState<boolean>(true);
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [aggregation, setAggregation] = useState<string>("count");
    const [fetchedData, setFetchedData] = useState<ExtractedDataPoint[]>([]);
    const [authors, setAuthors] = useState<author[]>([]);
    const [selectedPerson, setSelectedPerson] = useState<string>("");
    const [from, setFrom] = useState(sub(new Date(), { years: 1 }));
    const [to, setTo] = useState(new Date());
    const [containerWidth, setContainerWidth] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const tilePlotRef = useRef<HTMLDivElement|null>(null);
    const summaryPlotRef = useRef<HTMLDivElement|null>(null);
    const [tileChartData, setTileChartData] = useState<TileChartDataPoint[]>([])
    const [summaryChartData, setSummaryChartData] = useState<CountChartDataPoint[]>([])

    useEffect(() => {
        const fetchWorkItems = async () => {
            try {
                const query = "Subtask of: TODO-380"
                const fields = "id,author(id,name,login),duration(minutes),date,text,issue(id,customFields(id,name,value(id,name)))"
                const startDate = from.toISOString().split("T")[0];
                const endDate = to.toISOString().split("T")[0];
                const responseYoutrack: any = await host.fetchYouTrack(`workItems?startDate=${startDate}&endDate=${endDate}&fields=${fields}&query=${query}`);
                // console.log("responseYoutrack", responseYoutrack[0])

                const relevantData = extractRelevantInfo(responseYoutrack);
                const authors = extractAllPeople(responseYoutrack);

                setAuthors(authors);
                if (authors.length)
                    setSelectedPerson(YTApp.me.id);

                setFetchedData(relevantData);
            } catch {
                host.alert('YTApp: could not request custom HTTP endpoint', 'error' as AlertType.ERROR)
            }
        }
        fetchWorkItems()
    }, [from, to]);

    useEffect(() => {
        if (fetchedData.length === 0)
            return
        const povData = evaluateFromPOV(selectedPerson, fetchedData, from, to);
        setTileChartData([...povData]);
    }, [selectedPerson, fetchedData, from, to]);

    useEffect(() => {
        if (fetchedData.length === 0)
            return
        if (aggregation === "count") {
            const countsByCategory = countContributionCategories(tileChartData);
            setSummaryChartData(countsByCategory);
        }
        if (aggregation === "median") {
            const medianContributionByCategory = getAverageContributionPerCategory(tileChartData);
            setSummaryChartData(medianContributionByCategory);
        }
    }, [tileChartData, aggregation, selectedPerson]);

    useEffect(() => {
        if (!tilePlotRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
                setContainerHeight(entry.contentRect.height);
            }
        });

        resizeObserver.observe(tilePlotRef.current);
        return () => resizeObserver.disconnect();
    }, []);


    useEffect(() => {
        if (!summaryPlotRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
                setContainerHeight(entry.contentRect.height);
            }
        });

        resizeObserver.observe(summaryPlotRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    return (
        <>
            <section>
                <ButtonToolbar>
                    <ButtonGroup>
                        {authors.map(author => {
                            return (
                                <Button
                                    key={author.id}
                                    active={author.id === selectedPerson}
                                    onClick={() => setSelectedPerson(author.id)}
                                >
                                    {author.name}
                                </Button>
                            )
                        })}
                    </ButtonGroup>
                    <ButtonGroup>
                        {["count", "median"].map(mode => {
                            return (
                                <Button
                                    key={mode}
                                    active={mode === aggregation}
                                    onClick={() => setAggregation(mode)}
                                >
                                    {mode}
                                </Button>
                            )
                        })}
                    </ButtonGroup>
                </ButtonToolbar>
            </section>
            <section
                className="component"
                ref={tilePlotRef}
            >
                <TilePlot
                    data={tileChartData}
                    viewBoxWidth={containerWidth}
                    width={containerWidth}
                    viewBoxHeight={containerHeight}
                    height={containerHeight}
                />
            </section>
            <section
                className="component"
                ref={summaryPlotRef}
            >
                <CountChart
                    data={summaryChartData}
                    viewBoxWidth={containerWidth}
                    width={containerWidth}
                    viewBoxHeight={containerHeight}
                    height={containerHeight}
               />
            </section>
        </>
    )
};


export const App = memo(AppComponent);
