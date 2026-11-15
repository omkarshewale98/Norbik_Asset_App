import { DataSource } from 'typeorm';
import { DiscoveryConfigService } from './config/discovery-config.service';
import { ClassifierService } from './enrichment/classifier.service';
import { HttpProbeService } from './enrichment/http-probe.service';
import { OuiService } from './enrichment/oui.service';
import { ArpScanner } from './scanners/arp.scanner';
import { MdnsScanner } from './scanners/mdns.scanner';
import { NetbiosScanner } from './scanners/netbios.scanner';
import { PingScanner } from './scanners/ping.scanner';
import { SnmpScanner } from './scanners/snmp.scanner';
import { SsdpScanner } from './scanners/ssdp.scanner';
import { DeviceRepository } from './store/device.repository';
import { RedisService } from 'src/common/redis/redis.service';
export interface AgentScanHost {
    ip: string;
    mac?: string | null;
    hostname?: string | null;
    domain?: string | null;
    openPorts?: number[];
    sources?: string[];
    snmp?: {
        sysDescr?: string | null;
        sysName?: string | null;
        sysObjectId?: string | null;
        sysLocation?: string | null;
        uptimeSeconds?: number | null;
        model?: string | null;
        serial?: string | null;
    } | null;
}
export interface AgentScanIngestOptions {
    cidr: string;
    segment?: string | null;
    startedAt?: Date;
    scanners?: string[];
}
export interface ScannerAvailability {
    source: string;
    available: boolean;
}
export interface DiscoveryStatus {
    running: boolean;
    lastRunAt: string | null;
    lastRunMs: number | null;
    deviceCount: number | null;
    scanners: ScannerAvailability[];
}
export interface RunScanResult {
    status: boolean;
    message?: string;
    error?: string;
    deviceCount?: number;
    durationMs?: number;
    scanners?: string[];
}
export declare class DiscoveryService {
    private readonly dataSource;
    private readonly arpScanner;
    private readonly pingScanner;
    private readonly mdnsScanner;
    private readonly ssdpScanner;
    private readonly netbiosScanner;
    private readonly snmpScanner;
    private readonly ouiService;
    private readonly httpProbeService;
    private readonly classifierService;
    private readonly deviceRepository;
    private readonly configService;
    private readonly redis;
    private readonly logger;
    private readonly runningSchemas;
    private readonly lastRun;
    constructor(dataSource: DataSource, arpScanner: ArpScanner, pingScanner: PingScanner, mdnsScanner: MdnsScanner, ssdpScanner: SsdpScanner, netbiosScanner: NetbiosScanner, snmpScanner: SnmpScanner, ouiService: OuiService, httpProbeService: HttpProbeService, classifierService: ClassifierService, deviceRepository: DeviceRepository, configService: DiscoveryConfigService, redis: RedisService);
    runScan(schema: string): Promise<RunScanResult>;
    ingestAgentScan(schema: string, hosts: AgentScanHost[], opts: AgentScanIngestOptions): Promise<{
        deviceCount: number;
        durationMs: number;
    }>;
    getStatus(schema: string): Promise<DiscoveryStatus>;
    private safeIsAvailable;
    private mergePartials;
    private firedMinute;
    runScheduled(): Promise<void>;
}
