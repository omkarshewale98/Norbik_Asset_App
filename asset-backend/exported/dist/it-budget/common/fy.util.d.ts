export declare const FY_WINDOW_YEARS = 10;
export interface FyInfo {
    code: string;
    label: string;
    startYear: number;
    startMonth: number;
    startDate: string;
    endDate: string;
}
export interface FyMonth {
    index: number;
    start: string;
    end: string;
    label: string;
    short: string;
}
export declare function fyStartMonth(pattern?: string | null): number;
export declare const ymd: (y: number, m: number, d: number) => string;
export declare function todayYmd(): string;
export declare function fyForStartYear(startYear: number, startMonth: number): FyInfo;
export declare function fyContaining(dateYmd: string, startMonth: number): FyInfo;
export declare function fyFromCode(code: string, startMonth: number): FyInfo | null;
export declare function fyOptions(startMonth: number, today?: string): FyInfo[];
export declare function fyMonths(fy: FyInfo): FyMonth[];
export declare function fyMonthIndexOf(dateYmd: string, fy: FyInfo): number;
export type PhasingMode = 'YEARLY' | 'HALF_YEARLY' | 'QUARTERLY' | 'MONTHLY';
export type PhasingMethod = 'EQUAL' | 'MANUAL';
export declare const PHASING_BUCKETS: Record<PhasingMode, number>;
export declare function bucketLabels(mode: PhasingMode, fy: FyInfo): string[];
export declare function equalSplit(amount: number, n: number): number[];
export declare function bucketsToMonths(buckets: number[], mode: PhasingMode): number[];
export declare function monthsToBuckets(months: number[], mode: PhasingMode): number[];
export declare function sumMoney(values: number[]): number;
export declare function roundMoney(v: number): number;
export type PeriodType = 'YEAR' | 'HALF' | 'QUARTER' | 'MONTH' | 'YTD' | 'CUSTOM';
export interface PeriodInput {
    type?: PeriodType;
    index?: number;
    from?: string;
    to?: string;
}
export interface PeriodRange {
    type: PeriodType;
    index?: number;
    from: string;
    to: string;
    label: string;
    monthWeights: number[];
}
export declare function resolvePeriod(fy: FyInfo, input?: PeriodInput, today?: string): PeriodRange;
