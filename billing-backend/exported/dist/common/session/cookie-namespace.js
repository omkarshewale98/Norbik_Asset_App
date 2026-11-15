"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toWireName = exports.isManagedCookie = exports.getAuthCookiePrefix = exports.AUTH_COOKIE_NAMES = void 0;
exports.rewriteCookieHeader = rewriteCookieHeader;
exports.cookieNamespaceMiddleware = cookieNamespaceMiddleware;
exports.AUTH_COOKIE_NAMES = [
    'jwtToken',
    'jwt_refresh_token',
    'session_id',
    'system_user_id',
    'main_user_id',
    'organization_id',
    'x-organization-schema',
    'role_id',
    'permissions',
    'permissionToken',
    'branch_access',
    'profile_image',
];
const DEFAULT_PREFIX = 'nb_';
const PREFIX_RE = /^[A-Za-z0-9_-]{0,16}$/;
const getAuthCookiePrefix = () => {
    const raw = process.env.AUTH_COOKIE_PREFIX;
    if (raw === undefined)
        return DEFAULT_PREFIX;
    const trimmed = raw.trim();
    if (!PREFIX_RE.test(trimmed))
        return DEFAULT_PREFIX;
    return trimmed;
};
exports.getAuthCookiePrefix = getAuthCookiePrefix;
const EXTRA_NAMESPACED = ['connect.sid'];
const MANAGED = new Set([...exports.AUTH_COOKIE_NAMES, ...EXTRA_NAMESPACED]);
const isManagedCookie = (name) => MANAGED.has(name);
exports.isManagedCookie = isManagedCookie;
const toWireName = (name, prefix = (0, exports.getAuthCookiePrefix)()) => prefix && MANAGED.has(name) ? `${prefix}${name}` : name;
exports.toWireName = toWireName;
function rewriteCookieHeader(rawHeader, prefix = (0, exports.getAuthCookiePrefix)()) {
    if (!rawHeader || !prefix)
        return { header: rawHeader ?? '', droppedForeign: [] };
    const out = [];
    const droppedForeign = [];
    for (const part of rawHeader.split(';')) {
        const pair = part.trim();
        if (!pair)
            continue;
        const eq = pair.indexOf('=');
        const name = (eq === -1 ? pair : pair.slice(0, eq)).trim();
        const value = eq === -1 ? '' : pair.slice(eq + 1);
        if (name.startsWith(prefix) && MANAGED.has(name.slice(prefix.length))) {
            out.push(`${name.slice(prefix.length)}=${value}`);
        }
        else if (MANAGED.has(name)) {
            droppedForeign.push(name);
        }
        else {
            out.push(pair);
        }
    }
    return { header: out.join('; '), droppedForeign };
}
const PATCHED = Symbol('cookieNamespacePatched');
function cookieNamespaceMiddleware() {
    return (req, res, next) => {
        const prefix = (0, exports.getAuthCookiePrefix)();
        if (!prefix)
            return next();
        const { header, droppedForeign } = rewriteCookieHeader(req.headers.cookie, prefix);
        if (req.headers.cookie !== undefined)
            req.headers.cookie = header;
        req.foreignAuthCookies = droppedForeign;
        if (!res[PATCHED]) {
            res[PATCHED] = true;
            const originalCookie = res.cookie.bind(res);
            const originalClear = res.clearCookie.bind(res);
            res.cookie = (name, value, options) => options === undefined
                ? originalCookie((0, exports.toWireName)(name, prefix), value)
                : originalCookie((0, exports.toWireName)(name, prefix), value, options);
            res.clearCookie = (name, options) => originalClear((0, exports.toWireName)(name, prefix), options);
            res.clearRawCookie = (name, options) => originalClear(name, options);
        }
        next();
    };
}
