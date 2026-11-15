import { CredentialService } from '../credentials/credential.service';
import { JobsService } from '../jobs/jobs.service';
import { AgentRepository } from '../store/agent.repository';
import { AuditActor } from '../phase2.types';
import { RemoteJob } from '../interfaces/device.interface';
import { AdConfig, AdRepository } from './ad.repository';
export declare class AdService {
    private readonly repo;
    private readonly credentials;
    private readonly jobs;
    private readonly agents;
    private readonly logger;
    constructor(repo: AdRepository, credentials: CredentialService, jobs: JobsService, agents: AgentRepository);
    getConfig(schema: string): Promise<AdConfig>;
    private agentJobPayload;
    queueAgentTest(schema: string, actor: AuditActor): Promise<RemoteJob>;
    queueAgentSync(schema: string, actor: AuditActor): Promise<RemoteJob>;
    private onAgentTestResult;
    private onAgentSyncResult;
    saveConfig(schema: string, patch: Partial<AdConfig>, userId: number | null): Promise<AdConfig>;
    private connect;
    bindTest(schema: string): Promise<{
        ok: boolean;
        message: string;
        bindDn?: string;
        baseEntries?: number;
    }>;
    syncComputers(schema: string): Promise<{
        synced: number;
        linked: number;
    }>;
    listComputers(schema: string, search?: string): Promise<import("./ad.repository").AdComputerRow[]>;
    private fileTimeToIso;
    private generalizedTimeToIso;
}
