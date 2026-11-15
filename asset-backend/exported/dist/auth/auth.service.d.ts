import { Request, Response } from 'express';
import { ConfigRepository } from 'src/config/config.repository';
import { RegisterUserLogin } from '../organization_register/entities/register-user-login.entity';
import { VerifyOtpDto } from '../organization_register/verify-otp.dto';
import { UserRepository } from '../user/user.repository';
import { LoginDto } from './dto/login.dto';
import { AssetItemsService } from 'src/assets-data/asset-items/asset-items.service';
import { MailService } from 'src/common/mail/mail.service';
import { NotificationHelper } from 'src/common/notifications/notifications.helper';
import { RedisService } from 'src/common/redis/redis.service';
import { OrganizationalProfile } from 'src/organizational-profile/entity/organizational-profile.entity';
import { User } from 'src/organizational-profile/entity/organizational-user.entity';
import { CasbinRule } from 'src/organizational-profile/entity/policy-builder/casbin-rule.entity';
import { OrganizationService } from 'src/organizational-profile/organizational-profile.service';
import { PolicyBuilderService } from 'src/organizational-profile/policy-builder.service';
import { Session } from 'src/organizational-profile/public_schema_entity/sessions.entity';
import { Repository } from 'typeorm';
import { MailConfigService } from '../common/mail/mail-config.service';
import { TokenService } from './token.service';
export declare class AuthService {
    private readonly tokenService;
    private readonly redisService;
    private readonly mailConfigService;
    private readonly mailService;
    private readonly orgProfileService;
    private readonly assetItemsService;
    private readonly notificationHelper;
    private userRepository;
    private readonly configRepository;
    private readonly sessionRepository;
    private readonly registerserRepository;
    private readonly organizationalProfileRepo;
    private readonly userRepo;
    private casbinRuleRepo;
    private readonly policyBuilderService;
    constructor(tokenService: TokenService, redisService: RedisService, mailConfigService: MailConfigService, mailService: MailService, orgProfileService: OrganizationService, assetItemsService: AssetItemsService, notificationHelper: NotificationHelper, userRepository: UserRepository, configRepository: ConfigRepository, sessionRepository: Repository<Session>, registerserRepository: Repository<RegisterUserLogin>, organizationalProfileRepo: Repository<OrganizationalProfile>, userRepo: Repository<User>, casbinRuleRepo: Repository<CasbinRule>, policyBuilderService: PolicyBuilderService);
    validateUser(loginDto: LoginDto, response: Response, req: Request): Promise<{
        success: boolean;
        message: string;
        data?: any;
        status: number;
    }>;
    private issueLoginSession;
    private otpPendingSecret;
    private setPendingLoginOtp;
    verifyLoginOtp(req: Request, res: Response, otp: string): Promise<{
        status: number;
        message: string;
        session_fingerprint: string;
    }>;
    private setAuthCookies;
    clearAuthCookies(response: Response): void;
    private readTokenExpiryMs;
    getSessionContext(req: Request, response?: Response): Promise<any>;
    logout(req: Request, res: Response): Promise<{
        message: string;
    }>;
    logoutAllSessions(userId: number, res: Response): Promise<{
        message: string;
    }>;
    forceLogoutByUserId(localUserId: number, req: Request): Promise<{
        status: string;
        message: string;
    }>;
    fetchUserLoginProfile(login_user_id: number): Promise<RegisterUserLogin>;
    getApiKey(): Promise<string | null>;
    private assertPasswordPolicy;
    private applyNewPassword;
    resetPasswordWithLink(token: string, newPassword: string): Promise<{
        status: number;
        message: string;
        email?: string;
    }>;
    changeOwnPassword(req: Request, currentPassword: string, newPassword: string): Promise<{
        status: number;
        message: string;
    }>;
    validatePasswordLink(token: string): Promise<{
        valid: boolean;
        message?: string;
        email?: string;
        purpose?: string;
    }>;
    createPasswordLinkToken(userId: number, purpose: 'reset' | 'invite' | 'otp'): Promise<string>;
    validatePasswordResetLink(userId: number): Promise<boolean>;
    findByEmail(email: string): Promise<RegisterUserLogin>;
    sendOtpForPasswordReset(email: string): Promise<any>;
    verifyForgotPasswordOtp(verifyOtpDto: VerifyOtpDto, res: Response): Promise<any>;
    endBrowserSession(req: Request): Promise<void>;
    private setSchema;
}
