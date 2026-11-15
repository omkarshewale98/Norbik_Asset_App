import { DataSource } from 'typeorm';
export declare class assetLocationScript {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    createAssetLocationScriptTable(schemaName: string): Promise<void>;
}
