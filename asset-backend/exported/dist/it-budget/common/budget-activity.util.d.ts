import { DataSource, EntityManager } from 'typeorm';
import { BudgetContext } from './budget-context';
export interface ActivityEntry {
    plan_id?: number | null;
    entity_type: 'PLAN' | 'LINE' | 'MANUAL_ENTRY' | 'CATEGORY' | 'EXPORT';
    entity_id?: number | null;
    action: string;
    description?: string;
    before?: any;
    after?: any;
}
export declare function logBudgetActivity(runner: DataSource | EntityManager, ctx: BudgetContext, e: ActivityEntry): Promise<void>;
