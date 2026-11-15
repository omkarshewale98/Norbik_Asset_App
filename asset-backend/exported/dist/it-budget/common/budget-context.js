"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetError = void 0;
exports.resolveSchema = resolveSchema;
exports.T = T;
exports.resolveBudgetContext = resolveBudgetContext;
const common_1 = require("@nestjs/common");
const crypto_utils_1 = require("../../common/encryption_decryption/crypto-utils");
const SCHEMA_RE = /^org_[A-Za-z0-9_]+$/;
function resolveSchema(req) {
    const raw = req.cookies?.['x-organization-schema'];
    if (!raw)
        throw new common_1.UnauthorizedException('Organization context missing');
    let dec;
    try {
        dec = (0, crypto_utils_1.decrypt)(String(raw));
    }
    catch {
        throw new common_1.UnauthorizedException('Invalid organization context');
    }
    const schema = `org_${dec}`;
    if (!dec || !SCHEMA_RE.test(schema)) {
        throw new common_1.UnauthorizedException('Invalid organization context');
    }
    return schema;
}
function T(schema, table) {
    if (!SCHEMA_RE.test(schema))
        throw new common_1.BadRequestException('Invalid schema');
    if (!/^[a-z_][a-z0-9_]*$/.test(table))
        throw new common_1.BadRequestException('Invalid table');
    return `"${schema}"."${table}"`;
}
async function resolveBudgetContext(dataSource, req) {
    const cached = req.__budgetCtx;
    if (cached)
        return cached;
    const schema = resolveSchema(req);
    const rawUser = req.cookies?.system_user_id;
    if (!rawUser)
        throw new common_1.UnauthorizedException('User context missing');
    let publicId;
    try {
        publicId = Number((0, crypto_utils_1.decrypt)(String(rawUser)));
    }
    catch {
        throw new common_1.UnauthorizedException('Invalid user context');
    }
    if (!Number.isFinite(publicId))
        throw new common_1.UnauthorizedException('Invalid user context');
    const rows = await dataSource.query(`SELECT user_id, role_id,
            TRIM(CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,''))) AS user_name
       FROM ${T(schema, 'users')}
      WHERE register_user_login_id = $1
        AND COALESCE(is_deleted, 0) = 0
      LIMIT 1`, [publicId]);
    if (!rows.length)
        throw new common_1.UnauthorizedException('User not found in organization');
    const ctx = {
        schema,
        userId: Number(rows[0].user_id),
        roleId: Number(rows[0].role_id),
        userName: rows[0].user_name,
        ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
    };
    req.__budgetCtx = ctx;
    return ctx;
}
class BudgetError extends common_1.BadRequestException {
    constructor(code, message, details) {
        super({ status: 400, code, message, details });
    }
}
exports.BudgetError = BudgetError;
