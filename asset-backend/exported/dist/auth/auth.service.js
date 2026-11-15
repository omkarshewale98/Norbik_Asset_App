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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bcrypt = __importStar(require("bcrypt"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_repository_1 = require("../config/config.repository");
const uuid_1 = require("uuid");
const register_user_login_entity_1 = require("../organization_register/entities/register-user-login.entity");
const user_repository_1 = require("../user/user.repository");
const jose_1 = require("jose");
const cookie_1 = require("cookie");
const asset_items_service_1 = require("../assets-data/asset-items/asset-items.service");
const mail_service_1 = require("../common/mail/mail.service");
const render_email_1 = require("../common/mail/render-email");
const notifications_helper_1 = require("../common/notifications/notifications.helper");
const redis_service_1 = require("../common/redis/redis.service");
const organizational_profile_entity_1 = require("../organizational-profile/entity/organizational-profile.entity");
const organizational_user_entity_1 = require("../organizational-profile/entity/organizational-user.entity");
const casbin_rule_entity_1 = require("../organizational-profile/entity/policy-builder/casbin-rule.entity");
const organizational_profile_service_1 = require("../organizational-profile/organizational-profile.service");
const policy_builder_service_1 = require("../organizational-profile/policy-builder.service");
const sessions_entity_1 = require("../organizational-profile/public_schema_entity/sessions.entity");
const typeorm_2 = require("typeorm");
const cookie_config_1 = require("../common/config/cookie.config");
const crypto_utils_1 = require("../common/encryption_decryption/crypto-utils");
const mail_config_service_1 = require("../common/mail/mail-config.service");
const token_service_1 = require("./token.service");
const session_binding_1 = require("../common/session/session-binding");
const session_context_1 = require("../common/session/session-context");
const password_reset_token_1 = require("../common/session/password-reset-token");
const cookie_namespace_1 = require("../common/session/cookie-namespace");
const special_permission_1 = require("../common/session/special-permission");
let AuthService = class AuthService {
    constructor(tokenService, redisService, mailConfigService, mailService, orgProfileService, assetItemsService, notificationHelper, userRepository, configRepository, sessionRepository, registerserRepository, organizationalProfileRepo, userRepo, casbinRuleRepo, policyBuilderService) {
        this.tokenService = tokenService;
        this.redisService = redisService;
        this.mailConfigService = mailConfigService;
        this.mailService = mailService;
        this.orgProfileService = orgProfileService;
        this.assetItemsService = assetItemsService;
        this.notificationHelper = notificationHelper;
        this.userRepository = userRepository;
        this.configRepository = configRepository;
        this.sessionRepository = sessionRepository;
        this.registerserRepository = registerserRepository;
        this.organizationalProfileRepo = organizationalProfileRepo;
        this.userRepo = userRepo;
        this.casbinRuleRepo = casbinRuleRepo;
        this.policyBuilderService = policyBuilderService;
    }
    async validateUser(loginDto, response, req) {
        const { email, password, rememberMe } = loginDto;
        const sanitizedIdentifier = email?.trim() || '';
        console.log('loginDto loginDto', { loginDto });
        try {
            const user = await this.userRepository.findUserWithMobileNumber(sanitizedIdentifier);
            if (!user) {
                throw new common_1.UnauthorizedException({
                    message: 'Invalid email or password',
                    statusCode: 401,
                });
            }
            if (user.is_active !== 1) {
                throw new common_1.UnauthorizedException({
                    message: 'User is deactivated. Contact administrator.',
                    statusCode: 401,
                });
            }
            const isPasswordValid = await this.userRepository.validatePassword(password, user.password);
            if (!isPasswordValid) {
                throw new common_1.UnauthorizedException({
                    message: 'Invalid email or password',
                    statusCode: 401,
                });
            }
            await this.userRepository.update(user.user_id, {
                last_login_at: new Date(),
            });
            const latestUser = await this.userRepository.findOne({
                where: { user_id: user.user_id },
                select: ['user_id', 'invite_status', 'invite_expires_at'],
            });
            if (latestUser?.invite_status === register_user_login_entity_1.InviteStatus.EXPIRED) {
                throw new common_1.UnauthorizedException({
                    message: 'Your invitation has expired. Please contact administrator.',
                    statusCode: 401,
                });
            }
            if (latestUser?.invite_status === register_user_login_entity_1.InviteStatus.INVITED) {
                if (latestUser.invite_expires_at &&
                    new Date() > new Date(latestUser.invite_expires_at)) {
                    await this.userRepository.update({ user_id: user.user_id }, { invite_status: register_user_login_entity_1.InviteStatus.EXPIRED });
                    throw new common_1.UnauthorizedException({
                        message: 'Your invitation has expired. Please contact administrator.',
                        statusCode: 401,
                    });
                }
                const updateResult = await this.userRepository.update({
                    user_id: user.user_id,
                    invite_status: register_user_login_entity_1.InviteStatus.INVITED,
                }, {
                    invite_status: register_user_login_entity_1.InviteStatus.ACCEPTED,
                    invite_expires_at: null,
                });
                if (updateResult.affected === 0) {
                    throw new common_1.UnauthorizedException({
                        message: 'Invitation is no longer valid.',
                        statusCode: 401,
                    });
                }
                user.invite_status = register_user_login_entity_1.InviteStatus.ACCEPTED;
                await this.redisService.delByPatternInTenant(`org_${user.organization.organization_schema_name}`, 'organization-users:*');
            }
            const mustChangePassword = user.force_password_change === true;
            if (!user.passwordSet) {
                await this.userRepository.update(user.user_id, {
                    passwordReset: 'Y',
                });
            }
            const organizationSchema = `org_${user.organization.organization_schema_name}`;
            await this.setSchema(organizationSchema);
            const query = `
        SELECT r.role_id, r.role_name, r.is_compulsary,
              u.user_id, u.first_name, u.last_name,
              u.profile_image, u.role_id, u.branch_access
        FROM ${organizationSchema}.users u
        LEFT JOIN ${organizationSchema}.organization_roles r
          ON u.role_id = r.role_id
        WHERE u.register_user_login_id = $1
          AND u.is_active = 1
          AND u.is_deleted = 0
        LIMIT 1;
      `;
            const result = await this.userRepository.query(query, [user.user_id]);
            if (!result || result.length === 0) {
                throw new common_1.BadRequestException('User is not active or role not found');
            }
            const { role_id, role_name, is_compulsary, branch_access } = result[0];
            await this.userRepository.query(`UPDATE ${organizationSchema}.users 
            SET last_login = NOW() 
            WHERE user_id = $1`, [result[0].user_id]);
            const branchAccessArray = branch_access || [];
            const policyData = await this.policyBuilderService.getPoliciesByRole(role_id.toString());
            const sidebarUser = await this.userRepo.findOne({
                where: { register_user_login_id: user.user_id },
                select: ['sidebarprefs', 'favorites_sidebar_menu', 'theme_preferences'],
            });
            const sidebarPreferences = sidebarUser?.sidebarprefs || null;
            const favourites = sidebarUser?.favorites_sidebar_menu || null;
            const themePreferences = sidebarUser?.theme_preferences || null;
            const organization = await this.organizationalProfileRepo.findOne({
                where: { organization_profile_id: 1 },
                select: ['othersetting', 'it_act_enabled', 'company_act_enabled'],
            });
            const othersettingsPreferences = {
                ...(organization?.othersetting || {}),
                it_act_enabled: organization?.it_act_enabled ?? false,
                company_act_enabled: organization?.company_act_enabled ?? false,
            };
            const rawSidebarMenus = await this.assetItemsService.getSidebarMenuOption();
            const barcodeandqrcodepref = await this.orgProfileService.getBarcodeQrSettings('Global');
            if (is_compulsary === true) {
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const otpExpiry = new Date();
                otpExpiry.setMinutes(otpExpiry.getMinutes() + 5);
                await this.userRepository.update(user.user_id, {
                    otp,
                    otp_expiry: otpExpiry,
                });
                await this.mailService.sendEmail(email, 'OTP for Login Verification', await (0, render_email_1.renderEmail)(render_email_1.EmailTemplate.AUTH_LOGIN_VERIFICATION, { name: `${user.first_name} ${user.last_name}`, otp }, this.mailConfigService));
            }
            if (is_compulsary === true) {
                if (response)
                    await this.setPendingLoginOtp(response, user.user_id, !!rememberMe);
                return {
                    success: true,
                    message: 'OTP verification required',
                    status: 200,
                    data: {
                        otp_required: true,
                        user_id: user.user_id,
                        organization_id: user.organization.organization_id,
                        billingOrgId: user.org_billing_id,
                        role: { role_id, role_name, is_compulsary },
                        force_password_change: mustChangePassword,
                        passwordSet: user.passwordSet,
                    },
                };
            }
            const permissions = policyData || {};
            const { sessionId, permissionToken } = await this.issueLoginSession(user, result[0], branchAccessArray, policyData, !!rememberMe, req, response);
            return {
                success: true,
                message: mustChangePassword
                    ? 'Password change required'
                    : 'Login successful',
                status: 200,
                data: {
                    permissionToken,
                    session_fingerprint: (0, session_binding_1.sessionFingerprint)(sessionId),
                    user_id: user.user_id,
                    main_user_id: result[0].user_id,
                    organization_id: user.organization.organization_id,
                    billingOrgId: user.org_billing_id,
                    role_id,
                    role: { role_id, role_name, is_compulsary },
                    force_password_change: mustChangePassword,
                    loginusersidebarpref: sidebarPreferences,
                    favourites,
                    themePreferences,
                    projectandcostcenterpref: othersettingsPreferences,
                    rawSidebarMenus,
                    barcodeandqrcodepref,
                    passwordSet: user.passwordSet,
                    organization_schema_name: user.organization.organization_schema_name,
                    permissions,
                    userData: result[0],
                    profile_image: result[0].profile_image,
                    branch_access: branchAccessArray,
                },
            };
        }
        catch (error) {
            console.log('Error from login:', error);
            throw error instanceof common_1.UnauthorizedException ||
                error instanceof common_1.BadRequestException
                ? error
                : new common_1.InternalServerErrorException('Internal server error');
        }
    }
    async issueLoginSession(user, tenantRow, branchAccessArray, policyData, rememberMe, req, response) {
        const role_id = tenantRow.role_id;
        const result = [tenantRow];
        const accessExpiry = rememberMe
            ? (process.env.JWT_ACCESS_EXPIRATION_REMEMBER ??
                process.env.JWT_ACCESS_EXPIRATION)
            : process.env.JWT_ACCESS_EXPIRATION;
        const refreshExpiry = rememberMe
            ? (process.env.JWT_REFRESH_EXPIRATION_REMEMBER ??
                process.env.JWT_REFRESH_EXPIRATION)
            : process.env.JWT_REFRESH_EXPIRATION;
        console.log('🔑 accessExpiry:', accessExpiry);
        console.log('🔑 refreshExpiry:', refreshExpiry);
        await this.endBrowserSession(req);
        const sessionId = (0, uuid_1.v4)();
        const tokens = await this.tokenService.generateTokens(user, accessExpiry, refreshExpiry, {
            sessionId,
            organizationId: user.organization.organization_id,
        });
        console.log('💾 Saving session...');
        await this.sessionRepository.insert({
            user_id: user.user_id,
            session_id: sessionId,
            device_name: req.headers['user-agent'] || 'unknown',
            device_type: 'desktop',
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            login_at: new Date(),
            last_seen: new Date(),
            is_active: true,
            refresh_token: (0, session_binding_1.hashRefreshToken)(tokens.refreshToken),
        });
        console.log('✅ Session saved');
        const permissions = policyData || {};
        console.log('🔐 Signing permission token...');
        const privateKey = fs.readFileSync(path.resolve(process.cwd(), process.env.JWT_PRIVATE_KEY || './keys/private.pem'), 'utf8');
        const privateKeyObj = await (0, jose_1.importPKCS8)(privateKey, 'RS256');
        const permissionToken = await new jose_1.SignJWT({
            sub: String(user.user_id),
            role_id,
            sessionId,
            permissions,
        })
            .setProtectedHeader({ alg: 'RS256' })
            .setIssuedAt()
            .setExpirationTime(process.env.PERM_TOKEN_EXPIRY || '1h')
            .sign(privateKeyObj);
        if (response) {
            this.setAuthCookies(response, tokens, (0, crypto_utils_1.encrypt)(user.user_id.toString()), (0, crypto_utils_1.encrypt)(result[0].user_id.toString()), (0, crypto_utils_1.encrypt)(result[0].role_id.toString()), (0, crypto_utils_1.encrypt)(user.organization.organization_schema_name), (0, crypto_utils_1.encrypt)(user.organization.organization_id.toString()), (0, crypto_utils_1.encrypt)(result[0]?.permissions), sessionId, req, permissionToken, branchAccessArray, rememberMe);
        }
        return { sessionId, permissionToken };
    }
    otpPendingSecret() {
        return new TextEncoder().encode(`${process.env.JWT_ACCESS_SECRET_KEY || ''}::login-otp::v1`.padEnd(32, '0'));
    }
    async setPendingLoginOtp(response, userId, rememberMe) {
        const token = await new jose_1.SignJWT({ pur: 'login-otp', rm: rememberMe ? 1 : 0 })
            .setProtectedHeader({ alg: 'HS256' })
            .setSubject(String(userId))
            .setIssuedAt()
            .setExpirationTime('10m')
            .sign(this.otpPendingSecret());
        response.cookie('otp_pending', token, (0, cookie_config_1.authCookieOptions)({ maxAge: 10 * 60 * 1000 }));
    }
    async verifyLoginOtp(req, res, otp) {
        const cookies = req.cookies ?? (0, cookie_1.parse)(req.headers.cookie || '');
        const pending = cookies.otp_pending;
        if (!pending) {
            throw new common_1.UnauthorizedException('Your verification step has expired. Please sign in again.');
        }
        let userId;
        let rememberMe = false;
        try {
            const { payload } = await (0, jose_1.jwtVerify)(pending, this.otpPendingSecret(), { algorithms: ['HS256'] });
            if (payload.pur !== 'login-otp')
                throw new Error('wrong purpose');
            userId = Number(payload.sub);
            rememberMe = payload.rm === 1;
        }
        catch {
            throw new common_1.UnauthorizedException('Your verification step has expired. Please sign in again.');
        }
        const attemptsKey = `auth:login-otp-attempts:${userId}`;
        const user = await this.userRepository.findOne({
            where: { user_id: userId },
            relations: ['organization'],
        });
        if (!user || user.is_active !== 1)
            throw new common_1.UnauthorizedException('User is inactive');
        if (!/^\d{6}$/.test(String(otp || '')) || !user.otp || String(user.otp) !== String(otp)) {
            const attempts = await this.redisService.incr(attemptsKey);
            if (attempts >= 5) {
                await this.userRepository.update(user.user_id, { otp: null, otp_expiry: null });
                await this.redisService.del(attemptsKey);
                res.clearCookie('otp_pending', (0, cookie_config_1.clearCookieOptions)());
                throw new common_1.UnauthorizedException('Too many incorrect codes. Please sign in again.');
            }
            throw new common_1.BadRequestException('Invalid OTP.');
        }
        if (!user.otp_expiry || new Date() > user.otp_expiry) {
            throw new common_1.GoneException('OTP has expired.');
        }
        await this.userRepository.update(user.user_id, { otp: null, otp_expiry: null });
        await this.redisService.del(attemptsKey);
        const organizationSchema = `org_${user.organization.organization_schema_name}`;
        await this.setSchema(organizationSchema);
        const rows = await this.userRepository.query(`SELECT r.role_id, u.user_id, u.branch_access
         FROM ${organizationSchema}.users u
         LEFT JOIN ${organizationSchema}.organization_roles r ON u.role_id = r.role_id
        WHERE u.register_user_login_id = $1 AND u.is_active = 1 AND u.is_deleted = 0
        LIMIT 1`, [user.user_id]);
        if (!rows?.length)
            throw new common_1.UnauthorizedException('User is not active or role not found');
        const policyData = await this.policyBuilderService.getPoliciesByRole(String(rows[0].role_id));
        await this.endBrowserSession(req);
        const { sessionId } = await this.issueLoginSession(user, rows[0], rows[0].branch_access || [], policyData, rememberMe, req, res);
        res.clearCookie('otp_pending', (0, cookie_config_1.clearCookieOptions)());
        return {
            status: 200,
            message: 'OTP verified. You are signed in.',
            session_fingerprint: (0, session_binding_1.sessionFingerprint)(sessionId),
        };
    }
    setAuthCookies(response, tokens, encryptedUserId, encryptedMainUserId, encryptedRoleId, encryptedSchemaName, encryptedOrganizationId, encryptedPermissions, sessionId, req, permissionToken, branchAccessArray, rememberMe) {
        const cookieOptions = (0, cookie_config_1.authCookieOptions)(rememberMe ? { maxAge: (0, cookie_config_1.getRememberMeMaxAgeMs)() } : {});
        response.cookie('jwtToken', tokens.accessToken, cookieOptions);
        response.cookie('jwt_refresh_token', tokens.refreshToken, cookieOptions);
        response.cookie('system_user_id', encryptedUserId, cookieOptions);
        response.cookie('session_id', sessionId, cookieOptions);
        response.cookie('x-organization-schema', encryptedSchemaName, cookieOptions);
        response.cookie('organization_id', encryptedOrganizationId, cookieOptions);
        response.cookie('role_id', encryptedRoleId, cookieOptions);
        response.cookie('main_user_id', encryptedMainUserId, cookieOptions);
        if (encryptedPermissions !== undefined && encryptedPermissions !== null) {
            response.cookie('permissions', encryptedPermissions, cookieOptions);
        }
        if (permissionToken) {
            response.cookie('permissionToken', permissionToken, cookieOptions);
        }
        response.cookie('branch_access', JSON.stringify(branchAccessArray ?? []), cookieOptions);
    }
    clearAuthCookies(response) {
        const variants = [
            (0, cookie_config_1.clearCookieOptions)(),
            ...(0, cookie_config_1.legacyClearCookieOptionVariants)(),
        ];
        cookie_config_1.AUTH_COOKIE_NAMES.forEach((name) => {
            variants.forEach((opts) => {
                response.clearCookie(name, opts);
            });
        });
        const clearRaw = response.clearRawCookie;
        const legacyEnabled = (process.env.AUTH_COOKIE_CLEAR_LEGACY || 'true').toLowerCase() !== 'false';
        if (typeof clearRaw === 'function' && (0, cookie_namespace_1.getAuthCookiePrefix)() && legacyEnabled) {
            cookie_config_1.AUTH_COOKIE_NAMES.forEach((name) => {
                variants.forEach((opts) => clearRaw(name, opts));
            });
        }
    }
    readTokenExpiryMs(token) {
        if (!token)
            return null;
        try {
            const payloadSegment = token.split('.')[1];
            if (!payloadSegment)
                return null;
            const payload = JSON.parse(Buffer.from(payloadSegment, 'base64').toString('utf8'));
            return payload?.exp ? payload.exp * 1000 : null;
        }
        catch {
            return null;
        }
    }
    async getSessionContext(req, response) {
        const cookies = req.cookies ?? (0, cookie_1.parse)(req.headers.cookie || '');
        const sessionId = cookies.session_id;
        const encryptedSystemUserId = cookies.system_user_id;
        if (!sessionId || !encryptedSystemUserId) {
            throw new common_1.UnauthorizedException('No active session');
        }
        let registerUserLoginId;
        try {
            registerUserLoginId = Number((0, crypto_utils_1.decrypt)(encryptedSystemUserId));
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid session');
        }
        if (!Number.isFinite(registerUserLoginId)) {
            throw new common_1.UnauthorizedException('Invalid session');
        }
        const session = await this.sessionRepository.findOne({
            where: { session_id: sessionId, user_id: registerUserLoginId },
        });
        if (!session || !session.is_active || session.is_blocked) {
            throw new common_1.UnauthorizedException('Session is inactive or blocked');
        }
        const account = await this.userRepository.findOne({
            where: { user_id: registerUserLoginId },
            relations: ['organization'],
        });
        if (!account || !account.organization) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const organizationSchema = `org_${account.organization.organization_schema_name}`;
        await this.setSchema(organizationSchema);
        const rows = await this.userRepository.query(`
        SELECT r.role_id, r.role_name, r.is_compulsary,
               u.user_id, u.first_name, u.last_name,
               u.profile_image, u.branch_access
        FROM ${organizationSchema}.users u
        LEFT JOIN ${organizationSchema}.organization_roles r
          ON u.role_id = r.role_id
        WHERE u.register_user_login_id = $1
          AND u.is_active = 1
          AND u.is_deleted = 0
        LIMIT 1;
      `, [registerUserLoginId]);
        if (!rows || rows.length === 0) {
            throw new common_1.UnauthorizedException('User is not active or role not found');
        }
        const tenantUser = rows[0];
        const roleId = tenantUser.role_id;
        const permissions = roleId
            ? ((await this.policyBuilderService.getPoliciesByRole(roleId.toString())) ?? {})
            : {};
        let permissionToken = null;
        try {
            const privateKey = fs.readFileSync(path.resolve(process.cwd(), process.env.JWT_PRIVATE_KEY || './keys/private.pem'), 'utf8');
            const privateKeyObj = await (0, jose_1.importPKCS8)(privateKey, 'RS256');
            permissionToken = await new jose_1.SignJWT({
                sub: String(registerUserLoginId),
                role_id: roleId,
                sessionId,
                permissions,
            })
                .setProtectedHeader({ alg: 'RS256' })
                .setIssuedAt()
                .setExpirationTime(process.env.PERM_TOKEN_EXPIRY || '1h')
                .sign(privateKeyObj);
        }
        catch (error) {
            console.error('Failed to sign permission token for /auth/me:', error);
        }
        if (response && permissionToken) {
            response.cookie('permissionToken', permissionToken, (0, cookie_config_1.authCookieOptions)());
        }
        const refreshExpiresAt = this.readTokenExpiryMs(cookies.jwt_refresh_token);
        const accessExpiresAt = this.readTokenExpiryMs(cookies.jwtToken);
        return {
            authenticated: true,
            user: {
                user_id: tenantUser.user_id,
                main_user_id: tenantUser.user_id,
                system_user_id: registerUserLoginId,
                first_name: tenantUser.first_name ?? account.first_name ?? null,
                last_name: tenantUser.last_name ?? account.last_name ?? null,
                email: account.business_email ?? null,
                profile_image: tenantUser.profile_image ?? null,
                passwordSet: account.passwordSet ?? null,
                force_password_change: account.force_password_change ?? false,
            },
            role: {
                role_id: roleId ?? null,
                role_name: tenantUser.role_name ?? null,
                is_compulsary: tenantUser.is_compulsary ?? false,
            },
            permissions,
            permissionToken,
            organization: {
                organization_id: account.organization.organization_id,
                organization_schema_name: account.organization.organization_schema_name,
                billingOrgId: account.org_billing_id ?? null,
            },
            branch_access: tenantUser.branch_access ?? [],
            session: {
                session_id: (0, session_binding_1.sessionFingerprint)(sessionId),
                fingerprint: (0, session_binding_1.sessionFingerprint)(sessionId),
                access_expires_at: accessExpiresAt,
                refresh_expires_at: refreshExpiresAt,
                expires_in_ms: refreshExpiresAt
                    ? Math.max(0, refreshExpiresAt - Date.now())
                    : null,
            },
        };
    }
    async logout(req, res) {
        try {
            const cookies = (0, cookie_1.parse)(req.headers.cookie || '');
            const sessionId = cookies.session_id;
            if (sessionId) {
                await this.sessionRepository.update({ session_id: sessionId }, {
                    is_active: false,
                    logout_at: new Date(),
                    refresh_token: null,
                });
                (0, session_context_1.invalidateTenantUserContext)(sessionId);
            }
            this.clearAuthCookies(res);
            return { message: 'Logged out successfully' };
        }
        catch (error) {
            console.error('Logout error:', error);
            throw new common_1.HttpException({ message: 'Logout failed', error: error.message }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async logoutAllSessions(userId, res) {
        try {
            await this.sessionRepository.update({ user_id: userId, is_active: true }, { is_active: false, logout_at: new Date(), refresh_token: null });
            await this.userRepository.update(userId, { refreshToken: null });
            this.clearAuthCookies(res);
            return { message: 'Logged out from all sessions successfully' };
        }
        catch (error) {
            console.error('Logout all sessions error:', error);
            throw new common_1.HttpException({ message: 'Logout failed', error: error.message }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async forceLogoutByUserId(localUserId, req) {
        const manager = this.sessionRepository.manager;
        const ctx = (0, special_permission_1.requireAuthContext)(req);
        if (Number(localUserId) !== ctx.tenantUserId) {
            await (0, special_permission_1.assertSpecialPermission)(manager, req, 'logout_all_session', 'You do not have permission to log out other users.');
        }
        const publicUserId = await (0, special_permission_1.resolveTenantUserAccount)(manager, ctx.organizationSchema, Number(localUserId));
        if (!publicUserId) {
            throw new common_1.NotFoundException('User not found in your organization');
        }
        await this.sessionRepository
            .createQueryBuilder()
            .update()
            .set({ force_logout: true, is_active: false, logout_at: new Date(), refresh_token: null })
            .where('user_id = :uid', { uid: publicUserId })
            .andWhere('is_active = true')
            .execute();
        await this.userRepository.update(publicUserId, { refreshToken: null });
        return {
            status: 'success',
            message: 'All sessions forcibly logged out for this user',
        };
    }
    async fetchUserLoginProfile(login_user_id) {
        const userExists = await this.userRepository.findOne({
            where: { user_id: login_user_id },
        });
        if (!userExists) {
            throw new common_1.HttpException({
                status: common_1.HttpStatus.BAD_REQUEST,
                message: 'Invalid createdBy user ID',
            }, common_1.HttpStatus.BAD_REQUEST);
        }
        return userExists;
    }
    async getApiKey() {
        return await this.configRepository.getJwtSecret();
    }
    assertPasswordPolicy(newPassword) {
        if (typeof newPassword !== 'string' ||
            newPassword.length < 8 ||
            newPassword.length > 128 ||
            !/[a-z]/.test(newPassword) ||
            !/[A-Z]/.test(newPassword) ||
            !/\d/.test(newPassword)) {
            throw new common_1.BadRequestException('Password must be at least 8 characters and contain uppercase, lowercase and a number.');
        }
    }
    async applyNewPassword(account, newPassword, opts = {}) {
        this.assertPasswordPolicy(newPassword);
        if (account.password && (await bcrypt.compare(newPassword, account.password))) {
            throw new common_1.BadRequestException('New password cannot be the same as your current password.');
        }
        if (opts.acceptInvite && account.invite_status === register_user_login_entity_1.InviteStatus.EXPIRED) {
            throw new common_1.UnauthorizedException('Invite link has expired. Please request a new invitation.');
        }
        const hashed = await bcrypt.hash(newPassword, 10);
        await this.userRepository.update(account.user_id, {
            password: hashed,
            passwordSet: true,
            verified: true,
            passwordReset: 'N',
            force_password_change: false,
            refreshToken: null,
            ...(opts.acceptInvite && account.invite_status === register_user_login_entity_1.InviteStatus.INVITED
                ? { invite_status: register_user_login_entity_1.InviteStatus.ACCEPTED, invite_expires_at: null }
                : {}),
        });
        const withOrg = account.organization ??
            (await this.userRepository.findOne({
                where: { user_id: account.user_id },
                relations: ['organization'],
            }))?.organization;
        const schemaName = withOrg?.organization_schema_name;
        if (schemaName && /^[A-Za-z0-9_]+$/.test(schemaName)) {
            await this.userRepository.query(`UPDATE "org_${schemaName}".users
            SET password = $1, updated_at = NOW()
          WHERE register_user_login_id = $2`, [hashed, account.user_id]);
        }
        const qb = this.sessionRepository
            .createQueryBuilder()
            .update()
            .set({ is_active: false, logout_at: new Date(), refresh_token: null })
            .where('user_id = :uid', { uid: account.user_id })
            .andWhere('is_active = true');
        if (opts.keepSessionId) {
            qb.andWhere('session_id <> :sid', { sid: opts.keepSessionId });
        }
        await qb.execute();
        if (schemaName) {
            await this.redisService.delByPatternInTenant(`org_${schemaName}`, 'organization-users:*');
        }
    }
    async resetPasswordWithLink(token, newPassword) {
        if (!token) {
            throw new common_1.UnauthorizedException('This password link is invalid or has expired. Please ask for a new one.');
        }
        const check = await (0, password_reset_token_1.verifyPasswordLinkToken)(token, (id) => this.userRepository.findOne({ where: { user_id: id } }));
        if (check.valid === false) {
            throw new common_1.GoneException((0, password_reset_token_1.passwordLinkErrorMessage)(check.reason));
        }
        const account = await this.userRepository.findOne({
            where: { user_id: check.userId },
            relations: ['organization'],
        });
        if (!account)
            throw new common_1.GoneException((0, password_reset_token_1.passwordLinkErrorMessage)('invalid'));
        if (account.is_active !== 1) {
            throw new common_1.UnauthorizedException('User is deactivated. Contact administrator.');
        }
        await this.applyNewPassword(account, newPassword, { acceptInvite: true });
        return {
            status: 200,
            message: 'Password has been set. Please sign in with your new password.',
            email: account.business_email,
        };
    }
    async changeOwnPassword(req, currentPassword, newPassword) {
        const cookies = req.cookies ?? (0, cookie_1.parse)(req.headers.cookie || '');
        const userId = Number((0, crypto_utils_1.decrypt)(String(cookies.system_user_id)));
        const sessionId = cookies.session_id;
        const account = await this.userRepository.findOne({
            where: { user_id: userId },
            relations: ['organization'],
        });
        if (!account)
            throw new common_1.UnauthorizedException('User not found');
        if (!currentPassword) {
            throw new common_1.BadRequestException('Current password is required');
        }
        if (!account.password || !(await bcrypt.compare(currentPassword, account.password))) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        await this.applyNewPassword(account, newPassword, {
            keepSessionId: sessionId,
            acceptInvite: true,
        });
        (0, session_context_1.invalidateTenantUserContext)(sessionId);
        return { status: 200, message: 'Password updated successfully.' };
    }
    async validatePasswordLink(token) {
        const check = await (0, password_reset_token_1.verifyPasswordLinkToken)(token, (id) => this.userRepository.findOne({ where: { user_id: id } }));
        if (check.valid === false) {
            return { valid: false, message: (0, password_reset_token_1.passwordLinkErrorMessage)(check.reason) };
        }
        const account = await this.userRepository.findOne({ where: { user_id: check.userId } });
        if (!account || account.is_active !== 1) {
            return { valid: false, message: (0, password_reset_token_1.passwordLinkErrorMessage)('invalid') };
        }
        if (account.invite_status === register_user_login_entity_1.InviteStatus.EXPIRED) {
            return { valid: false, message: 'This invitation has expired. Please contact your administrator.' };
        }
        return { valid: true, email: account.business_email, purpose: check.purpose };
    }
    async createPasswordLinkToken(userId, purpose) {
        const account = await this.userRepository.findOne({ where: { user_id: userId } });
        if (!account)
            throw new common_1.NotFoundException('User not found');
        return (0, password_reset_token_1.issuePasswordLinkToken)(account, purpose);
    }
    async validatePasswordResetLink(userId) {
        void userId;
        return false;
    }
    async findByEmail(email) {
        if (!email?.trim()) {
            return null;
        }
        return this.userRepository.findOne({
            where: {
                business_email: (0, typeorm_2.ILike)(email.trim()),
            },
        });
    }
    async sendOtpForPasswordReset(email) {
        const normalizedEmail = email?.trim();
        if (!normalizedEmail) {
            return {
                status: 400,
                message: 'Business email is required.',
                data: null,
            };
        }
        const user = await this.userRepository.findByEmail(normalizedEmail);
        if (!user) {
            console.log('[Forgot Password] Business email not found.');
            return {
                status: 404,
                message: 'Business email does not exist.',
                data: null,
            };
        }
        console.log('[Forgot Password] User found:', {
            user_id: user.user_id,
            business_email: user.business_email,
        });
        if (user.invite_status === 'EXPIRED') {
            return {
                status: 400,
                message: 'This account invitation has expired.',
                data: null,
            };
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date();
        otpExpiry.setMinutes(otpExpiry.getMinutes() + 5);
        try {
            await this.userRepository.update(user.user_id, {
                otp,
                otp_expiry: otpExpiry,
            });
            const FORGOT_PASSWORD_EVENT_ID = 1;
            const contextData = {
                updatedUser: {
                    first_name: user.first_name,
                    last_name: user.last_name,
                    otp,
                    otp_code: otp,
                    user_otp: otp,
                    redirection_link: '',
                },
            };
            if (user.business_email) {
                const recipients = [
                    {
                        recipient_type: 'user',
                        recipient_id: String(user.user_id),
                        recipient_email: user.business_email,
                        recipient_contact: user.phone_number,
                    },
                ];
                try {
                    await this.notificationHelper.triggerEventNotification({
                        eventId: FORGOT_PASSWORD_EVENT_ID,
                        contextData,
                        recipients,
                        meta: {
                            trace_id: `FORGOT_PASSWORD_${user.user_id}`,
                        },
                    });
                }
                catch (err) {
                    console.error('Notification failed:', err.message);
                }
            }
            else {
                console.error('[Forgot Password] User has no business email configured.');
                return {
                    status: 400,
                    message: 'No business email is configured for this account.',
                    data: null,
                };
            }
            return {
                status: 200,
                message: 'Verification code has been sent.',
                data: {
                    user_id: user.user_id,
                    email: user.business_email,
                },
            };
        }
        catch (error) {
            console.error('Failed to process OTP reset:', error);
            throw new common_1.HttpException('Failed to process password reset request.', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async verifyForgotPasswordOtp(verifyOtpDto, res) {
        const { otp, user_id } = verifyOtpDto;
        void res;
        const attemptsKey = `auth:fp-otp-attempts:${user_id}`;
        const account = await this.userRepository.findOne({ where: { user_id } });
        if (!account || !account.otp || String(account.otp) !== String(otp)) {
            const attempts = await this.redisService.incr(attemptsKey);
            if (attempts >= 5 && account) {
                await this.userRepository.update(account.user_id, { otp: null, otp_expiry: null });
                await this.redisService.del(attemptsKey);
                throw new common_1.BadRequestException({
                    statusCode: 400,
                    message: 'Too many incorrect codes. Please request a new OTP.',
                });
            }
            throw new common_1.BadRequestException({
                statusCode: 400,
                message: 'Invalid OTP or user not found.',
            });
        }
        if (!account.otp_expiry || new Date() > account.otp_expiry) {
            throw new common_1.HttpException({ statusCode: 410, message: 'OTP has expired.' }, common_1.HttpStatus.GONE);
        }
        await this.userRepository.update(account.user_id, { otp: null, otp_expiry: null });
        await this.redisService.del(attemptsKey);
        const resetToken = await (0, password_reset_token_1.issuePasswordLinkToken)(account, 'otp');
        return {
            statusCode: 200,
            message: 'OTP has been verified.',
            resetToken,
        };
    }
    async endBrowserSession(req) {
        try {
            const cookies = req.cookies ?? (0, cookie_1.parse)(req.headers?.cookie || '');
            const sessionId = cookies?.session_id;
            if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId))
                return;
            await this.sessionRepository.update({ session_id: sessionId, is_active: true }, { is_active: false, logout_at: new Date(), refresh_token: null });
            (0, session_context_1.invalidateTenantUserContext)(sessionId);
        }
        catch (error) {
            console.error('endBrowserSession failed:', error?.message);
        }
    }
    async setSchema(schema) {
        const queryRunner = this.userRepository.manager.connection.createQueryRunner();
        await queryRunner.startTransaction();
        try {
            await queryRunner.query(`SET search_path TO ${schema}, public`);
            await queryRunner.commitTransaction();
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw new Error(`Failed to set schema: ${error.message}`);
        }
        finally {
            await queryRunner.release();
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(7, (0, typeorm_1.InjectRepository)(user_repository_1.UserRepository)),
    __param(9, (0, typeorm_1.InjectRepository)(sessions_entity_1.Session)),
    __param(10, (0, typeorm_1.InjectRepository)(register_user_login_entity_1.RegisterUserLogin)),
    __param(11, (0, typeorm_1.InjectRepository)(organizational_profile_entity_1.OrganizationalProfile)),
    __param(12, (0, typeorm_1.InjectRepository)(organizational_user_entity_1.User)),
    __param(13, (0, typeorm_1.InjectRepository)(casbin_rule_entity_1.CasbinRule)),
    __metadata("design:paramtypes", [token_service_1.TokenService,
        redis_service_1.RedisService,
        mail_config_service_1.MailConfigService,
        mail_service_1.MailService,
        organizational_profile_service_1.OrganizationService,
        asset_items_service_1.AssetItemsService,
        notifications_helper_1.NotificationHelper,
        user_repository_1.UserRepository,
        config_repository_1.ConfigRepository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        policy_builder_service_1.PolicyBuilderService])
], AuthService);
