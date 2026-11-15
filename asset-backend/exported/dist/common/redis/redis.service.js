"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
exports.tenantScopedKey = tenantScopedKey;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const request_context_service_1 = require("../context/request-context.service");
function tenantScopedKey(key) {
    const schema = (0, request_context_service_1.currentTenantSchema)();
    if (!schema || (process.env.REDIS_TENANT_PREFIX || '').toLowerCase() === 'off')
        return key;
    const prefix = `${schema}:`;
    return key.startsWith(prefix) ? key : `${prefix}${key}`;
}
let RedisService = class RedisService {
    onModuleInit() {
        this.client = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            enableOfflineQueue: false,
        });
        this.client.on('error', (err) => console.error('[Redis] connection error:', err.message));
    }
    async incr(key) {
        try {
            return await this.client.incr(tenantScopedKey(key));
        }
        catch {
            return 0;
        }
    }
    async get(key) {
        try {
            const val = await this.client.get(tenantScopedKey(key));
            return val ? JSON.parse(val) : null;
        }
        catch {
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        try {
            await this.client.set(tenantScopedKey(key), JSON.stringify(value), 'EX', ttlSeconds);
        }
        catch { }
    }
    async tryLock(key, ttlSeconds) {
        try {
            const res = await this.client.set(tenantScopedKey(key), '1', 'EX', ttlSeconds, 'NX');
            return res === 'OK';
        }
        catch {
            return true;
        }
    }
    async releaseLock(key) {
        try {
            await this.client.del(tenantScopedKey(key));
        }
        catch { }
    }
    async del(key) {
        try {
            await this.client.del(tenantScopedKey(key));
        }
        catch { }
    }
    async getGlobal(key) {
        try {
            const val = await this.client.get(key);
            return val ? JSON.parse(val) : null;
        }
        catch {
            return null;
        }
    }
    async setGlobal(key, value, ttlSeconds) {
        try {
            await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        }
        catch { }
    }
    async delGlobal(key) {
        try {
            await this.client.del(key);
        }
        catch { }
    }
    async delByPattern(pattern) {
        try {
            console.log("DELETED PATTERN:", pattern);
            const keys = await this.client.keys(tenantScopedKey(pattern));
            if (keys.length > 0) {
                const count = await this.client.del(...keys);
                return { success: true, deletedCount: count };
            }
            return { success: true, deletedCount: 0 };
        }
        catch (error) {
            console.error(`[Redis] Failed to delete pattern ${pattern}:`, error);
            return { success: false, deletedCount: 0, error: error.message };
        }
    }
    async delByPatternInTenant(schema, pattern) {
        if (!/^org_[A-Za-z0-9_]+$/.test(schema || ''))
            return { success: false, deletedCount: 0 };
        try {
            const keys = await this.client.keys(`${schema}:${pattern}`);
            if (keys.length)
                return { success: true, deletedCount: await this.client.del(...keys) };
            return { success: true, deletedCount: 0 };
        }
        catch (error) {
            return { success: false, deletedCount: 0, error: error.message };
        }
    }
    onModuleDestroy() {
        this.client.disconnect();
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = __decorate([
    (0, common_1.Injectable)()
], RedisService);
