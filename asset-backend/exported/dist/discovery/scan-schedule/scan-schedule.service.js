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
var ScanScheduleService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanScheduleService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const cron_util_1 = require("../config/cron.util");
const agent_repository_1 = require("../store/agent.repository");
const credential_service_1 = require("../credentials/credential.service");
const jobs_service_1 = require("../jobs/jobs.service");
const discovery_service_1 = require("../discovery.service");
const scan_schedule_repository_1 = require("./scan-schedule.repository");
const CIDR_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;
const SYSTEM_ACTOR = { userId: null, name: 'scheduler', ip: null, requestId: null };
let ScanScheduleService = ScanScheduleService_1 = class ScanScheduleService {
    constructor(dataSource, repo, agents, credentials, jobs, discovery) {
        this.dataSource = dataSource;
        this.repo = repo;
        this.agents = agents;
        this.credentials = credentials;
        this.jobs = jobs;
        this.discovery = discovery;
        this.logger = new common_1.Logger(ScanScheduleService_1.name);
        this.firedMinute = new Map();
        this.jobs.registerTerminalHook(async (schema, job) => {
            if (job.type !== 'NETWORK_SCAN')
                return;
            if (job.status === 'succeeded')
                await this.onJobResult(schema, job);
            else
                await this.onJobFailed(schema, job);
        });
    }
    async validate(schema, input) {
        const name = (input.name || '').trim();
        if (!name)
            throw new common_1.BadRequestException('name is required');
        const cidr = (input.cidr || '').trim();
        const m = CIDR_RE.exec(cidr);
        if (!m || m.slice(1, 5).some((o) => Number(o) > 255) || Number(m[5]) < 16 || Number(m[5]) > 32) {
            throw new common_1.BadRequestException('cidr must be IPv4 between /16 and /32, e.g. 192.168.1.0/24');
        }
        if (!input.agentId)
            throw new common_1.BadRequestException('agentId is required — pick the relay agent that sits in that subnet');
        const agent = (await this.agents.listAgents(schema)).find((a) => a.id === String(input.agentId));
        if (!agent)
            throw new common_1.BadRequestException('Agent not found or revoked');
        const cron = (input.cron || '').trim() || null;
        if (cron && !(0, cron_util_1.validateCron)(cron))
            throw new common_1.BadRequestException('cron must be a 5-field expression like "0 */4 * * *" (leave blank for manual only)');
        let snmpCredentialId = input.snmpCredentialId ? String(input.snmpCredentialId) : null;
        if (snmpCredentialId) {
            const cred = await this.credentials.get(schema, snmpCredentialId);
            if (cred.kind !== 'snmp-v2c')
                throw new common_1.BadRequestException('The SNMP credential must be of kind snmp-v2c');
        }
        return {
            name, cidr, site: (input.site || '').trim() || null, agentId: String(input.agentId),
            snmpCredentialId, enabled: input.enabled ?? true, cron, options: input.options ?? {},
        };
    }
    list(schema) { return this.repo.list(schema); }
    async create(schema, input, userId) {
        return this.repo.create(schema, await this.validate(schema, input), userId);
    }
    async update(schema, id, input) {
        return this.repo.update(schema, id, await this.validate(schema, input));
    }
    async remove(schema, id) {
        if (!(await this.repo.remove(schema, id)))
            throw new common_1.BadRequestException('Scan schedule not found');
    }
    async queue(schema, id, actor, reason) {
        const s = await this.repo.get(schema, id);
        if (!s)
            throw new common_1.BadRequestException('Scan schedule not found');
        if (!s.agentOnline && reason === 'manual') {
            throw new common_1.BadRequestException(`Relay agent "${s.agentHostname ?? s.agentId}" is offline — the scan would sit in the queue until it comes back`);
        }
        if (await this.hasActiveJob(schema, s.agentId, s.id)) {
            throw new common_1.BadRequestException('A scan for this schedule is already queued or running');
        }
        let fingerprintPorts = [];
        try {
            const rows = await this.dataSource.query(`SELECT fingerprint_ports FROM ${schema}.discovery_config ORDER BY id LIMIT 1`);
            fingerprintPorts = (rows[0]?.fingerprint_ports ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0);
        }
        catch (err) {
            this.logger.debug(`fingerprint ports unavailable for ${schema}: ${err?.message}`);
        }
        const job = await this.jobs.createJob(schema, actor, {
            type: 'NETWORK_SCAN',
            agentId: s.agentId,
            targetLabel: `${s.name} · ${s.cidr} · ${reason}`,
            payload: {
                scheduleId: s.id,
                cidr: s.cidr,
                site: s.site,
                segment: s.name,
                options: s.options,
                fingerprintPorts,
                credentialId: s.options.snmp && s.snmpCredentialId ? s.snmpCredentialId : null,
                timeoutSeconds: 1500,
            },
            maxAttempts: 1,
        });
        await this.repo.markQueued(schema, s.id, job.id);
        return job;
    }
    async hasActiveJob(schema, agentId, scheduleId) {
        const rows = await this.dataSource.query(`SELECT 1 FROM ${schema}.discovery_remote_job
       WHERE agent_id = $1::bigint AND type = 'NETWORK_SCAN'
         AND status IN ('pending_approval', 'queued', 'claimed', 'running')
         AND payload->>'scheduleId' = $2
       LIMIT 1`, [agentId, scheduleId]);
        return rows.length > 0;
    }
    async schemas() {
        try {
            const rows = await this.dataSource.query(`
        SELECT DISTINCT table_schema FROM information_schema.tables
        WHERE table_name = 'discovery_scan_schedule' AND table_schema LIKE 'org\\_%' ESCAPE '\\'`);
            return rows.map((r) => r.table_schema);
        }
        catch (err) {
            this.logger.debug(`schema enumeration failed: ${err?.message}`);
            return [];
        }
    }
    async tick() {
        const now = new Date();
        for (const schema of await this.schemas()) {
            try {
                const due = (await this.repo.listScheduled(schema)).filter((s) => s.cron && (0, cron_util_1.cronMatches)(s.cron, now));
                for (const s of due) {
                    const key = `${s.id}@${now.getFullYear()}-${now.getMonth()}-${now.getDate()}T${now.getHours()}:${now.getMinutes()}`;
                    if (this.firedMinute.get(`${schema}:${s.id}`) === key)
                        continue;
                    this.firedMinute.set(`${schema}:${s.id}`, key);
                    if (!s.agentOnline) {
                        await this.repo.markResult(schema, s.id, 'skipped', null, `Relay agent ${s.agentHostname ?? s.agentId} offline at ${now.toISOString()}`);
                        continue;
                    }
                    try {
                        const job = await this.queue(schema, s.id, SYSTEM_ACTOR, 'scheduled');
                        this.logger.log(`Scheduled network scan ${schema}/${s.name} (${s.cidr}) → job ${job.id}`);
                    }
                    catch (err) {
                        this.logger.debug(`scheduled scan ${schema}/${s.id} not queued: ${err?.message}`);
                    }
                }
            }
            catch (err) {
                this.logger.debug(`scan tick ${schema}: ${err?.message}`);
            }
        }
    }
    async onJobResult(schema, job) {
        const p = (job.payload ?? {});
        const r = (job.result ?? {});
        const scheduleId = p.scheduleId ? String(p.scheduleId) : null;
        const hosts = Array.isArray(r.hosts) ? r.hosts : [];
        try {
            const res = await this.discovery.ingestAgentScan(schema, hosts, {
                cidr: String(p.cidr ?? ''),
                segment: p.segment ?? null,
                startedAt: job.startedAt ? new Date(job.startedAt) : new Date(),
                scanners: Array.isArray(r.scanners) ? r.scanners : [],
            });
            if (scheduleId) {
                await this.repo.markResult(schema, scheduleId, 'succeeded', res.deviceCount, r.warning ? String(r.warning) : null);
            }
            this.logger.log(`Agent network scan ${schema} job ${job.id}: ${hosts.length} host(s) reported, ${res.deviceCount} stored`);
        }
        catch (err) {
            const msg = err?.message ?? String(err);
            if (scheduleId)
                await this.repo.markResult(schema, scheduleId, 'failed', null, msg);
            this.logger.error(`Agent network scan ${schema} job ${job.id}: result NOT stored: ${msg}`);
            try {
                await this.agents.annotateJob(schema, job.id, `Result received but NOT stored: ${msg}`);
            }
            catch { }
        }
    }
    async onJobFailed(schema, job) {
        const p = (job.payload ?? {});
        if (!p.scheduleId)
            return;
        await this.repo.markResult(schema, String(p.scheduleId), job.status, null, job.error ?? null);
    }
};
exports.ScanScheduleService = ScanScheduleService;
__decorate([
    (0, schedule_1.Cron)('* * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScanScheduleService.prototype, "tick", null);
exports.ScanScheduleService = ScanScheduleService = ScanScheduleService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        scan_schedule_repository_1.ScanScheduleRepository,
        agent_repository_1.AgentRepository,
        credential_service_1.CredentialService,
        jobs_service_1.JobsService,
        discovery_service_1.DiscoveryService])
], ScanScheduleService);
