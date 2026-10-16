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

const AppComponent = ({ host }: { host: HostAPI }) => {
    const [loading, setLoading] = useState<boolean>(true);
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [fetchedData, setFetchedData] = useState(null);
    const [authors, setAuthors] = useState(new Set<string>());
    const [from, setFrom] = useState(sub(new Date(), { years: 1 }));
    const [to, setTo] = useState(new Date());
    const [containerWidth, setContainerWidth] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const containerRef = useRef<HTMLDivElement|null>(null);

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

    useEffect(() => {
        const fetchWorkItems = async (from, to) => {
            try {
                const configYoutrackWorkitems = {
                    query: {
                        query: "work date: 2026-10-14 .. Today",
                        fields: "id,author(name,login),duration(minutes),date,text,issue(id,customFields(id,name,value(id,name)))"
                    }
                }
                const responseYoutrack: any = await host.fetchYouTrack(`workItems`, configYoutrackWorkitems)
                console.log("responseYoutrack", responseYoutrack[0])
                setFetchedData(responseYoutrack)
                extractAllPeople(responseYoutrack)
            } catch {
                host.alert('YTApp: could not request custom HTTP endpoint', 'error' as AlertType.ERROR)
            }
        }
        fetchWorkItems(from, to)
    }, [from, to]);

    return (
        <>
            <section
                className="component"
                ref={containerRef}
            >
                <TilePlot
                    data={[]}
                    width={containerWidth}
                    height={containerHeight}
                />
            </section>
        </>
    )
};


export const App = memo(AppComponent);
