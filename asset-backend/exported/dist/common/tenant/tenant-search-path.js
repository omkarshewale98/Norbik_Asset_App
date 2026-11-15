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
exports.TenantSearchPathService = void 0;
exports.normaliseSearchPath = normaliseSearchPath;
exports.parseSetSearchPath = parseSetSearchPath;
exports.desiredSearchPath = desiredSearchPath;
exports.isTenantSearchPathGuardActive = isTenantSearchPathGuardActive;
exports.installTenantSearchPathGuard = installTenantSearchPathGuard;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const request_context_service_1 = require("../context/request-context.service");
const IDENT = /^"?[A-Za-z_][A-Za-z0-9_$]*"?$/;
const SET_SEARCH_PATH = /^\s*set\s+(?:session\s+)?search_path\s*(?:to|=)\s*(.+?)\s*;?\s*$/i;
function normaliseSearchPath(value) {
    if (!value)
        return null;
    const parts = value
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
    if (!parts.length || parts.length > 8)
        return null;
    if (!parts.every((p) => IDENT.test(p) || /^'[A-Za-z0-9_$]+'$/.test(p)))
        return null;
    return parts.join(', ');
}
function parseSetSearchPath(sql) {
    if (typeof sql !== 'string' || sql.length > 500)
        return null;
    const m = SET_SEARCH_PATH.exec(sql);
    return m ? normaliseSearchPath(m[1]) : null;
}
function desiredSearchPath() {
    const explicit = (0, request_context_service_1.getRequestContextValue)('search_path');
    if (explicit)
        return explicit;
    const schema = (0, request_context_service_1.currentTenantSchema)();
    if (schema && IDENT.test(schema))
        return `${schema}, public`;
    return 'public';
}
const WRAPPED = Symbol('tenantSearchPathWrapped');
const CURRENT = Symbol('tenantSearchPathCurrent');
function wrapClient(client) {
    if (!client || client[WRAPPED] || typeof client.query !== 'function')
        return;
    client[WRAPPED] = true;
    const originalQuery = client.query;
    client.__rawQuery = originalQuery;
    client.query = function (...args) {
        const text = typeof args[0] === 'string' ? args[0] : args[0]?.text;
        const requested = parseSetSearchPath(text);
        if (requested) {
            client[CURRENT] = requested;
            if ((0, request_context_service_1.hasRequestContext)()) {
                (0, request_context_service_1.setRequestContextValue)('search_path', requested);
                const firstOrg = requested
                    .split(',')
                    .map((s) => s.trim().replace(/"/g, ''))
                    .find((s) => s.startsWith('org_'));
                if (firstOrg)
                    (0, request_context_service_1.setRequestContextValue)('schema', firstOrg);
            }
        }
        else if (typeof text === 'string' &&
            /^\s*(reset\s+search_path|discard\s+all|rollback|abort)\b/i.test(text)) {
            client[CURRENT] = undefined;
        }
        return originalQuery.apply(this, args);
    };
}
let guardActive = false;
function isTenantSearchPathGuardActive() {
    return guardActive;
}
function installTenantSearchPathGuard(dataSource, logger) {
    if ((process.env.TENANT_SEARCH_PATH_GUARD || '').toLowerCase() === 'off') {
        logger?.warn('TENANT_SEARCH_PATH_GUARD=off — request-scoped search_path disabled');
        return false;
    }
    const driver = dataSource?.driver;
    if (!driver || typeof driver.obtainMasterConnection !== 'function')
        return false;
    if (driver[WRAPPED])
        return (guardActive = true);
    driver[WRAPPED] = true;
    const obtainMaster = driver.obtainMasterConnection.bind(driver);
    driver.obtainMasterConnection = async (...args) => {
        const result = await obtainMaster(...args);
        const client = Array.isArray(result) ? result[0] : undefined;
        if (client) {
            wrapClient(client);
            if ((0, request_context_service_1.hasRequestContext)()) {
                const desired = desiredSearchPath();
                if (client[CURRENT] !== desired) {
                    await client.__rawQuery.call(client, `SET search_path TO ${desired}`);
                    client[CURRENT] = desired;
                }
            }
        }
        return result;
    };
    if (typeof driver.obtainSlaveConnection === 'function') {
        const obtainSlave = driver.obtainSlaveConnection.bind(driver);
        driver.obtainSlaveConnection = async (...args) => {
            const result = await obtainSlave(...args);
            const client = Array.isArray(result) ? result[0] : undefined;
            if (client && !client[WRAPPED]) {
                wrapClient(client);
                if ((0, request_context_service_1.hasRequestContext)()) {
                    const desired = desiredSearchPath();
                    await client.__rawQuery.call(client, `SET search_path TO ${desired}`);
                    client[CURRENT] = desired;
                }
            }
            return result;
        };
    }
    guardActive = true;
    logger?.log('Request-scoped tenant search_path guard installed');
    return true;
}
let TenantSearchPathService = class TenantSearchPathService {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger('TenantSearchPath');
    }
    onApplicationBootstrap() {
        installTenantSearchPathGuard(this.dataSource, this.logger);
    }
};
exports.TenantSearchPathService = TenantSearchPathService;
exports.TenantSearchPathService = TenantSearchPathService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], TenantSearchPathService);
