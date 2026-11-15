import { UserRepository } from 'src/user/user.repository';
export interface TokenSessionContext {
    sessionId?: string;
    organizationId?: number;
}
export declare class TokenService {
    private userRepository;
    constructor(userRepository: UserRepository);
    generateTokens(user: any, accessExpiry?: string, refreshExpiry?: string, ctx?: TokenSessionContext): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
}
