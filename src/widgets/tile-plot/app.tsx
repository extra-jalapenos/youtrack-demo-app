import React, {memo, useEffect, useState } from 'react';
import * as d3 from "d3";
import "./app.css"
import type { HostAPI } from "../../../@types/globals";
import { sub } from "date-fns"
import TilePlot from "./TilePlot.tsx";
import {ControlsHeight, ControlsHeightContext} from '@jetbrains/ring-ui-built/components/global/controls-height';

// Register widget in YouTrack. To learn more, see https://www.jetbrains.com/help/youtrack/devportal-apps/apps-host-api.html

const AppComponent = () => {

    const [host, setHost] = useState<HostAPI | null>(null);
    // const [isConfiguring, setIsConfiguring] = useState(false);
    const [config, _setConfig] = useState({
        from: sub(new Date(), { months: 6 }),
        to: new Date()
    })

    useEffect(() => {
        const registerApp = async () => {
            try {
                const host = await YTApp.register()
                setHost(host)
            } catch (e) {
                console.error(e)
            }
        }
        registerApp()
    }, []);

    if (host === null)
        console.log("no host")

    // widget rendering dimensions
    return (
        <div className="widget">
            <ControlsHeightContext.Provider value={ControlsHeight.S}>
            {
                <TilePlot
                    host={host}
                    from={config.from}
                    to={config.to}
                />
            }
            </ControlsHeightContext.Provider>
        </div>
    )
};


export const App = memo(AppComponent);
