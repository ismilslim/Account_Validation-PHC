
import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { NetworkStatusDashboard } from './components/NetworkStatusDashboard';
import { AccountVerificationForm } from './components/AccountVerificationForm';
import { Modal } from './components/Modal';
import { Spinner } from './components/Spinner';
import { BulkResultsDisplay } from './components/BulkResultsDisplay';
import { BankStatus, AccountDetails, VerificationResultData } from './types';
import { fetchBankStatuses, verifyAccountDetails } from './services/geminiService';

/**
 * Parses a single row of a CSV string, handling quoted fields.
 * @param row The CSV row string to parse.
 * @returns An array of strings representing the cells in the row.
 */
const robustParseCsvRow = (row: string): string[] => {
    const values = [];
    let currentVal = "";
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
        const char = row[i];

        if (char === '"') {
            // Handle escaped quotes ("")
            if (inQuotes && i + 1 < row.length && row[i+1] === '"') {
                currentVal += '"';
                i++; // Skip next char
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(currentVal.trim());
            currentVal = "";
        } else {
            currentVal += char;
        }
    }
    values.push(currentVal.trim());

    return values;
};


const App: React.FC = () => {
    const [bankStatuses, setBankStatuses] = useState<BankStatus[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isVerifying, setIsVerifying] = useState<boolean>(false);
    const [isBulkVerifying, setIsBulkVerifying] = useState<boolean>(false);
    const [verificationResult, setVerificationResult] = useState<VerificationResultData | null>(null);
    const [bulkResults, setBulkResults] = useState<VerificationResultData[]>([]);
    const [networkError, setNetworkError] = useState<string | null>(null); // For non-modal errors
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);

    const loadNetworkStatus = useCallback(async () => {
        setIsLoading(true);
        try {
            const statuses = await fetchBankStatuses();
            setBankStatuses(statuses);
            setNetworkError(null);
        } catch (err) {
            setNetworkError('Failed to fetch bank network statuses.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadNetworkStatus();
        const interval = setInterval(loadNetworkStatus, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [loadNetworkStatus]);

    const handleVerification = async (details: AccountDetails) => {
        setIsVerifying(true);
        setVerificationResult(null);
        try {
            const result = await verifyAccountDetails(details);
            setVerificationResult(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during verification.';
            setVerificationResult({ success: false, message: errorMessage, data: details });
        } finally {
            setIsVerifying(false);
            setIsModalOpen(true);
        }
    };

    const handleBulkUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            if (!text) {
                setVerificationResult({ success: false, message: "Could not read the file.", data: null });
                setIsModalOpen(true);
                return;
            }

            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length <= 1) {
                setVerificationResult({ success: false, message: "CSV file is empty or contains only a header.", data: null });
                setIsModalOpen(true);
                return;
            }
            
            const header = robustParseCsvRow(lines[0]);
            const requiredHeaders = ['beneficiaryName', 'bankName', 'accountNumber', 'bvn'];
            const missingHeaders = requiredHeaders.filter(rh => !header.includes(rh));

            if (missingHeaders.length > 0) {
                const errorMessage = `Invalid CSV header. Missing required columns: ${missingHeaders.join(', ')}.`;
                setVerificationResult({ success: false, message: errorMessage, data: null });
                setIsModalOpen(true);
                return;
            }
            
            const headerMap = header.reduce((acc, col, index) => {
                acc[col.trim()] = index;
                return acc;
            }, {} as Record<string, number>);

            const accountsToVerify: AccountDetails[] = [];
            const parsingErrors: string[] = [];

            lines.slice(1).forEach((line, index) => {
                const data = robustParseCsvRow(line);

                if (data.length !== header.length) {
                    parsingErrors.push(`Row ${index + 2}: Mismatched column count. Expected ${header.length}, but found ${data.length}.`);
                    return; // Skip this malformed row
                }
                
                const account: AccountDetails = {
                    beneficiaryName: data[headerMap['beneficiaryName']] ?? '',
                    bankName: data[headerMap['bankName']] ?? '',
                    accountNumber: data[headerMap['accountNumber']] ?? '',
                    bvn: data[headerMap['bvn']] ?? '',
                };
                
                // Only add if it's not a completely empty row
                if (Object.values(account).some(val => val.trim() !== '')) {
                     accountsToVerify.push(account);
                }
            });

            if (parsingErrors.length > 0) {
                 const errorMessage = `Could not parse the CSV file due to formatting issues:\n\n${parsingErrors.join('\n')}`;
                 setVerificationResult({ success: false, message: errorMessage, data: null });
                 setIsModalOpen(true);
                 return;
            }

            // Check for duplicates
            const seen = new Map<string, number>();
            accountsToVerify.forEach(account => {
                const key = `${account.accountNumber.trim()}-${account.bankName.trim()}`.toLowerCase();
                if(key !== '-') {
                    seen.set(key, (seen.get(key) || 0) + 1);
                }
            });

            const duplicates = Array.from(seen.entries())
                .filter(([, count]) => count > 1)
                .map(([key]) => key);
            
            if (duplicates.length > 0) {
                const duplicateMessages = duplicates.map(d => {
                    const [acc, bank] = d.split('-');
                    return `Account ${acc} at ${bank}`;
                }).join('; ');
                const errorMessage = `Duplicate entries found in the file. Please remove them and try again. Duplicates: ${duplicateMessages}.`;
                setVerificationResult({ success: false, message: errorMessage, data: null });
                setIsModalOpen(true);
                return;
            }


            setIsBulkVerifying(true);
            setBulkResults([]);
            
            const results: VerificationResultData[] = [];
            for (const account of accountsToVerify) {
                try {
                    const result = await verifyAccountDetails(account);
                    results.push(result);
                } catch (err) {
                     const message = err instanceof Error ? err.message : 'An unknown error occurred.';
                     results.push({ success: false, message, data: account });
                }
            }
            
            setBulkResults(results);
            setIsBulkVerifying(false);
            setIsBulkModalOpen(true);
        };
        reader.onerror = () => {
             setVerificationResult({ success: false, message: "Failed to read the file.", data: null });
             setIsModalOpen(true);
        }
        reader.readAsText(file);
    };
    
    const handleDownloadResults = () => {
        const successfulResults = bulkResults.filter(r => r.success && r.data);
        if (successfulResults.length === 0) return;

        const headers = ['beneficiaryName', 'bankName', 'accountNumber', 'bvn'];
        const rows = successfulResults.map(r => {
            const data = r.data as AccountDetails;
            return [data.beneficiaryName, data.bankName, data.accountNumber, data.bvn].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.href) {
            URL.revokeObjectURL(link.href);
        }
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', 'successful_verifications.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadAllResults = () => {
        if (bulkResults.length === 0) return;

        const headers = ['beneficiaryName', 'bankName', 'accountNumber', 'bvn', 'status', 'message'];
        
        const rows = bulkResults.map(r => {
            const data = r.data;
            // Safely format for CSV, escaping quotes and wrapping in quotes if it contains a comma
            const formatCsvField = (field: string) => {
                const cleanField = field.replace(/"/g, '""');
                return /[",\n]/.test(cleanField) ? `"${cleanField}"` : cleanField;
            };

            return [
                data?.beneficiaryName || '',
                data?.bankName || '',
                data?.accountNumber || '',
                data?.bvn || '',
                r.success ? 'Success' : 'Failed',
                formatCsvField(r.message)
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.href) {
            URL.revokeObjectURL(link.href);
        }
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', 'all_verification_results.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    const closeModal = () => {
        setIsModalOpen(false);
        setVerificationResult(null);
    };
    
    const closeBulkModal = () => {
        setIsBulkModalOpen(false);
        setBulkResults([]);
    };

    const VerificationResultContent: React.FC = () => {
        if (!verificationResult) return null;
    
        return (
            <div className="text-center p-4">
                {verificationResult.success ? (
                    <div>
                        <svg className="mx-auto h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-4 text-2xl font-bold text-gray-800">Verification Successful</h3>
                        <p className="mt-2 text-gray-600">{verificationResult.message}</p>
                        <div className="mt-6 text-left bg-gray-50 p-4 rounded-lg border border-gray-200">
                           <h4 className="font-semibold text-gray-700 mb-3">Verified Details:</h4>
                           <ul className="space-y-2 text-sm text-gray-600">
                               <li><strong>Beneficiary:</strong> {verificationResult.data?.beneficiaryName}</li>
                               <li><strong>Bank:</strong> {verificationResult.data?.bankName}</li>
                               <li><strong>Account Number:</strong> {verificationResult.data?.accountNumber}</li>
                               <li><strong>BVN:</strong> {verificationResult.data?.bvn}</li>
                           </ul>
                        </div>
                    </div>
                ) : (
                    <div>
                         <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-4 text-2xl font-bold text-gray-800">Verification Failed</h3>
                        <p className="mt-2 text-gray-600 bg-red-50 p-3 rounded-md whitespace-pre-wrap">{verificationResult.message}</p>
                        {verificationResult.data && (
                            <div className="mt-6 text-left bg-gray-50 p-4 rounded-lg border border-gray-200">
                               <h4 className="font-semibold text-gray-700 mb-3">Submitted Details:</h4>
                               <ul className="space-y-2 text-sm text-gray-600">
                                   <li><strong>Beneficiary:</strong> {verificationResult.data.beneficiaryName}</li>
                                   <li><strong>Bank:</strong> {verificationResult.data.bankName}</li>
                                   <li><strong>Account Number:</strong> {verificationResult.data.accountNumber}</li>
                                   <li><strong>BVN:</strong> {verificationResult.data.bvn}</li>
                               </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-light-bg text-dark-text font-sans">
            <Header />
            <main className="container mx-auto p-4 md:p-8">
                 {networkError && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert"><p>{networkError}</p></div>}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <NetworkStatusDashboard statuses={bankStatuses} isLoading={isLoading} onRefresh={loadNetworkStatus} />
                    </div>
                    <div className="lg:col-span-2">
                       <AccountVerificationForm 
                            onSubmit={handleVerification} 
                            isVerifying={isVerifying}
                            onBulkUpload={handleBulkUpload}
                            isBulkVerifying={isBulkVerifying}
                        />
                    </div>
                </div>
            </main>
            <Modal isOpen={isModalOpen} onClose={closeModal}>
                {isVerifying ? <Spinner /> : <VerificationResultContent />}
            </Modal>
            <Modal isOpen={isBulkModalOpen} onClose={closeBulkModal} maxWidth="max-w-4xl">
                <BulkResultsDisplay 
                    results={bulkResults}
                    onDownload={handleDownloadResults}
                    onDownloadAll={handleDownloadAllResults}
                    onClose={closeBulkModal}
                />
            </Modal>
        </div>
    );
};

export default App;
