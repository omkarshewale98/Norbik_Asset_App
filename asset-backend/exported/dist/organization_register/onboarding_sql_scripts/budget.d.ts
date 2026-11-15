import { DataSource } from 'typeorm';
export declare class BudgetTablesScript {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    createBudgetTables(schemaName: string): Promise<void>;
}
