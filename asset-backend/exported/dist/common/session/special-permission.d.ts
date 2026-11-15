import { Request } from 'express';
import { EntityManager } from 'typeorm';
export declare const SUPER_ADMIN_ROLE_ID = 1;
export interface AuthContext {
    sessionId: string;
    systemUserId: number;
    tenantUserId: number;
    roleId: number | null;
    branchAccess: number[];
    organizationSchema: string;
    organizationId?: number;
}
export declare function requireAuthContext(req: Request): AuthContext;
export declare function roleHasSpecialPermission(manager: EntityManager, schema: string, roleId: number | null, attrKey: string): Promise<boolean>;
export declare function assertSpecialPermission(manager: EntityManager, req: Request, attrKey: string, message?: string): Promise<AuthContext>;
export declare function resolveTenantUserAccount(manager: EntityManager, schema: string, tenantUserId: number): Promise<number | null>;
