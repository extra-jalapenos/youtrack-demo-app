import React, {memo, useEffect, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import * as d3 from "d3";
import "./app.css"
import RadialChart from "./RadialChart.tsx";
import DataPoint, {dataPointRaw} from "./types.ts";
import type {EmbeddableWidgetAPI, HostAPI} from "../../../@types/globals";
import Heading from "@jetbrains/ring-ui-built/components/heading/heading";
import DatePicker from "@jetbrains/ring-ui-built/components/date-picker/date-picker";
import Text from "@jetbrains/ring-ui-built/components/text/text";
import {AlertType} from "@jetbrains/ring-ui-built/components/alert/alert";
import { sub } from "date-fns"
// Register widget in YouTrack. To learn more, see https://www.jetbrains.com/help/youtrack/devportal-apps/apps-host-api.html

const regenerateArray = () => {
    return Array(100).fill(0).map(_ => new DataPoint);
}

const AppComponent = () => {
    const [host, setHost] = React.useState<EmbeddableWidgetAPI | null>(null);
    const [isConfiguring, setIsConfiguring] = React.useState(false);

    const [config, _setConfig] = React.useState({
        from: sub(new Date(), { years: 1 }),
        to: new Date()
    })

    const [height, _setHeight] = useState(document.documentElement.clientHeight);
    const [width, _setWidth] = useState(document.documentElement.clientWidth);
    const [data, _setData] = useState<Array<dataPointRaw>>(regenerateArray());

    useEffect(() => {
        async function register() {
            // Register widget in YouTrack. To learn more, see https://www.jetbrains.com/help/youtrack/devportal-apps/apps-host-api.html
            const newHost = await YTApp.register();
            console.log("registered", newHost);
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
    return (
        <div className="widget">
            <Heading>Cool heading</Heading>
            {
                    <section>
                        <RadialChart host={host} from={config.from} to={config.to} width={width} height={width} />
                        <Button onClick={() => _setData(regenerateArray())}>Regenerate</Button>
                        <div>
                            <p>
                                <Text size={Text.Size.S} info>
                                    Label text example
                                </Text>
                                <br />
                                <Text size={Text.Size.S} info bold>
                                    Label text example bold
                                </Text>
                            </p>

                            <p>
                                <Text size={Text.Size.M}>Regular text example</Text>
                                <br />
                                <Text size={Text.Size.M} bold>
                                    Regular text example bold
                                </Text>
                            </p>

                            <p>
                                <Text size={Text.Size.L}>Text block example</Text>
                                <br />
                                <Text size={Text.Size.L} bold>
                                    Text block example bold
                                </Text>
                            </p>
                        </div>
                    </section>
            }
        </div>
    )
};


export const App = memo(AppComponent);
