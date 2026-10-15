import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import '@jetbrains/ring-ui-built/components/style.css';
import { App } from './app';
import {ControlsHeight, ControlsHeightContext} from '@jetbrains/ring-ui-built/components/global/controls-height';
import {EmbeddableWidgetAPI, HostAPI} from "../../../@types/globals";

// Register widget in YouTrack. To learn more, see https://www.jetbrains.com/help/youtrack/devportal-apps/apps-host-api.html
const host: HostAPI = await YTApp.register();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
        <ControlsHeightContext.Provider value={ControlsHeight.S}>
            <App host={host} />
        </ControlsHeightContext.Provider>
    </StrictMode>
);