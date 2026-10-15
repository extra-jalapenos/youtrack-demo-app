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
    console.log(host, "Host")
    // eslint-disable-next-line
    console.log(host.reportWidgetSize())
    const [loading, setLoading] = useState<boolean>(true);
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [fetchedData, setFetchedData] = useState(null);
    const svgContainerRef = useRef<HTMLElement|null>(null);

    const [size, setSize] = useState({
        width: 100,
        height: 100
    });

    const [config, _setConfig] = useState({
        from: sub(new Date(), {months: 12}),
        to: new Date()
    });

    if (loading)
        return (
            <Loader/>
        )


    // widget rendering dimensions
    return (
        <>
            <section>
                <Heading>Lol hi</Heading>
            </section>
            <section
                className="component"
            >
                <TilePlot
                    viewBoxWidth={size.width}
                    viewBoxHeight={size.height}
                    data={[]}
                />
            </section>
        </>
    )
};


export const App = memo(AppComponent);
