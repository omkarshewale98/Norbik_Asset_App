export interface ListInput {
    search?: {
        column?: string;
        values?: string[];
    }[];
    filters?: {
        column: string;
        values: any[];
    }[];
    sort?: {
        column: string;
        order?: 'ASC' | 'DESC' | 'asc' | 'desc';
    }[];
    pagination?: {
        limit?: number;
    };
    cursor?: string | null;
    direction?: 'next' | 'prev';
    page?: number;
    jumpToLast?: boolean;
    [k: string]: any;
}
export declare function searchText(input: ListInput): string;
export declare function filterValues(input: ListInput, column: string): string[];
export declare function paginate<T extends Record<string, any>>(rows: T[], input: ListInput, defaultSort: {
    column: string;
    order: 'ASC' | 'DESC';
}, sortable: string[]): {
    data: T[];
    meta: {
        total: number;
        totalPages: number;
        currentPage: number;
        limit: number;
        count: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
        startCursor: string;
        endCursor: string;
        nextCursor: string;
        prevCursor: string;
    };
};
export declare const num: (v: any) => number;
export declare const pct: (part: number, whole: number) => number | null;
