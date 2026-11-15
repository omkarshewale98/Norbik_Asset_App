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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = exports.SESSION_FP_HEADER = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const bcrypt = __importStar(require("bcrypt"));
const cookie_1 = require("cookie");
const jose_1 = require("jose");
const cookie_config_1 = require("../common/config/cookie.config");
const crypto_utils_1 = require("../common/encryption_decryption/crypto-utils");
const session_binding_1 = require("../common/session/session-binding");
const session_context_1 = require("../common/session/session-context");
const register_user_login_entity_1 = require("../organization_register/entities/register-user-login.entity");
const sessions_entity_1 = require("../organizational-profile/public_schema_entity/sessions.entity");
const user_repository_1 = require("../user/user.repository");
const typeorm_2 = require("typeorm");
const auth_service_1 = require("./auth.service");
const token_service_1 = require("./token.service");
exports.SESSION_FP_HEADER = 'x-session-fp';
let JwtAuthGuard = class JwtAuthGuard {
    constructor(jwtService, tokenService, authService, userRepository, sessionRepository, registerUserLogin) {
        this.jwtService = jwtService;
        this.tokenService = tokenService;
        this.authService = authService;
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.registerUserLogin = registerUserLogin;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const cookies = (0, cookie_1.parse)(request.headers.cookie || '');
        const accessToken = cookies.jwtToken;
        const refreshToken = cookies.jwt_refresh_token;
        const x_user_id = cookies.system_user_id;
        const sessionId = cookies.session_id;
        const reject = (message, clearCookies = false) => {
            if (!response.headersSent) {
                if (clearCookies)
                    this.authService.clearAuthCookies(response);
                response.status(401).json({ message, sessionExpired: true, redirectUrl: '/sign-in' });
            }
            return false;
        };
        if (request.sessionBindingFailure) {
            return reject('Your session is no longer valid. Please sign in again.', true);
        }
        if (!sessionId)
            return reject('Session ID missing');
        if (!x_user_id)
            return reject('User ID missing');
        let numericUserId;
        try {
            numericUserId = Number((0, crypto_utils_1.decrypt)(x_user_id.toString()));
        }
        catch {
            return reject('Invalid user ID', true);
        }
        if (!Number.isFinite(numericUserId))
            return reject('Invalid user ID', true);
        const session = await this.sessionRepository.findOne({
            where: { session_id: sessionId, user_id: numericUserId },
        });
        if (!session || !session.is_active || session.is_blocked) {
            return reject('Session is inactive or blocked', true);
        }
        if (session.force_logout === true) {
            await this.sessionRepository.update(session.session_id, {
                is_active: false,
                logout_at: new Date(),
                force_logout: false,
            });
            return reject('You have been logged out by admin.', true);
        }
        const tabFingerprint = request.headers[exports.SESSION_FP_HEADER];
        if (typeof tabFingerprint === 'string' &&
            tabFingerprint.length > 0 &&
            tabFingerprint !== (0, session_binding_1.sessionFingerprint)(sessionId)) {
            response.status(409).json({
                message: 'You are signed in as a different user in another tab. This page will reload with the current session.',
                sessionChanged: true,
                redirectUrl: '/dashboard',
            });
            return false;
        }
        const user = await this.registerUserLogin.findOne({
            where: { user_id: numericUserId },
        });
        if (!user || !user.is_active)
            return reject('User is inactive', true);
        if (!accessToken) {
            return reject('Access token missing', !refreshToken);
        }
        const claims = await (0, session_binding_1.readAccessClaims)(accessToken, { allowExpired: true });
        const binding = (0, session_binding_1.checkCookieBinding)(cookies, claims);
        if (binding.ok === false) {
            return reject(binding.reason, true);
        }
        if (claims.userId !== numericUserId)
            return reject('Invalid session', true);
        if (!claims.expired) {
            request.user = this.jwtService.decode(accessToken);
            return this.finish(request, response, session, claims, reject);
        }
        if (!refreshToken)
            return reject('Session expired', true);
        let refreshDecoded;
        try {
            const refreshSecret = Buffer.from(process.env.JWT_REFRESH_SECRET_KEY.padEnd(32, '0'));
            refreshDecoded = this.jwtService.verify(refreshToken, { secret: refreshSecret });
        }
        catch (refreshError) {
            const message = refreshError.name === 'TokenExpiredError'
                ? 'Session expired due to inactivity. Please log in again.'
                : 'Invalid refresh token';
            return reject(message, true);
        }
        const refreshInner = await this.readRefreshInner(refreshToken);
        if (refreshInner &&
            (refreshInner.userId !== numericUserId ||
                (refreshInner.sid !== undefined && refreshInner.sid !== sessionId))) {
            return reject('Invalid session', true);
        }
        try {
            const stored = (0, session_context_1.parseRefreshHashes)(session.refresh_token);
            const presented = (0, session_binding_1.hashRefreshToken)(refreshToken);
            let matches = false;
            let withinGrace = false;
            if (stored.current) {
                matches = stored.current === presented;
                withinGrace =
                    !matches &&
                        !!stored.previous &&
                        stored.previous === presented &&
                        Date.now() - (stored.rotatedAt ?? 0) < 60_000;
            }
            else {
                const fullUserLegacy = await this.userRepository.findOne({
                    where: { user_id: numericUserId, verified: true },
                });
                matches =
                    !!fullUserLegacy?.refreshToken &&
                        (await bcrypt.compare(refreshToken, fullUserLegacy.refreshToken));
            }
            if (withinGrace) {
                request.user = refreshDecoded;
                return this.finish(request, response, session, claims, reject);
            }
            if (!matches) {
                console.log('❌ Refresh token does not belong to this session');
                return reject('Invalid session', true);
            }
            const fullUser = await this.userRepository.findOne({
                where: { user_id: numericUserId, verified: true },
                relations: ['organization'],
            });
            if (!fullUser)
                return reject('User not found', true);
            const tokenAgeSeconds = Math.floor(Date.now() / 1000) - (refreshDecoded?.iat ?? 0);
            if (tokenAgeSeconds < 30) {
                request.user = refreshDecoded;
                return this.finish(request, response, session, claims, reject);
            }
            const standardRefreshMs = this.parseDurationToMs(process.env.JWT_REFRESH_EXPIRATION ?? '45m');
            const tokenLifespanMs = (refreshDecoded.exp - refreshDecoded.iat) * 1000;
            const wasRememberMe = tokenLifespanMs > standardRefreshMs;
            const accessExpiry = wasRememberMe
                ? (process.env.JWT_ACCESS_EXPIRATION_REMEMBER ?? process.env.JWT_ACCESS_EXPIRATION)
                : process.env.JWT_ACCESS_EXPIRATION;
            const refreshExpiry = wasRememberMe
                ? (process.env.JWT_REFRESH_EXPIRATION_REMEMBER ?? process.env.JWT_REFRESH_EXPIRATION)
                : process.env.JWT_REFRESH_EXPIRATION;
            const tokens = await this.tokenService.generateTokens(fullUser, accessExpiry, refreshExpiry, {
                sessionId,
                organizationId: fullUser.organization?.organization_id,
            });
            await this.sessionRepository.update(sessionId, {
                refresh_token: (0, session_context_1.serialiseRefreshHashes)({
                    current: (0, session_binding_1.hashRefreshToken)(tokens.refreshToken),
                    previous: presented,
                    rotatedAt: Date.now(),
                }),
            });
            const cookieOpts = (0, cookie_config_1.authCookieOptions)(wasRememberMe ? { maxAge: (0, cookie_config_1.getRememberMeMaxAgeMs)() } : {});
            response.cookie('jwtToken', tokens.accessToken, cookieOpts);
            response.cookie('jwt_refresh_token', tokens.refreshToken, cookieOpts);
            response.cookie('organization_id', (0, crypto_utils_1.encrypt)(String(fullUser.organization?.organization_id)), cookieOpts);
            request.user = this.jwtService.decode(tokens.accessToken);
            console.log(`✅ Sliding session refreshed for user ${numericUserId}`);
            return this.finish(request, response, session, claims, reject);
        }
        catch (err) {
            console.error('❌ Token refresh error:', err);
            if (!response.headersSent) {
                response.status(500).json({
                    message: 'Authentication error. Please try again.',
                    sessionExpired: false,
                });
            }
            return false;
        }
    }
    async finish(request, response, session, claims, reject) {
        const tenant = await (0, session_context_1.loadTenantUserContext)(this.sessionRepository.manager, session.session_id, claims.userId, claims.organizationSchema);
        if (!tenant) {
            (0, session_context_1.invalidateTenantUserContext)(session.session_id);
            return reject('Your account is not active in this organization.', true);
        }
        (0, session_binding_1.overrideRequestCookies)(request, {
            main_user_id: (0, crypto_utils_1.encrypt)(String(tenant.tenantUserId)),
            role_id: tenant.roleId !== null ? (0, crypto_utils_1.encrypt)(String(tenant.roleId)) : undefined,
            branch_access: JSON.stringify(tenant.branchAccess ?? []),
        });
        request.authContext = {
            sessionId: session.session_id,
            systemUserId: claims.userId,
            tenantUserId: tenant.tenantUserId,
            roleId: tenant.roleId,
            branchAccess: tenant.branchAccess,
            organizationSchema: `org_${claims.organizationSchema}`,
            organizationId: claims.orgId,
        };
        await this.sessionRepository.update(session.session_id, { last_seen: new Date() });
        void response;
        return true;
    }
    async readRefreshInner(refreshToken) {
        try {
            const decoded = this.jwtService.decode(refreshToken);
            if (!decoded?.data)
                return null;
            const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET_KEY.padEnd(32, '0'));
            const { plaintext } = await (0, jose_1.compactDecrypt)(decoded.data, secret);
            const inner = JSON.parse(new TextDecoder().decode(plaintext));
            return {
                userId: Number(inner.userId),
                organizationSchema: String(inner.organizationSchema),
                sid: inner.sid,
                orgId: inner.orgId,
            };
        }
        catch {
            return null;
        }
    }
    parseDurationToMs(duration) {
        const unit = duration.slice(-1);
        const value = parseInt(duration.slice(0, -1), 10);
        switch (unit) {
            case 's': return value * 1_000;
            case 'm': return value * 60 * 1_000;
            case 'h': return value * 60 * 60 * 1_000;
            case 'd': return value * 24 * 60 * 60 * 1_000;
            default: return 45 * 60 * 1_000;
        }
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_1.InjectRepository)(user_repository_1.UserRepository)),
    __param(4, (0, typeorm_1.InjectRepository)(sessions_entity_1.Session)),
    __param(5, (0, typeorm_1.InjectRepository)(register_user_login_entity_1.RegisterUserLogin)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        token_service_1.TokenService,
        auth_service_1.AuthService,
        user_repository_1.UserRepository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], JwtAuthGuard);
