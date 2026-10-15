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

const AppComponent = ({ host }: { host: HostAPI }) => {
    const [loading, setLoading] = useState<boolean>(true);
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [fetchedData, setFetchedData] = useState(null);
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

    return (
        <>
            <section>
                <Heading>Lol hi</Heading>
            </section>
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
