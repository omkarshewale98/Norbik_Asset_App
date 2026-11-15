import { Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
export declare function normaliseSearchPath(value: string): string | null;
export declare function parseSetSearchPath(sql: unknown): string | null;
export declare function desiredSearchPath(): string;
export declare function isTenantSearchPathGuardActive(): boolean;
export declare function installTenantSearchPathGuard(dataSource: DataSource, logger?: Logger): boolean;
export declare class TenantSearchPathService implements OnApplicationBootstrap {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    onApplicationBootstrap(): void;
}
