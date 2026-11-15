import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
export type BudgetSubmodule = 'BUDGET_SETUP' | 'BUDGET_CONSUMPTION' | 'BUDGET_CATEGORY';
export type BudgetAction = 'ADD' | 'VIEW' | 'EDIT' | 'DELETE' | 'EXPORT' | 'TOGGLE';
export interface BudgetPermissionRequirement {
    submodule: BudgetSubmodule;
    action?: BudgetAction;
    special?: string;
    anyOf?: {
        submodule: BudgetSubmodule;
        action: BudgetAction;
    }[];
}
export declare const BUDGET_PERMISSION_META = "it_budget_permission_requirement";
export declare const BudgetPermission: (req: BudgetPermissionRequirement) => import("@nestjs/common").CustomDecorator<string>;
export declare function roleHasBudgetAction(ds: DataSource, schema: string, roleId: number, submodule: BudgetSubmodule, action: BudgetAction): Promise<boolean>;
export declare function roleHasBudgetSpecial(ds: DataSource, schema: string, roleId: number, submodule: BudgetSubmodule, attrKey: string): Promise<boolean>;
export declare class BudgetPermissionGuard implements CanActivate {
    private readonly reflector;
    private readonly dataSource;
    constructor(reflector: Reflector, dataSource: DataSource);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
