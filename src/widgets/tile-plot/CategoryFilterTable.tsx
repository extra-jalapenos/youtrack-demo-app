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
    <table className="category-table">
        <thead>
        <tr>
            <th scope="col">Category</th>
            <th scope="col" className="numeric">Days</th>
            <th scope="col" className="numeric">My time</th>
        </tr>
        </thead>
        <tbody>
        {summary.map(({label, days, ownMinutes}) => {
            const colour = contributionCategoryColour.get(label);
            return (
                <tr key={label}>
                    <td>
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
                    </td>
                    <td className="numeric">{days}</td>
                    <td className="numeric">{formatDuration({minutes: ownMinutes}, {zero: true})}</td>
                </tr>
            );
        })}
        </tbody>
    </table>
);

export default CategoryFilterTable;
