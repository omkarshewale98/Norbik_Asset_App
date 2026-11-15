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
exports.ScanScheduleController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const api_key_guard_1 = require("../../auth/api-key.guard");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
const request_context_service_1 = require("../../common/context/request-context.service");
const audit_service_1 = require("../audit/audit.service");
const discovery_permission_guard_1 = require("../rbac/discovery-permission.guard");
const discovery_permissions_1 = require("../rbac/discovery-permissions");
const scan_schedule_service_1 = require("./scan-schedule.service");
let ScanScheduleController = class ScanScheduleController {
    constructor(schedules, audit, requestContext) {
        this.schedules = schedules;
        this.audit = audit;
        this.requestContext = requestContext;
    }
    resolveSchema() {
        const schema = this.requestContext.get('schema');
        if (!schema || !/^org_[A-Za-z0-9_]+$/.test(schema)) {
            throw new common_1.BadRequestException('Organization schema could not be resolved for this request');
        }
        return schema;
    }
    async list() {
        try {
            const schema = this.resolveSchema();
            return { status: true, schedules: await this.schedules.list(schema) };
        }
        catch (error) {
            return { status: false, message: error?.message ?? String(error), schedules: [] };
        }
    }
    async create(body, req) {
        const schema = this.resolveSchema();
        const actor = this.audit.actor(req);
        const schedule = await this.audit.wrap(schema, actor, { action: 'scan_schedule.create', targetType: 'scan-schedule', targetLabel: body?.name, params: { cidr: body?.cidr, agentId: body?.agentId, cron: body?.cron ?? null } }, () => this.schedules.create(schema, body, actor.userId));
        return { status: true, schedule };
    }
    async update(id, body, req) {
        const schema = this.resolveSchema();
        const actor = this.audit.actor(req);
        const schedule = await this.audit.wrap(schema, actor, { action: 'scan_schedule.update', targetType: 'scan-schedule', targetId: id, targetLabel: body?.name, params: { cidr: body?.cidr, agentId: body?.agentId, cron: body?.cron ?? null, enabled: body?.enabled } }, () => this.schedules.update(schema, id, body));
        return { status: true, schedule };
    }
    async remove(id, req) {
        const schema = this.resolveSchema();
        const actor = this.audit.actor(req);
        await this.audit.wrap(schema, actor, { action: 'scan_schedule.delete', targetType: 'scan-schedule', targetId: id }, () => this.schedules.remove(schema, id));
        return { status: true };
    }
    async run(id, req) {
        const schema = this.resolveSchema();
        const actor = this.audit.actor(req);
        const job = await this.audit.wrap(schema, actor, { action: 'scan_schedule.run', targetType: 'scan-schedule', targetId: id }, () => this.schedules.queue(schema, id, actor, 'manual'));
        return { status: true, job, message: 'Network scan queued — the relay agent picks it up on its next poll (≤ 30 s). Devices appear on the Dashboard when the job succeeds.' };
    }
};
exports.ScanScheduleController = ScanScheduleController;
__decorate([
    (0, common_1.Get)(),
    (0, discovery_permissions_1.RequireDiscovery)(discovery_permissions_1.DiscoverySub.Config, 'VIEW'),
    (0, swagger_1.ApiOperation)({ summary: 'List subnet scans run by relay agents' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScanScheduleController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, discovery_permissions_1.RequireDiscovery)(discovery_permissions_1.DiscoverySub.Config, 'EDIT'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a subnet scan to be run by a relay agent' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ScanScheduleController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, discovery_permissions_1.RequireDiscovery)(discovery_permissions_1.DiscoverySub.Config, 'EDIT'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a relay-agent subnet scan' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ScanScheduleController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, discovery_permissions_1.RequireDiscovery)(discovery_permissions_1.DiscoverySub.Config, 'EDIT'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a relay-agent subnet scan (devices already discovered are kept)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ScanScheduleController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/run'),
    (0, discovery_permissions_1.RequireDiscovery)(discovery_permissions_1.DiscoverySub.Config, 'EDIT'),
    (0, swagger_1.ApiOperation)({ summary: 'Run this subnet scan now on its relay agent (NETWORK_SCAN job)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ScanScheduleController.prototype, "run", null);
exports.ScanScheduleController = ScanScheduleController = __decorate([
    (0, swagger_1.ApiTags)('Discovery Scan Schedules'),
    (0, common_1.Controller)('discovery/scan-schedules'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard, jwt_auth_guard_1.JwtAuthGuard, discovery_permission_guard_1.DiscoveryPermissionGuard),
    __metadata("design:paramtypes", [scan_schedule_service_1.ScanScheduleService,
        audit_service_1.AuditService,
        request_context_service_1.RequestContextService])
], ScanScheduleController);
