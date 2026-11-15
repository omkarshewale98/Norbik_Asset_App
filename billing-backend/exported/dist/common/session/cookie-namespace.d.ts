import type { NextFunction, Request, Response } from 'express';
export declare const AUTH_COOKIE_NAMES: readonly ["jwtToken", "jwt_refresh_token", "session_id", "system_user_id", "main_user_id", "organization_id", "x-organization-schema", "role_id", "permissions", "permissionToken", "branch_access", "profile_image"];
export declare const getAuthCookiePrefix: () => string;
export declare const isManagedCookie: (name: string) => boolean;
export declare const toWireName: (name: string, prefix?: string) => string;
export declare function rewriteCookieHeader(rawHeader: string | undefined, prefix?: string): {
    header: string;
    droppedForeign: string[];
};
export declare function cookieNamespaceMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
