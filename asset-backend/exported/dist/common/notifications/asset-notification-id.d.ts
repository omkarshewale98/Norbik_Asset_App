import { EntityManager } from 'typeorm';
export declare function resolveAssetDisplayId(manager: EntityManager, assetStocksUniqueId?: number | string | null): Promise<string>;
