import { Request } from 'express';
import { RequestContextService } from 'src/common/context/request-context.service';
import { AuditService } from '../audit/audit.service';
import { ScanScheduleInput } from './scan-schedule.repository';
import { ScanScheduleService } from './scan-schedule.service';
export declare class ScanScheduleController {
    private readonly schedules;
    private readonly audit;
    private readonly requestContext;
    constructor(schedules: ScanScheduleService, audit: AuditService, requestContext: RequestContextService);
    private resolveSchema;
    list(): Promise<{
        status: boolean;
        schedules: import("./scan-schedule.repository").ScanSchedule[];
        message?: undefined;
    } | {
        status: boolean;
        message: any;
        schedules: any[];
    }>;
    create(body: ScanScheduleInput, req: Request): Promise<{
        status: boolean;
        schedule: import("./scan-schedule.repository").ScanSchedule;
    }>;
    update(id: string, body: ScanScheduleInput, req: Request): Promise<{
        status: boolean;
        schedule: import("./scan-schedule.repository").ScanSchedule;
    }>;
    remove(id: string, req: Request): Promise<{
        status: boolean;
    }>;
    run(id: string, req: Request): Promise<{
        status: boolean;
        job: import("../interfaces/device.interface").RemoteJob;
        message: string;
    }>;
}
