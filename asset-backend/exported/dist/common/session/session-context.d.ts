import { EntityManager } from 'typeorm';
export interface TenantUserContext {
    tenantUserId: number;
    roleId: number | null;
    branchAccess: number[];
    roleName?: string | null;
    isCompulsary?: boolean;
}
export declare function invalidateTenantUserContext(sessionId?: string | null): void;
export declare function invalidateAllTenantUserContexts(): void;
export declare function loadTenantUserContext(manager: EntityManager, sessionId: string, systemUserId: number, schemaName: string): Promise<TenantUserContext | null>;
export interface RefreshHashes {
    current?: string;
    previous?: string;
    rotatedAt?: number;
}
export declare function parseRefreshHashes(value?: string | null): RefreshHashes;
export declare function serialiseRefreshHashes(h: RefreshHashes): string;
