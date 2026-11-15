"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_COOKIES = exports.IDENTITY_COOKIES = exports.APP_ID = void 0;
exports.readAccessClaims = readAccessClaims;
exports.checkCookieBinding = checkCookieBinding;
exports.sessionFingerprint = sessionFingerprint;
exports.hashRefreshToken = hashRefreshToken;
exports.stripRequestCookies = stripRequestCookies;
exports.overrideRequestCookies = overrideRequestCookies;
exports.sessionBindingMiddleware = sessionBindingMiddleware;
const crypto_1 = require("crypto");
const cookie_1 = require("cookie");
const jose_1 = require("jose");
const crypto_utils_1 = require("../encryption_decryption/crypto-utils");
exports.APP_ID = (process.env.AUTH_APP_ID || 'asset').trim();
exports.IDENTITY_COOKIES = [
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
exports.SESSION_COOKIES = ['jwtToken', 'jwt_refresh_token', 'session_id'];
const secretBytes = (envName) => new TextEncoder().encode((process.env[envName] || '').padEnd(32, '0'));
async function decryptPayload(data, secret) {
    const { plaintext } = await (0, jose_1.compactDecrypt)(data, secret);
    return JSON.parse(new TextDecoder().decode(plaintext));
}
async function readAccessClaims(token, opts = {}) {
    if (!token)
        return null;
    const secret = secretBytes(opts.secretEnv || 'JWT_ACCESS_SECRET_KEY');
    let payload;
    let expired = false;
    try {
        ({ payload } = await (0, jose_1.jwtVerify)(token, secret, { algorithms: ['HS256'] }));
    }
    catch (err) {
        if (opts.allowExpired && err?.code === 'ERR_JWT_EXPIRED' && err?.payload) {
            payload = err.payload;
            expired = true;
        }
        else {
            return null;
        }
    }
    if (!payload?.data || typeof payload.data !== 'string')
        return null;
    try {
        const inner = await decryptPayload(payload.data, secret);
        const userId = Number(inner?.userId);
        if (!Number.isFinite(userId) || !inner?.organizationSchema)
            return null;
        return {
            userId,
            organizationSchema: String(inner.organizationSchema),
            orgId: inner.orgId !== undefined && inner.orgId !== null ? Number(inner.orgId) : undefined,
            sid: inner.sid ? String(inner.sid) : undefined,
            app: inner.app ? String(inner.app) : undefined,
            iat: payload.iat,
            exp: payload.exp,
            expired,
        };
    }
    catch {
        return null;
    }
}
const safeDecrypt = (value) => {
    if (!value)
        return null;
    try {
        return (0, crypto_utils_1.decrypt)(String(value));
    }
    catch {
        return null;
    }
};
function checkCookieBinding(cookies, claims, expectedApp = exports.APP_ID) {
    if (!claims)
        return { ok: false, reason: 'Invalid access token' };
    if (claims.app && claims.app !== expectedApp) {
        return { ok: false, reason: 'Token was issued for another application' };
    }
    const userId = safeDecrypt(cookies.system_user_id);
    if (userId === null || Number(userId) !== claims.userId) {
        return { ok: false, reason: 'User cookie does not match the session' };
    }
    const schema = safeDecrypt(cookies['x-organization-schema']);
    if (schema === null || schema !== claims.organizationSchema) {
        return { ok: false, reason: 'Organization cookie does not match the session' };
    }
    if (claims.orgId !== undefined) {
        const orgId = safeDecrypt(cookies.organization_id);
        if (orgId === null || Number(orgId) !== claims.orgId) {
            return { ok: false, reason: 'Organization id cookie does not match the session' };
        }
    }
    if (claims.sid !== undefined && cookies.session_id !== claims.sid) {
        return { ok: false, reason: 'Session cookie does not match the token' };
    }
    return { ok: true, claims };
}
function sessionFingerprint(sessionId) {
    if (!sessionId)
        return null;
    return (0, crypto_1.createHash)('sha256').update(`fp:${sessionId}`).digest('hex').slice(0, 24);
}
function hashRefreshToken(token) {
    return 'sha256:' + (0, crypto_1.createHash)('sha256').update(token).digest('hex');
}
function rebuildCookieHeader(req, cookies) {
    const parts = [];
    for (const [name, value] of Object.entries(cookies)) {
        if (value === undefined || value === null)
            continue;
        try {
            parts.push((0, cookie_1.serialize)(name, String(value)));
        }
        catch {
        }
    }
    req.headers.cookie = parts.join('; ');
}
function stripRequestCookies(req, names) {
    const current = (0, cookie_1.parse)(req.headers.cookie || '');
    let changed = false;
    for (const n of names) {
        if (n in current) {
            delete current[n];
            changed = true;
        }
        if (req.cookies && n in req.cookies) {
            delete req.cookies[n];
        }
    }
    if (changed)
        rebuildCookieHeader(req, current);
}
function overrideRequestCookies(req, values) {
    const current = (0, cookie_1.parse)(req.headers.cookie || '');
    for (const [k, v] of Object.entries(values)) {
        if (v === undefined || v === null) {
            delete current[k];
            if (req.cookies)
                delete req.cookies[k];
        }
        else {
            current[k] = v;
            if (req.cookies)
                req.cookies[k] = v;
        }
    }
    rebuildCookieHeader(req, current);
}
function sessionBindingMiddleware() {
    return async (req, _res, next) => {
        try {
            const cookies = (0, cookie_1.parse)(req.headers.cookie || '');
            const hasIdentity = exports.IDENTITY_COOKIES.some((n) => cookies[n] !== undefined);
            if (!hasIdentity && !cookies.jwtToken)
                return next();
            if (!cookies.jwtToken) {
                stripRequestCookies(req, exports.IDENTITY_COOKIES);
                req.sessionBindingFailure = 'Access token missing';
                return next();
            }
            const claims = await readAccessClaims(cookies.jwtToken, { allowExpired: true });
            const result = checkCookieBinding(cookies, claims);
            if (result.ok === false) {
                stripRequestCookies(req, [...exports.IDENTITY_COOKIES, ...exports.SESSION_COOKIES]);
                req.sessionBindingFailure = result.reason;
                console.warn(`[SessionBinding] ${req.method} ${req.originalUrl || req.url}: ${result.reason}`);
                return next();
            }
            req.sessionClaims = result.claims;
            return next();
        }
        catch (err) {
            console.error('[SessionBinding] unexpected error:', err?.message);
            stripRequestCookies(req, [...exports.IDENTITY_COOKIES, ...exports.SESSION_COOKIES]);
            req.sessionBindingFailure = 'Session could not be verified';
            return next();
        }
    };
}
