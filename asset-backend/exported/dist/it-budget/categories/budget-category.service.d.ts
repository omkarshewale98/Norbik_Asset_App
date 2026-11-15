import { HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BudgetContext } from '../common/budget-context';
import { ListInput } from '../common/budget-list.util';
export interface BudgetCategoryInput {
    budget_category_id?: number;
    budget_category_name?: string;
    budget_category_code?: string;
    budget_category_description?: string;
    budget_category_color?: string;
}
export declare class BudgetCategoryService {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    private baseSelect;
    list(ctx: BudgetContext, input: ListInput): Promise<{
        success: boolean;
        message: string;
        data: any[];
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
    dropdown(ctx: BudgetContext): Promise<{
        status: HttpStatus;
        message: string;
        data: any;
    }>;
    fetchOne(ctx: BudgetContext, id: number): Promise<{
        status: HttpStatus;
        message: string;
        data: any;
    }>;
    private normalise;
    private validate;
    private uniqueCode;
    create(ctx: BudgetContext, input: BudgetCategoryInput): Promise<{
        status: HttpStatus;
        message: string;
        data: any;
    }>;
    update(ctx: BudgetContext, input: BudgetCategoryInput): Promise<{
        status: HttpStatus;
        message: string;
        data: any;
    }>;
    private ids;
    setActive(ctx: BudgetContext, input: {
        ids?: any[];
    }, active: boolean): Promise<{
        status: HttpStatus;
        message: string;
    }>;
    remove(ctx: BudgetContext, input: {
        ids?: any[];
    }): Promise<{
        status: HttpStatus;
        message: string;
        data: {
            deleted: any;
            blocked: any;
        };
    }>;
    exportExcel(ctx: BudgetContext, input: ListInput & {
        selectedIds?: any[];
        isSelectAll?: boolean;
        excludeIds?: any[];
        visible_columns?: any;
        column_order?: string[];
    }): Promise<Buffer<ArrayBufferLike>>;
}
