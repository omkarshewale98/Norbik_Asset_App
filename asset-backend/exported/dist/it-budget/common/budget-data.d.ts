import { DataSource, EntityManager } from 'typeorm';
import { FyInfo, PhasingMode } from './fy.util';
type Runner = DataSource | EntityManager;
export declare const STATUS: {
    readonly DRAFT: 10;
    readonly SCHEDULED: 20;
    readonly CURRENT: 30;
    readonly CLOSED: 40;
};
export declare function orgFyStartMonth(runner: Runner, schema: string): Promise<{
    startMonth: number;
    pattern: string;
}>;
export declare function orgName(runner: Runner, schema: string): Promise<string>;
export interface PlanRow {
    plan_id: number;
    fy_code: string;
    fy_label: string;
    fy_start_date: string;
    fy_end_date: string;
    fy_pattern: string;
    plan_name: string;
    owner_user_id: number;
    owner_name: string;
    status_code: number;
    status_key: string;
    status_name: string;
    status_color: string;
    current_version: number;
    phasing_mode: PhasingMode;
    phasing_method: 'EQUAL' | 'MANUAL' | null;
    total_amount: number;
    capex_amount: number;
    opex_amount: number;
    remarks: string;
    is_locked: boolean;
    published_at: string;
    published_by_name: string;
    set_current_at: string;
    closed_at: string;
    closed_by_name: string;
    lock_version: number;
    created_at: string;
    created_by_name: string;
    updated_at: string;
    updated_by_name: string;
}
export declare function planSelect(schema: string): string;
export declare function normalisePlan(r: any): PlanRow;
export declare function loadPlan(runner: Runner, schema: string, planId: number): Promise<PlanRow>;
export declare function planFy(plan: Pick<PlanRow, 'fy_start_date'>): FyInfo;
export interface LineRow {
    line_id: number;
    plan_id: number;
    line_type: 'ITEM' | 'SERVICE';
    asset_item_id: number | null;
    service_name: string | null;
    line_name: string;
    main_category_name: string | null;
    sub_category_name: string | null;
    budget_category_id: number;
    budget_category_name: string;
    budget_category_color: string | null;
    ownership_status_type_id: number;
    ownership_status_type_name: string;
    ownership_color: string | null;
    expense_nature: 'capex' | 'opex' | 'NA';
    annual_amount: number;
    quantity: number | null;
    unit_estimate: number | null;
    justification: string | null;
    sort_order: number;
    is_active: number;
    added_in_version: number | null;
    removed_in_version: number | null;
    phasing_months: number[];
}
export declare function loadLines(runner: Runner, schema: string, planId: number, includeInactive?: boolean): Promise<LineRow[]>;
export declare function plannedMonths(line: Pick<LineRow, 'annual_amount' | 'phasing_months'>): {
    months: number[];
    assumed: boolean;
};
export interface PurchaseRow {
    plan_id: number;
    procurement_id: number;
    asset_id: number;
    asset_item_id: number;
    asset_item_name: string;
    ownership_status_id: number | null;
    ownership_status_type_name: string | null;
    ownership_nature: string | null;
    purchase_date: string;
    amount: number;
    invoice_no: string | null;
    bill_no: string | null;
    vendor_id: number | null;
    vendor_name: string | null;
    is_renewal: boolean;
    stock_id: number | null;
    first_serial_id: number | null;
    date_assumed: boolean;
    line_id: number | null;
}
export declare function loadPurchases(runner: Runner, schema: string, planIds: number[], from?: string | null, to?: string | null): Promise<PurchaseRow[]>;
export interface ManualRow {
    entry_id: number;
    plan_id: number;
    line_id: number;
    entry_date: string;
    amount: number;
    gst_amount: number | null;
    description: string;
    vendor_id: number | null;
    vendor_name: string | null;
    reference_no: string | null;
    created_by_name: string;
    created_at: string;
    updated_by_name: string;
    updated_at: string;
}
export declare function loadManual(runner: Runner, schema: string, planIds: number[], from?: string | null, to?: string | null, lineId?: number | null): Promise<ManualRow[]>;
export declare function consumedByPlan(runner: Runner, schema: string, planIds: number[]): Promise<Map<number, {
    consumed: number;
    unbudgeted: number;
    unbudgetedCount: number;
}>>;
export declare function consumedByLine(runner: Runner, schema: string, planId: number): Promise<Map<number, number>>;
export declare function monthIndexSafe(dateYmd: string, fy: FyInfo): number;
export {};
