import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { BudgetConsumptionService, ManualEntryInput } from './budget-consumption.service';
export declare class BudgetConsumptionController {
    private readonly service;
    private readonly dataSource;
    constructor(service: BudgetConsumptionService, dataSource: DataSource);
    private ctx;
    summary(req: Request, body: any): Promise<{
        status: import("@nestjs/common").HttpStatus;
        message: string;
        data: {
            plan: {
                plan_id: number;
                fy_code: string;
                fy_label: string;
                fy_start_date: string;
                fy_end_date: string;
                plan_name: string;
                status_code: number;
                status_name: string;
                status_color: string;
                version_label: string;
                owner_name: string;
                phasing_mode: import("../common/fy.util").PhasingMode;
                is_locked: boolean;
                closed_at: string;
                closed_by_name: string;
            };
            period: {
                type: import("../common/fy.util").PeriodType;
                index: number;
                from: string;
                to: string;
                label: string;
            };
            cards: {
                budget: number;
                consumed: number;
                available: number;
                excess: number;
                utilisation_pct: number;
                unbudgeted_amount: number;
                unbudgeted_count: number;
                capex: {
                    budget: number;
                    consumed: number;
                    utilisation_pct: number;
                    share_of_budget_pct: number;
                };
                opex: {
                    budget: number;
                    consumed: number;
                    utilisation_pct: number;
                    share_of_budget_pct: number;
                };
            };
            annual: {
                budget: number;
                consumed: number;
                available: number;
                utilisation_pct: number;
            };
            phasing_assumed: boolean;
            line_count: number;
        };
    }>;
    trend(req: Request, body: any): Promise<{
        status: import("@nestjs/common").HttpStatus;
        message: string;
        data: {
            fy_label: string;
            phasing_assumed: boolean;
            months: {
                index: number;
                label: string;
                short: string;
                start: string;
                end: string;
                is_future: boolean;
                planned: number;
                planned_capex: number;
                planned_opex: number;
                consumed: number;
                consumed_capex: number;
                consumed_opex: number;
                unbudgeted: number;
                cumulative_planned: number;
                cumulative_consumed: number;
                change_vs_prev_pct: number;
            }[];
        };
    }>;
    lines(req: Request, body: any): Promise<{
        success: boolean;
        message: string;
        data: {
            line_id: number;
            line_type: "ITEM" | "SERVICE";
            line_name: string;
            asset_item_id: number;
            main_category_name: string;
            sub_category_name: string;
            budget_category_id: number;
            budget_category_name: string;
            budget_category_color: string;
            ownership_status_type_id: number;
            ownership_status_type_name: string;
            expense_nature: "capex" | "NA" | "opex";
            annual_amount: number;
            planned_period: number;
            consumed_period: number;
            consumed_fy: number;
            available_period: number;
            available_fy: number;
            excess_period: number;
            utilisation_pct: number;
            entry_count: number;
            phasing_assumed: boolean;
        }[];
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
    lineDetails(req: Request, body: any): Promise<{
        status: import("@nestjs/common").HttpStatus;
        message: string;
        data: {
            line: {
                quantity: number;
                unit_estimate: number;
                justification: string;
                line_id: number;
                line_type: "ITEM" | "SERVICE";
                line_name: string;
                asset_item_id: number;
                main_category_name: string;
                sub_category_name: string;
                budget_category_id: number;
                budget_category_name: string;
                budget_category_color: string;
                ownership_status_type_id: number;
                ownership_status_type_name: string;
                expense_nature: "capex" | "NA" | "opex";
                annual_amount: number;
                planned_period: number;
                consumed_period: number;
                consumed_fy: number;
                available_period: number;
                available_fy: number;
                excess_period: number;
                utilisation_pct: number;
                entry_count: number;
                phasing_assumed: boolean;
            };
            period: {
                type: import("../common/fy.util").PeriodType;
                from: string;
                to: string;
                label: string;
            };
            phasing_assumed: boolean;
            months: {
                index: number;
                label: string;
                short: string;
                in_period: boolean;
                planned: number;
                consumed: number;
            }[];
            assets: any[];
            manual_entries: import("../common/budget-data").ManualRow[];
            plan_locked: boolean;
        };
    }>;
    unbudgeted(req: Request, body: any): Promise<{
        success: boolean;
        message: string;
        data: {
            procurement_id: number;
            asset_id: number;
            stock_id: number;
            asset_stocks_unique_id: number;
            asset_item_id: number;
            asset_item_name: string;
            ownership_status_type_name: string;
            expense_nature: string;
            purchase_date: string;
            invoice_no: string;
            vendor_name: string;
            is_renewal: boolean;
            date_assumed: boolean;
            amount: number;
            reason: string;
        }[];
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
        totals: {
            purchases: number;
            items: number;
            amount: number;
            capex_amount: number;
            opex_amount: number;
        };
        period: import("../common/fy.util").PeriodRange;
        plan: {
            plan_id: number;
            fy_label: string;
            fy_start_date: string;
            fy_end_date: string;
        };
    }>;
    exportUnbudgeted(req: Request, res: Response, body: any): Promise<void>;
    manualList(req: Request, body: any): Promise<{
        success: boolean;
        message: string;
        data: {
            line_name: string;
            budget_category_name: string;
            expense_nature: string;
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
        }[];
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
    manualCreate(req: Request, body: ManualEntryInput): Promise<{
        status: import("@nestjs/common").HttpStatus;
        message: string;
        data: {
            entry_id: number;
        };
    }>;
    manualUpdate(req: Request, body: ManualEntryInput): Promise<{
        status: import("@nestjs/common").HttpStatus;
        message: string;
    }>;
    manualDelete(req: Request, body: {
        entry_id: number;
    }): Promise<{
        status: import("@nestjs/common").HttpStatus;
        message: string;
    }>;
    vendors(req: Request): Promise<{
        status: number;
        message: string;
        data: any;
    }>;
    export(req: Request, res: Response, body: any): Promise<void>;
}
