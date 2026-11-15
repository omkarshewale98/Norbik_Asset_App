import { HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BudgetContext } from '../common/budget-context';
import { PhasingMode } from '../common/fy.util';
import { ListInput } from '../common/budget-list.util';
import { ExportFormat } from '../common/budget-export.util';
import { BudgetPlanInput, BudgetReviseInput } from './budget-plan.types';
export declare class BudgetPlanService {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    lookups(ctx: BudgetContext): Promise<{
        status: HttpStatus;
        message: string;
        data: {
            financial_year: {
                pattern: string;
                start_month: number;
                window_years: number;
                options: {
                    value: string;
                    label: string;
                    start_date: string;
                    end_date: string;
                    is_current_period: boolean;
                    has_plan: boolean;
                    plan_id: number;
                    plan_status_code: number;
                    plan_status_name: any;
                }[];
            };
            categories: any;
            ownership_types: any;
            items: any;
            users: any;
            current_user_id: number;
            phasing_modes: {
                value: PhasingMode;
                buckets: number;
            }[];
            gst_note: string;
        };
    }>;
    private allPlanRows;
    listPlans(ctx: BudgetContext, input: ListInput): Promise<{
        success: boolean;
        message: string;
        data: Record<string, any>[];
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
    }>;
    selector(ctx: BudgetContext): Promise<{
        status: HttpStatus;
        message: string;
        data: {
            default_plan_id: any;
            plans: any;
        };
    }>;
    getPlan(ctx: BudgetContext, planId: number): Promise<{
        status: HttpStatus;
        message: string;
        data: {
            plan: {
                version_label: string;
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
                phasing_method: "EQUAL" | "MANUAL" | null;
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
            };
            fy: {
                code: string;
                label: string;
                start_date: string;
                end_date: string;
            };
            months: {
                index: number;
                label: string;
                short: string;
            }[];
            bucket_labels: string[];
            lines: {
                phasing: number[];
                consumed_amount: number;
                line_id: number;
                plan_id: number;
                line_type: "ITEM" | "SERVICE";
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
                expense_nature: "capex" | "opex" | "NA";
                annual_amount: number;
                quantity: number | null;
                unit_estimate: number | null;
                justification: string | null;
                sort_order: number;
                is_active: number;
                added_in_version: number | null;
                removed_in_version: number | null;
                phasing_months: number[];
            }[];
        };
    }>;
    private validateHeader;
    private assertOwner;
    private buildLines;
    private totals;
    private insertLine;
    private writePhasing;
    private snapshot;
    private assertLockVersion;
    private assertNotLocked;
    create(ctx: BudgetContext, input: BudgetPlanInput): Promise<{
        status: HttpStatus;
        message: string;
        data: {
            plan: {
                version_label: string;
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
                phasing_method: "EQUAL" | "MANUAL" | null;
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
            };
            fy: {
                code: string;
                label: string;
                start_date: string;
                end_date: string;
            };
            months: {
                index: number;
                label: string;
                short: string;
            }[];
            bucket_labels: string[];
            lines: {
                phasing: number[];
                consumed_amount: number;
                line_id: number;
                plan_id: number;
                line_type: "ITEM" | "SERVICE";
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
                expense_nature: "capex" | "opex" | "NA";
                annual_amount: number;
                quantity: number | null;
                unit_estimate: number | null;
                justification: string | null;
                sort_order: number;
                is_active: number;
                added_in_version: number | null;
                removed_in_version: number | null;
                phasing_months: number[];
            }[];
        };
    }>;
    updateDraft(ctx: BudgetContext, input: BudgetPlanInput): Promise<{
        status: HttpStatus;
        message: string;
        data: {
            plan: {
                version_label: string;
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
                phasing_method: "EQUAL" | "MANUAL" | null;
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
            };
            fy: {
                code: string;
                label: string;
                start_date: string;
                end_date: string;
            };
            months: {
                index: number;
                label: string;
                short: string;
            }[];
            bucket_labels: string[];
            lines: {
                phasing: number[];
                consumed_amount: number;
                line_id: number;
                plan_id: number;
                line_type: "ITEM" | "SERVICE";
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
                expense_nature: "capex" | "opex" | "NA";
                annual_amount: number;
                quantity: number | null;
                unit_estimate: number | null;
                justification: string | null;
                sort_order: number;
                is_active: number;
                added_in_version: number | null;
                removed_in_version: number | null;
                phasing_months: number[];
            }[];
        };
    }>;
    deleteDraft(ctx: BudgetContext, planId: number): Promise<{
        status: HttpStatus;
        message: string;
    }>;
    publish(ctx: BudgetContext, input: {
        plan_id: number;
        lock_version?: number;
    }): Promise<{
        status: HttpStatus;
        message: string;
        data: {
            plan: {
                version_label: string;
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
                phasing_method: "EQUAL" | "MANUAL" | null;
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
            };
            fy: {
                code: string;
                label: string;
                start_date: string;
                end_date: string;
            };
            months: {
                index: number;
                label: string;
                short: string;
            }[];
            bucket_labels: string[];
            lines: {
                phasing: number[];
                consumed_amount: number;
                line_id: number;
                plan_id: number;
                line_type: "ITEM" | "SERVICE";
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
                expense_nature: "capex" | "opex" | "NA";
                annual_amount: number;
                quantity: number | null;
                unit_estimate: number | null;
                justification: string | null;
                sort_order: number;
                is_active: number;
                added_in_version: number | null;
                removed_in_version: number | null;
                phasing_months: number[];
            }[];
        };
    }>;
    revise(ctx: BudgetContext, input: BudgetReviseInput): Promise<{
        status: HttpStatus;
        message: string;
        data: {
            plan: {
                version_label: string;
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
                phasing_method: "EQUAL" | "MANUAL" | null;
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
            };
            fy: {
                code: string;
                label: string;
                start_date: string;
                end_date: string;
            };
            months: {
                index: number;
                label: string;
                short: string;
            }[];
            bucket_labels: string[];
            lines: {
                phasing: number[];
                consumed_amount: number;
                line_id: number;
                plan_id: number;
                line_type: "ITEM" | "SERVICE";
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
                expense_nature: "capex" | "opex" | "NA";
                annual_amount: number;
                quantity: number | null;
                unit_estimate: number | null;
                justification: string | null;
                sort_order: number;
                is_active: number;
                added_in_version: number | null;
                removed_in_version: number | null;
                phasing_months: number[];
            }[];
        };
    }>;
    previewRevision(ctx: BudgetContext, input: BudgetReviseInput): Promise<{
        status: HttpStatus;
        message: string;
        data: {
            revision_type: "REALLOCATION" | "INCREASED" | "REDUCED";
            next_version_label: string;
            total_before: number;
            total_after: number;
            net_change: number;
            capex_after: number;
            opex_after: number;
            changes: {
                line_id: number;
                line_name: string;
                change_type: string;
                amount_before: number;
                amount_after: any;
                consumed_amount: number;
            }[];
        };
    }>;
    setCurrent(ctx: BudgetContext, input: {
        plan_id: number;
        close_previous?: boolean;
    }, canClose: boolean): Promise<{
        status: HttpStatus;
        message: string;
    }>;
    close(ctx: BudgetContext, input: {
        plan_id: number;
        confirm_before_end?: boolean;
    }): Promise<{
        status: HttpStatus;
        message: string;
    }>;
    reopen(ctx: BudgetContext, input: {
        plan_id: number;
    }): Promise<{
        status: HttpStatus;
        message: string;
    }>;
    lock(ctx: BudgetContext, input: {
        plan_id: number;
    }): Promise<{
        status: HttpStatus;
        message: string;
    }>;
    versions(ctx: BudgetContext, planId: number): Promise<{
        status: HttpStatus;
        message: string;
        data: any;
    }>;
    versionSnapshot(ctx: BudgetContext, planId: number, versionNo: number): Promise<{
        status: HttpStatus;
        message: string;
        data: any;
    }>;
    changesLog(ctx: BudgetContext, planId: number): Promise<{
        status: HttpStatus;
        message: string;
        data: {
            plan: {
                plan_id: number;
                fy_label: string;
                version_label: string;
                status_name: string;
            };
            versions: any;
        };
    }>;
    activity(ctx: BudgetContext, planId: number): Promise<{
        status: HttpStatus;
        message: string;
        data: any;
    }>;
    exportList(ctx: BudgetContext, input: ListInput & {
        format?: ExportFormat;
        selectedIds?: any[];
        isSelectAll?: boolean;
        excludeIds?: any[];
        visible_columns?: any;
        column_order?: string[];
    }): Promise<Buffer<ArrayBufferLike>>;
    exportPlan(ctx: BudgetContext, planId: number, format: ExportFormat): Promise<Buffer<ArrayBufferLike>>;
}
