import { DataSource } from 'typeorm';
export interface ScanScheduleOptions {
    ping: boolean;
    arp: boolean;
    netbios: boolean;
    snmp: boolean;
    ports: boolean;
}
export declare const DEFAULT_SCAN_OPTIONS: ScanScheduleOptions;
export interface ScanSchedule {
    id: string;
    name: string;
    cidr: string;
    site: string | null;
    agentId: string;
    agentHostname: string | null;
    agentOnline: boolean;
    snmpCredentialId: string | null;
    snmpCredentialName: string | null;
    enabled: boolean;
    cron: string | null;
    options: ScanScheduleOptions;
    lastRunAt: string | null;
    lastJobId: string | null;
    lastResult: string | null;
    lastDeviceCount: number | null;
    lastError: string | null;
    createdBy: number | null;
    createdAt: string;
    updatedAt: string;
}
export interface ScanScheduleInput {
    name: string;
    cidr: string;
    site?: string | null;
    agentId: string;
    snmpCredentialId?: string | null;
    enabled?: boolean;
    cron?: string | null;
    options?: Partial<ScanScheduleOptions>;
}
export declare class ScanScheduleRepository {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    private assertSchema;
    private map;
    private selectSql;
    list(schema: string): Promise<ScanSchedule[]>;
    get(schema: string, id: string): Promise<ScanSchedule | null>;
    create(schema: string, input: ScanScheduleInput, userId: number | null): Promise<ScanSchedule>;
    update(schema: string, id: string, input: ScanScheduleInput): Promise<ScanSchedule>;
    remove(schema: string, id: string): Promise<boolean>;
    markQueued(schema: string, id: string, jobId: string): Promise<void>;
    markResult(schema: string, id: string, result: string, deviceCount: number | null, error: string | null): Promise<void>;
    listScheduled(schema: string): Promise<ScanSchedule[]>;
}
