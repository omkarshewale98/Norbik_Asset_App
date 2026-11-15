export type PasswordLinkPurpose = 'reset' | 'invite' | 'otp';
export declare function passwordFingerprint(userId: number, passwordHash?: string | null): string;
export interface PasswordLinkAccount {
    user_id: number;
    password?: string | null;
}
export declare function issuePasswordLinkToken(account: PasswordLinkAccount, purpose: PasswordLinkPurpose, ttl?: string): Promise<string>;
export type PasswordLinkCheck = {
    valid: true;
    userId: number;
    purpose: PasswordLinkPurpose;
} | {
    valid: false;
    reason: 'expired' | 'invalid' | 'used';
};
export declare function decodePasswordLinkToken(token: string): Promise<{
    ok: true;
    userId: number;
    purpose: PasswordLinkPurpose;
    fp: string;
} | {
    ok: false;
    reason: 'expired' | 'invalid';
}>;
export declare function verifyPasswordLinkToken(token: string, loadAccount: (userId: number) => Promise<PasswordLinkAccount | null>): Promise<PasswordLinkCheck>;
export declare function passwordLinkErrorMessage(reason: 'expired' | 'invalid' | 'used'): string;
export declare function buildPasswordLink(account: PasswordLinkAccount, purpose: PasswordLinkPurpose, baseUrl?: string): Promise<string>;
