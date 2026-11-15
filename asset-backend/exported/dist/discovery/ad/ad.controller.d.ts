import { Request } from 'express';
import { RequestContextService } from 'src/common/context/request-context.service';
import { AuditService } from '../audit/audit.service';
import { AdConfig } from './ad.repository';
import { AdService } from './ad.service';
export declare class AdController {
    private readonly ad;
    private readonly audit;
    private readonly requestContext;
    constructor(ad: AdService, audit: AuditService, requestContext: RequestContextService);
    private resolveSchema;
    get(): Promise<{
        status: boolean;
        config: AdConfig;
        message?: undefined;
        error?: undefined;
    } | {
        status: boolean;
        message: string;
        error: any;
        config?: undefined;
    }>;
    save(body: Partial<AdConfig>, req: Request): Promise<{
        status: boolean;
        config: AdConfig;
    }>;
    test(req: Request): Promise<{
        status: boolean;
        ok: boolean;
        queued: boolean;
        job: import("../interfaces/device.interface").RemoteJob;
        message: string;
    } | {
        ok: boolean;
        message: string;
        bindDn?: string;
        baseEntries?: number;
        status: boolean;
        queued?: undefined;
        job?: undefined;
    }>;
    sync(req: Request): Promise<{
        status: boolean;
        queued: boolean;
        job: import("../interfaces/device.interface").RemoteJob;
        synced: number;
        linked: number;
        message: string;
    } | {
        message: string;
        synced: number;
        linked: number;
        status: boolean;
        queued?: undefined;
        job?: undefined;
    }>;
    computers(search?: string): Promise<{
        status: boolean;
        computers: import("./ad.repository").AdComputerRow[];
        message?: undefined;
        error?: undefined;
    } | {
        status: boolean;
        message: string;
        error: any;
        computers: any[];
    }>;
}
