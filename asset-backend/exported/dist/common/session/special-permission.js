"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPER_ADMIN_ROLE_ID = void 0;
exports.requireAuthContext = requireAuthContext;
exports.roleHasSpecialPermission = roleHasSpecialPermission;
exports.assertSpecialPermission = assertSpecialPermission;
exports.resolveTenantUserAccount = resolveTenantUserAccount;
const common_1 = require("@nestjs/common");
const SCHEMA_RE = /^org_[A-Za-z0-9_]+$/;
exports.SUPER_ADMIN_ROLE_ID = 1;
function requireAuthContext(req) {
    const ctx = req.authContext;
    if (!ctx || !SCHEMA_RE.test(ctx.organizationSchema)) {
        throw new common_1.UnauthorizedException('Session context missing');
    }
    return ctx;
}
async function roleHasSpecialPermission(manager, schema, roleId, attrKey) {
    if (!roleId)
        return false;
    if (roleId === exports.SUPER_ADMIN_ROLE_ID)
        return true;
    if (!SCHEMA_RE.test(schema) || !/^[a-z_]+$/.test(attrKey))
        return false;
    const rows = await manager.query(`SELECT EXISTS (
       SELECT 1
         FROM "${schema}".policy_attributes pa
         JOIN "${schema}".special_permissions_master spm
           ON spm.id = pa.special_permission_master_id
        WHERE pa.role_id = $1
          AND spm.attr_key = $2
     ) AS ok`, [roleId, attrKey]);
    return rows?.[0]?.ok === true;
}
async function assertSpecialPermission(manager, req, attrKey, message = 'You do not have permission to perform this action.') {
    const ctx = requireAuthContext(req);
    const ok = await roleHasSpecialPermission(manager, ctx.organizationSchema, ctx.roleId, attrKey);
    if (!ok)
        throw new common_1.ForbiddenException(message);
    return ctx;
}
async function resolveTenantUserAccount(manager, schema, tenantUserId) {
    if (!SCHEMA_RE.test(schema) || !Number.isFinite(Number(tenantUserId)))
        return null;
    const rows = await manager.query(`SELECT register_user_login_id
       FROM "${schema}".users
      WHERE user_id = $1
        AND COALESCE(is_deleted, 0) = 0
      LIMIT 1`, [Number(tenantUserId)]);
    const id = rows?.[0]?.register_user_login_id;
    return id === undefined || id === null ? null : Number(id);
}
