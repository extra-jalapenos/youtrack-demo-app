import React, {memo, useEffect, useMemo, useRef, useState} from 'react';
import {
    timeDay,
    timeMonday,
    timeMonth
} from "d3-time"
import type {HostAPI} from "../../../@types/globals";
import "@jetbrains/ring-ui-built/components/style.css";
import "./app.css"
import {sub} from "date-fns"
import {ControlsHeight, ControlsHeightContext} from '@jetbrains/ring-ui-built/components/global/controls-height';
import {extractAllPeople} from "./utils/dataService.ts";
import {
    evaluateFromPOV,
    extractRelevantInfo,
    getCategorySummary
} from "./utils/processingData.ts";
import ButtonGroup from "@jetbrains/ring-ui-built/components/button-group/button-group";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import {author, ExtractedDataPoint, ChartDataPoint, FetchedDataPoint } from "./utils/types.d.ts";
import ButtonToolbar from "@jetbrains/ring-ui-built/components/button-toolbar/button-toolbar";
import TimePlot from './components/TimePlot.tsx';
import CategoryFilterTable from './components/CategoryFilterTable.tsx';
import { fetchWorkItems } from './utils/fetching.ts';

const AppComponent = () => {
    const [containerWidth, setContainerWidth] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);

    const [loading, setLoading] = useState<boolean>(true);
    const [isConfiguring, setIsConfiguring] = useState(false);
    
    const [from, setFrom] = useState(sub(new Date(), { months: 3, weeks: 5 }));
    const [to, setTo] = useState((new Date()));

    const [extractedDataPoints, setExtractedDataPoints] = useState<ExtractedDataPoint[]>([]);
    const [authors, setAuthors] = useState<author[]>([]);
    const [selectedPerson, setSelectedPerson] = useState<string>("");
    
    const [ChartData, setChartData] = useState<ChartDataPoint[]>([])
    const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
    
    const plotRef = useRef<HTMLDivElement|null>(null);
    const summaryPlotRef = useRef<HTMLDivElement|null>(null);
    
    const presentCategories = useMemo(
        () => new Set(ChartData.map(d => d.contributionCategory)),
        [ChartData]
    );

    const categorySummary = useMemo(() => getCategorySummary(ChartData), [ChartData]);

    const loadData = async () => {
        const fetchedData: FetchedDataPoint[] = await fetchWorkItems(from, to, "Subtask of: TODO-380");
    
        const authors = extractAllPeople(fetchedData);
        setAuthors(authors);

        if (authors.length) {
            setSelectedPerson(authors[0].id)
        }
        const extractedDataPoints: ExtractedDataPoint[] = extractRelevantInfo(fetchedData);
        setExtractedDataPoints(extractedDataPoints);
    }

    useEffect(() => {
        loadData()
    }, [from, to]);

    useEffect(() => {
        if (extractedDataPoints.length === 0) {
            return
        };
        const groupingFunction = (d: ExtractedDataPoint) => timeDay(d.date)
        const povData = evaluateFromPOV(selectedPerson, extractedDataPoints, from, to, groupingFunction);
        setChartData([...povData]);
    }, [extractedDataPoints, selectedPerson]);

    // whenever the data changes (person, dates, grouping), all present categories start active
    useEffect(() => {
        setActiveCategories(new Set(presentCategories));
    }, [presentCategories]);

    const toggleCategory = (category: string) => {
        setActiveCategories(prev => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    useEffect(() => {
        if (!plotRef.current) {
            return;
        }

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
                setContainerHeight(entry.contentRect.height);
            }
        });

        resizeObserver.observe(plotRef.current);
        return () => resizeObserver.disconnect();
    }, []);


    useEffect(() => {
        if (!summaryPlotRef.current) {
            return;
        }

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
        <section
            id="header"
            className="component"
        >
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
            
            <Button
                onClick={() => loadData()}
            >
                Refresh Data
            </Button>
          </ButtonToolbar>
        </section>
        <section
            id="graph"
            className="component"
            ref={plotRef}
        >
          <TimePlot
            data={ChartData}
            width={containerWidth}
            height={containerHeight}
            activeCategories={activeCategories}
          />
        </section>
        <section id="summary">
          <CategoryFilterTable
            summary={categorySummary}
            activeCategories={activeCategories}
            onToggle={toggleCategory}
          />
        </section>
      </>
    )
};


export const App = memo(AppComponent);
