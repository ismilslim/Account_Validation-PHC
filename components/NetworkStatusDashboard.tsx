import React, { useState } from 'react';
import { BankStatus } from '../types';
import { StatusIndicator } from './StatusIndicator';
import { Spinner } from './Spinner';

interface NetworkStatusDashboardProps {
    statuses: BankStatus[];
    isLoading: boolean;
    onRefresh: () => void;
}

export const NetworkStatusDashboard: React.FC<NetworkStatusDashboardProps> = ({ statuses, isLoading, onRefresh }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredStatuses = statuses.filter(bank =>
        bank.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-700">Banking Network Status</h2>
                <button onClick={onRefresh} disabled={isLoading} className="text-accent hover:text-secondary disabled:opacity-50 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 11M20 20l-1.5-1.5A9 9 0 003.5 13" />
                    </svg>
                </button>
            </div>
            
            <div className="relative mb-4">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                </span>
                <input
                    type="text"
                    placeholder="Search for a bank..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-secondary focus:border-secondary transition-colors"
                    aria-label="Search for a bank"
                />
            </div>

            {isLoading && statuses.length === 0 ? (
                <div className="flex-grow flex justify-center items-center h-64">
                    <Spinner />
                </div>
            ) : (
                <div className="flex-grow grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-4 max-h-[55vh] overflow-y-auto pr-2">
                    {filteredStatuses.length > 0 ? (
                        filteredStatuses.map(bank => (
                            <StatusIndicator key={bank.name} name={bank.name} status={bank.status} />
                        ))
                    ) : (
                        <div className="col-span-full text-center text-gray-500 py-8">
                            <p>No banks found matching your search.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
