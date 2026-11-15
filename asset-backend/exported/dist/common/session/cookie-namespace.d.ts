import type { NextFunction, Request, Response } from 'express';
export declare const getAuthCookiePrefix: () => string;
export declare const isManagedCookie: (name: string) => boolean;
export declare const toWireName: (name: string, prefix?: string) => string;
export declare function rewriteCookieHeader(rawHeader: string | undefined, prefix?: string): {
    header: string;
    droppedForeign: string[];
};
export declare function cookieNamespaceMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
