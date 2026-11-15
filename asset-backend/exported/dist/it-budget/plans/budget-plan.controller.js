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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetPlanController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const api_key_guard_1 = require("../../auth/api-key.guard");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
const budget_context_1 = require("../common/budget-context");
const budget_permission_guard_1 = require("../common/budget-permission.guard");
const budget_export_util_1 = require("../common/budget-export.util");
const budget_plan_service_1 = require("./budget-plan.service");
const ANY_BUDGET_VIEW = {
    submodule: 'BUDGET_SETUP',
    anyOf: [
        { submodule: 'BUDGET_SETUP', action: 'VIEW' },
        { submodule: 'BUDGET_CONSUMPTION', action: 'VIEW' },
    ],
};
let BudgetPlanController = class BudgetPlanController {
    constructor(service, dataSource) {
        this.service = service;
        this.dataSource = dataSource;
    }
    ctx(req) {
        return (0, budget_context_1.resolveBudgetContext)(this.dataSource, req);
    }
    send(res, buffer, base, format) {
        res.set({
            'Content-Type': budget_export_util_1.EXPORT_CONTENT_TYPE[format],
            'Content-Disposition': `attachment; filename=${(0, budget_export_util_1.exportFileName)(base, format)}`,
            'Access-Control-Expose-Headers': 'Content-Disposition',
        });
        res.end(buffer);
    }
    async lookups(req) {
        return this.service.lookups(await this.ctx(req));
    }
    async list(req, body) {
        return this.service.listPlans(await this.ctx(req), body || {});
    }
    async selector(req) {
        return this.service.selector(await this.ctx(req));
    }
    async get(req, body) {
        return this.service.getPlan(await this.ctx(req), Number(body?.plan_id));
    }
    async create(req, body) {
        return this.service.create(await this.ctx(req), body || {});
    }
    async updateDraft(req, body) {
        return this.service.updateDraft(await this.ctx(req), body || {});
    }
    async deleteDraft(req, body) {
        return this.service.deleteDraft(await this.ctx(req), Number(body?.plan_id));
    }
    async publish(req, body) {
        return this.service.publish(await this.ctx(req), body);
    }
    async previewRevision(req, body) {
        return this.service.previewRevision(await this.ctx(req), body);
    }
    async revise(req, body) {
        return this.service.revise(await this.ctx(req), body);
    }
    async setCurrent(req, body) {
        const ctx = await this.ctx(req);
        const canClose = await (0, budget_permission_guard_1.roleHasBudgetSpecial)(this.dataSource, ctx.schema, ctx.roleId, 'BUDGET_SETUP', 'close_financial_year');
        return this.service.setCurrent(ctx, body, canClose);
    }
    async close(req, body) {
        return this.service.close(await this.ctx(req), body);
    }
    async reopen(req, body) {
        return this.service.reopen(await this.ctx(req), body);
    }
    async lock(req, body) {
        return this.service.lock(await this.ctx(req), body);
    }
    async versions(req, body) {
        return this.service.versions(await this.ctx(req), Number(body?.plan_id));
    }
    async versionSnapshot(req, body) {
        return this.service.versionSnapshot(await this.ctx(req), Number(body?.plan_id), Number(body?.version_no));
    }
    async changesLog(req, body) {
        return this.service.changesLog(await this.ctx(req), Number(body?.plan_id));
    }
    async activity(req, body) {
        return this.service.activity(await this.ctx(req), Number(body?.plan_id));
    }
    async exportList(req, res, body) {
        const format = (0, budget_export_util_1.exportFormat)(body?.format);
        const buffer = await this.service.exportList(await this.ctx(req), { ...(body || {}), format });
        this.send(res, buffer, 'it-budget-year-wise', format);
    }
    async exportPlan(req, res, body) {
        const format = (0, budget_export_util_1.exportFormat)(body?.format);
        const ctx = await this.ctx(req);
        const buffer = await this.service.exportPlan(ctx, Number(body?.plan_id), format);
        this.send(res, buffer, `it-budget-plan-${body?.plan_id}`, format);
    }
};
exports.BudgetPlanController = BudgetPlanController;
__decorate([
    (0, common_1.Get)('lookups'),
    (0, budget_permission_guard_1.BudgetPermission)(ANY_BUDGET_VIEW),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BudgetPlanController.prototype, "lookups", null);
__decorate([
    (0, common_1.Post)('list'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_SETUP', action: 'VIEW' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetPlanController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('selector'),
    (0, budget_permission_guard_1.BudgetPermission)(ANY_BUDGET_VIEW),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BudgetPlanController.prototype, "selector", null);
__decorate([
    (0, common_1.Post)('get'),
    (0, budget_permission_guard_1.BudgetPermission)(ANY_BUDGET_VIEW),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetPlanController.prototype, "get", null);
__decorate([
    (0, common_1.Post)('create'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_SETUP', action: 'ADD' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetPlanController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('update-draft'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_SETUP', action: 'EDIT' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetPlanController.prototype, "updateDraft", null);
__decorate([
    (0, common_1.Post)('delete-draft'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_SETUP', action: 'DELETE' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetPlanController.prototype, "deleteDraft", null);
__decorate([
    (0, common_1.Post)('publish'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_SETUP', action: 'EDIT' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetPlanController.prototype, "publish", null);
__decorate([
    (0, common_1.Post)('revise/preview'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_SETUP', action: 'EDIT' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetPlanController.prototype, "previewRevision", null);
__decorate([
    (0, common_1.Post)('revise'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_SETUP', action: 'EDIT' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetPlanController.prototype, "revise", null);
__decorate([
    (0, common_1.Post)('set-current'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_SETUP', special: 'set_current_financial_year' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetPlanController.prototype, "setCurrent", null);
__decorate([
    (0, common_1.Post)('close'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_SETUP', special: 'close_financial_year' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetPlanController.prototype, "close", null);
__decorate([
    (0, common_1.Post)('reopen'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_SETUP', special: 'close_financial_year' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetPlanController.prototype, "reopen", null);
__decorate([
    (0, common_1.Post)('lock'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_SETUP', special: 'lock_financial_year' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetPlanController.prototype, "lock", null);
__decorate([
    (0, common_1.Post)('versions'),
    (0, budget_permission_guard_1.BudgetPermission)(ANY_BUDGET_VIEW),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetPlanController.prototype, "versions", null);
__decorate([
    (0, common_1.Post)('version-snapshot'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_SETUP', action: 'VIEW' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetPlanController.prototype, "versionSnapshot", null);
__decorate([
    (0, common_1.Post)('changes-log'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_SETUP', action: 'VIEW' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetPlanController.prototype, "changesLog", null);
__decorate([
    (0, common_1.Post)('activity'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_SETUP', action: 'VIEW' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetPlanController.prototype, "activity", null);
__decorate([
    (0, common_1.Post)('export-list'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_SETUP', action: 'EXPORT' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetPlanController.prototype, "exportList", null);
__decorate([
    (0, common_1.Post)('export-plan'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_SETUP', action: 'EXPORT' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetPlanController.prototype, "exportPlan", null);
exports.BudgetPlanController = BudgetPlanController = __decorate([
    (0, common_1.Controller)('it-budget/plans'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard, jwt_auth_guard_1.JwtAuthGuard, budget_permission_guard_1.BudgetPermissionGuard),
    __metadata("design:paramtypes", [budget_plan_service_1.BudgetPlanService,
        typeorm_1.DataSource])
], BudgetPlanController);
