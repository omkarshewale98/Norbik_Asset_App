export declare function runWithRequestContext<T>(callback: () => T): T;
export declare function hasRequestContext(): boolean;
export declare function getRequestContextValue<T = any>(key: string): T | undefined;
export declare function setRequestContextValue(key: string, value: any): void;
export declare function currentTenantSchema(): string | undefined;
export declare class RequestContextService {
    run(callback: () => void): void;
    set(key: string, value: any): void;
    get<T>(key: string): T | undefined;
}
