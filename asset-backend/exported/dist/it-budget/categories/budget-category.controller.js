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
exports.BudgetCategoryController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const api_key_guard_1 = require("../../auth/api-key.guard");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
const budget_context_1 = require("../common/budget-context");
const budget_permission_guard_1 = require("../common/budget-permission.guard");
const budget_export_util_1 = require("../common/budget-export.util");
const budget_category_service_1 = require("./budget-category.service");
let BudgetCategoryController = class BudgetCategoryController {
    constructor(service, dataSource) {
        this.service = service;
        this.dataSource = dataSource;
    }
    ctx(req) {
        return (0, budget_context_1.resolveBudgetContext)(this.dataSource, req);
    }
    async list(req, body) {
        return this.service.list(await this.ctx(req), body || {});
    }
    async dropdown(req) {
        return this.service.dropdown(await this.ctx(req));
    }
    async fetchOne(req, body) {
        return this.service.fetchOne(await this.ctx(req), Number(body?.budget_category_id));
    }
    async create(req, body) {
        return this.service.create(await this.ctx(req), body || {});
    }
    async update(req, body) {
        return this.service.update(await this.ctx(req), body || {});
    }
    async enable(req, body) {
        return this.service.setActive(await this.ctx(req), body, true);
    }
    async disable(req, body) {
        return this.service.setActive(await this.ctx(req), body, false);
    }
    async remove(req, body) {
        return this.service.remove(await this.ctx(req), body);
    }
    async export(req, res, body) {
        const buffer = await this.service.exportExcel(await this.ctx(req), body || {});
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename=${(0, budget_export_util_1.exportFileName)('budget-categories', 'xlsx')}`,
            'Access-Control-Expose-Headers': 'Content-Disposition',
        });
        res.end(buffer);
    }
};
exports.BudgetCategoryController = BudgetCategoryController;
__decorate([
    (0, common_1.Post)('list'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_CATEGORY', action: 'VIEW' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetCategoryController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('dropdown'),
    (0, budget_permission_guard_1.BudgetPermission)({
        submodule: 'BUDGET_SETUP',
        anyOf: [
            { submodule: 'BUDGET_SETUP', action: 'VIEW' },
            { submodule: 'BUDGET_CONSUMPTION', action: 'VIEW' },
            { submodule: 'BUDGET_CATEGORY', action: 'VIEW' },
        ],
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BudgetCategoryController.prototype, "dropdown", null);
__decorate([
    (0, common_1.Post)('fetch-single'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_CATEGORY', action: 'VIEW' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetCategoryController.prototype, "fetchOne", null);
__decorate([
    (0, common_1.Post)('create'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_CATEGORY', action: 'ADD' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetCategoryController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('update'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_CATEGORY', action: 'EDIT' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetCategoryController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('enable'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_CATEGORY', action: 'TOGGLE' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetCategoryController.prototype, "enable", null);
__decorate([
    (0, common_1.Post)('disable'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_CATEGORY', action: 'TOGGLE' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetCategoryController.prototype, "disable", null);
__decorate([
    (0, common_1.Post)('delete'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_CATEGORY', action: 'DELETE' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetCategoryController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('export'),
    (0, budget_permission_guard_1.BudgetPermission)({ submodule: 'BUDGET_CATEGORY', action: 'EXPORT' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], BudgetCategoryController.prototype, "export", null);
exports.BudgetCategoryController = BudgetCategoryController = __decorate([
    (0, common_1.Controller)('it-budget/categories'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard, jwt_auth_guard_1.JwtAuthGuard, budget_permission_guard_1.BudgetPermissionGuard),
    __metadata("design:paramtypes", [budget_category_service_1.BudgetCategoryService,
        typeorm_1.DataSource])
], BudgetCategoryController);
