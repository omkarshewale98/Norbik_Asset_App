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
exports.BudgetConsumptionController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const api_key_guard_1 = require("../../auth/api-key.guard");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
const budget_context_1 = require("../common/budget-context");
const budget_permission_guard_1 = require("../common/budget-permission.guard");
const budget_export_util_1 = require("../common/budget-export.util");
const budget_consumption_service_1 = require("./budget-consumption.service");
let BudgetConsumptionController = class BudgetConsumptionController {
    constructor(service, dataSource) {
        this.service = service;
        this.dataSource = dataSource;
    }
    ctx(req) {
        return (0, budget_context_1.resolveBudgetContext)(this.dataSource, req);
    }
    async summary(req, body) {
        return this.service.summary(await this.ctx(req), body || {});
    }
    async trend(req, body) {
        return this.service.trend(await this.ctx(req), body || {});
    }
    async lines(req, body) {
        return this.service.lines(await this.ctx(req), body || {});
    }
    async lineDetails(req, body) {
        return this.service.lineDetails(await this.ctx(req), body || {});
    }
    async unbudgeted(req, body) {
        return this.service.unbudgeted(await this.ctx(req), body || {});
    }
    async exportUnbudgeted(req, res, body) {
        const format = (0, budget_export_util_1.exportFormat)(body?.format);
        const buffer = await this.service.exportUnbudgeted(await this.ctx(req), { ...(body || {}), format });
        res.set({
            'Content-Type': budget_export_util_1.EXPORT_CONTENT_TYPE[format],
            'Content-Disposition': `attachment; filename=${(0, budget_export_util_1.exportFileName)('unbudgeted-spend-report', format)}`,
            'Access-Control-Expose-Headers': 'Content-Disposition',
        });
        res.end(buffer);
    }
    async manualList(req, body) {
        return this.service.manualList(await this.ctx(req), body || {});
    }
    async manualCreate(req, body) {
        return this.service.manualCreate(await this.ctx(req), body);
    }
    async manualUpdate(req, body) {
        return this.service.manualUpdate(await this.ctx(req), body);
    }
    async manualDelete(req, body) {
        return this.service.manualDelete(await this.ctx(req), body);
    }
    async vendors(req) {
        const ctx = await this.ctx(req);
        const rows = await this.dataSource.query(`SELECT vendor_id AS value, COALESCE(NULLIF(vendor_display_name,''), vendor_name) AS label
         FROM ${(0, budget_context_1.T)(ctx.schema, 'vendors')}
        WHERE COALESCE(is_deleted, 0) = 0 AND COALESCE(is_active, 1) = 1
        ORDER BY 2`);
        return { status: 200, message: 'OK', data: rows };
    }
    async export(req, res, body) {
        const format = (0, budget_export_util_1.exportFormat)(body?.format);
        const buffer = await this.service.export(await this.ctx(req), { ...(body || {}), format });
        res.set({
            'Content-Type': budget_export_util_1.EXPORT_CONTENT_TYPE[format],
            'Content-Disposition': `attachment; filename=${(0, budget_export_util_1.exportFileName)('it-budget-consumption', format)}`,
            'Access-Control-Expose-Headers': 'Content-Disposition',
        });
        res.end(buffer);
    }
};
exports.BudgetConsumptionController = BudgetConsumptionController;
__decorate([
    (0, common_1.Post)('summary'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_CONSUMPTION', action: 'VIEW' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetConsumptionController.prototype, "summary", null);
__decorate([
    (0, common_1.Post)('trend'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_CONSUMPTION', action: 'VIEW' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetConsumptionController.prototype, "trend", null);
__decorate([
    (0, common_1.Post)('lines'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_CONSUMPTION', action: 'VIEW' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetConsumptionController.prototype, "lines", null);
__decorate([
    (0, common_1.Post)('line-details'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_CONSUMPTION', action: 'VIEW' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetConsumptionController.prototype, "lineDetails", null);
__decorate([
    (0, common_1.Post)('unbudgeted'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_CONSUMPTION', action: 'VIEW' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetConsumptionController.prototype, "unbudgeted", null);
__decorate([
    (0, common_1.Post)('unbudgeted/export'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_CONSUMPTION', action: 'EXPORT' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetConsumptionController.prototype, "exportUnbudgeted", null);
__decorate([
    (0, common_1.Post)('manual/list'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_CONSUMPTION', action: 'VIEW' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetConsumptionController.prototype, "manualList", null);
__decorate([
    (0, common_1.Post)('manual/create'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_CONSUMPTION', action: 'ADD' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetConsumptionController.prototype, "manualCreate", null);
__decorate([
    (0, common_1.Post)('manual/update'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_CONSUMPTION', action: 'EDIT' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetConsumptionController.prototype, "manualUpdate", null);
__decorate([
    (0, common_1.Post)('manual/delete'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_CONSUMPTION', action: 'DELETE' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetConsumptionController.prototype, "manualDelete", null);
__decorate([
    (0, common_1.Get)('vendors'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_CONSUMPTION', action: 'VIEW' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BudgetConsumptionController.prototype, "vendors", null);
__decorate([
    (0, common_1.Post)('export'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_CONSUMPTION', action: 'EXPORT' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetConsumptionController.prototype, "export", null);
exports.BudgetConsumptionController = BudgetConsumptionController = __decorate([
    (0, common_1.Controller)('it-budget/consumption'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard, jwt_auth_guard_1.JwtAuthGuard, budget_permission_guard_1.BudgetPermissionGuard),
    __metadata("design:paramtypes", [budget_consumption_service_1.BudgetConsumptionService,
        typeorm_1.DataSource])
], BudgetConsumptionController);
