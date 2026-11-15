import type { NextFunction, Request, Response } from 'express';
export declare const APP_ID: string;
export declare const IDENTITY_COOKIES: readonly ["system_user_id", "main_user_id", "organization_id", "x-organization-schema", "role_id", "permissions", "permissionToken", "branch_access", "profile_image"];
export declare const SESSION_COOKIES: readonly ["jwtToken", "jwt_refresh_token", "session_id"];
export interface SessionClaims {
    userId: number;
    organizationSchema: string;
    orgId?: number;
    sid?: string;
    app?: string;
    iat?: number;
    exp?: number;
    expired?: boolean;
}
export declare function readAccessClaims(token: string, opts?: {
    allowExpired?: boolean;
    secretEnv?: string;
}): Promise<SessionClaims | null>;
export type BindingResult = {
    ok: true;
    claims: SessionClaims;
} | {
    ok: false;
    reason: string;
};
export declare function checkCookieBinding(cookies: Record<string, string | undefined>, claims: SessionClaims | null, expectedApp?: string): BindingResult;
export declare function sessionFingerprint(sessionId?: string | null): string | null;
export declare function hashRefreshToken(token: string): string;
export declare function stripRequestCookies(req: Request, names: readonly string[]): void;
export declare function overrideRequestCookies(req: Request, values: Record<string, string | undefined | null>): void;
export declare function sessionBindingMiddleware(): (req: Request, _res: Response, next: NextFunction) => Promise<void>;
