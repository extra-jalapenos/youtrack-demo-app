import type {CSSProperties} from 'react';
import {formatDuration} from 'date-fns/formatDuration';
import {contributionCategoryColour} from './colorScales.ts';
import type {CategorySummary} from './processingData.ts';

type CategoryFilterTableProps = {
    summary: CategorySummary[];
    activeCategories: Set<string>;
    onToggle: (label: string) => void;
};

const CategoryFilterTable = ({summary, activeCategories, onToggle}: CategoryFilterTableProps) => (
    <div className="category-list">
        <div className="category-row category-header" aria-hidden="true">
            <span>Category</span>
            <span className="numeric">Days</span>
            <span className="numeric">My time</span>
        </div>
        {summary.map(({label, days, ownMinutes}) => {
            const colour = contributionCategoryColour.get(label);
            return (
                <div key={label} className="category-row">
                    <button
                        type="button"
                        className="category-toggle"
                        aria-pressed={activeCategories.has(label)}
                        disabled={days === 0}
                        onClick={() => onToggle(label)}
                        style={{'--category-colour': colour} as CSSProperties}
                    >
                        <span className="category-swatch"/>
                        {label}
                    </button>
                    <span className="numeric">{days}</span>
                    <span className="numeric">{formatDuration({minutes: ownMinutes}, {zero: true})}</span>
                </div>
            );
        })}
    </div>
);

export default CategoryFilterTable;
