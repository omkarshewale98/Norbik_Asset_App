import { DataSource } from 'typeorm';
export interface EnrolmentTokenRow {
    id: string;
    name: string;
    tokenPrefix: string;
    createdBy: number | null;
    createdAt: string;
    expiresAt: string | null;
    revokedAt: string | null;
    lastUsedAt: string | null;
    useCount: number;
    active: boolean;
}
export interface IssuedEnrolmentToken {
    row: EnrolmentTokenRow;
    token: string;
}
export interface ResolvedEnrolment {
    schema: string;
    tokenId: string;
    tokenName: string;
}
export declare class EnrolmentTokenService {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    private assertSchema;
    private hash;
    private map;
    list(schema: string): Promise<EnrolmentTokenRow[]>;
    issue(schema: string, name: string, userId: number | null, expiresInDays?: number | null): Promise<IssuedEnrolmentToken>;
    revoke(schema: string, id: string): Promise<EnrolmentTokenRow>;
    resolve(token: string | undefined): Promise<ResolvedEnrolment>;
}
