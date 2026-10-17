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
    calculateMinutesByDayAndPersonId,
    evaluateFromPOV,
    extractRelevantInfo
} from "./processingData.ts";
import ButtonGroup from "@jetbrains/ring-ui-built/components/button-group/button-group";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import {author, ExtractedDataPoint, TileChartDataPoint} from "./types.ts";
import {getEmptyMap} from "./helper.ts";

const AppComponent = ({ host }: { host: HostAPI }) => {
    const [loading, setLoading] = useState<boolean>(true);
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [fetchedData, setFetchedData] = useState<ExtractedDataPoint[]>([]);
    const [authors, setAuthors] = useState<author[]>([]);
    const [selectedPerson, setSelectedPerson] = useState<string>("");
    const [from, setFrom] = useState(sub(new Date(), { years: 1 }));
    const [to, setTo] = useState(new Date());
    const [containerWidth, setContainerWidth] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const containerRef = useRef<HTMLDivElement|null>(null);
    const [renderedData, setRenderedData] = useState<TileChartDataPoint[]>([])

    useEffect(() => {
        const fetchWorkItems = async () => {
            try {
                const query = "Subtask of: TODO-380"
                const fields = "id,author(id,name,login),duration(minutes),date,text,issue(id,customFields(id,name,value(id,name)))"
                const startDate = from.toISOString().split("T")[0];
                const endDate = to.toISOString().split("T")[0];
                const responseYoutrack: any = await host.fetchYouTrack(`workItems?startDate=${startDate}&endDate=${endDate}&fields=${fields}&query=${query}`);
                console.log("responseYoutrack", responseYoutrack[0])

                const relevantData = extractRelevantInfo(responseYoutrack);
                const authors = extractAllPeople(responseYoutrack);

                setAuthors(authors);
                if (authors.length)
                    setSelectedPerson(authors[0].id);

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
        setRenderedData([...povData]);
        console.log("set pov data", povData);
    }, [selectedPerson, fetchedData, from, to]);

    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
                setContainerHeight(entry.contentRect.height);
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    return (
        <>
            <section>
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
            </section>
            <section
                className="component"
                ref={containerRef}
            >
                <TilePlot
                    data={renderedData}
                    width={containerWidth}
                    height={containerHeight}
                />
            </section>
        </>
    )
};


export const App = memo(AppComponent);
