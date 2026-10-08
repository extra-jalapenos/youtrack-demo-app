import React, {memo, useEffect } from 'react';
// noinspection ES6UnusedImports
import * as d3 from "d3";
import "./app.css"
import type { HostAPI } from "../../../@types/globals";
import Heading from "@jetbrains/ring-ui-built/components/heading/heading";
import { sub } from "date-fns"
import TilePlot from "./TilePlot.tsx";
import {ControlsHeight, ControlsHeightContext} from '@jetbrains/ring-ui-built/components/global/controls-height';

// Register widget in YouTrack. To learn more, see https://www.jetbrains.com/help/youtrack/devportal-apps/apps-host-api.html

const AppComponent = () => {
    const [host, setHost] = React.useState<HostAPI | null>(null);
    // const [isConfiguring, setIsConfiguring] = React.useState(false);
    const [config, _setConfig] = React.useState({
        from: sub(new Date(), { months: 6 }),
        to: new Date()
    })

    useEffect(() => {
        async function register() {
            // Register widget in YouTrack. To learn more, see https://www.jetbrains.com/help/youtrack/devportal-apps/apps-host-api.html
            const newHost = await YTApp.register();
            if (!('readConfig' in newHost)) {
                throw new Error('Wrong type of API returned: probably widget used in wrong extension point');
            }

            await setHost(newHost);
        }
        register();
    }, []);

    if (host === null)
        return (
            <div>No host</div>
        )
    console.log(host)
    // widget rendering dimensions
    console.log(document.documentElement.clientWidth, document.documentElement.clientHeight)
    return (
        <div className="widget">
            <ControlsHeightContext.Provider value={ControlsHeight.S}>

            {
                <TilePlot
                    host={host}
                    from={config.from}
                    to={config.to}
                    squareSize={20}
                />
            }
            </ControlsHeightContext.Provider>
        </div>
    )
};


export const App = memo(AppComponent);
