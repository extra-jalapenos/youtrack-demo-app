import { HostAPI } from "../../../../@types/globals";
import { mockData } from "./mockData";

export const YTAppPresent = (): true | Error => {
    if (YTApp)
        return true;
    return Error("no YTApp detected")
}

export const fetchWorkItems = async (from: Date, to: Date, query: string) => {
        try {
            YTAppPresent();
            const host: HostAPI = await YTApp.register();
            const fields = "id,author(id,name,login),duration(minutes),date,text,issue(id,customFields(id,name,value(id,name)))"
            const startDate = from.toISOString().split("T")[0];
            const endDate = to.toISOString().split("T")[0];
            const responseYoutrack: any = await host.fetchYouTrack(`workItems?startDate=${startDate}&endDate=${endDate}&fields=${fields}&query=${query}`);
            return responseYoutrack;
        } catch (error) {
            return mockData(from, to, ["Alice", "Bob", "Charlie"], 500)
            // host.alert('YTApp: could not request custom HTTP endpoint', 'error' as AlertType.ERROR)
        }
    }
