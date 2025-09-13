import React, { useState, useMemo } from 'react';
import { VerificationResultData } from '../types';

interface BulkResultsDisplayProps {
    results: VerificationResultData[];
    onDownload: () => void;
    onDownloadAll: () => void;
    onClose: () => void;
}

type SortKey = 'beneficiaryName' | 'accountNumber' | 'success' | 'message';

interface SortConfig {
    key: SortKey;
    direction: 'ascending' | 'descending';
}

const SortableHeader: React.FC<{
    sortKey: SortKey;
    title: string;
    sortConfig: SortConfig | null;
    requestSort: (key: SortKey) => void;
}> = ({ sortKey, title, sortConfig, requestSort }) => {
    const isSorted = sortConfig?.key === sortKey;
    const directionIcon = isSorted ? (sortConfig?.direction === 'ascending' ? '▲' : '▼') : '';

    const thClassNames = `
        px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider 
        cursor-pointer hover:bg-gray-100 transition-colors duration-150
        ${isSorted ? '!bg-gray-200 text-gray-700 font-semibold' : ''}
    `;

    return (
        <th
            scope="col"
            className={thClassNames.trim()}
            onClick={() => requestSort(sortKey)}
            aria-sort={isSorted ? sortConfig.direction : 'none'}
            title={`Sort by ${title}`}
        >
            <div className="flex items-center justify-between">
                <span>{title}</span>
                <span className="w-4 text-center">
                    {directionIcon}
                </span>
            </div>
        </th>
    );
};


export const BulkResultsDisplay: React.FC<BulkResultsDisplayProps> = ({ results, onDownload, onDownloadAll, onClose }) => {
    const successfulCount = results.filter(r => r.success).length;
    const failedCount = results.length - successfulCount;
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'beneficiaryName', direction: 'ascending' });

    const requestSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedResults = useMemo(() => {
        let sortableItems = [...results];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const getSortValue = (item: VerificationResultData, key: SortKey) => {
                    if (key === 'beneficiaryName' || key === 'accountNumber') {
                        return item.data?.[key]?.toLowerCase() || '';
                    }
                    if (key === 'success' || key === 'message') {
                        const val = item[key];
                         if (typeof val === 'boolean') return val ? 1 : 0;
                         if (typeof val === 'string') return val.toLowerCase();
                         return val;
                    }
                    return '';
                };

                const aValue = getSortValue(a, sortConfig.key);
                const bValue = getSortValue(b, sortConfig.key);

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [results, sortConfig]);


    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Bulk Verification Results</h2>
            <div className="mb-6 bg-gray-50 p-4 rounded-lg flex justify-around text-center">
                <div>
                    <p className="text-3xl font-bold text-green-600">{successfulCount}</p>
                    <p className="text-sm text-gray-600">Successful</p>
                </div>
                <div>
                    <p className="text-3xl font-bold text-red-600">{failedCount}</p>
                    <p className="text-sm text-gray-600">Failed</p>
                </div>
                 <div>
                    <p className="text-3xl font-bold text-gray-800">{results.length}</p>
                    <p className="text-sm text-gray-600">Total</p>
                </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                            <SortableHeader sortKey="beneficiaryName" title="Beneficiary" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader sortKey="accountNumber" title="Account No." sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader sortKey="success" title="Status" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader sortKey="message" title="Details" sortConfig={sortConfig} requestSort={requestSort} />
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedResults.map((result, index) => (
                            <tr key={index} className={result.success ? 'bg-green-50' : 'bg-red-50'}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.data?.beneficiaryName || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.data?.accountNumber || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                        {result.success ? 'Success' : 'Failed'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">{result.message}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-6 flex justify-end space-x-4">
                 <button 
                    onClick={onClose}
                    className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                    Close
                </button>
                <button
                    onClick={onDownloadAll}
                    disabled={results.length === 0}
                    className="bg-white text-primary border border-primary font-bold py-2 px-4 rounded-md hover:bg-blue-50 disabled:bg-gray-200 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    Download All Results
                </button>
                <button 
                    onClick={onDownload}
                    disabled={successfulCount === 0}
                    className="bg-primary text-white font-bold py-2 px-4 rounded-md hover:bg-secondary disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    Download Successful Results
                </button>
            </div>
        </div>
    );
};