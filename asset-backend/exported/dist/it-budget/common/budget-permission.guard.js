"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetPermissionGuard = exports.BudgetPermission = exports.BUDGET_PERMISSION_META = void 0;
exports.roleHasBudgetAction = roleHasBudgetAction;
exports.roleHasBudgetSpecial = roleHasBudgetSpecial;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const typeorm_1 = require("typeorm");
const budget_context_1 = require("./budget-context");
exports.BUDGET_PERMISSION_META = 'it_budget_permission_requirement';
const BudgetPermission = (req) => (0, common_1.SetMetadata)(exports.BUDGET_PERMISSION_META, req);
exports.BudgetPermission = BudgetPermission;
async function roleHasBudgetAction(ds, schema, roleId, submodule, action) {
    const rows = await ds.query(`SELECT EXISTS (
       SELECT 1
         FROM ${(0, budget_context_1.T)(schema, 'casbin_rule')} cr
         JOIN ${(0, budget_context_1.T)(schema, 'submodules')} s ON s.id::text = cr.v5
         JOIN ${(0, budget_context_1.T)(schema, 'actions')}    a ON a.id::text = cr.v2
        WHERE cr.ptype = 'p'
          AND cr.v0 = $1
          AND cr.v1 = s.module_id::text
          AND s.submodule_code = $2
          AND a.action_code = $3
          AND COALESCE(cr."isAllowed", true) = true
     ) AS ok`, [String(roleId), submodule, action]);
    return rows[0]?.ok === true;
}
async function roleHasBudgetSpecial(ds, schema, roleId, submodule, attrKey) {
    const rows = await ds.query(`SELECT EXISTS (
       SELECT 1
         FROM ${(0, budget_context_1.T)(schema, 'policy_attributes')} pa
         JOIN ${(0, budget_context_1.T)(schema, 'special_permissions_master')} spm ON spm.id = pa.special_permission_master_id
         JOIN ${(0, budget_context_1.T)(schema, 'submodules')} s ON s.id = spm.submodule_id
        WHERE pa.role_id = $1
          AND s.submodule_code = $2
          AND spm.attr_key = $3
     ) AS ok`, [roleId, submodule, attrKey]);
    return rows[0]?.ok === true;
}
let BudgetPermissionGuard = class BudgetPermissionGuard {
    constructor(reflector, dataSource) {
        this.reflector = reflector;
        this.dataSource = dataSource;
    }
    async canActivate(context) {
        const requirement = this.reflector.getAllAndOverride(exports.BUDGET_PERMISSION_META, [context.getHandler(), context.getClass()]);
        const req = context.switchToHttp().getRequest();
        const ctx = await (0, budget_context_1.resolveBudgetContext)(this.dataSource, req);
        if (!requirement)
            return true;
        let ok = false;
        if (requirement.anyOf?.length) {
            for (const r of requirement.anyOf) {
                if (await roleHasBudgetAction(this.dataSource, ctx.schema, ctx.roleId, r.submodule, r.action)) {
                    ok = true;
                    break;
                }
            }
        }
        else if (requirement.special) {
            ok = await roleHasBudgetSpecial(this.dataSource, ctx.schema, ctx.roleId, requirement.submodule, requirement.special);
        }
        else if (requirement.action) {
            ok = await roleHasBudgetAction(this.dataSource, ctx.schema, ctx.roleId, requirement.submodule, requirement.action);
        }
        if (!ok) {
            throw new common_1.ForbiddenException({
                status: 403,
                code: 'BUD_FORBIDDEN',
                message: 'You do not have permission to perform this action',
            });
        }
        return true;
    }
};
exports.BudgetPermissionGuard = BudgetPermissionGuard;
exports.BudgetPermissionGuard = BudgetPermissionGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        typeorm_1.DataSource])
], BudgetPermissionGuard);
