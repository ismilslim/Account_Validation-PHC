
import React from 'react';
import { BankNetworkStatus } from '../types';

interface StatusIndicatorProps {
    name: string;
    status: BankNetworkStatus;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ name, status }) => {
    const getStatusColor = () => {
        switch (status) {
            case BankNetworkStatus.OPERATIONAL:
                return 'bg-green-500';
            case BankNetworkStatus.DEGRADED:
                return 'bg-yellow-500';
            case BankNetworkStatus.OFFLINE:
                return 'bg-red-500';
            default:
                return 'bg-gray-400';
        }
    };

    return (
        <div className="bg-gray-50 border border-gray-200 p-3 rounded-md flex items-center space-x-3 hover:shadow-md transition-shadow">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor()}`}></div>
            <div className="flex-grow">
                <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                <p className={`text-xs ${status === BankNetworkStatus.OPERATIONAL ? 'text-gray-500' : 'font-semibold text-gray-700'}`}>{status}</p>
            </div>
        </div>
    );
};
