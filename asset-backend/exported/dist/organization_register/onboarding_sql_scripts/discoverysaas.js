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
exports.DiscoverySaasTablesScript = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
let DiscoverySaasTablesScript = class DiscoverySaasTablesScript {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async createDiscoverySaasTables(schemaName) {
        const query = `
-- ========================= discovery_enrolment_token =========================
-- Per-organisation agent enrolment tokens (SaaS tenancy fix). The plaintext
-- token is  <org_schema>.<secret> ; only sha256(secret) is stored. The
-- organisation an agent enrols into is derived from the token, never from
-- a header the installer sends. Revoking a token does not affect agents that
-- already registered with it (they hold their own per-agent identity).
CREATE TABLE IF NOT EXISTS ${schemaName}.discovery_enrolment_token (
    id            bigserial PRIMARY KEY,
    name          text NOT NULL,
    token_hash    text NOT NULL UNIQUE,
    token_prefix  text NOT NULL,
    created_by    bigint,
    created_at    timestamptz NOT NULL DEFAULT now(),
    expires_at    timestamptz,
    revoked_at    timestamptz,
    last_used_at  timestamptz,
    use_count     integer NOT NULL DEFAULT 0
);
ALTER TABLE ${schemaName}.discovery_enrolment_token OWNER TO postgres;

-- ========================= discovery_scan_schedule =========================
-- "Scan from agent": a subnet sweep (ping / ARP / NetBIOS / SNMP v2c / port
-- check) executed by an ONLINE relay agent inside the customer's network as a
-- NETWORK_SCAN remote job, instead of by the backend's own scanners (which
-- can only reach what the backend server can route to — nothing, for a
-- cloud-hosted backend). Results land in discovery_device exactly like a
-- backend scan (sources contain 'agent-scan').
CREATE TABLE IF NOT EXISTS ${schemaName}.discovery_scan_schedule (
    id                 bigserial PRIMARY KEY,
    name               text NOT NULL,
    cidr               text NOT NULL,
    site               text,
    agent_id           bigint NOT NULL
                       REFERENCES ${schemaName}.discovery_agent (id) ON DELETE CASCADE,
    snmp_credential_id bigint
                       REFERENCES ${schemaName}.discovery_credential (id) ON DELETE SET NULL,
    enabled            boolean NOT NULL DEFAULT true,
    cron               text,
    options            jsonb NOT NULL DEFAULT '{"ping": true, "arp": true, "netbios": true, "snmp": true, "ports": true}'::jsonb,
    last_run_at        timestamptz,
    last_job_id        bigint,
    last_result        text,
    last_device_count  integer,
    last_error         text,
    created_by         bigint,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ${schemaName}.discovery_scan_schedule OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_discovery_scan_schedule_agent
    ON ${schemaName}.discovery_scan_schedule (agent_id);

-- ========================= discovery_ad_config: sync mode =========================
-- 'direct' = the backend binds to the domain controller itself (on-premise).
-- 'agent'  = an online relay agent inside the LAN runs the LDAP query as an
--            AD_SYNC / AD_TEST job and reports the computer list (SaaS: the
--            customer's DC is never exposed to the internet).
ALTER TABLE ${schemaName}.discovery_ad_config
    ADD COLUMN IF NOT EXISTS sync_mode text NOT NULL DEFAULT 'direct';
ALTER TABLE ${schemaName}.discovery_ad_config
    ADD COLUMN IF NOT EXISTS sync_agent_id bigint;
ALTER TABLE ${schemaName}.discovery_ad_config
    ADD COLUMN IF NOT EXISTS last_sync_at timestamptz;
ALTER TABLE ${schemaName}.discovery_ad_config
    ADD COLUMN IF NOT EXISTS last_sync_result text;
ALTER TABLE ${schemaName}.discovery_ad_config
    ADD COLUMN IF NOT EXISTS last_sync_error text;
ALTER TABLE ${schemaName}.discovery_ad_config
    DROP CONSTRAINT IF EXISTS discovery_ad_config_sync_mode_check;
ALTER TABLE ${schemaName}.discovery_ad_config
    ADD CONSTRAINT discovery_ad_config_sync_mode_check CHECK (sync_mode IN ('direct', 'agent'));
ALTER TABLE ${schemaName}.discovery_ad_config
    DROP CONSTRAINT IF EXISTS discovery_ad_config_sync_agent_id_fkey;
ALTER TABLE ${schemaName}.discovery_ad_config
    ADD CONSTRAINT discovery_ad_config_sync_agent_id_fkey FOREIGN KEY (sync_agent_id)
        REFERENCES ${schemaName}.discovery_agent (id) ON DELETE SET NULL;

    `;
        await this.dataSource.query(query);
    }
};
exports.DiscoverySaasTablesScript = DiscoverySaasTablesScript;
exports.DiscoverySaasTablesScript = DiscoverySaasTablesScript = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], DiscoverySaasTablesScript);
