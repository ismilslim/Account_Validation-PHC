
export enum BankNetworkStatus {
    OPERATIONAL = 'Operational',
    DEGRADED = 'Degraded Performance',
    OFFLINE = 'Offline',
}

export interface BankStatus {
    name: string;
    status: BankNetworkStatus;
}

export interface AccountDetails {
    beneficiaryName: string;
    bankName: string;
    accountNumber: string;
    bvn: string;
}

export interface VerificationResultData {
    success: boolean;
    message: string;
    data: AccountDetails | null;
}

export interface BankData {
    name: string;
    sortCode: string;
}
