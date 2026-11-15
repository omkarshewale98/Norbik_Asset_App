import { DataSource } from 'typeorm';
export declare class DiscoverySaasTablesScript {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    createDiscoverySaasTables(schemaName: string): Promise<void>;
}
