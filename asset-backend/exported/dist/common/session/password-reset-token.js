"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordFingerprint = passwordFingerprint;
exports.issuePasswordLinkToken = issuePasswordLinkToken;
exports.decodePasswordLinkToken = decodePasswordLinkToken;
exports.verifyPasswordLinkToken = verifyPasswordLinkToken;
exports.passwordLinkErrorMessage = passwordLinkErrorMessage;
exports.buildPasswordLink = buildPasswordLink;
const crypto_1 = require("crypto");
const jose_1 = require("jose");
const DEFAULT_TTL = {
    reset: process.env.PASSWORD_RESET_LINK_TTL || '24h',
    invite: process.env.PASSWORD_INVITE_LINK_TTL || '48h',
    otp: process.env.PASSWORD_OTP_LINK_TTL || '15m',
};
const ISSUER = 'norbik-asset/password-link';
const secret = () => {
    const explicit = (process.env.PASSWORD_LINK_SECRET || '').trim();
    const base = explicit || `${process.env.JWT_ACCESS_SECRET_KEY || ''}::password-link::v1`;
    if (!base || base === '::password-link::v1') {
        throw new Error('PASSWORD_LINK_SECRET (or JWT_ACCESS_SECRET_KEY) must be set');
    }
    return (0, crypto_1.createHash)('sha256').update(base).digest();
};
function passwordFingerprint(userId, passwordHash) {
    return (0, crypto_1.createHash)('sha256')
        .update(`${userId}:${passwordHash || 'no-password'}`)
        .digest('hex')
        .slice(0, 32);
}
async function issuePasswordLinkToken(account, purpose, ttl = DEFAULT_TTL[purpose]) {
    if (!account?.user_id)
        throw new Error('issuePasswordLinkToken: account.user_id is required');
    return new jose_1.SignJWT({
        pur: purpose,
        fp: passwordFingerprint(account.user_id, account.password),
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(String(account.user_id))
        .setIssuer(ISSUER)
        .setJti((0, crypto_1.randomUUID)())
        .setIssuedAt()
        .setExpirationTime(ttl)
        .sign(secret());
}
async function decodePasswordLinkToken(token) {
    if (!token || typeof token !== 'string' || token.length > 2048) {
        return { ok: false, reason: 'invalid' };
    }
    try {
        const { payload } = await (0, jose_1.jwtVerify)(token, secret(), {
            algorithms: ['HS256'],
            issuer: ISSUER,
        });
        const userId = Number(payload.sub);
        const purpose = payload.pur;
        if (!Number.isFinite(userId) || !['reset', 'invite', 'otp'].includes(purpose)) {
            return { ok: false, reason: 'invalid' };
        }
        return { ok: true, userId, purpose, fp: String(payload.fp || '') };
    }
    catch (err) {
        return { ok: false, reason: err?.code === 'ERR_JWT_EXPIRED' ? 'expired' : 'invalid' };
    }
}
async function verifyPasswordLinkToken(token, loadAccount) {
    const decoded = await decodePasswordLinkToken(token);
    if (decoded.ok === false)
        return { valid: false, reason: decoded.reason };
    const account = await loadAccount(decoded.userId);
    if (!account)
        return { valid: false, reason: 'invalid' };
    if (passwordFingerprint(account.user_id, account.password) !== decoded.fp) {
        return { valid: false, reason: 'used' };
    }
    return { valid: true, userId: decoded.userId, purpose: decoded.purpose };
}
function passwordLinkErrorMessage(reason) {
    switch (reason) {
        case 'expired':
            return 'This link has expired. Please ask for a new one.';
        case 'used':
            return 'This link has already been used. Please ask for a new one.';
        default:
            return 'This link is invalid. Please ask for a new one.';
    }
}
async function buildPasswordLink(account, purpose, baseUrl = process.env.CLIENT_ORIGIN_URL || '') {
    const token = await issuePasswordLinkToken(account, purpose);
    return `${baseUrl.replace(/\/+$/, '')}/set-forgot-password?token=${encodeURIComponent(token)}`;
}
