import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { BudgetCategoryInput, BudgetCategoryService } from './budget-category.service';
export declare class BudgetCategoryController {
    private readonly service;
    private readonly dataSource;
    constructor(service: BudgetCategoryService, dataSource: DataSource);
    private ctx;
    list(req: Request, body: any): Promise<{
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
    dropdown(req: Request): Promise<{
        status: import("@nestjs/common").HttpStatus;
        message: string;
        data: any;
    }>;
    fetchOne(req: Request, body: {
        budget_category_id: number;
    }): Promise<{
        status: import("@nestjs/common").HttpStatus;
        message: string;
        data: any;
    }>;
    create(req: Request, body: BudgetCategoryInput): Promise<{
        status: import("@nestjs/common").HttpStatus;
        message: string;
        data: any;
    }>;
    update(req: Request, body: BudgetCategoryInput): Promise<{
        status: import("@nestjs/common").HttpStatus;
        message: string;
        data: any;
    }>;
    enable(req: Request, body: {
        ids: number[];
    }): Promise<{
        status: import("@nestjs/common").HttpStatus;
        message: string;
    }>;
    disable(req: Request, body: {
        ids: number[];
    }): Promise<{
        status: import("@nestjs/common").HttpStatus;
        message: string;
    }>;
    remove(req: Request, body: {
        ids: number[];
    }): Promise<{
        status: import("@nestjs/common").HttpStatus;
        message: string;
        data: {
            deleted: any;
            blocked: any;
        };
    }>;
    export(req: Request, res: Response, body: any): Promise<void>;
}
