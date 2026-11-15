import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { DataSource } from 'typeorm';
export interface BudgetContext {
    schema: string;
    userId: number;
    roleId: number;
    userName: string;
    ip?: string;
}
export declare function resolveSchema(req: Request): string;
export declare function T(schema: string, table: string): string;
export declare function resolveBudgetContext(dataSource: DataSource, req: Request): Promise<BudgetContext>;
export declare class BudgetError extends BadRequestException {
    constructor(code: string, message: string, details?: any);
}
