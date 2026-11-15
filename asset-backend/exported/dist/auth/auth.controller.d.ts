import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RedisService } from 'src/common/redis/redis.service';
export declare class AuthController {
    private authService;
    private readonly dataSource;
    private redisService;
    constructor(authService: AuthService, dataSource: DataSource, redisService: RedisService);
    login(loginDto: LoginDto, response: Response, req: Request): Promise<{
        success: boolean;
        message: string;
        data?: any;
        status: number;
    }>;
    getMe(req: Request, response: Response): Promise<any>;
    fetchUserLoginProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getApiKey(res: any): Promise<any>;
    updatePassword(res: Response, body: {
        token?: string;
        newPassword?: string;
    }): Promise<Response<any, Record<string, any>>>;
    changePassword(req: Request, res: Response, body: {
        currentPassword?: string;
        oldPassword?: string;
        newPassword?: string;
    }): Promise<Response<any, Record<string, any>>>;
    checkSession(req: Request): {
        status: string;
        user_id: any;
        session_id: any;
    } | {
        status: string;
        user_id?: undefined;
        session_id?: undefined;
    };
    logout(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    logoutAll(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    logoutAllById(userId: number, req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    validateToken(): Promise<{
        message: string;
    }>;
    validateResetLink(token: string): Promise<{
        valid: boolean;
        message?: string;
        email?: string;
        purpose?: string;
    }>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto, res: Response, req: Request): Promise<Response<any, Record<string, any>>>;
    verifyLoginOtp(req: Request, res: Response, body: {
        otp?: string;
    }): Promise<Response<any, Record<string, any>>>;
    verifyForgotPasswordOtp(body: any, res: Response): Promise<Response<any, Record<string, any>>>;
    clearCookies(response: Response, req: Request): Promise<void>;
}
