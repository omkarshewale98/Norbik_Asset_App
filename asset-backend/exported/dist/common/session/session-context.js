"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateTenantUserContext = invalidateTenantUserContext;
exports.invalidateAllTenantUserContexts = invalidateAllTenantUserContexts;
exports.loadTenantUserContext = loadTenantUserContext;
exports.parseRefreshHashes = parseRefreshHashes;
exports.serialiseRefreshHashes = serialiseRefreshHashes;
const SCHEMA_NAME_RE = /^[A-Za-z0-9_]+$/;
const TTL_MS = Number(process.env.TENANT_CONTEXT_TTL_MS) > 0 ? Number(process.env.TENANT_CONTEXT_TTL_MS) : 15_000;
const MAX_ENTRIES = 5_000;
const cache = new Map();
function invalidateTenantUserContext(sessionId) {
    if (sessionId)
        cache.delete(sessionId);
}
function invalidateAllTenantUserContexts() {
    cache.clear();
}
const toNumberArray = (value) => {
    if (Array.isArray(value))
        return value.map(Number).filter(Number.isFinite);
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : [];
        }
        catch {
            return [];
        }
    }
    return [];
};
async function loadTenantUserContext(manager, sessionId, systemUserId, schemaName) {
    if (!SCHEMA_NAME_RE.test(schemaName || ''))
        return null;
    const key = sessionId;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS)
        return hit.value;
    const schema = `"org_${schemaName}"`;
    const rows = await manager.query(`SELECT u.user_id, u.role_id, u.branch_access, r.role_name, r.is_compulsary
       FROM ${schema}.users u
       LEFT JOIN ${schema}.organization_roles r ON r.role_id = u.role_id
      WHERE u.register_user_login_id = $1
        AND u.is_active = 1
        AND COALESCE(u.is_deleted, 0) = 0
      LIMIT 1`, [systemUserId]);
    if (!rows?.length) {
        cache.delete(key);
        return null;
    }
    const value = {
        tenantUserId: Number(rows[0].user_id),
        roleId: rows[0].role_id !== null && rows[0].role_id !== undefined ? Number(rows[0].role_id) : null,
        branchAccess: toNumberArray(rows[0].branch_access),
        roleName: rows[0].role_name ?? null,
        isCompulsary: rows[0].is_compulsary === true,
    };
    if (cache.size >= MAX_ENTRIES) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined)
            cache.delete(oldest);
    }
    cache.set(key, { at: Date.now(), value });
    return value;
}
function parseRefreshHashes(value) {
    if (!value || !value.startsWith('sha256:'))
        return {};
    const [current, previous, rotatedAt] = value.split('|');
    return {
        current,
        previous: previous && previous.startsWith('sha256:') ? previous : undefined,
        rotatedAt: rotatedAt ? Number(rotatedAt) : undefined,
    };
}
function serialiseRefreshHashes(h) {
    if (!h.current)
        return null;
    return [h.current, h.previous ?? '', h.rotatedAt ?? ''].join('|').replace(/\|+$/, '');
}
