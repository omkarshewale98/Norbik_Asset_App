"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var EnrolmentTokenService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrolmentTokenService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const crypto = __importStar(require("crypto"));
const typeorm_2 = require("typeorm");
const SCHEMA_RE = /^org_[A-Za-z0-9_]+$/;
const SECRET_RE = /^[A-Za-z0-9_-]{32,64}$/;
let EnrolmentTokenService = EnrolmentTokenService_1 = class EnrolmentTokenService {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(EnrolmentTokenService_1.name);
    }
    assertSchema(schema) {
        if (!schema || !SCHEMA_RE.test(schema)) {
            throw new common_1.BadRequestException('Organization schema could not be resolved for this request');
        }
    }
    hash(secret) {
        return crypto.createHash('sha256').update(secret).digest('hex');
    }
    map(r) {
        const revoked = !!r.revoked_at;
        const expired = !!r.expires_at && new Date(r.expires_at).getTime() < Date.now();
        return {
            id: String(r.id),
            name: r.name,
            tokenPrefix: r.token_prefix,
            createdBy: r.created_by == null ? null : Number(r.created_by),
            createdAt: r.created_at,
            expiresAt: r.expires_at ?? null,
            revokedAt: r.revoked_at ?? null,
            lastUsedAt: r.last_used_at ?? null,
            useCount: Number(r.use_count ?? 0),
            active: !revoked && !expired,
        };
    }
    async list(schema) {
        this.assertSchema(schema);
        const rows = await this.dataSource.query(`SELECT * FROM ${schema}.discovery_enrolment_token ORDER BY revoked_at IS NOT NULL, created_at DESC`);
        return rows.map((r) => this.map(r));
    }
    async issue(schema, name, userId, expiresInDays) {
        this.assertSchema(schema);
        const label = (name || '').trim().slice(0, 120) || 'Enrolment token';
        const secret = crypto.randomBytes(32).toString('base64url');
        const token = `${schema}.${secret}`;
        const prefix = secret.slice(0, 6);
        const days = expiresInDays && expiresInDays > 0 ? Math.min(expiresInDays, 3650) : null;
        const rows = await this.dataSource.query(`INSERT INTO ${schema}.discovery_enrolment_token (name, token_hash, token_prefix, created_by, expires_at)
       VALUES ($1, $2, $3, $4, CASE WHEN $5::int IS NULL THEN NULL ELSE now() + ($5::int || ' days')::interval END)
       RETURNING *`, [label, this.hash(secret), prefix, userId, days]);
        this.logger.log(`Enrolment token issued in ${schema}: "${label}" (${prefix}…)`);
        return { row: this.map(rows[0]), token };
    }
    async revoke(schema, id) {
        this.assertSchema(schema);
        const rows = await this.dataSource.query(`UPDATE ${schema}.discovery_enrolment_token SET revoked_at = COALESCE(revoked_at, now()) WHERE id = $1::bigint RETURNING *`, [id]);
        if (!rows.length)
            throw new common_1.BadRequestException('Enrolment token not found');
        return this.map(rows[0]);
    }
    async resolve(token) {
        const raw = (token || '').trim();
        const dot = raw.indexOf('.');
        if (!raw || dot <= 0) {
            if (raw && process.env.DISCOVERY_AGENT_TOKEN && raw === process.env.DISCOVERY_AGENT_TOKEN) {
                this.logger.warn('An agent tried to enrol with the retired server-wide DISCOVERY_AGENT_TOKEN. Issue a per-organisation token on Agent Discovery → Collector and reinstall with it.');
                throw new common_1.UnauthorizedException('The shared enrolment token has been retired — use a per-organisation enrolment token (Agent Discovery → Collector → Enrolment tokens)');
            }
            throw new common_1.UnauthorizedException('Invalid or missing enrolment token (expected org_<name>.<secret>)');
        }
        const schema = raw.slice(0, dot);
        const secret = raw.slice(dot + 1);
        if (!SCHEMA_RE.test(schema) || !SECRET_RE.test(secret)) {
            throw new common_1.UnauthorizedException('Invalid enrolment token format');
        }
        let rows;
        try {
            rows = await this.dataSource.query(`SELECT id, name, revoked_at, expires_at FROM ${schema}.discovery_enrolment_token WHERE token_hash = $1 LIMIT 1`, [this.hash(secret)]);
        }
        catch (err) {
            const code = err?.code || err?.driverError?.code;
            if (code === '42P01') {
                this.logger.error(`${schema}.discovery_enrolment_token is missing — run migrate_add_discovery_saas_all_schemas.sql`);
                throw new common_1.ServiceUnavailableException('Enrolment is not configured for this organisation on the server (migration pending)');
            }
            if (code === '3F000') {
                throw new common_1.UnauthorizedException('Invalid enrolment token');
            }
            throw err;
        }
        if (!rows.length)
            throw new common_1.UnauthorizedException('Invalid enrolment token');
        const r = rows[0];
        if (r.revoked_at)
            throw new common_1.UnauthorizedException('This enrolment token has been revoked');
        if (r.expires_at && new Date(r.expires_at).getTime() < Date.now())
            throw new common_1.UnauthorizedException('This enrolment token has expired');
        void this.dataSource
            .query(`UPDATE ${schema}.discovery_enrolment_token SET last_used_at = now(), use_count = use_count + 1 WHERE id = $1::bigint`, [r.id])
            .catch((e) => this.logger.debug(`enrolment use_count update failed: ${e?.message}`));
        return { schema, tokenId: String(r.id), tokenName: r.name };
    }
};
exports.EnrolmentTokenService = EnrolmentTokenService;
exports.EnrolmentTokenService = EnrolmentTokenService = EnrolmentTokenService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], EnrolmentTokenService);
