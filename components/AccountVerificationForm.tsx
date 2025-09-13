import React, { useState, useRef, useEffect } from 'react';
import { AccountDetails, BankData } from '../types';
import { fetchBankData } from '../services/geminiService';
import { Spinner } from './Spinner';

interface AccountVerificationFormProps {
    onSubmit: (details: AccountDetails) => void;
    onBulkUpload: (file: File) => void;
    isVerifying: boolean;
    isBulkVerifying: boolean;
}

export const AccountVerificationForm: React.FC<AccountVerificationFormProps> = ({ onSubmit, onBulkUpload, isVerifying, isBulkVerifying }) => {
    const [bankData, setBankData] = useState<BankData[]>([]);
    const [isBankDataLoading, setIsBankDataLoading] = useState(true);

    const [formData, setFormData] = useState<AccountDetails>({
        beneficiaryName: '',
        bankName: '',
        accountNumber: '',
        bvn: '',
    });
    const [errors, setErrors] = useState<Partial<AccountDetails>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadBanks = async () => {
            setIsBankDataLoading(true);
            try {
                const data = await fetchBankData();
                setBankData(data);
                if (data.length > 0) {
                    setFormData(prev => ({ ...prev, bankName: data[0].name }));
                }
            } catch (error) {
                console.error("Failed to load bank list", error);
            } finally {
                setIsBankDataLoading(false);
            }
        };
        loadBanks();
    }, []);

    const validate = (): boolean => {
        const newErrors: Partial<AccountDetails> = {};
        if (!formData.beneficiaryName.trim()) {
            newErrors.beneficiaryName = 'Beneficiary name is required.';
        }
        if (!formData.bankName.trim()) {
            newErrors.bankName = 'Bank name is required.';
        }
        if (!formData.accountNumber.trim()) {
            newErrors.accountNumber = 'Account number is required.';
        } else if (!/^\d{10}$/.test(formData.accountNumber)) {
            newErrors.accountNumber = 'Account number must be 10 digits.';
        }
        if (!formData.bvn.trim()) {
            newErrors.bvn = 'BVN is required.';
        } else if (!/^\d{11}$/.test(formData.bvn)) {
            newErrors.bvn = 'BVN must be 11 digits.';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSubmit(formData);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof AccountDetails]) {
           setErrors(prev => {
               const newErrors = { ...prev };
               delete newErrors[name as keyof AccountDetails];
               return newErrors;
           });
        }
    };
    
    const handleBulkUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onBulkUpload(file);
        }
        // Reset file input value to allow re-uploading the same file
        e.target.value = '';
    };

    const handleDownloadTemplate = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        const headers = ['beneficiaryName', 'bankName', 'accountNumber', 'bvn'].join(',');
        const exampleRow = 'Ada Lovelace,Zenith Bank,0123456789,12345678901';

        const bankListHeader = [
            '', // blank line
            '# Please use one of the following bank names for the \'bankName\' column:',
            '#',
            '# Bank Name - Sort Code'
        ].join('\n');
        
        const bankListContent = bankData.length > 0
            ? bankData.map(bank => `# ${bank.name} - ${bank.sortCode}`).join('\n')
            : '# Bank list could not be loaded.';

        const csvContent = [headers, exampleRow, bankListHeader, bankListContent].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', 'bulk_upload_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };


    return (
        <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold text-gray-700 mb-6">Verify Account Details</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="beneficiaryName" className="block text-sm font-medium text-gray-600 mb-1">Beneficiary Name</label>
                    <input
                        type="text"
                        id="beneficiaryName"
                        name="beneficiaryName"
                        value={formData.beneficiaryName}
                        onChange={handleChange}
                        className={`w-full px-4 py-2 border ${errors.beneficiaryName ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-secondary focus:border-secondary transition-colors`}
                        placeholder="e.g., John Doe"
                    />
                    {errors.beneficiaryName && <p className="text-red-500 text-xs mt-1">{errors.beneficiaryName}</p>}
                </div>

                <div>
                    <label htmlFor="bankName" className="block text-sm font-medium text-gray-600 mb-1">Bank Name</label>
                    <select
                        id="bankName"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleChange}
                        disabled={isBankDataLoading}
                        className={`w-full px-4 py-2 border ${errors.bankName ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-secondary focus:border-secondary transition-colors bg-white`}
                    >
                        {isBankDataLoading ? (
                           <option>Loading banks...</option>
                        ) : (
                            bankData.map(bank => <option key={bank.name} value={bank.name}>{bank.name}</option>)
                        )}
                    </select>
                    {errors.bankName && <p className="text-red-500 text-xs mt-1">{errors.bankName}</p>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-600 mb-1">Bank Account Number (NUBAN)</label>
                        <input
                            type="text"
                            id="accountNumber"
                            name="accountNumber"
                            value={formData.accountNumber}
                            onChange={handleChange}
                            maxLength={10}
                            className={`w-full px-4 py-2 border ${errors.accountNumber ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-secondary focus:border-secondary transition-colors`}
                            placeholder="10-digit number"
                        />
                         {errors.accountNumber && <p className="text-red-500 text-xs mt-1">{errors.accountNumber}</p>}
                    </div>
                     <div>
                        <label htmlFor="bvn" className="block text-sm font-medium text-gray-600 mb-1">Bank Verification Number (BVN)</label>
                        <input
                            type="text"
                            id="bvn"
                            name="bvn"
                            value={formData.bvn}
                            onChange={handleChange}
                            maxLength={11}
                            className={`w-full px-4 py-2 border ${errors.bvn ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-secondary focus:border-secondary transition-colors`}
                            placeholder="11-digit number"
                        />
                         {errors.bvn && <p className="text-red-500 text-xs mt-1">{errors.bvn}</p>}
                    </div>
                </div>

                <div className="pt-4 space-y-4">
                    <div className="flex items-center space-x-4">
                        <button
                            type="submit"
                            disabled={isVerifying || isBulkVerifying || isBankDataLoading}
                            className="w-full flex justify-center items-center bg-primary text-white font-bold py-3 px-4 rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {isVerifying ? <><Spinner /> Verifying...</> : 'Verify Account'}
                        </button>
                        <button
                            type="button"
                            onClick={handleBulkUploadClick}
                            disabled={isVerifying || isBulkVerifying || isBankDataLoading}
                            className="w-full flex justify-center items-center bg-white text-primary border border-primary font-bold py-3 px-4 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-200 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {isBulkVerifying ? <><Spinner /> Uploading...</> : 'Bulk Upload'}
                        </button>
                         <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".csv, text/csv"
                        />
                    </div>
                     <p className="text-center text-xs text-gray-500">
                        For bulk uploads, use a CSV file with headers.
                        <a href="#" onClick={handleDownloadTemplate} className="font-semibold text-accent hover:underline ml-1">
                            Download Template
                        </a>
                    </p>
                </div>
            </form>
        </div>
    );
};