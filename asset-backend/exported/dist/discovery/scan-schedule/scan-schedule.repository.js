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
exports.ScanScheduleRepository = exports.DEFAULT_SCAN_OPTIONS = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const device_interface_1 = require("../interfaces/device.interface");
exports.DEFAULT_SCAN_OPTIONS = { ping: true, arp: true, netbios: true, snmp: true, ports: true };
let ScanScheduleRepository = class ScanScheduleRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    assertSchema(schema) {
        if (!schema || !/^org_[A-Za-z0-9_]+$/.test(schema)) {
            throw new common_1.BadRequestException('Organization schema could not be resolved for this request');
        }
    }
    map(r) {
        const hb = r.agent_last_heartbeat ? new Date(r.agent_last_heartbeat).getTime() : 0;
        return {
            id: String(r.id),
            name: r.name,
            cidr: r.cidr,
            site: r.site ?? null,
            agentId: String(r.agent_id),
            agentHostname: r.agent_hostname ?? null,
            agentOnline: !r.agent_revoked_at && hb > 0 && Date.now() - hb < device_interface_1.AGENT_OFFLINE_AFTER_MS,
            snmpCredentialId: r.snmp_credential_id == null ? null : String(r.snmp_credential_id),
            snmpCredentialName: r.snmp_credential_name ?? null,
            enabled: !!r.enabled,
            cron: r.cron ?? null,
            options: { ...exports.DEFAULT_SCAN_OPTIONS, ...(r.options ?? {}) },
            lastRunAt: r.last_run_at ?? null,
            lastJobId: r.last_job_id == null ? null : String(r.last_job_id),
            lastResult: r.last_result ?? null,
            lastDeviceCount: r.last_device_count == null ? null : Number(r.last_device_count),
            lastError: r.last_error ?? null,
            createdBy: r.created_by == null ? null : Number(r.created_by),
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        };
    }
    selectSql(schema) {
        return `
      SELECT s.*, a.hostname AS agent_hostname, a.last_heartbeat AS agent_last_heartbeat, a.revoked_at AS agent_revoked_at,
             c.name AS snmp_credential_name
      FROM ${schema}.discovery_scan_schedule s
      JOIN ${schema}.discovery_agent a ON a.id = s.agent_id
      LEFT JOIN ${schema}.discovery_credential c ON c.id = s.snmp_credential_id`;
    }
    async list(schema) {
        this.assertSchema(schema);
        const rows = await this.dataSource.query(`${this.selectSql(schema)} ORDER BY s.name, s.id`);
        return rows.map((r) => this.map(r));
    }
    async get(schema, id) {
        this.assertSchema(schema);
        const rows = await this.dataSource.query(`${this.selectSql(schema)} WHERE s.id = $1::bigint`, [id]);
        return rows.length ? this.map(rows[0]) : null;
    }
    async create(schema, input, userId) {
        this.assertSchema(schema);
        const rows = await this.dataSource.query(`INSERT INTO ${schema}.discovery_scan_schedule
         (name, cidr, site, agent_id, snmp_credential_id, enabled, cron, options, created_by)
       VALUES ($1, $2, $3, $4::bigint, $5::bigint, $6::boolean, $7, $8::jsonb, $9) RETURNING id`, [
            input.name, input.cidr, input.site ?? null, input.agentId, input.snmpCredentialId ?? null,
            input.enabled ?? true, input.cron ?? null, JSON.stringify({ ...exports.DEFAULT_SCAN_OPTIONS, ...(input.options ?? {}) }), userId,
        ]);
        return (await this.get(schema, String(rows[0].id)));
    }
    async update(schema, id, input) {
        this.assertSchema(schema);
        const rows = await this.dataSource.query(`UPDATE ${schema}.discovery_scan_schedule
         SET name = $1, cidr = $2, site = $3, agent_id = $4::bigint, snmp_credential_id = $5::bigint,
             enabled = $6::boolean, cron = $7, options = $8::jsonb, updated_at = now()
       WHERE id = $9::bigint RETURNING id`, [
            input.name, input.cidr, input.site ?? null, input.agentId, input.snmpCredentialId ?? null,
            input.enabled ?? true, input.cron ?? null, JSON.stringify({ ...exports.DEFAULT_SCAN_OPTIONS, ...(input.options ?? {}) }), id,
        ]);
        if (!rows.length)
            throw new common_1.BadRequestException('Scan schedule not found');
        return (await this.get(schema, id));
    }
    async remove(schema, id) {
        this.assertSchema(schema);
        const rows = await this.dataSource.query(`DELETE FROM ${schema}.discovery_scan_schedule WHERE id = $1::bigint RETURNING id`, [id]);
        return rows.length > 0;
    }
    async markQueued(schema, id, jobId) {
        this.assertSchema(schema);
        await this.dataSource.query(`UPDATE ${schema}.discovery_scan_schedule SET last_run_at = now(), last_job_id = $2::bigint, last_result = 'queued', last_error = NULL WHERE id = $1::bigint`, [id, jobId]);
    }
    async markResult(schema, id, result, deviceCount, error) {
        this.assertSchema(schema);
        await this.dataSource.query(`UPDATE ${schema}.discovery_scan_schedule SET last_result = $2, last_device_count = $3, last_error = $4 WHERE id = $1::bigint`, [id, result, deviceCount, error]);
    }
    async listScheduled(schema) {
        this.assertSchema(schema);
        const rows = await this.dataSource.query(`${this.selectSql(schema)} WHERE s.enabled AND s.cron IS NOT NULL AND s.cron <> ''`);
        return rows.map((r) => this.map(r));
    }
};
exports.ScanScheduleRepository = ScanScheduleRepository;
exports.ScanScheduleRepository = ScanScheduleRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], ScanScheduleRepository);
