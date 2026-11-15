import { PhasingMethod, PhasingMode } from '../common/fy.util';
export interface BudgetLineInput {
    line_id?: number | null;
    line_type: 'ITEM' | 'SERVICE';
    asset_item_id?: number | null;
    service_name?: string | null;
    budget_category_id: number;
    ownership_status_type_id: number;
    annual_amount: number;
    quantity?: number | null;
    unit_estimate?: number | null;
    justification?: string | null;
    phasing?: number[] | null;
}
export interface BudgetPlanInput {
    plan_id?: number;
    fy_code?: string;
    plan_name?: string | null;
    owner_user_id?: number;
    remarks?: string | null;
    phasing_mode?: PhasingMode;
    phasing_method?: PhasingMethod | null;
    lines?: BudgetLineInput[];
    lock_version?: number;
}
export interface BudgetReviseInput extends BudgetPlanInput {
    plan_id: number;
    reason: string;
}
export declare const REVISION_TYPES: readonly ["INITIAL", "REALLOCATION", "INCREASED", "REDUCED"];
export type RevisionType = (typeof REVISION_TYPES)[number];
export type ChangeType = 'ADDED' | 'REMOVED' | 'INCREASED' | 'REDUCED' | 'REALLOCATED' | 'PHASING_CHANGED' | 'ATTRIBUTE_CHANGED';
export declare const MAX_LINES = 500;
export declare const MAX_AMOUNT = 999999999999.99;
