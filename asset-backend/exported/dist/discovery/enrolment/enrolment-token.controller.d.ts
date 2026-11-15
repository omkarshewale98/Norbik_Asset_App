import { Request } from 'express';
import { RequestContextService } from 'src/common/context/request-context.service';
import { AuditService } from '../audit/audit.service';
import { EnrolmentTokenService } from './enrolment-token.service';
export declare class EnrolmentTokenController {
    private readonly tokens;
    private readonly audit;
    private readonly requestContext;
    constructor(tokens: EnrolmentTokenService, audit: AuditService, requestContext: RequestContextService);
    private resolveSchema;
    list(): Promise<{
        status: boolean;
        schema: string;
        tokens: import("./enrolment-token.service").EnrolmentTokenRow[];
        message?: undefined;
    } | {
        status: boolean;
        message: any;
        tokens: any[];
        schema?: undefined;
    }>;
    issue(body: {
        name?: string;
        expiresInDays?: number | null;
    }, req: Request): Promise<{
        status: boolean;
        token: string;
        row: import("./enrolment-token.service").EnrolmentTokenRow;
        message: string;
    }>;
    revoke(id: string, req: Request): Promise<{
        status: boolean;
        row: import("./enrolment-token.service").EnrolmentTokenRow;
        message: string;
    }>;
}
