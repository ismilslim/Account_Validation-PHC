
import { GoogleGenAI, Type } from "@google/genai";
import { BankStatus, BankNetworkStatus, AccountDetails, VerificationResultData, BankData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

let cachedBankData: BankData[] | null = null;

export const fetchBankData = async (): Promise<BankData[]> => {
    if (cachedBankData) {
        return cachedBankData;
    }

    const prompt = "List the top 25 commercial banks in Nigeria with their official sort codes. Respond with only a JSON array of objects, where each object has a 'name' (string) and 'sortCode' (string) property.";

    const bankDataSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                sortCode: { type: Type.STRING }
            },
            required: ['name', 'sortCode']
        }
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: bankDataSchema,
            },
        });

        const jsonString = response.text;
        const bankData = JSON.parse(jsonString) as BankData[];

        if (!Array.isArray(bankData) || !bankData.every(item => typeof item.name === 'string' && typeof item.sortCode === 'string')) {
             throw new Error("AI response for bank data is not in the expected format.");
        }

        cachedBankData = bankData.sort((a, b) => a.name.localeCompare(b.name));
        return cachedBankData;

    } catch (error) {
        console.error("Error fetching bank data from Gemini API:", error);
        const fallbackBanks: BankData[] = [
            { name: "Access Bank", sortCode: "044150149" },
            { name: "Citibank", sortCode: "023150005" },
            { name: "Ecobank Nigeria", sortCode: "050150311" },
            { name: "Fidelity Bank", sortCode: "0701504 Fidelity" },
            { name: "First Bank of Nigeria", sortCode: "011151003" },
            { name: "First City Monument Bank (FCMB)", sortCode: "214150018" },
            { name: "Guaranty Trust Holding Company (GTCO)", sortCode: "058152052" },
            { name: "Jaiz Bank", sortCode: "301080020" },
            { name: "Keystone Bank", sortCode: "082150017" },
            { name: "Kuda Bank", sortCode: "502110004" },
            { name: "Opay", sortCode: "999992" },
            { name: "Palmpay", sortCode: "999991" },
            { name: "Polaris Bank", sortCode: "076151006" },
            { name: "Providus Bank", sortCode: "101150013" },
            { name: "Stanbic IBTC Bank", sortCode: "221150018" },
            { name: "Standard Chartered Bank", sortCode: "068150015" },
            { name: "Sterling Bank", sortCode: "232150016" },
            { name: "SunTrust Bank", sortCode: "100150017" },
            { name: "TAJBank", sortCode: "302080015" },
            { name: "Union Bank of Nigeria", sortCode: "032150002" },
            { name: "United Bank for Africa (UBA)", sortCode: "033153592" },
            { name: "Unity Bank", sortCode: "215150015" },
            { name: "Wema Bank", sortCode: "035150103" },
            { name: "Zenith Bank", sortCode: "057150013" },
        ];
        cachedBankData = fallbackBanks.sort((a, b) => a.name.localeCompare(b.name));
        return cachedBankData;
    }
};


// Mock fetching bank statuses
export const fetchBankStatuses = async (): Promise<BankStatus[]> => {
    const banksData = await fetchBankData();
    const banks = banksData.map(b => b.name);
    return new Promise(resolve => {
        setTimeout(() => {
            const statuses = banks.map(name => {
                const rand = Math.random();
                let status: BankNetworkStatus;
                if (rand < 0.85) {
                    status = BankNetworkStatus.OPERATIONAL;
                } else if (rand < 0.95) {
                    status = BankNetworkStatus.DEGRADED;
                } else {
                    status = BankNetworkStatus.OFFLINE;
                }
                return { name, status };
            });
            resolve(statuses);
        }, 500);
    });
};

const verificationSchema = {
    type: Type.OBJECT,
    properties: {
        success: { type: Type.BOOLEAN },
        message: { type: Type.STRING },
        data: {
            type: Type.OBJECT,
            properties: {
                beneficiaryName: { type: Type.STRING },
                bankName: { type: Type.STRING },
                accountNumber: { type: Type.STRING },
                bvn: { type: Type.STRING },
            },
            nullable: true
        }
    }
};


export const verifyAccountDetails = async (details: AccountDetails): Promise<VerificationResultData> => {
    const prompt = `
        You are a mock Nigerian bank account verification API. Your task is to validate the provided banking details.
        
        Rules for validation:
        1.  If the account number has less than 10 digits or the BVN has less than 11 digits, fail the verification with a specific message.
        2.  If the beneficiary name contains numbers or special characters (except spaces and hyphens), fail the verification.
        3.  For simulation purposes, if the account number starts with '1' (e.g., 1234567890), treat it as an invalid/non-existent account and fail the verification.
        4.  For simulation purposes, if the BVN starts with '1' (e.g., 11223344556), treat it as an invalid BVN and fail the verification.
        5.  In all other cases, assume the verification is successful. The returned beneficiary name should be a slightly more formal version of the input name (e.g., "John Doe" becomes "Doe, John Adewale").
        6.  The success message should be "Account details verified successfully."
        7.  The failure message should clearly state the reason (e.g., "Invalid account number.", "BVN does not match records.", "Beneficiary name seems invalid.").

        User Input:
        - Beneficiary Name: ${details.beneficiaryName}
        - Bank Name: ${details.bankName}
        - Account Number: ${details.accountNumber}
        - BVN: ${details.bvn}

        Respond with a JSON object that strictly follows the provided schema.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: verificationSchema,
            },
        });

        const jsonString = response.text;
        const result = JSON.parse(jsonString) as VerificationResultData;

        // Final check to ensure the structure is correct
        if (typeof result.success !== 'boolean' || typeof result.message !== 'string') {
             throw new Error("AI response is not in the expected format.");
        }

        return result;

    } catch (error) {
        console.error("Error verifying account details with Gemini API:", error);
        throw new Error("The verification service is currently unavailable. Please try again later.");
    }
};
