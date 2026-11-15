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
exports.EnrolmentTokenController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const api_key_guard_1 = require("../../auth/api-key.guard");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
const request_context_service_1 = require("../../common/context/request-context.service");
const audit_service_1 = require("../audit/audit.service");
const discovery_permission_guard_1 = require("../rbac/discovery-permission.guard");
const discovery_permissions_1 = require("../rbac/discovery-permissions");
const enrolment_token_service_1 = require("./enrolment-token.service");
let EnrolmentTokenController = class EnrolmentTokenController {
    constructor(tokens, audit, requestContext) {
        this.tokens = tokens;
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
            return { status: true, schema, tokens: await this.tokens.list(schema) };
        }
        catch (error) {
            return { status: false, message: error?.message ?? String(error), tokens: [] };
        }
    }
    async issue(body, req) {
        const schema = this.resolveSchema();
        const actor = this.audit.actor(req);
        const issued = await this.audit.wrap(schema, actor, { action: 'enrolment_token.issue', targetType: 'enrolment-token', params: { name: body?.name ?? null, expiresInDays: body?.expiresInDays ?? null } }, () => this.tokens.issue(schema, body?.name ?? '', actor.userId, body?.expiresInDays ?? null));
        return {
            status: true,
            token: issued.token,
            row: issued.row,
            message: 'Copy the token now — it is not shown again. Use it as -EnrolmentToken in install-agent.ps1 (no -OrgSchema needed).',
        };
    }
    async revoke(id, req) {
        const schema = this.resolveSchema();
        const actor = this.audit.actor(req);
        const row = await this.audit.wrap(schema, actor, { action: 'enrolment_token.revoke', targetType: 'enrolment-token', targetId: id }, () => this.tokens.revoke(schema, id));
        return { status: true, row, message: 'Token revoked. Agents that already registered with it are unaffected.' };
    }
};
exports.EnrolmentTokenController = EnrolmentTokenController;
__decorate([
    (0, common_1.Get)(),
    (0, discovery_permissions_1.RequireDiscovery)(discovery_permissions_1.DiscoverySub.Collector, 'VIEW'),
    (0, swagger_1.ApiOperation)({ summary: 'List this organisation\'s enrolment tokens (prefix only, never the secret)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EnrolmentTokenController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, discovery_permissions_1.RequireDiscovery)(discovery_permissions_1.DiscoverySub.Collector, 'EDIT'),
    (0, swagger_1.ApiOperation)({ summary: 'Issue a new enrolment token for this organisation — the plaintext is returned once' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EnrolmentTokenController.prototype, "issue", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, discovery_permissions_1.RequireDiscovery)(discovery_permissions_1.DiscoverySub.Collector, 'EDIT'),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke an enrolment token (already-registered agents keep working)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EnrolmentTokenController.prototype, "revoke", null);
exports.EnrolmentTokenController = EnrolmentTokenController = __decorate([
    (0, swagger_1.ApiTags)('Discovery Enrolment Tokens'),
    (0, common_1.Controller)('discovery/enrolment-tokens'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard, jwt_auth_guard_1.JwtAuthGuard, discovery_permission_guard_1.DiscoveryPermissionGuard),
    __metadata("design:paramtypes", [enrolment_token_service_1.EnrolmentTokenService,
        audit_service_1.AuditService,
        request_context_service_1.RequestContextService])
], EnrolmentTokenController);
