"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAssetDisplayId = resolveAssetDisplayId;
const asset_stock_serials_entity_1 = require("../../assets-data/stocks/entities/asset_stock_serials.entity");
async function resolveAssetDisplayId(manager, assetStocksUniqueId) {
    if (assetStocksUniqueId == null || assetStocksUniqueId === '')
        return '';
    try {
        const serial = await manager.findOne(asset_stock_serials_entity_1.AssetStockSerials, {
            where: { asset_stocks_unique_id: Number(assetStocksUniqueId) },
            select: ['asset_stocks_unique_id', 'system_code', 'stock_serials'],
        });
        return serial?.system_code || serial?.stock_serials || '';
    }
    catch {
        return '';
    }
}
