"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LocationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const stocks_entity_1 = require("../assets-data/stocks/entities/stocks.entity");
const auth_service_1 = require("../auth/auth.service");
const branch_access_1 = require("../branch-access/branch-access");
const mail_config_service_1 = require("../common/mail/mail-config.service");
const mail_service_1 = require("../common/mail/mail.service");
const notifications_helper_1 = require("../common/notifications/notifications.helper");
const keyset_pagination_1 = require("../common/pagination/keyset-pagination");
const dropdown_cache_service_1 = require("../common/redis/dropdown-cache.service");
const request_context_service_1 = require("../common/context/request-context.service");
const dropdown_entities_1 = require("../common/redis/dropdown-entities");
const redis_service_1 = require("../common/redis/redis.service");
const database_service_1 = require("../dynamic-schema/database.service");
const branches_entity_1 = require("../organizational-profile/entity/branches.entity");
const location_branch_mapping_entity_1 = require("../organizational-profile/entity/location-branch-mapping.entity");
const location_types_entity_1 = require("../organizational-profile/entity/location-types.entity");
const locations_entity_1 = require("../organizational-profile/entity/locations.entity");
const organizational_user_entity_1 = require("../organizational-profile/entity/organizational-user.entity");
const orgnization_stats_entity_1 = require("../organizational-profile/entity/orgnization-stats.entity");
const location_asset_counts_view_1 = require("../organizational-profile/viewentity/location-asset-counts.view");
const location_child_count_view_entity_1 = require("../organizational-profile/viewentity/location-child-count.view.entity");
const location_hierarchy_precomputed_view_entity_1 = require("../organizational-profile/viewentity/location-hierarchy-precomputed.view.entity");
const cache_service_helper_1 = require("../utils/cache-service-helper");
const typeorm_2 = require("typeorm");
const XlsxPopulate = __importStar(require("xlsx-populate"));
const user_location_fav_1 = require("./entities/user-location-fav");
let LocationsService = LocationsService_1 = class LocationsService {
    constructor(dataSource, databaseService, mailService, mailConfigService, redisService, authService, notificationHelper, locationRepository, locationTypeRepository, stockRepository, orgStatRepository, branchRepository, locationHierarchyPrecomputedView, locationChildCountView, userRepository, locationBranchMappingRepo, userLocationFavoriteRepo, dropdownCache, requestContext) {
        this.dataSource = dataSource;
        this.databaseService = databaseService;
        this.mailService = mailService;
        this.mailConfigService = mailConfigService;
        this.redisService = redisService;
        this.authService = authService;
        this.notificationHelper = notificationHelper;
        this.locationRepository = locationRepository;
        this.locationTypeRepository = locationTypeRepository;
        this.stockRepository = stockRepository;
        this.orgStatRepository = orgStatRepository;
        this.branchRepository = branchRepository;
        this.locationHierarchyPrecomputedView = locationHierarchyPrecomputedView;
        this.locationChildCountView = locationChildCountView;
        this.userRepository = userRepository;
        this.locationBranchMappingRepo = locationBranchMappingRepo;
        this.userLocationFavoriteRepo = userLocationFavoriteRepo;
        this.dropdownCache = dropdownCache;
        this.requestContext = requestContext;
    }
    async withOrgSchema(fn) {
        const schema = this.requestContext.get('schema');
        const runner = this.dataSource.createQueryRunner();
        await runner.connect();
        try {
            if (schema && /^[A-Za-z0-9_]+$/.test(schema)) {
                await runner.query(`SET search_path TO "${schema}", public`);
            }
            return await fn(runner.manager);
        }
        finally {
            await runner.release();
        }
    }
    async getUserByPublicID(public_user_id) {
        const userExists = await this.dataSource
            .getRepository(organizational_user_entity_1.User)
            .findOne({ where: { register_user_login_id: public_user_id } });
        console.log('public user id in asset', public_user_id);
        if (!userExists) {
            throw new common_1.HttpException({ status: common_1.HttpStatus.BAD_REQUEST, message: 'Invalid user ID' }, common_1.HttpStatus.BAD_REQUEST);
        }
        else {
            return userExists.user_id;
        }
    }
    safeSchema(schema) {
        return schema && LocationsService_1.TENANT_SCHEMA_RE.test(schema)
            ? schema
            : null;
    }
    toPositiveIntOrNull(value) {
        if (value === null || value === undefined || value === '')
            return null;
        const n = Number(value);
        return Number.isInteger(n) && n > 0 ? n : null;
    }
    extractLocationRows(payload, typeCode) {
        let rows = null;
        if (Array.isArray(payload?.locations)) {
            rows = payload.locations;
        }
        else if (typeCode) {
            for (const key of [typeCode, `${typeCode}s`, `${typeCode}es`]) {
                if (Array.isArray(payload?.[key])) {
                    rows = payload[key];
                    break;
                }
            }
        }
        if (!rows && typeof payload?.location_name === 'string') {
            rows = [
                {
                    location_name: payload.location_name,
                    location_code: payload.location_code ?? null,
                },
            ];
        }
        return (rows || []).filter((r) => r &&
            typeof r.location_name === 'string' &&
            r.location_name.trim() !== '');
    }
    async resolveTypeOfLocation(location, manager) {
        const typeRepo = manager
            ? manager.getRepository(location_types_entity_1.LocationType)
            : this.locationTypeRepository;
        if (location?.location_type_id) {
            const byId = await typeRepo.findOne({
                where: { type_id: Number(location.location_type_id) },
            });
            if (byId)
                return byId;
        }
        if (location?.location_type_code) {
            return typeRepo.findOne({
                where: { type_code: location.location_type_code },
            });
        }
        return null;
    }
    async checkParentLevelRule(parentLocation, childType, manager) {
        if (!parentLocation)
            return null;
        if (Number(parentLocation.is_active) !== 1) {
            return `Parent location "${parentLocation.location_name}" is inactive.`;
        }
        const parentType = await this.resolveTypeOfLocation(parentLocation, manager);
        if (parentType?.level == null ||
            childType?.level == null) {
            return null;
        }
        if (Number(parentType.level) >= Number(childType.level)) {
            return (`A ${childType.type_name} (level ${childType.level}) cannot be placed under ` +
                `${parentType.type_name} "${parentLocation.location_name}" (level ${parentType.level}). ` +
                `The parent's type level must be lower than the child's.`);
        }
        return null;
    }
    async resolveBranchRootLocation(branchId, createdBy, manager) {
        const locationRepo = manager
            ? manager.getRepository(locations_entity_1.Locations)
            : this.locationRepository;
        const branchRepo = manager
            ? manager.getRepository(branches_entity_1.Branch)
            : this.branchRepository;
        const typeRepo = manager
            ? manager.getRepository(location_types_entity_1.LocationType)
            : this.locationTypeRepository;
        const mappingRepo = manager
            ? manager.getRepository(location_branch_mapping_entity_1.LocationBranchMapping)
            : this.locationBranchMappingRepo;
        const roots = await locationRepo
            .createQueryBuilder('al')
            .innerJoin('location_branch_mapping', 'lbm', `lbm.location_id = al.location_id
         AND lbm.branch_id = :branchId
         AND lbm.is_active = 1
         AND lbm.is_deleted = 0`, { branchId })
            .leftJoin('location_types', 'lt', `(lt.type_id = al.location_type_id
          OR (al.location_type_id IS NULL AND lt.type_code = al.location_type_code))`)
            .select('al.location_id', 'location_id')
            .where('al.parent_location_id IS NULL')
            .andWhere('al.is_deleted = 0')
            .andWhere('al.is_active = 1')
            .orderBy('lt.level', 'ASC', 'NULLS LAST')
            .addOrderBy('al.location_id', 'ASC')
            .limit(1)
            .getRawMany();
        if (roots.length) {
            return locationRepo.findOne({
                where: { location_id: Number(roots[0].location_id) },
            });
        }
        const branch = await branchRepo.findOne({
            where: { branch_id: branchId, is_active: 1, is_deleted: 0 },
        });
        if (!branch)
            return null;
        const rootTypeCode = branch.occupancy_type_code === 'head_office' ? 'head_office' : 'branch';
        const rootType = await typeRepo.findOne({
            where: { type_code: rootTypeCode, is_deleted: 0 },
        });
        if (!rootType)
            return null;
        const root = await locationRepo.save(locationRepo.create({
            location_name: branch.branch_name,
            location_type_id: rootType.type_id,
            location_type_code: rootType.type_code,
            parent_location_id: null,
            location_level: 0,
            is_active: 1,
            is_deleted: 0,
            created_by: createdBy,
        }));
        root.path = `/${root.location_id}/`;
        await locationRepo.save(root);
        await mappingRepo.save(mappingRepo.create({
            location_id: root.location_id,
            branch_id: branchId,
            type_id: rootType.type_id,
            is_active: 1,
            is_deleted: 0,
            updated_by: createdBy,
        }));
        return root;
    }
    async addNewLocation(payload, createdBy, organizationId, req) {
        const requestedTypeId = Number(payload?.location_type_id ?? payload?.location_type);
        const typeRow = Number.isFinite(requestedTypeId)
            ? await this.locationTypeRepository.findOne({
                where: {
                    type_id: requestedTypeId,
                    is_deleted: 0,
                    is_active: 1,
                },
            })
            : null;
        if (!typeRow ||
            (payload?.location_type_code &&
                typeRow.type_code !== payload.location_type_code)) {
            return {
                status: 400,
                success: false,
                message: 'Invalid location type',
                data: null,
            };
        }
        const location_type = typeRow.type_id;
        const location_type_code = typeRow.type_code;
        if (payload?.pincode && !/^[1-9][0-9]{5}$/.test(String(payload.pincode).trim())) {
            return {
                status: 400,
                success: false,
                message: 'Please enter a valid 6-digit pincode.',
                data: null,
            };
        }
        const locations = this.extractLocationRows(payload, location_type_code);
        if (!locations.length) {
            return {
                status: 400,
                success: false,
                message: 'No location data found',
                data: null,
            };
        }
        const hasExplicitParent = Object.prototype.hasOwnProperty.call(payload ?? {}, 'parent_location_id');
        const nearestFirstAncestors = hasExplicitParent
            ? []
            : (await this.locationTypeRepository.find({
                where: { is_active: 1, is_deleted: 0 },
                order: { level: 'DESC' },
            })).filter((t) => t.level != null &&
                typeRow.level != null &&
                t.level < typeRow.level);
        const insertedLocations = [];
        const linkedLocations = [];
        let newBranchMappings = 0;
        let linkedExistingCount = 0;
        let branchIds = [];
        if (Array.isArray(payload.branch_access)) {
            branchIds = payload.branch_access
                .map((id) => Number(id))
                .filter((id) => Number.isFinite(id));
        }
        if (branchIds.length === 0 &&
            payload.branch_id != null &&
            payload.branch_id !== '') {
            const branchId = Number(payload.branch_id);
            if (Number.isFinite(branchId)) {
                branchIds = [branchId];
            }
        }
        branchIds = [...new Set(branchIds)];
        const parentCache = new Map();
        const resolvedParents = [];
        for (const item of locations) {
            let parent_location_id = null;
            if (hasExplicitParent) {
                parent_location_id = this.toPositiveIntOrNull(payload.parent_location_id);
            }
            else {
                for (const ancestorType of nearestFirstAncestors) {
                    const dynamicKey = `selected_${ancestorType.type_code}_id`;
                    const legacyKey = `${ancestorType.type_code}_id`;
                    const useLegacyKey = legacyKey !== 'branch_id';
                    const candidate = item[dynamicKey] ??
                        (useLegacyKey ? item[legacyKey] : undefined) ??
                        payload[dynamicKey] ??
                        (useLegacyKey ? payload[legacyKey] : undefined) ??
                        null;
                    const candidateId = this.toPositiveIntOrNull(candidate);
                    if (candidateId) {
                        parent_location_id = candidateId;
                        break;
                    }
                }
            }
            if (!parent_location_id) {
                if (branchIds.length > 0 && Number(typeRow.level) > 0) {
                    const branchRoot = await this.resolveBranchRootLocation(branchIds[0], createdBy);
                    if (branchRoot &&
                        !(await this.checkParentLevelRule(branchRoot, typeRow))) {
                        parentCache.set(Number(branchRoot.location_id), branchRoot);
                        resolvedParents.push(branchRoot);
                        continue;
                    }
                }
                resolvedParents.push(null);
                continue;
            }
            let parentLocation = parentCache.get(parent_location_id) ?? null;
            if (!parentLocation) {
                parentLocation = await this.locationRepository.findOne({
                    where: { location_id: parent_location_id, is_deleted: 0 },
                });
            }
            if (!parentLocation) {
                if (hasExplicitParent) {
                    return {
                        status: 400,
                        success: false,
                        message: 'Selected parent location does not exist.',
                        data: null,
                    };
                }
                resolvedParents.push(null);
                continue;
            }
            parentCache.set(parent_location_id, parentLocation);
            if (branchIds.length > 0) {
                const parentInBranch = await this.locationBranchMappingRepo.findOne({
                    where: {
                        location_id: parentLocation.location_id,
                        branch_id: (0, typeorm_2.In)(branchIds),
                        is_deleted: 0,
                    },
                });
                if (!parentInBranch) {
                    return {
                        status: 400,
                        success: false,
                        message: `Parent location "${parentLocation.location_name}" does not belong to the selected branch.`,
                        data: null,
                    };
                }
            }
            const ruleError = await this.checkParentLevelRule(parentLocation, typeRow);
            if (ruleError) {
                return {
                    status: 400,
                    success: false,
                    message: ruleError,
                    data: null,
                };
            }
            resolvedParents.push(parentLocation);
        }
        for (const [rowIndex, item] of locations.entries()) {
            const parentLocation = resolvedParents[rowIndex];
            const parent_location_id = parentLocation?.location_id ?? null;
            const existingLocation = await this.locationRepository.findOne({
                where: {
                    location_name: (0, typeorm_2.ILike)(item.location_name.trim()),
                    location_type_code,
                    parent_location_id: parent_location_id ?? (0, typeorm_2.IsNull)(),
                    is_deleted: 0,
                },
            });
            if (existingLocation) {
                const mappingsForResponse = [];
                let gainedMapping = false;
                for (const bId of branchIds) {
                    const alreadyMapped = await this.locationBranchMappingRepo.findOne({
                        where: {
                            location_id: existingLocation.location_id,
                            branch_id: Number(bId),
                            is_deleted: 0,
                        },
                    });
                    if (!alreadyMapped) {
                        const newMapping = this.locationBranchMappingRepo.create({
                            location_id: existingLocation.location_id,
                            branch_id: Number(bId),
                            type_id: Number(location_type),
                            is_active: 1,
                            is_deleted: 0,
                            updated_by: createdBy,
                        });
                        const savedMapping = await this.locationBranchMappingRepo.save(newMapping);
                        newBranchMappings += 1;
                        gainedMapping = true;
                        mappingsForResponse.push({
                            location_mapping_id: savedMapping.location_mapping_id,
                            location_id: savedMapping.location_id,
                            branch_id: savedMapping.branch_id,
                            type_id: savedMapping.type_id,
                        });
                    }
                    else {
                        mappingsForResponse.push({
                            location_mapping_id: alreadyMapped.location_mapping_id,
                            location_id: alreadyMapped.location_id,
                            branch_id: alreadyMapped.branch_id,
                            type_id: alreadyMapped.type_id,
                        });
                    }
                }
                if (branchIds.length === 0) {
                    const existingMappings = await this.locationBranchMappingRepo.find({
                        where: {
                            location_id: existingLocation.location_id,
                            is_deleted: 0,
                        },
                    });
                    mappingsForResponse.push(...existingMappings.map((mapping) => ({
                        location_mapping_id: mapping.location_mapping_id,
                        location_id: mapping.location_id,
                        branch_id: mapping.branch_id,
                        type_id: mapping.type_id,
                    })));
                }
                if (gainedMapping)
                    linkedExistingCount += 1;
                const primaryMapping = branchIds.length > 0
                    ? mappingsForResponse.find((mapping) => Number(mapping.branch_id) ===
                        Number(branchIds[0]))
                    : mappingsForResponse[0];
                linkedLocations.push({
                    ...existingLocation,
                    location_mapping_id: primaryMapping?.location_mapping_id ?? null,
                    branch_id: primaryMapping?.branch_id ?? null,
                    branch_mappings: mappingsForResponse,
                });
                continue;
            }
            console.log('POINT:3');
            const path = parentLocation ? parentLocation.path || '/' : '/';
            const level = parentLocation
                ? (parentLocation.location_level || 0) + 1
                : 0;
            console.log('POINT:4');
            const newLocation = this.locationRepository.create({
                location_name: item.location_name?.trim(),
                location_code: item.location_code || null,
                location_floor: payload.location_floor || null,
                location_room: payload.location_room || null,
                location_city: payload.location_city || null,
                location_state: payload.location_state || null,
                country: payload.country || null,
                pincode: payload.pincode
                    ? Number(payload.pincode)
                    : null,
                location_landmark: payload.location_landmark || null,
                location_street_address: payload.location_street_address || null,
                location_description: payload.location_description || null,
                location_type_id: Number(location_type),
                location_type_code,
                parent_location_id,
                location_level: level,
                is_active: payload.is_active === undefined || payload.is_active === null
                    ? 1
                    : payload.is_active
                        ? 1
                        : 0,
                is_deleted: 0,
                created_by: createdBy,
            });
            const savedLocation = await this.locationRepository.save(newLocation);
            console.log('POINT:5');
            savedLocation.path =
                `${path}${savedLocation.location_id}/`;
            await this.locationRepository.save(savedLocation);
            console.log('POINT:6');
            let savedMappings = [];
            if (branchIds.length > 0) {
                const mappings = branchIds.map((bId) => this.locationBranchMappingRepo.create({
                    location_id: savedLocation.location_id,
                    branch_id: Number(bId),
                    type_id: Number(location_type),
                    is_active: 1,
                    is_deleted: 0,
                    updated_by: createdBy,
                }));
                savedMappings =
                    await this.locationBranchMappingRepo.save(mappings);
                newBranchMappings +=
                    savedMappings.length;
            }
            const primaryMapping = savedMappings[0] ?? null;
            insertedLocations.push({
                ...savedLocation,
                location_mapping_id: primaryMapping?.location_mapping_id ??
                    null,
                branch_id: primaryMapping?.branch_id ??
                    null,
                branch_mappings: savedMappings.map((mapping) => ({
                    location_mapping_id: mapping.location_mapping_id,
                    location_id: mapping.location_id,
                    branch_id: mapping.branch_id,
                    type_id: mapping.type_id,
                })),
            });
        }
        console.log('POINT:7');
        await this.redisService.delByPattern('asset-locations:*');
        const LOCATION_CREATION_EVENT_ID = 50;
        const createdUser = await this.userRepository.findOne({
            where: {
                user_id: createdBy,
            },
        });
        const contextData = {
            location: {
                location_type: location_type_code,
                total_locations: insertedLocations.length,
                created_by: `${createdUser?.first_name ?? ''} ${createdUser?.last_name ?? ''}`.trim(),
            },
        };
        const recipients = [];
        if (createdUser?.users_business_email) {
            recipients.push({
                recipient_type: 'user',
                recipient_id: String(createdUser.user_id),
                recipient_email: createdUser.users_business_email,
            });
        }
        await this.notificationHelper.triggerEventNotification({
            eventId: LOCATION_CREATION_EVENT_ID,
            contextData,
            recipients,
            meta: {
                trace_id: `LOCATION_CREATE_${Date.now()}`,
            },
        });
        console.log('POINT:8');
        console.log('REDIS UPDATE:LOCATION-ADD');
        await this.redisService.delByPattern('asset-locations:*');
        this.redisService.delByPattern('orgnizationprofile-getcounts:*');
        await this.dropdownCache.invalidate(dropdown_entities_1.DROPDOWN.LOCATION);
        const createdCount = insertedLocations.length;
        const linkedCount = linkedLocations.length;
        if (createdCount === 0 &&
            newBranchMappings === 0) {
            return {
                status: 409,
                success: false,
                message: linkedCount > 0
                    ? 'This location already exists here and is already linked to the selected branch(es).'
                    : 'No location was created — a location with this name already exists under the selected parent.',
                data: [],
                created: 0,
                linked: linkedCount,
                branchMappingsAdded: 0,
            };
        }
        const parts = [];
        if (createdCount > 0) {
            parts.push(`${createdCount} location${createdCount > 1 ? 's' : ''} created`);
        }
        if (linkedExistingCount > 0) {
            parts.push(`${linkedExistingCount} ${createdCount > 0 ? 'existing ' : ''}location${linkedExistingCount > 1 ? 's' : ''} linked to the selected branch(es)`);
        }
        const skippedCount = linkedCount - linkedExistingCount;
        const skippedNote = skippedCount > 0
            ? `; ${skippedCount} already exist${skippedCount > 1 ? '' : 's'} here and ${skippedCount > 1 ? 'were' : 'was'} skipped`
            : '';
        return {
            status: 201,
            success: true,
            message: createdCount === 1 && linkedExistingCount === 0 && skippedCount === 0
                ? 'Location created successfully.'
                : parts.join(' and ') + skippedNote + '.',
            data: [...insertedLocations, ...linkedLocations],
            created: createdCount,
            linked: linkedCount,
            linkedToNewBranch: linkedExistingCount,
            branchMappingsAdded: newBranchMappings,
        };
    }
    async getAllAssetsLocations(dto, branchIds = [], userId) {
        console.time('TOTAL-LOCATION-SERVICE');
        try {
            const d = dto;
            const limit = Math.min(Math.max(Number(dto.pagination?.limit || 10), 1), 100);
            const cursorToken = typeof d.cursor === 'string' ? d.cursor : null;
            const direction = d.direction === 'prev' ? 'prev' : 'next';
            const jumpToLast = d.jumpToLast === true || dto.isLastPageMode === true;
            const jumpPage = d.page
                ? Number(d.page)
                : undefined;
            const usingOffset = !!jumpPage && jumpPage > 1 && !jumpToLast;
            const searchArray = dto.search || [];
            const filters = dto.filters || [];
            const sortArray = dto.sort || [];
            const rangeFilters = dto.range_filters || [];
            const dateBetween = dto.date_between;
            const knownTotalRaw = dto?.knownTotal ??
                dto?.known_total;
            const knownTotalVal = knownTotalRaw != null &&
                !Number.isNaN(Number(knownTotalRaw))
                ? Number(knownTotalRaw)
                : null;
            if (dto?.jumpToLast || dto.isLastPageMode) {
                dto.isLastPageMode = true;
            }
            const cacheKey = (0, cache_service_helper_1.buildListCacheKey)({
                prefix: 'asset-locations-v2',
                dto,
                schema: dto.schema,
                login_user_id: `${dto.login_user_id}_${userId}`,
            });
            console.log('ASSET LOCATION CACHE KEY:', cacheKey);
            console.log('ASSET LOCATION USER ID:', userId);
            console.time('REDIS-GET');
            const cached = await this.redisService.get(cacheKey);
            console.timeEnd('REDIS-GET');
            if (cached) {
                console.log('asset-locations: REDIS HIT');
                return cached;
            }
            console.log('asset-locations: REDIS MISS');
            const sortField = sortArray[0]?.column || 'location_id';
            const idField = 'location_id';
            const alias = 'asset_locations';
            console.time('LOCATION-QUERY');
            const qb = this.locationBranchMappingRepo
                .createQueryBuilder('location_branch_mapping')
                .leftJoin('asset_locations', 'asset_locations', `asset_locations.location_id =
           location_branch_mapping.location_id
         AND asset_locations.is_deleted = 0`)
                .leftJoin('branches', 'branch', 'branch.branch_id = location_branch_mapping.branch_id')
                .leftJoin('branches', 'mapped_branch', `mapped_branch.branch_id =
         location_branch_mapping.branch_id`)
                .leftJoin('location_types', 'location_type', `location_type.type_id =
         location_branch_mapping.type_id`)
                .leftJoin(location_child_count_view_entity_1.LocationChildCountView, 'child_count_view', `child_count_view.location_id =
         asset_locations.location_id`)
                .leftJoin(`(
          WITH RECURSIVE location_tree AS (
            SELECT l.location_id,
                   CAST(l.location_id AS text) AS path_ids,
                   CAST(l.location_name AS text) AS path_names,
                   CAST(l.location_type_code AS text) AS path_types,
                   -- Display path skips Branch / Head Office (type level 0):
                   -- the Branch column already shows it (NA-2734).
                   CASE WHEN lt.level = 0 THEN NULL
                        ELSE CAST(l.location_name AS text) END AS display_names,
                   1 AS depth
              FROM asset_locations l
              LEFT JOIN location_types lt
                ON lt.type_id = l.location_type_id
                OR (l.location_type_id IS NULL AND lt.type_code = l.location_type_code)
             WHERE l.parent_location_id IS NULL
               AND l.is_deleted = 0
            UNION ALL
            SELECT c.location_id,
                   p.path_ids   || '/'   || CAST(c.location_id AS text),
                   p.path_names || ' → ' || c.location_name,
                   p.path_types || ' → ' || c.location_type_code,
                   CASE WHEN ct.level = 0 THEN p.display_names
                        ELSE COALESCE(p.display_names || ' → ', '') || c.location_name END,
                   p.depth + 1
              FROM asset_locations c
              JOIN location_tree p ON c.parent_location_id = p.location_id
              LEFT JOIN location_types ct
                ON ct.type_id = c.location_type_id
                OR (c.location_type_id IS NULL AND ct.type_code = c.location_type_code)
             WHERE c.is_deleted = 0
               AND p.depth < 100
          )
          SELECT location_id, path_ids, path_names, path_types, display_names
            FROM location_tree
        )`, 'location_hierarchy', `location_hierarchy.location_id =
         asset_locations.location_id`)
                .leftJoin(location_asset_counts_view_1.LocationAssetCountsView, 'location_asset_count', `location_asset_count.location_id =
         location_branch_mapping.location_mapping_id`)
                .leftJoin('user_location_favorites', 'fav', `fav.location_mapping_id =
           location_branch_mapping.location_mapping_id
         AND fav.user_id = :userId`, {
                userId: Number(userId),
            })
                .where('location_branch_mapping.is_deleted = :deleted', {
                deleted: 0,
            })
                .andWhere('asset_locations.is_deleted = 0');
            console.time('BRANCH-FILTER');
            (0, branch_access_1.applyBranchFilter)({
                qb,
                entityKey: 'LocationBranch',
                branchIds,
            });
            console.timeEnd('BRANCH-FILTER');
            qb.select([
                'asset_locations.location_id AS location_id',
                'location_branch_mapping.branch_id AS branch_id',
                'asset_locations.location_name AS location_name',
                'asset_locations.location_floor AS location_floor',
                'asset_locations.location_room AS location_room',
                'asset_locations.location_city AS location_city',
                'asset_locations.location_state AS location_state',
                'asset_locations.location_street_address AS location_street_address',
                'asset_locations.location_description AS location_description',
                'asset_locations.location_google_map_pin AS location_google_map_pin',
                'asset_locations.location_code AS location_code',
                'asset_locations.country AS country',
                'asset_locations.pincode AS pincode',
                'asset_locations.location_landmark AS location_landmark',
                'asset_locations.parent_location_id AS parent_location_id',
                'asset_locations.path AS path',
                'asset_locations.location_level AS location_level',
                'asset_locations.location_type_code AS location_type_code',
                'location_type.type_name AS location_type_name',
                'asset_locations.created_at AS created_at',
                'asset_locations.is_active AS is_active',
                'COALESCE(MAX(location_asset_count.asset_count), 0) AS asset_count',
                'COALESCE(MAX(child_count_view.child_count), 0) AS child_count',
                'branch.branch_id AS branch_branch_id',
                'branch.branch_name AS branch_branch_name',
                'branch.city AS branch_city',
                'branch.state AS branch_state',
                'location_branch_mapping.location_mapping_id AS location_mapping_id',
                'location_branch_mapping.branch_id AS mapping_branch_id',
                'location_branch_mapping.type_id AS mapping_type_id',
                'CASE WHEN fav.id IS NOT NULL THEN true ELSE false END AS is_favourite',
                'mapped_branch.branch_id AS mapped_branch_id',
                'mapped_branch.branch_name AS mapped_branch_name',
                'location_type.type_id AS type_id',
                'location_type.type_name AS type_name',
                'location_type.type_code AS type_code',
                'COALESCE(MAX(location_hierarchy.display_names), asset_locations.location_name) AS hierarchy_text',
                'asset_locations.path AS hierarchy',
                'MAX(location_hierarchy.path_ids) AS path_ids',
                'MAX(location_hierarchy.path_types) AS path_types',
            ]);
            console.timeEnd('LOCATION-QUERY');
            searchArray.forEach((s, i) => {
                if (!s.values?.length)
                    return;
                const value = s.values.join(' ');
                qb.andWhere(`
          (
            asset_locations.location_name ILIKE :loc_${i}
            OR branch.branch_name ILIKE :branch_${i}
          )
        `, {
                    [`loc_${i}`]: `%${value}%`,
                    [`branch_${i}`]: `%${value}%`,
                });
            });
            const columnMap = {
                location_id: 'asset_locations.location_id',
                branch_id: 'location_branch_mapping.branch_id',
                location_type_code: 'asset_locations.location_type_code',
                parent_location_id: 'asset_locations.parent_location_id',
            };
            filters.forEach((f, i) => {
                if (!f.values?.length)
                    return;
                const column = columnMap[f.column] || `asset_locations.${f.column}`;
                qb.andWhere(`${column} IN (:...filter_values_${i})`, {
                    [`filter_values_${i}`]: f.values,
                });
            });
            console.time('COUNT-QUERY');
            const countKey = 'asset-locations:count:' +
                JSON.stringify({
                    search: searchArray,
                    filters,
                    branchIds,
                });
            const total = await (0, keyset_pagination_1.getCachedCount)(this.redisService, countKey, async () => {
                const countQb = qb.clone();
                const totalResult = await countQb
                    .select('COUNT(DISTINCT location_branch_mapping.location_mapping_id)', 'total')
                    .getRawOne();
                return Number(totalResult?.total || 0);
            }, 5, knownTotalVal);
            console.timeEnd('COUNT-QUERY');
            const sortableMap = {
                location_mapping_id: 'location_branch_mapping.location_mapping_id',
                location_id: 'asset_locations.location_id',
                location_name: 'asset_locations.location_name',
                location_code: 'asset_locations.location_code',
                location_city: 'asset_locations.location_city',
                location_state: 'asset_locations.location_state',
                location_type_code: 'asset_locations.location_type_code',
                is_active: 'asset_locations.is_active',
                created_at: 'asset_locations.created_at',
                hierarchy: 'asset_locations.path COLLATE "C"',
            };
            const idColumn = 'location_id';
            const idDbColumn = 'asset_locations.location_id';
            const defaultSort = {
                column: 'hierarchy',
                order: 'ASC',
            };
            console.time('CURSOR-PAGINATION');
            let plan;
            if (jumpToLast) {
                plan = (0, keyset_pagination_1.buildKeyset)({
                    qb,
                    columnMap: sortableMap,
                    sort: sortArray,
                    defaultSort,
                    idColumn,
                    idDbColumn,
                    cursor: null,
                    direction: 'prev',
                });
            }
            else if (usingOffset) {
                plan = (0, keyset_pagination_1.buildKeyset)({
                    qb,
                    columnMap: sortableMap,
                    sort: sortArray,
                    defaultSort,
                    idColumn,
                    idDbColumn,
                    cursor: null,
                    direction: 'next',
                });
                (0, keyset_pagination_1.applyOffsetRaw)(qb, jumpPage, limit);
            }
            else {
                plan = (0, keyset_pagination_1.buildKeyset)({
                    qb,
                    columnMap: sortableMap,
                    sort: sortArray,
                    defaultSort,
                    idColumn,
                    idDbColumn,
                    cursor: cursorToken,
                    direction,
                });
            }
            console.timeEnd('CURSOR-PAGINATION');
            qb.groupBy(`
        asset_locations.location_id,
        branch.branch_id,
        mapped_branch.branch_id,
        location_type.type_id,
        location_branch_mapping.location_mapping_id,
        fav.id
      `);
            console.time('DATA-QUERY');
            if (!usingOffset) {
                qb.limit(limit + 1);
            }
            const rows = await qb.getRawMany();
            console.timeEnd('DATA-QUERY');
            console.log('========== LOCATION FAVOURITE DEBUG ==========');
            console.log('USER ID:', userId);
            console.log('FAVOURITES:', rows.map((r) => ({
                location_mapping_id: r.location_mapping_id,
                is_favourite: r.is_favourite,
            })));
            console.log('===============================================');
            const totalPages = total > 0
                ? Math.max(1, Math.ceil(total / limit))
                : 1;
            let pagedRows;
            let meta;
            if (usingOffset) {
                pagedRows = rows;
                const first = pagedRows[0];
                const last = pagedRows[pagedRows.length - 1];
                meta = (0, keyset_pagination_1.buildListMeta)({
                    page: {
                        data: pagedRows,
                        startCursor: first
                            ? (0, keyset_pagination_1.encodeCursor)({
                                v: first[plan.sortColumn] ?? null,
                                id: first[idColumn],
                            })
                            : null,
                        endCursor: last
                            ? (0, keyset_pagination_1.encodeCursor)({
                                v: last[plan.sortColumn] ?? null,
                                id: last[idColumn],
                            })
                            : null,
                        hasNextPage: jumpPage < totalPages,
                        hasPrevPage: jumpPage > 1,
                    },
                    limit,
                    total,
                    currentPage: jumpPage,
                });
            }
            else {
                const page = (0, keyset_pagination_1.finalizePage)({
                    rows,
                    limit,
                    plan,
                    idColumn,
                    hadCursor: !!cursorToken,
                });
                pagedRows = page.data;
                if (jumpToLast) {
                    page.hasNextPage = false;
                    page.hasPrevPage =
                        total > pagedRows.length;
                }
                meta = (0, keyset_pagination_1.buildListMeta)({
                    page,
                    limit,
                    total,
                    currentPage: jumpToLast
                        ? totalPages
                        : 1,
                });
            }
            console.time('RESPONSE-MAPPING');
            const data = pagedRows.map((r) => {
                return {
                    id: r.location_mapping_id,
                    location: {
                        location_mapping_id: r.location_mapping_id,
                        is_favourite: r.is_favourite === true ||
                            r.is_favourite === 'true',
                        location_id: r.location_id,
                        branch_id: r.branch_id,
                        location_name: r.location_name,
                        location_city: r.location_city,
                        location_state: r.location_state,
                        location_type_code: r.location_type_code,
                        location_type_name: r.location_type_name,
                        created_at: r.created_at,
                        is_active: r.is_active,
                        path: r.path,
                    },
                    hierarchyText: r.hierarchy_text || '-',
                    hierarchy: r.path_ids
                        ? r.path_ids
                            .split('/')
                            .map(Number)
                        : [],
                    branchName: r.mapped_branch_name ||
                        r.branch_branch_name ||
                        '-',
                    address: {
                        street: r.location_street_address ||
                            '-',
                        city: r.location_city || '',
                        state: r.location_state || '',
                        country: r.country || '',
                        pincode: r.pincode || '',
                        landmark: r.location_landmark || '',
                    },
                    totalAssetsAssigned: Number(r.asset_count || 0),
                    status: Number(r.is_active) === 1
                        ? 'Active'
                        : 'Inactive',
                    childCount: Number(r.child_count || 0),
                    branch: {
                        branch_id: r.branch_branch_id,
                        branch_name: r.branch_branch_name,
                        city: r.branch_city,
                        state: r.branch_state,
                    },
                    branch_mappings: r.branch_mappings,
                };
            });
            console.timeEnd('RESPONSE-MAPPING');
            const response = {
                success: true,
                message: data.length
                    ? 'Locations fetched successfully'
                    : 'No locations found',
                data,
                meta,
            };
            console.time('REDIS-SET');
            await this.redisService.set(cacheKey, response, 3);
            console.timeEnd('REDIS-SET');
            console.timeEnd('TOTAL-LOCATION-SERVICE');
            return response;
        }
        catch (error) {
            console.log(error);
            console.timeEnd('TOTAL-LOCATION-SERVICE');
            throw error;
        }
    }
    async resolveInternalUserId(userId) {
        if (!userId || !Number.isFinite(Number(userId)))
            return null;
        try {
            const user = await this.userRepository.findOne({
                where: [
                    { user_id: Number(userId) },
                    { register_user_login_id: Number(userId) },
                ],
                select: ['user_id'],
            });
            return user?.user_id ?? null;
        }
        catch {
            return null;
        }
    }
    async resolveLocationIds(ids) {
        const inputIds = (ids || [])
            .map(Number)
            .filter((id) => Number.isFinite(id));
        const mappingMap = new Map();
        if (!inputIds.length)
            return mappingMap;
        const mappings = await this.locationBranchMappingRepo.find({
            where: { location_mapping_id: (0, typeorm_2.In)(inputIds), is_deleted: 0 },
            select: ['location_mapping_id', 'location_id'],
        });
        mappings.forEach((m) => mappingMap.set(m.location_mapping_id, m.location_id));
        return mappingMap;
    }
    async deleteLocationsById(ids, userId) {
        console.log('Location ids to delete', ids);
        const rawIds = Array.isArray(ids) ? ids : [ids];
        const inputIds = rawIds.map(Number).filter((id) => Number.isFinite(id));
        console.log('POINT:2', inputIds);
        if (!inputIds.length) {
            throw new common_1.BadRequestException('No location IDs provided');
        }
        const mappingMap = await this.resolveLocationIds(inputIds);
        const resolvedLocationIds = [
            ...new Set(inputIds.map((id) => (mappingMap.has(id) ? mappingMap.get(id) : id))),
        ];
        const locations = await this.locationRepository.find({
            where: { location_id: (0, typeorm_2.In)(resolvedLocationIds), is_deleted: 0 },
        });
        console.log('Active locations:', locations);
        if (!locations.length) {
            throw new common_1.NotFoundException('No matching active locations found');
        }
        const deletedLocations = [];
        const failedLocations = [];
        for (const location of locations) {
            const childCount = await this.locationRepository.count({
                where: {
                    parent_location_id: location.location_id,
                    is_deleted: 0,
                },
            });
            console.log('POINT:4 childCount', childCount);
            if (childCount > 0) {
                failedLocations.push({
                    name: location.location_name,
                    reason: 'Location has child locations',
                });
                continue;
            }
            const locMappings = await this.locationBranchMappingRepo.find({
                where: { location_id: location.location_id, is_deleted: 0 },
                select: ['location_mapping_id'],
            });
            const locMappingIds = locMappings.map((m) => m.location_mapping_id);
            const targetStockLocationIds = [
                location.location_id,
                ...locMappingIds,
            ];
            const totalQuantity = await this.stockRepository
                .createQueryBuilder('stock')
                .select('COALESCE(SUM(stock.quantity), 0)', 'sum')
                .where('stock.location_id IN (:...targetStockLocationIds)', {
                targetStockLocationIds,
            })
                .andWhere('stock.is_deleted = 0')
                .getRawOne();
            if (Number(totalQuantity?.sum || 0) > 0) {
                failedLocations.push({
                    name: location.location_name,
                    reason: 'Location has stock quantity greater than 0',
                });
                continue;
            }
            console.log('POINT:4 totalQuantity', totalQuantity);
            const realUserId = await this.resolveInternalUserId(userId);
            location.is_deleted = 1;
            location.is_active = 0;
            location.updated_by = realUserId ?? userId;
            location.updated_at = new Date();
            deletedLocations.push(location);
        }
        console.log('POINT:5');
        if (deletedLocations.length > 0) {
            const deletedLocationIds = deletedLocations.map((loc) => loc.location_id);
            const realUserId = await this.resolveInternalUserId(userId);
            await this.locationRepository.save(deletedLocations);
            await this.locationBranchMappingRepo
                .createQueryBuilder()
                .update()
                .set({
                is_deleted: 1,
                is_active: 0,
                updated_by: realUserId ?? null,
                updated_at: new Date(),
            })
                .where('location_id IN (:...deletedLocationIds)', {
                deletedLocationIds,
            })
                .execute();
        }
        const totalLocations = await this.locationRepository.count({
            where: { is_active: 1, is_deleted: 0 },
        });
        console.log('REDIS UPDATE:DELETE-LOCATION');
        await this.redisService.delByPattern('asset-locations:*');
        this.redisService.delByPattern('orgnizationprofile-getcounts:*');
        await this.dropdownCache.invalidate(dropdown_entities_1.DROPDOWN.LOCATION);
        return {
            message: `Soft deleted ${deletedLocations.length} location(s) successfully`,
            deletedIds: deletedLocations.map((loc) => loc.location_id),
            failed: failedLocations,
        };
    }
    async optionsLocationTypes() {
        return this.dropdownCache.getOrSet(dropdown_entities_1.DROPDOWN.LOCATION_TYPE, { variant: 'options' }, async () => {
            return await this.dataSource.transaction(async (manager) => {
                const data = await manager.find(location_types_entity_1.LocationType, {
                    where: { is_active: 1, is_deleted: 0 },
                    order: { level: 'ASC', sort_order: 'ASC', type_id: 'ASC' },
                });
                return data.map((item) => ({
                    value: item.type_id,
                    label: item.type_name,
                    type_code: item.type_code,
                    level: item.level,
                    sort_order: item.sort_order,
                    is_required: item.is_required,
                    is_occupancy_type: item.is_occupancy_type,
                    is_location: item.is_location,
                    type_icon: item.type_icon,
                    description: item.description,
                }));
            });
        });
    }
    async getOrganizationLocationsDropdown(payload, branchIds = [], userId) {
        return this.dropdownCache.getOrSet(dropdown_entities_1.DROPDOWN.LOCATION, {
            variant: 'org-locations',
            search: payload?.search,
            branch_id: payload?.branch_id,
            branchIds,
            userId,
        }, async () => {
            try {
                const { search, branch_id } = payload;
                console.log('branchIds vk', branchIds);
                console.log('userId vk', userId);
                console.time('QB-BUILD');
                const qb = this.locationBranchMappingRepo
                    .createQueryBuilder('mapping')
                    .innerJoin('mapping.location', 'location')
                    .innerJoin('mapping.branch', 'branch')
                    .leftJoin('v_location_hierarchy_precomputed', 'lh', 'lh.location_id = location.location_id')
                    .leftJoin('location_types', 'lt', `(lt.type_id = location.location_type_id
              OR (location.location_type_id IS NULL
                  AND lt.type_code = location.location_type_code))`)
                    .leftJoin('user_location_favorites', 'fav', `fav.location_mapping_id = mapping.location_mapping_id
             AND fav.user_id = :userId`, {
                    userId: Number(userId),
                })
                    .select([
                    'mapping.location_mapping_id AS location_mapping_id',
                    'CASE WHEN fav.id IS NOT NULL THEN true ELSE false END AS is_favourite',
                    'location.location_id AS location_id',
                    'location.location_name AS location_name',
                    'location.location_floor AS location_floor',
                    'location.location_room AS location_room',
                    'location.location_type_code AS location_type_code',
                    'location.parent_location_id AS parent_location_id',
                    'lt.type_id AS location_type_id',
                    'lt.type_name AS location_type_name',
                    'lt.level AS type_level',
                    'lh.path_names AS hierarchy_text',
                    'lh.path_types AS hierarchy_types',
                    'lh.level AS hierarchy_level',
                    'branch.branch_id AS branch_id',
                    'branch.branch_name AS branch_name',
                ])
                    .where('mapping.is_deleted = 0')
                    .andWhere('location.is_deleted = 0')
                    .andWhere('location.is_active = 1');
                console.timeEnd('QB-BUILD');
                if (branchIds?.length) {
                    qb.andWhere('mapping.branch_id IN (:...branchIds)', {
                        branchIds: branchIds.map(Number),
                    });
                }
                if (branch_id) {
                    qb.andWhere('mapping.branch_id = :branch_id', {
                        branch_id,
                    });
                }
                if (search?.trim()) {
                    qb.andWhere(`(
              location.location_name ILIKE :search
              OR branch.branch_name ILIKE :search
              OR lh.path_names ILIKE :search
            )`, {
                        search: `%${search.trim()}%`,
                    });
                }
                qb.distinct(true);
                const result = await qb
                    .orderBy('branch.branch_name', 'ASC')
                    .addOrderBy('lh.path_names', 'ASC')
                    .addOrderBy('location.location_name', 'ASC')
                    .getRawMany();
                return result.map((item) => {
                    const ownPath = item.hierarchy_text ||
                        item.location_name;
                    const fullPath = item.branch_name
                        ? `${item.branch_name} → ${ownPath}`
                        : ownPath;
                    return {
                        location_mapping_id: item.location_mapping_id,
                        is_favourite: item.is_favourite === true ||
                            item.is_favourite === 'true',
                        location_id: item.location_id,
                        location_name: item.location_name,
                        location_floor: item.location_floor,
                        location_room: item.location_room,
                        location_type_code: item.location_type_code,
                        location_type_id: item.location_type_id != null
                            ? Number(item.location_type_id)
                            : null,
                        location_type_name: item.location_type_name ?? null,
                        type_level: item.type_level != null ? Number(item.type_level) : null,
                        parent_location_id: item.parent_location_id,
                        hierarchy_text: item.hierarchy_text ?? null,
                        hierarchy_types: item.hierarchy_types ?? null,
                        hierarchy_level: item.hierarchy_level ?? null,
                        full_path: fullPath,
                        branch_id: item.branch_id,
                        branch_name: item.branch_name,
                    };
                });
            }
            catch (error) {
                throw new common_1.BadRequestException(`Error fetching locations dropdown: ${error.message}`);
            }
        });
    }
    async exportLocationsExcel(dto, branchIds = []) {
        try {
            const selectedIds = dto.selectedIds || [];
            const searchArray = dto.search || [];
            const filters = dto.filters || [];
            const sortArray = dto.sort || [];
            const qb = this.locationBranchMappingRepo
                .createQueryBuilder('location_branch_mapping')
                .leftJoin('asset_locations', 'asset_locations', `asset_locations.location_id = location_branch_mapping.location_id
        AND asset_locations.is_deleted = 0`)
                .leftJoin('branches', 'branch', 'branch.branch_id = location_branch_mapping.branch_id')
                .leftJoin('branches', 'mapped_branch', 'mapped_branch.branch_id = location_branch_mapping.branch_id')
                .leftJoin('location_types', 'location_type', 'location_type.type_id = location_branch_mapping.type_id')
                .leftJoin(location_child_count_view_entity_1.LocationChildCountView, 'child_count_view', 'child_count_view.location_id = asset_locations.location_id')
                .leftJoin(location_hierarchy_precomputed_view_entity_1.LocationHierarchyPrecomputedView, 'location_hierarchy', 'location_hierarchy.location_id = asset_locations.location_id')
                .leftJoin(location_asset_counts_view_1.LocationAssetCountsView, 'location_asset_count', 'location_asset_count.location_id = location_branch_mapping.location_mapping_id')
                .where('location_branch_mapping.is_deleted = :deleted', { deleted: 0 })
                .andWhere('asset_locations.is_deleted = 0');
            (0, branch_access_1.applyBranchFilter)({
                qb,
                entityKey: 'LocationBranch',
                branchIds,
            });
            qb.select([
                'asset_locations.location_id AS location_id',
                'location_branch_mapping.branch_id AS branch_id',
                'asset_locations.location_name AS location_name',
                'asset_locations.location_floor AS location_floor',
                'asset_locations.location_room AS location_room',
                'asset_locations.location_city AS location_city',
                'asset_locations.location_state AS location_state',
                'asset_locations.location_street_address AS location_street_address',
                'asset_locations.location_description AS location_description',
                'asset_locations.location_google_map_pin AS location_google_map_pin',
                'asset_locations.location_code AS location_code',
                'asset_locations.country AS country',
                'asset_locations.pincode AS pincode',
                'asset_locations.location_landmark AS location_landmark',
                'asset_locations.parent_location_id AS parent_location_id',
                'asset_locations.path AS path',
                'asset_locations.location_level AS location_level',
                'asset_locations.location_type_code AS location_type_code',
                'asset_locations.created_at AS created_at',
                'asset_locations.is_active AS is_active',
                'COALESCE(MAX(location_asset_count.asset_count), 0) AS asset_count',
                'COALESCE(MAX(child_count_view.child_count), 0) AS child_count',
                'branch.branch_id AS branch_branch_id',
                'branch.branch_name AS branch_branch_name',
                'branch.city AS branch_city',
                'branch.state AS branch_state',
                'location_branch_mapping.location_mapping_id AS location_mapping_id',
                'location_branch_mapping.branch_id AS mapping_branch_id',
                'location_branch_mapping.type_id AS mapping_type_id',
                'mapped_branch.branch_id AS mapped_branch_id',
                'mapped_branch.branch_name AS mapped_branch_name',
                'location_type.type_id AS type_id',
                'location_type.type_name AS type_name',
                'location_type.type_code AS type_code',
                'MAX(location_hierarchy.path_names) AS hierarchy_text',
                'MAX(location_hierarchy.path_ids) AS path_ids',
                'MAX(location_hierarchy.path_types) AS path_types',
            ]);
            qb.groupBy(`
      asset_locations.location_id,
      branch.branch_id,
      mapped_branch.branch_id,
      location_type.type_id,
      location_branch_mapping.location_mapping_id
    `);
            if (selectedIds.length) {
                qb.andWhere('(location_branch_mapping.location_mapping_id IN (:...selectedIds) OR asset_locations.location_id IN (:...selectedIds))', {
                    selectedIds,
                });
            }
            searchArray.forEach((s, i) => {
                if (!s.values?.length)
                    return;
                const value = s.values.join(' ');
                qb.andWhere(`
          (
            asset_locations.location_name ILIKE :loc_${i}
            OR branch.branch_name ILIKE :branch_${i}
          )
        `, {
                    [`loc_${i}`]: `%${value}%`,
                    [`branch_${i}`]: `%${value}%`,
                });
            });
            for (const f of filters) {
                if (!f.values?.length)
                    continue;
                const columnMap = {
                    location_id: 'asset_locations.location_id',
                    branch_id: 'location_branch_mapping.branch_id',
                    location_type_code: 'asset_locations.location_type_code',
                    parent_location_id: 'asset_locations.parent_location_id',
                    is_active: 'asset_locations.is_active',
                };
                const column = columnMap[f.column] || `asset_locations.${f.column}`;
                qb.andWhere(`${column} IN (:...values)`, { values: f.values });
            }
            const sortColumnMap = {
                location_mapping_id: 'location_branch_mapping.location_mapping_id',
                location_id: 'asset_locations.location_id',
                location_name: 'asset_locations.location_name',
                location_code: 'asset_locations.location_code',
                location_city: 'asset_locations.location_city',
                location_state: 'asset_locations.location_state',
                location_type_code: 'asset_locations.location_type_code',
                is_active: 'asset_locations.is_active',
                created_at: 'asset_locations.created_at',
                hierarchy: 'asset_locations.path',
                branch_name: 'branch.branch_name',
                mapped_branch_name: 'mapped_branch.branch_name',
                asset_count: 'asset_count',
                child_count: 'child_count',
            };
            if (sortArray.length) {
                sortArray.forEach((s) => {
                    const column = sortColumnMap[s.column];
                    if (column) {
                        qb.addOrderBy(column, s.order === 'DESC' ? 'DESC' : 'ASC');
                    }
                });
            }
            else {
                qb.orderBy('asset_locations.path', 'ASC');
            }
            const rows = await qb.getRawMany();
            const workbook = await XlsxPopulate.fromBlankAsync();
            const sheet = workbook.sheet(0);
            sheet.name('Locations');
            const headers = [
                'Sr. No.',
                'Location Name',
                'Location Type',
                'Hierarchy',
                'Branch Name',
                'Asset Count',
                'Child Count',
                'Status',
                'Created At',
                'City',
                'State',
                'Country',
                'Address',
            ];
            headers.forEach((header, index) => {
                sheet
                    .cell(1, index + 1)
                    .value(header)
                    .style({
                    bold: true,
                });
            });
            rows.forEach((r, index) => {
                const row = index + 2;
                sheet.cell(row, 1).value(index + 1);
                sheet.cell(row, 2).value(r.location_name || '-');
                sheet.cell(row, 3).value(r.location_type_code || '-');
                sheet.cell(row, 4).value(r.hierarchy_text || '-');
                sheet.cell(row, 5).value(r.mapped_branch_name || r.branch_branch_name || '-');
                sheet.cell(row, 6).value(Number(r.asset_count) || 0);
                sheet.cell(row, 7).value(Number(r.child_count) || 0);
                sheet
                    .cell(row, 8)
                    .value(Number(r.is_active) === 1 ? 'Active' : 'Inactive');
                sheet
                    .cell(row, 9)
                    .value(r.created_at ? new Date(r.created_at).toLocaleDateString() : '-');
                sheet.cell(row, 10).value(r.location_city || '-');
                sheet.cell(row, 11).value(r.location_state || '-');
                sheet.cell(row, 12).value(r.country || '-');
                sheet.cell(row, 13).value(r.location_street_address || '-');
            });
            const columnWidths = {
                1: 10,
                2: 35,
                3: 20,
                4: 60,
                5: 30,
                6: 15,
                7: 15,
                8: 15,
                9: 18,
                10: 20,
                11: 20,
                12: 20,
                13: 40,
            };
            Object.entries(columnWidths).forEach(([col, width]) => {
                sheet.column(col).width(width);
            });
            sheet.freezePanes(2, 1);
            return await workbook.outputAsync();
        }
        catch (error) {
            console.log('Export Locations Error:', error);
            throw new common_1.BadRequestException(`Error exporting locations: ${error.message}`);
        }
    }
    async recordMetric(metric, value) {
        return this.orgStatRepository.save({
            metric,
            value,
        });
    }
    async getTypeChain(typeRef) {
        const rawId = typeRef && typeof typeRef === 'object'
            ? typeRef.value ?? typeRef.type_id ?? typeRef.location_type_id
            : typeRef;
        const typeId = this.toPositiveIntOrNull(rawId);
        let selected = typeId
            ? await this.locationTypeRepository.findOne({
                where: { type_id: typeId, is_deleted: 0 },
            })
            : null;
        if (!selected) {
            const label = typeRef && typeof typeRef === 'object'
                ? typeRef.label
                : typeof typeRef === 'string'
                    ? typeRef
                    : null;
            if (label && String(label).trim()) {
                selected = await this.locationTypeRepository.findOne({
                    where: { type_name: (0, typeorm_2.ILike)(String(label).trim()), is_deleted: 0 },
                });
            }
        }
        if (!selected) {
            return { selected: null, chain: [] };
        }
        if (selected.level == null) {
            return { selected, chain: [selected] };
        }
        const ancestors = (await this.locationTypeRepository.find({
            where: { is_active: 1, is_deleted: 0, is_location: true },
            order: { level: 'ASC', sort_order: 'ASC', type_id: 'ASC' },
        })).filter((t) => t.type_id !== selected.type_id &&
            t.level != null &&
            Number(t.level) >= 1 &&
            Number(t.level) < Number(selected.level));
        return { selected, chain: [...ancestors, selected] };
    }
    buildChainHeaders(chain) {
        const used = new Map();
        return chain.map((type) => {
            const base = `${String(type.type_name || type.type_code).trim()} Name`;
            const seen = used.get(base.toLowerCase()) ?? 0;
            used.set(base.toLowerCase(), seen + 1);
            return {
                header: seen === 0 ? base : `${base} (${type.type_code})`,
                type,
            };
        });
    }
    async getLocationTemplateHeaders(locationType) {
        const { selected, chain } = await this.getTypeChain(locationType);
        if (!selected) {
            console.warn(`Invalid or unsupported location type received: ${JSON.stringify(locationType)}`);
        }
        const chainHeaders = this.buildChainHeaders(chain);
        const hierarchyHeaders = chainHeaders.map((c) => c.header);
        const dynamicHierarchyHeaders = chainHeaders.map((c, index) => ({
            label: c.header,
            required: index === chainHeaders.length - 1 ||
                Boolean(c.type?.is_required && Number(c.type?.is_required) === 1),
            type: 'dropdown',
        }));
        const headers = [
            {
                label: 'Branch',
                required: true,
                type: 'dropdown',
            },
            ...dynamicHierarchyHeaders,
            { label: 'Street', required: false, type: 'text' },
            { label: 'City', required: false, type: 'text' },
            { label: 'State', required: false, type: 'text' },
            { label: 'Country', required: false, type: 'text' },
            { label: 'Pincode', required: false, type: 'text' },
            { label: 'Description', required: false, type: 'text' },
        ];
        return {
            headers,
            hierarchyHeaders,
            hierarchyTypes: chainHeaders.map((c) => ({
                header: c.header,
                type_id: c.type.type_id,
                type_code: c.type.type_code,
                type_name: c.type.type_name,
                level: c.type.level,
            })),
        };
    }
    async bulkImportLocations(dto, userId, organizationId, schema) {
        const successLocations = [];
        const errorLocations = [];
        const { selected: locationType, chain } = await this.getTypeChain(dto?.locationTypeOptionId);
        if (!locationType) {
            throw new common_1.BadRequestException('Invalid location type');
        }
        const chainHeaders = this.buildChainHeaders(chain);
        const rows = dto.payload || [];
        const branchResponse = await this.getAllOrganizationBranches();
        const branches = branchResponse?.data || [];
        const branchMap = new Map(branches.map((branch) => [
            branch.label?.trim()?.toLowerCase(),
            Number(branch.value),
        ]));
        const tenantSchema = this.safeSchema(schema);
        for (const row of rows) {
            const queryRunner = this.locationRepository.manager.connection.createQueryRunner();
            await queryRunner.connect();
            if (tenantSchema) {
                await queryRunner.query(`SET search_path TO "${tenantSchema}", public`);
            }
            await queryRunner.startTransaction();
            try {
                const branchName = String(row['Branch'] ?? '').trim();
                const branchId = branchMap.get(branchName.toLowerCase());
                if (!branchId) {
                    throw new Error(`Invalid branch '${branchName}'`);
                }
                const targetHeader = chainHeaders[chainHeaders.length - 1]?.header;
                for (let i = 0; i < chainHeaders.length; i++) {
                    const { header, type } = chainHeaders[i];
                    const isTargetType = i === chainHeaders.length - 1;
                    const isAncestorRequired = Boolean(type?.is_required && Number(type?.is_required) === 1);
                    if ((isTargetType || isAncestorRequired) &&
                        !String(row[header] ?? '').trim()) {
                        throw new Error(`'${header}' is required`);
                    }
                }
                const branchRoot = await this.resolveBranchRootLocation(Number(branchId), userId, queryRunner.manager);
                let parentNode = branchRoot;
                let previousType = null;
                let finalLocation = null;
                for (const { header, type } of chainHeaders) {
                    const locationName = String(row[header] ?? '').trim();
                    if (!locationName) {
                        continue;
                    }
                    if (previousType &&
                        previousType.level != null &&
                        type.level != null &&
                        Number(type.level) <= Number(previousType.level)) {
                        throw new Error(`'${header}' cannot be placed under '${previousType.type_name}' — both are level ${type.level}. Fill only one of them.`);
                    }
                    let parentForNode = parentNode;
                    if (parentForNode) {
                        const ruleError = await this.checkParentLevelRule(parentForNode, type, queryRunner.manager);
                        if (ruleError) {
                            if (parentForNode === branchRoot) {
                                parentForNode = null;
                            }
                            else {
                                throw new Error(`'${header}' "${locationName}": ${ruleError}`);
                            }
                        }
                    }
                    const resolvedLocation = await this.resolveOrCreateLocationNode({
                        queryRunner,
                        locationName,
                        branchId: Number(branchId),
                        parentLocation: parentForNode,
                        typeMeta: { type_id: type.type_id, type_code: type.type_code },
                        row,
                        userId,
                        isTarget: header === targetHeader,
                    });
                    parentNode = resolvedLocation;
                    previousType = type;
                    finalLocation = resolvedLocation;
                }
                if (!finalLocation) {
                    throw new Error('No valid location data found in row');
                }
                await queryRunner.commitTransaction();
                successLocations.push({
                    ...row,
                    location_id: finalLocation?.location_id || null,
                });
            }
            catch (error) {
                await queryRunner.rollbackTransaction();
                errorLocations.push({
                    ...row,
                    reason: error?.message || 'Import failed',
                });
            }
            finally {
                await queryRunner.release();
            }
        }
        const createdUser = await this.userRepository
            .createQueryBuilder('users')
            .where('users.user_id = :userId', { userId })
            .getOne();
        const totalLocations = await this.locationRepository
            .createQueryBuilder('loc')
            .where('loc.is_active = 1')
            .getCount();
        const contextData = {
            updatedUser: {
                first_name: createdUser?.first_name,
                last_name: createdUser?.last_name,
            },
            assetStockSerial: {
                quantity: successLocations.length,
            },
        };
        const recipients = [];
        if (createdUser?.users_business_email) {
            recipients.push({
                recipient_type: 'user',
                recipient_id: String(createdUser.user_id),
                recipient_email: createdUser.users_business_email,
            });
        }
        const LOCATION_CREATION_EVENT_ID = 50;
        await this.notificationHelper.triggerEventNotification({
            eventId: LOCATION_CREATION_EVENT_ID,
            contextData,
            recipients,
            meta: {
                trace_id: String(totalLocations),
            },
        });
        this.redisService.delByPattern('asset-locations:*');
        this.redisService.delByPattern('orgnizationprofile-getcounts:*');
        await this.dropdownCache.invalidate(dropdown_entities_1.DROPDOWN.LOCATION);
        return {
            status: successLocations.length
                ? common_1.HttpStatus.CREATED
                : common_1.HttpStatus.CONFLICT,
            message: successLocations.length && errorLocations.length
                ? 'Bulk locations created with some conflicts.'
                : successLocations.length
                    ? 'All locations created successfully.'
                    : 'No locations created. All entries had conflicts.',
            data: {
                created_count: successLocations.length,
                created_records: successLocations,
                error_records: errorLocations,
            },
        };
    }
    async resolveOrCreateLocationNode(params) {
        const { queryRunner, locationName, branchId, parentLocation, typeMeta, row, userId, isTarget, } = params;
        const parentLocationId = parentLocation?.location_id ?? null;
        const existingQb = queryRunner.manager
            .getRepository(locations_entity_1.Locations)
            .createQueryBuilder('al')
            .innerJoin('location_branch_mapping', 'lbm', `lbm.location_id = al.location_id
         AND lbm.branch_id = :bid
         AND lbm.is_deleted = 0`, { bid: branchId })
            .where('LOWER(TRIM(al.location_name)) = LOWER(:name)', {
            name: locationName.trim(),
        })
            .andWhere('al.is_deleted = 0')
            .andWhere('(al.location_type_id = :tid OR (al.location_type_id IS NULL AND al.location_type_code = :tcode))', { tid: typeMeta.type_id, tcode: typeMeta.type_code });
        if (parentLocationId) {
            existingQb.andWhere('al.parent_location_id = :pid', {
                pid: parentLocationId,
            });
        }
        else {
            existingQb.andWhere('al.parent_location_id IS NULL');
        }
        const existingLocation = await existingQb.getOne();
        if (existingLocation) {
            if (isTarget) {
                throw new Error(`'${locationName}' already exists at this place in the hierarchy`);
            }
            if (Number(existingLocation.is_active) !== 1) {
                throw new Error(`'${locationName}' exists but is inactive — activate it before importing under it`);
            }
            return existingLocation;
        }
        const parentPath = parentLocation ? parentLocation.path || '/' : '/';
        const level = parentLocation
            ? (parentLocation.location_level || 0) + 1
            : 0;
        const address = isTarget
            ? {
                location_street_address: row['Street'] || null,
                location_city: row['City'] || null,
                location_state: row['State'] || null,
                country: row['Country'] || null,
                pincode: row['Pincode'] ? Number(row['Pincode']) : null,
                location_description: row['Description'] || null,
            }
            : {};
        const locationPayload = queryRunner.manager.create(locations_entity_1.Locations, {
            location_name: locationName.trim(),
            location_type_id: typeMeta.type_id,
            location_type_code: typeMeta.type_code,
            parent_location_id: parentLocationId,
            location_level: level,
            path: '',
            ...address,
            is_active: 1,
            is_deleted: 0,
            created_by: userId,
        });
        let savedLocation = await queryRunner.manager.save(locations_entity_1.Locations, locationPayload);
        savedLocation.path = `${parentPath}${savedLocation.location_id}/`;
        savedLocation = await queryRunner.manager.save(locations_entity_1.Locations, savedLocation);
        await queryRunner.manager.save(location_branch_mapping_entity_1.LocationBranchMapping, queryRunner.manager.create(location_branch_mapping_entity_1.LocationBranchMapping, {
            location_id: savedLocation.location_id,
            branch_id: branchId,
            type_id: typeMeta.type_id,
            is_active: 1,
            is_deleted: 0,
            updated_by: userId,
        }));
        return savedLocation;
    }
    async updateLocation(payloadWithId, userId, schema) {
        const { location_id, ...payload } = payloadWithId;
        const mappingRecord = await this.locationBranchMappingRepo.findOne({
            where: {
                location_mapping_id: location_id,
                is_deleted: 0,
            },
            select: ['location_mapping_id', 'location_id'],
        });
        if (!mappingRecord) {
            throw new common_1.HttpException('Location not found', common_1.HttpStatus.NOT_FOUND);
        }
        const actualLocationId = mappingRecord.location_id;
        const location = await this.locationRepository.findOne({
            where: { location_id: actualLocationId, is_deleted: 0 },
        });
        if (!location) {
            throw new common_1.HttpException('Location not found', common_1.HttpStatus.NOT_FOUND);
        }
        if (payload?.pincode && !/^[1-9][0-9]{5}$/.test(String(payload.pincode).trim())) {
            throw new common_1.HttpException('Please enter a valid 6-digit pincode.', common_1.HttpStatus.BAD_REQUEST);
        }
        const legacyRows = this.extractLocationRows({ ...payload, location_name: undefined }, payload.location_type_code || location.location_type_code);
        const item = legacyRows[0] || {};
        const newName = (typeof payload.location_name === 'string' &&
            payload.location_name.trim()) ||
            item?.location_name?.trim() ||
            location.location_name;
        const currentType = await this.resolveTypeOfLocation(location);
        const typeChangeRequested = Object.prototype.hasOwnProperty.call(payload, 'location_type_id') &&
            payload.location_type_id !== null &&
            payload.location_type_id !== '' &&
            Number(payload.location_type_id) !== Number(location.location_type_id);
        const parentKeyPresent = Object.prototype.hasOwnProperty.call(payload, 'parent_location_id');
        const requestedParentId = parentKeyPresent
            ? this.toPositiveIntOrNull(payload.parent_location_id)
            : null;
        if (parentKeyPresent &&
            payload.parent_location_id !== null &&
            payload.parent_location_id !== '' &&
            requestedParentId === null) {
            throw new common_1.HttpException('Invalid parent_location_id', common_1.HttpStatus.BAD_REQUEST);
        }
        const parentChangeRequested = parentKeyPresent &&
            (requestedParentId ?? null) !==
                (location.parent_location_id != null
                    ? Number(location.parent_location_id)
                    : null);
        const hierarchyEditEnabled = process.env.LOCATION_HIERARCHY_EDIT_ENABLED === 'true';
        if (!hierarchyEditEnabled) {
            const currentTypeId = currentType?.type_id ?? location.location_type_id ?? null;
            const currentTypeCode = String(currentType?.type_code ?? location.location_type_code ?? '').toLowerCase();
            const sentTypeIds = [payload.location_type_id, payload.location_type]
                .map((v) => this.toPositiveIntOrNull(v))
                .filter((v) => v !== null);
            const sentTypeCode = typeof payload.location_type_code === 'string' &&
                payload.location_type_code.trim()
                ? payload.location_type_code.trim().toLowerCase()
                : null;
            const typeDiffers = (currentTypeId != null &&
                sentTypeIds.some((id) => id !== Number(currentTypeId))) ||
                (sentTypeCode !== null &&
                    currentTypeCode !== '' &&
                    sentTypeCode !== currentTypeCode);
            if (typeDiffers) {
                throw new common_1.HttpException('Location type cannot be changed after creation as it impacts hierarchy structure and mapping.', common_1.HttpStatus.BAD_REQUEST);
            }
            if (parentChangeRequested) {
                throw new common_1.HttpException('Parent location cannot be changed after creation as it impacts hierarchy structure and mapping.', common_1.HttpStatus.BAD_REQUEST);
            }
        }
        const currentActive = Number(location.is_active) === 1 ? 1 : 0;
        if (payload.is_active !== undefined &&
            payload.is_active !== null &&
            payload.is_active !== '') {
            const requestedActive = [true, 1, '1', 'true'].includes(payload.is_active)
                ? 1
                : 0;
            if (requestedActive !== currentActive) {
                throw new common_1.HttpException('Status cannot be changed from Edit Location. Use Activate / Deactivate instead.', common_1.HttpStatus.BAD_REQUEST);
            }
        }
        const currentMappings = await this.locationBranchMappingRepo.find({
            where: { location_id: location.location_id, is_active: 1, is_deleted: 0 },
            select: ['branch_id'],
        });
        const currentBranchIds = new Set(currentMappings.map((m) => Number(m.branch_id)));
        if (payload.branch_id &&
            currentBranchIds.size > 0 &&
            !currentBranchIds.has(Number(payload.branch_id))) {
            throw new common_1.HttpException('Branch cannot be changed from Edit Location.', common_1.HttpStatus.BAD_REQUEST);
        }
        let targetType = currentType;
        if (typeChangeRequested) {
            targetType = await this.locationTypeRepository.findOne({
                where: {
                    type_id: Number(payload.location_type_id),
                    is_deleted: 0,
                    is_active: 1,
                },
            });
            if (!targetType) {
                throw new common_1.HttpException('Invalid location type', common_1.HttpStatus.BAD_REQUEST);
            }
            const childCount = await this.locationRepository.count({
                where: { parent_location_id: location.location_id, is_deleted: 0 },
            });
            if (childCount > 0) {
                throw new common_1.HttpException(`Cannot change the type of "${location.location_name}" because it has ${childCount} child location(s). Move or remove the children first.`, common_1.HttpStatus.CONFLICT);
            }
        }
        let newParent = null;
        if (parentChangeRequested && requestedParentId) {
            if (requestedParentId === Number(location.location_id)) {
                throw new common_1.HttpException('A location cannot be its own parent.', common_1.HttpStatus.BAD_REQUEST);
            }
            newParent = await this.locationRepository.findOne({
                where: { location_id: requestedParentId, is_deleted: 0 },
            });
            if (!newParent) {
                throw new common_1.HttpException('Selected parent location does not exist.', common_1.HttpStatus.BAD_REQUEST);
            }
            if (Number(newParent.is_active) !== 1) {
                throw new common_1.HttpException(`Parent location "${newParent.location_name}" is inactive.`, common_1.HttpStatus.BAD_REQUEST);
            }
            const parentMappings = await this.locationBranchMappingRepo.find({
                where: { location_id: newParent.location_id, is_active: 1, is_deleted: 0 },
                select: ['branch_id'],
            });
            const sharesBranch = parentMappings.some((m) => currentBranchIds.has(Number(m.branch_id)));
            if (currentBranchIds.size > 0 && !sharesBranch) {
                throw new common_1.HttpException(`Cannot move "${location.location_name}" under "${newParent.location_name}" because it belongs to a different branch.`, common_1.HttpStatus.BAD_REQUEST);
            }
            if (await this.isDescendantOf(requestedParentId, location.location_id)) {
                throw new common_1.HttpException('Cannot move a location under one of its own descendants.', common_1.HttpStatus.BAD_REQUEST);
            }
        }
        else if (!parentChangeRequested && location.parent_location_id) {
            newParent = typeChangeRequested
                ? await this.locationRepository.findOne({
                    where: { location_id: location.parent_location_id },
                })
                : null;
        }
        if ((parentChangeRequested || typeChangeRequested) && newParent && targetType) {
            const ruleError = await this.checkParentLevelRule(newParent, targetType);
            if (ruleError) {
                throw new common_1.HttpException(ruleError, common_1.HttpStatus.BAD_REQUEST);
            }
        }
        const tenantSchema = this.safeSchema(schema);
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        let savedLocation;
        try {
            if (tenantSchema) {
                await queryRunner.query(`SET search_path TO "${tenantSchema}", public`);
            }
            await queryRunner.startTransaction();
            const repo = queryRunner.manager.getRepository(locations_entity_1.Locations);
            const merged = repo.merge(location, {
                location_name: newName,
                location_code: payload.location_code !== undefined
                    ? payload.location_code || null
                    : item?.location_code !== undefined
                        ? item.location_code || null
                        : location.location_code,
                location_floor: payload.location_floor?.trim() || location.location_floor,
                location_room: payload.location_room?.trim() || location.location_room,
                location_city: payload.location_city?.trim() || location.location_city,
                location_state: payload.location_state?.trim() || location.location_state,
                country: payload.country?.trim() || location.country,
                pincode: payload.pincode ? Number(payload.pincode) : location.pincode,
                location_landmark: payload.location_landmark?.trim() || location.location_landmark,
                location_street_address: payload.location_street_address?.trim() ||
                    location.location_street_address,
                location_description: payload.location_description?.trim() || location.location_description,
                is_active: currentActive,
                updated_by: userId,
            });
            if (typeChangeRequested && targetType) {
                merged.location_type_id = targetType.type_id;
                merged.location_type_code = targetType.type_code;
            }
            if (parentChangeRequested) {
                merged.parent_location_id = newParent ? newParent.location_id : null;
                merged.location_level = newParent
                    ? (newParent.location_level || 0) + 1
                    : 0;
                const parentPath = newParent ? newParent.path || '/' : '/';
                merged.path = `${parentPath}${location.location_id}/`;
            }
            savedLocation = await repo.save(merged);
            if (parentChangeRequested) {
                const table = tenantSchema
                    ? `"${tenantSchema}".asset_locations`
                    : 'asset_locations';
                await queryRunner.query(`
          WITH RECURSIVE sub AS (
            SELECT a.location_id,
                   $2::text AS new_path,
                   $3::int  AS new_level,
                   0        AS depth
              FROM ${table} a
             WHERE a.location_id = $1
            UNION ALL
            SELECT c.location_id,
                   s.new_path || c.location_id::text || '/',
                   s.new_level + 1,
                   s.depth + 1
              FROM ${table} c
              JOIN sub s ON c.parent_location_id = s.location_id
             WHERE s.depth < 100
          )
          UPDATE ${table} t
             SET path = sub.new_path,
                 location_level = sub.new_level
            FROM sub
           WHERE t.location_id = sub.location_id
             AND sub.depth > 0
          `, [
                    savedLocation.location_id,
                    savedLocation.path,
                    savedLocation.location_level ?? 0,
                ]);
            }
            if (typeChangeRequested && targetType) {
                await queryRunner.manager
                    .getRepository(location_branch_mapping_entity_1.LocationBranchMapping)
                    .update({ location_id: location.location_id, is_deleted: 0 }, { type_id: targetType.type_id, updated_by: userId });
            }
            await queryRunner.commitTransaction();
        }
        catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }
            throw error;
        }
        finally {
            await queryRunner.release();
        }
        console.log('REDIS UPDATE:UPDATE-LOCATION');
        await this.redisService.delByPattern('asset-locations:*');
        await this.dropdownCache.invalidate(dropdown_entities_1.DROPDOWN.LOCATION);
        return {
            status: common_1.HttpStatus.OK,
            message: parentChangeRequested || typeChangeRequested
                ? 'Location updated successfully (hierarchy recalculated)'
                : 'Location updated successfully',
            data: savedLocation,
        };
    }
    async isDescendantOf(candidateId, ancestorId) {
        let currentId = candidateId;
        const seen = new Set();
        while (currentId != null && !seen.has(currentId) && seen.size < 200) {
            if (Number(currentId) === Number(ancestorId))
                return true;
            seen.add(currentId);
            const row = await this.locationRepository.findOne({
                where: { location_id: currentId },
                select: ['location_id', 'parent_location_id'],
            });
            currentId =
                row?.parent_location_id != null ? Number(row.parent_location_id) : null;
        }
        return false;
    }
    async activateLocations(locationIds, systemUserId) {
        const rawIds = Array.isArray(locationIds) ? locationIds : [locationIds];
        const inputIds = rawIds.map(Number).filter((id) => Number.isFinite(id));
        const mappingMap = await this.resolveLocationIds(inputIds);
        const results = [];
        const locationsToActivate = [];
        for (const id of inputIds) {
            const realLocationId = mappingMap.get(id) ?? id;
            const location = await this.locationRepository.findOne({
                where: { location_id: realLocationId, is_deleted: 0 },
            });
            if (!location) {
                results.push({
                    id,
                    status: 'failed',
                    message: 'Location not found or deleted.',
                    name: `ID ${id}`,
                });
                continue;
            }
            if (location.is_active) {
                results.push({
                    id,
                    status: 'failed',
                    message: 'Location is already active.',
                    name: location.location_name,
                });
                continue;
            }
            locationsToActivate.push(location);
            results.push({
                id,
                status: 'success',
                name: location.location_name,
            });
        }
        if (locationsToActivate.length > 0) {
            const activeLocationIds = locationsToActivate.map((l) => l.location_id);
            const realUserId = await this.resolveInternalUserId(systemUserId);
            await this.locationRepository
                .createQueryBuilder()
                .update()
                .set({
                is_active: 1,
                updated_by: realUserId ?? systemUserId,
                updated_at: new Date(),
            })
                .where('location_id IN (:...ids)', {
                ids: activeLocationIds,
            })
                .execute();
            await this.locationBranchMappingRepo
                .createQueryBuilder()
                .update()
                .set({
                is_active: 1,
                updated_by: realUserId ?? null,
                updated_at: new Date(),
            })
                .where('location_id IN (:...ids)', {
                ids: activeLocationIds,
            })
                .execute();
        }
        console.log('REDIS UPDATE:ACTIVATE-LOCATION');
        await this.redisService.delByPattern('asset-locations:*');
        this.redisService.delByPattern('orgnizationprofile-getcounts:*');
        await this.dropdownCache.invalidate(dropdown_entities_1.DROPDOWN.LOCATION);
        const successful = results.filter((r) => r.status === 'success');
        let message = '';
        if (successful.length === 1) {
            message = `Location ${successful[0].name} marked as active.`;
        }
        else if (successful.length > 1) {
            message = `${successful.length} locations marked as active.`;
        }
        else {
            message = 'No locations were marked as active.';
        }
        return {
            success: successful.length > 0,
            message,
            details: results,
        };
    }
    async deactivateLocations(locationIds, systemUserId) {
        const rawIds = Array.isArray(locationIds) ? locationIds : [locationIds];
        const inputIds = rawIds.map(Number).filter((id) => Number.isFinite(id));
        const mappingMap = await this.resolveLocationIds(inputIds);
        const results = [];
        const locationsToDeactivate = [];
        for (const id of inputIds) {
            const realLocationId = mappingMap.get(id) ?? id;
            const location = await this.locationRepository.findOne({
                where: { location_id: realLocationId, is_deleted: 0 },
            });
            if (!location) {
                results.push({
                    id,
                    status: 'failed',
                    message: 'Location not found or deleted.',
                    name: `ID ${id}`,
                });
                continue;
            }
            if (!location.is_active) {
                results.push({
                    id,
                    status: 'failed',
                    message: 'Location is already inactive.',
                    name: location.location_name,
                });
                continue;
            }
            const locMappings = await this.locationBranchMappingRepo.find({
                where: { location_id: location.location_id, is_deleted: 0 },
                select: ['location_mapping_id'],
            });
            const targetStockLocationIds = [
                location.location_id,
                ...locMappings.map((m) => m.location_mapping_id),
            ];
            const stockCount = await this.stockRepository
                .createQueryBuilder('stock')
                .where('stock.location_id IN (:...targetStockLocationIds)', {
                targetStockLocationIds,
            })
                .andWhere('stock.is_deleted = 0')
                .andWhere('stock.quantity > 0')
                .getCount();
            if (stockCount > 0) {
                results.push({
                    id,
                    status: 'failed',
                    message: 'Location has assigned assets (quantity > 0). Please unassign or transfer assets before deactivation.',
                    name: location.location_name,
                });
                continue;
            }
            locationsToDeactivate.push(location);
            results.push({
                id,
                status: 'success',
                name: location.location_name,
            });
        }
        if (locationsToDeactivate.length > 0) {
            const deactivateLocationIds = locationsToDeactivate.map((l) => l.location_id);
            const realUserId = await this.resolveInternalUserId(systemUserId);
            await this.locationRepository
                .createQueryBuilder()
                .update()
                .set({
                is_active: 0,
                updated_by: realUserId ?? systemUserId,
                updated_at: new Date(),
            })
                .where('location_id IN (:...ids)', {
                ids: deactivateLocationIds,
            })
                .execute();
            await this.locationBranchMappingRepo
                .createQueryBuilder()
                .update()
                .set({
                is_active: 0,
                updated_by: realUserId ?? null,
                updated_at: new Date(),
            })
                .where('location_id IN (:...ids)', {
                ids: deactivateLocationIds,
            })
                .execute();
            console.log('updatedUser systemUserId:', systemUserId);
            console.log('REDIS UPDATE:DEACTIVATE-LOCATION');
            await this.redisService.delByPattern('asset-locations:*');
            this.redisService.delByPattern('orgnizationprofile-getcounts:*');
            await this.dropdownCache.invalidate(dropdown_entities_1.DROPDOWN.LOCATION);
            const LOCATION_DEACTIVATION_EVENT_ID = 19;
            const updatedUser = await this.userRepository.findOne({
                where: { register_user_login_id: systemUserId },
            });
            console.log('updatedUser details:', updatedUser);
            for (const location of locationsToDeactivate) {
                const contextData = {
                    location,
                    updatedUser: {
                        first_name: updatedUser?.first_name,
                        last_name: updatedUser?.last_name,
                    },
                };
                const recipients = [];
                if (updatedUser?.users_business_email) {
                    recipients.push({
                        recipient_type: 'user',
                        recipient_id: String(updatedUser.user_id),
                        recipient_email: updatedUser.users_business_email,
                    });
                }
                await this.notificationHelper.triggerEventNotification({
                    eventId: LOCATION_DEACTIVATION_EVENT_ID,
                    contextData,
                    recipients,
                    meta: {
                        trace_id: `location-${location.location_id}`,
                    },
                });
            }
        }
        const successful = results.filter((r) => r.status === 'success');
        let message = '';
        if (successful.length === 1) {
            message = `Location ${successful[0].name} marked as inactive.`;
        }
        else if (successful.length > 1) {
            message = `${successful.length} locations marked as inactive.`;
        }
        else {
            message = 'No locations were marked as inactive.';
        }
        return {
            success: successful.length > 0,
            message,
            details: results,
        };
    }
    async getLocationsWithTypeByLabel(dto) {
        const { location_type_code, branch_id } = dto;
        const locationType = await this.locationRepository
            .createQueryBuilder('lt')
            .select(['lt.location_type_id AS location_type_id'])
            .where('LOWER(lt.location_type_code) = LOWER(:location_type_code)', {
            location_type_code,
        })
            .getRawOne();
        if (!locationType?.location_type_id) {
            return {
                success: false,
                message: 'Invalid location type',
                data: [],
            };
        }
        return await this.getLocationsWithType({
            location_type_id: locationType.location_type_id,
            branch_id,
        });
    }
    toColumnLetter(colIndex) {
        let letter = '';
        while (colIndex > 0) {
            const mod = (colIndex - 1) % 26;
            letter = String.fromCharCode(65 + mod) + letter;
            colIndex = Math.floor((colIndex - 1) / 26);
        }
        return letter;
    }
    async generateLocationTemplate(locationType, branchIds = []) {
        try {
            console.log('locationType', locationType);
            const { selected: selectedType, chain } = await this.getTypeChain(locationType);
            const chainHeaders = this.buildChainHeaders(chain);
            const normalizedType = selectedType?.type_name ?? locationType?.label ?? 'Location';
            const locationsQb = this.locationRepository
                .createQueryBuilder('al')
                .innerJoin('location_branch_mapping', 'lbm', `lbm.location_id = al.location_id
           AND lbm.is_active = 1
           AND lbm.is_deleted = 0`)
                .innerJoin('branches', 'br', `br.branch_id = lbm.branch_id
           AND br.is_active = 1
           AND br.is_deleted = 0`)
                .leftJoin('location_types', 'lt', `(lt.type_id = al.location_type_id
            OR (al.location_type_id IS NULL AND lt.type_code = al.location_type_code))`)
                .select([
                'al.location_id AS location_id',
                'al.location_name AS location_name',
                'lt.type_id AS location_type_id',
                'al.parent_location_id AS parent_location_id',
                'br.branch_name AS branch_name',
            ])
                .where('al.is_deleted = 0')
                .andWhere('al.is_active = 1');
            if (branchIds?.length) {
                locationsQb.andWhere('lbm.branch_id IN (:...tplBranchIds)', {
                    tplBranchIds: branchIds.map(Number),
                });
            }
            const loctionsOptions = await locationsQb.getRawMany();
            const states = [
                'Andhra Pradesh',
                'Arunachal Pradesh',
                'Assam',
                'Bihar',
                'Chhattisgarh',
                'Goa',
                'Gujarat',
                'Haryana',
                'Himachal Pradesh',
                'Jharkhand',
                'Karnataka',
                'Kerala',
                'Madhya Pradesh',
                'Maharashtra',
                'Manipur',
                'Meghalaya',
                'Mizoram',
                'Nagaland',
                'Odisha',
                'Punjab',
                'Rajasthan',
                'Sikkim',
                'Tamil Nadu',
                'Telangana',
                'Tripura',
                'Uttar Pradesh',
                'Uttarakhand',
                'West Bengal',
            ];
            const countries = ['India'];
            const hierarchyHeaders = chainHeaders.map((c) => c.header);
            const typeIdByHeader = {};
            chainHeaders.forEach((c) => {
                typeIdByHeader[c.header] = Number(c.type.type_id);
            });
            const locationIdMap = {};
            loctionsOptions.forEach((location) => {
                locationIdMap[location.location_id] = location;
            });
            console.log('totalLocations', loctionsOptions?.length);
            const branchScopedLists = new Map();
            const addToList = (key, name) => {
                if (!name)
                    return;
                const list = branchScopedLists.get(key) || [];
                if (!list.includes(name))
                    list.push(name);
                branchScopedLists.set(key, list);
            };
            hierarchyHeaders.forEach((header, index) => {
                const currentTypeId = typeIdByHeader[header];
                if (!currentTypeId) {
                    console.warn(`Skipping invalid hierarchy header: ${header}`);
                    return;
                }
                const previousTypeId = index > 0 ? typeIdByHeader[hierarchyHeaders[index - 1]] : null;
                loctionsOptions.forEach((location) => {
                    if (Number(location.location_type_id) !== Number(currentTypeId))
                        return;
                    const branchName = String(location.branch_name ?? '').trim();
                    const name = String(location.location_name ?? '').trim();
                    addToList(`${index}|${branchName}|`, name);
                    if (!previousTypeId)
                        return;
                    let ancestor = locationIdMap[location.parent_location_id];
                    while (ancestor) {
                        if (Number(ancestor.location_type_id) === Number(previousTypeId)) {
                            addToList(`${index}|${branchName}|${String(ancestor.location_name).trim()}`, name);
                            break;
                        }
                        ancestor = locationIdMap[ancestor.parent_location_id];
                    }
                });
            });
            console.log('branchScopedLists', branchScopedLists.size);
            const branchResponse = await this.getAllOrganizationBranches(branchIds);
            const branches = branchResponse.data.map((b) => b.label);
            console.log("BRANCHES FOR DROPDOWN", branches);
            console.log('Branches Count:', branches.length);
            console.log('Branches:', branches);
            const workbook = await XlsxPopulate.fromBlankAsync();
            const mainSheet = workbook.sheet(0);
            mainSheet.name('Location_Template');
            const dataSheet = workbook.addSheet('Data');
            const instructions = [
                'Instructions:',
                `1. Template Type: ${normalizedType || 'Location'}`,
                '2. Fill data starting from row 8.',
                "3. Select the Branch first — location dropdowns only list that branch's locations.",
                '4. For same-level locations (e.g. Building, Shed, Warehouse): Select only ONE per row. If you select Building, leave Shed and Warehouse blank.',
                '5. Use dropdown values only where available.',
                '6. Do not edit header row.',
            ];
            instructions.forEach((text, idx) => {
                mainSheet
                    .cell(idx + 1, 1)
                    .value(text)
                    .style({
                    bold: true,
                    fontColor: '0000FF',
                });
            });
            const dynamicHierarchyHeaders = chainHeaders.map((c, index) => ({
                label: c.header,
                required: index === chainHeaders.length - 1 ||
                    Boolean(c.type?.is_required && Number(c.type?.is_required) === 1),
            }));
            const headers = [
                {
                    label: 'Branch',
                    required: true,
                },
                ...dynamicHierarchyHeaders,
                {
                    label: 'Street',
                    required: false,
                },
                {
                    label: 'City',
                    required: false,
                },
                {
                    label: 'State',
                    required: false,
                },
                {
                    label: 'Country',
                    required: false,
                },
                {
                    label: 'Pincode',
                    required: false,
                },
                {
                    label: 'Description',
                    required: false,
                },
            ];
            headers.forEach((_, index) => {
                mainSheet.column(index + 1).width(28);
            });
            headers.forEach((item, index) => {
                const cell = mainSheet.cell(7, index + 1);
                cell.value(item.label);
                cell.style({
                    bold: true,
                });
                if (item.required) {
                    cell.style({
                        fill: 'FFCCCC',
                    });
                }
            });
            branches.forEach((item, i) => {
                dataSheet.cell(i + 1, 1).value(item);
            });
            states.forEach((state, index) => {
                dataSheet.cell(index + 1, 500).value(state);
            });
            countries.forEach((country, index) => {
                dataSheet.cell(index + 1, 501).value(country);
            });
            const KEY_COL = 502;
            const NAME_COL = 503;
            let listColumn = 504;
            let keyRow = 0;
            branchScopedLists.forEach((values, key) => {
                values.forEach((value, rowIndex) => {
                    dataSheet.cell(rowIndex + 1, listColumn).value(value);
                });
                const listLetter = this.toColumnLetter(listColumn);
                const rangeName = `L_${listColumn}`;
                workbook.definedName(rangeName, `Data!$${listLetter}$1:$${listLetter}$${values.length}`);
                keyRow++;
                dataSheet.cell(keyRow, KEY_COL).value(key);
                dataSheet.cell(keyRow, NAME_COL).value(rangeName);
                listColumn++;
            });
            const emptyColLetter = this.toColumnLetter(listColumn);
            workbook.definedName('EMPTY_LIST', `Data!$${emptyColLetter}$1:$${emptyColLetter}$1`);
            listColumn++;
            const startRow = 8;
            const maxRow = 5000;
            mainSheet.range(`A${startRow}:A${maxRow}`).dataValidation({
                type: 'list',
                formula1: `Data!$A$1:$A$${branches.length}`,
                allowBlank: true,
                showErrorMessage: true,
                errorTitle: 'Invalid Selection',
                error: 'Please select only from dropdown values',
            });
            if (keyRow > 0) {
                const keyLetter = this.toColumnLetter(KEY_COL);
                const nameLetter = this.toColumnLetter(NAME_COL);
                const keyTable = `Data!$${keyLetter}$1:$${nameLetter}$${keyRow}`;
                hierarchyHeaders.forEach((_header, index) => {
                    const currentType = chainHeaders[index]?.type;
                    const columnLetter = this.toColumnLetter(index + 2);
                    const colRange = `${columnLetter}${startRow}:${columnLetter}${maxRow}`;
                    const siblingColLetters = chainHeaders
                        .map((c, i) => ({ type: c.type, colLetter: this.toColumnLetter(i + 2), i }))
                        .filter((s) => s.i !== index &&
                        s.type?.level != null &&
                        currentType?.level != null &&
                        Number(s.type.level) === Number(currentType.level))
                        .map((s) => s.colLetter);
                    const prevRef = index === 0 ? '""' : `${this.toColumnLetter(index + 1)}${startRow}`;
                    const lookupKey = `${index}&"|"&$A${startRow}&"|"&${prevRef}`;
                    const baseFormula = `INDIRECT(VLOOKUP(${lookupKey},${keyTable},2,FALSE))`;
                    let formula1 = baseFormula;
                    if (siblingColLetters.length > 0) {
                        const siblingCheck = siblingColLetters
                            .map((letter) => `${letter}${startRow}<>""`)
                            .join(',');
                        const condition = siblingColLetters.length === 1
                            ? siblingCheck
                            : `OR(${siblingCheck})`;
                        formula1 = `IF(${condition},EMPTY_LIST,${baseFormula})`;
                    }
                    mainSheet.range(colRange).dataValidation({
                        type: 'list',
                        formula1,
                        allowBlank: true,
                        showErrorMessage: false,
                    });
                });
            }
            const stateColumnIndex = headers.findIndex((h) => h.label === 'State');
            if (stateColumnIndex !== -1) {
                const excelColumn = this.toColumnLetter(stateColumnIndex + 1);
                mainSheet
                    .range(`${excelColumn}${startRow}:${excelColumn}${maxRow}`)
                    .dataValidation({
                    type: 'list',
                    formula1: `Data!$SF$1:$SF$${states.length}`,
                    allowBlank: true,
                    showErrorMessage: true,
                    errorTitle: 'Invalid Selection',
                    error: 'Please select only from dropdown values',
                });
            }
            const countryColumnIndex = headers.findIndex((h) => h.label === 'Country');
            if (countryColumnIndex !== -1) {
                const excelColumn = this.toColumnLetter(countryColumnIndex + 1);
                mainSheet
                    .range(`${excelColumn}${startRow}:${excelColumn}${maxRow}`)
                    .dataValidation({
                    type: 'list',
                    formula1: `Data!$SG$1:$SG$${countries.length}`,
                    allowBlank: true,
                    showErrorMessage: true,
                    errorTitle: 'Invalid Selection',
                    error: 'Please select only from dropdown values',
                });
            }
            const pincodeColumnIndex = headers.findIndex((h) => h.label === 'Pincode');
            if (pincodeColumnIndex !== -1) {
                const excelColumn = this.toColumnLetter(pincodeColumnIndex + 1);
                mainSheet
                    .range(`${excelColumn}${startRow}:${excelColumn}${maxRow}`)
                    .dataValidation({
                    type: 'custom',
                    formula1: `AND(ISNUMBER(${excelColumn}${startRow}),LEN(${excelColumn}${startRow})=6)`,
                    allowBlank: true,
                    showErrorMessage: true,
                    errorTitle: 'Invalid Pincode',
                    error: 'Pincode must be exactly 6 numeric digits',
                });
            }
            dataSheet.hidden(true);
            return await workbook.outputAsync();
        }
        catch (error) {
            console.error('Error generating location template:', error);
            throw new Error('Failed to generate Excel location template');
        }
    }
    async getAllOrganizationBranches(branchIds = []) {
        try {
            const qb = this.branchRepository
                .createQueryBuilder('branch')
                .select([
                'branch.branch_id AS branch_id',
                'branch.branch_name AS branch_name',
            ])
                .where('branch.is_active = :isActive', { isActive: 1 })
                .andWhere('branch.is_deleted = :isDeleted', { isDeleted: 0 })
                .orderBy('branch.branch_name', 'ASC');
            if (branchIds?.length) {
                qb.andWhere('branch.branch_id IN (:...scopeBranchIds)', {
                    scopeBranchIds: branchIds.map(Number),
                });
            }
            const branches = await qb.getRawMany();
            const branchOptions = branches.map((b) => ({
                value: String(b.branch_id),
                label: b.branch_name,
            }));
            return {
                status: 200,
                message: 'Branches retrieved successfully',
                data: branchOptions,
            };
        }
        catch (error) {
            console.error('Error fetching branches:', error);
            throw new common_1.BadRequestException(`Error fetching branches: ${error.message}`);
        }
    }
    async getLocationOptions(types, branchId) {
        return this.dropdownCache.getOrSet(dropdown_entities_1.DROPDOWN.LOCATION, { variant: 'location-options', types, branchId }, async () => {
            return await this.withOrgSchema(async (manager) => {
                const result = {};
                for (const type of types) {
                    const qb = manager
                        .createQueryBuilder(locations_entity_1.Locations, 'loc')
                        .innerJoin('location_branch_mapping', 'lbm', 'lbm.location_id = loc.location_id AND lbm.is_deleted = 0')
                        .leftJoin('branches', 'br', 'br.branch_id = lbm.branch_id')
                        .where('loc.is_deleted = 0')
                        .andWhere('loc.is_active = 1')
                        .andWhere('loc.location_type_code = :type', { type })
                        .select([
                        'loc.location_id AS location_id',
                        'loc.location_name AS location_name',
                        'loc.parent_location_id AS parent_location_id',
                        'lbm.branch_id AS branch_id',
                        'br.branch_street AS branch_street',
                        'br.branch_landmark AS branch_landmark',
                        'br.city AS city',
                        'br.state AS state',
                        'br.country AS country',
                        'br.pincode AS pincode',
                    ])
                        .orderBy('loc.location_name', 'ASC')
                        .addOrderBy('lbm.location_mapping_id', 'ASC');
                    if (branchId) {
                        qb.andWhere('lbm.branch_id = :branchId', { branchId });
                    }
                    const seen = new Set();
                    const data = (await qb.getRawMany()).filter((row) => {
                        const id = Number(row.location_id);
                        if (seen.has(id))
                            return false;
                        seen.add(id);
                        return true;
                    });
                    result[type] = data.map((item) => ({
                        value: item.location_id,
                        label: item.location_name,
                        branch_id: item.branch_id,
                        parent_location_id: item.parent_location_id,
                        street: item.branch_street || null,
                        landmark: item.branch_landmark || null,
                        city: item.city || null,
                        state: item.state || null,
                        country: item.country || null,
                        pincode: item.pincode || null,
                    }));
                }
                return result;
            });
        });
    }
    async getLocationsWithType(dto) {
        return this.dropdownCache.getOrSet(dropdown_entities_1.DROPDOWN.LOCATION, {
            variant: 'locations-by-type-mapped',
            location_type_id: dto?.location_type_id,
            branch_id: dto?.branch_id,
        }, async () => {
            const location_type_id = dto?.location_type_id;
            const branch_id = dto?.branch_id;
            return this.withOrgSchema(async (manager) => {
                const query = manager
                    .getRepository(locations_entity_1.Locations)
                    .createQueryBuilder('al')
                    .innerJoin('location_branch_mapping', 'lbm', `lbm.location_id = al.location_id
             AND lbm.is_active = 1
             AND lbm.is_deleted = 0`)
                    .innerJoin('branches', 'br', `br.branch_id = lbm.branch_id
             AND br.is_active = 1
             AND br.is_deleted = 0`)
                    .leftJoin('location_types', 'lt', 'al.location_type_id = lt.type_id')
                    .select([
                    'al.location_id AS location_id',
                    'al.location_name AS location_name',
                    'al.location_type_id AS location_type_id',
                    'lt.type_code AS location_type_code',
                    'lt.type_name AS location_type_name',
                    'lbm.location_mapping_id AS location_mapping_id',
                    'lbm.branch_id AS branch_id',
                    'al.parent_location_id AS parent_location_id',
                    'al.path AS path',
                    'al.location_code AS location_code',
                ])
                    .where('al.is_active = :isActive', { isActive: 1 })
                    .andWhere('al.is_deleted = :isDeleted', { isDeleted: 0 })
                    .orderBy('al.location_name', 'ASC');
                if (location_type_id) {
                    query.andWhere('al.location_type_id = :location_type_id', {
                        location_type_id,
                    });
                }
                if (branch_id) {
                    query.andWhere('lbm.branch_id = :branch_id', {
                        branch_id: Number(branch_id),
                    });
                }
                const rows = await query.getRawMany();
                const seen = new Set();
                const data = rows.filter((r) => {
                    const id = Number(r.location_id);
                    if (seen.has(id))
                        return false;
                    seen.add(id);
                    return true;
                });
                return {
                    success: true,
                    message: 'Locations fetched successfully',
                    data,
                };
            });
        });
    }
    async getGroupedLocations(dto, branchIds = []) {
        return this.dropdownCache.getOrSet(dropdown_entities_1.DROPDOWN.LOCATION, {
            variant: 'grouped-locations',
            branch_id: dto?.branch_id,
            branchIds,
        }, async () => {
            try {
                const branch_id = dto?.branch_id;
                const query = this.locationRepository
                    .createQueryBuilder('al')
                    .innerJoin('location_branch_mapping', 'location_branch_mapping', `location_branch_mapping.location_id = al.location_id
               AND location_branch_mapping.is_active = 1
               AND location_branch_mapping.is_deleted = 0`)
                    .innerJoin('branches', 'br', `br.branch_id = location_branch_mapping.branch_id
               AND br.is_active = 1
               AND br.is_deleted = 0`)
                    .innerJoin('location_types', 'lt', `(lt.type_id = al.location_type_id
                OR (al.location_type_id IS NULL
                    AND lt.type_code = al.location_type_code))
               AND lt.is_active = 1
               AND lt.is_deleted = 0`)
                    .select([
                    'al.location_id AS location_id',
                    'al.location_name AS location_name',
                    'lt.type_id AS location_type_id',
                    'lt.type_code AS location_type_code',
                    'lt.type_name AS location_type_name',
                    'location_branch_mapping.location_mapping_id AS location_mapping_id',
                    'location_branch_mapping.branch_id AS branch_id',
                    'br.branch_name AS branch_name',
                    'al.parent_location_id AS parent_location_id',
                    'al.path AS path',
                    'al.location_code AS location_code',
                ])
                    .where('al.is_active = :isActive', { isActive: 1 })
                    .andWhere('al.is_deleted = :isDeleted', { isDeleted: 0 });
                if (branch_id) {
                    query.andWhere('location_branch_mapping.branch_id = :branch_id', {
                        branch_id,
                    });
                }
                (0, branch_access_1.applyBranchFilter)({
                    qb: query,
                    entityKey: 'LocationBranch',
                    branchIds,
                });
                query
                    .orderBy('lt.level', 'ASC')
                    .addOrderBy('lt.sort_order', 'ASC')
                    .addOrderBy('al.location_name', 'ASC');
                const rows = await query.getRawMany();
                const groupedLocations = {};
                const seen = new Map();
                for (const row of rows) {
                    const typeKey = Number(row.location_type_id);
                    if (!groupedLocations[typeKey]) {
                        groupedLocations[typeKey] = {
                            location_type_id: typeKey,
                            location_type_code: row.location_type_code,
                            location_type_name: row.location_type_name,
                            locations: [],
                        };
                    }
                    const locationId = Number(row.location_id);
                    const existing = seen.get(locationId);
                    if (existing) {
                        if (!existing.branch_ids.includes(Number(row.branch_id))) {
                            existing.branch_ids.push(Number(row.branch_id));
                        }
                        continue;
                    }
                    const option = {
                        location_id: locationId,
                        location_name: row.location_name,
                        location_code: row.location_code,
                        location_mapping_id: row.location_mapping_id,
                        branch_id: Number(row.branch_id),
                        branch_name: row.branch_name,
                        branch_ids: [Number(row.branch_id)],
                        parent_location_id: row.parent_location_id,
                        path: row.path,
                    };
                    seen.set(locationId, option);
                    groupedLocations[typeKey].locations.push(option);
                }
                return {
                    success: true,
                    message: 'Grouped locations fetched successfully',
                    data: Object.values(groupedLocations),
                };
            }
            catch (error) {
                throw new common_1.BadRequestException(error instanceof Error
                    ? error.message
                    : 'Failed to fetch grouped locations');
            }
        });
    }
    async getLocationsByParent(parentLocationId, locationTypeCode) {
        return this.dropdownCache.getOrSet(dropdown_entities_1.DROPDOWN.LOCATION, {
            variant: 'locations-by-parent',
            parent_location_id: parentLocationId,
            location_type_code: locationTypeCode,
        }, async () => this.withOrgSchema(async (manager) => {
            const query = manager
                .getRepository(locations_entity_1.Locations)
                .createQueryBuilder('location')
                .select([
                'location.location_id',
                'location.location_name',
                'location.parent_location_id',
                'location.path',
                'location.location_level',
                'location.location_type_id',
                'location.location_type_code',
            ])
                .where('location.parent_location_id = :parentLocationId', {
                parentLocationId,
            })
                .andWhere('location.is_deleted = 0')
                .andWhere('location.is_active = 1');
            if (locationTypeCode) {
                query.andWhere('location.location_type_code = :locationTypeCode', {
                    locationTypeCode,
                });
            }
            const locations = await query.getMany();
            return {
                success: true,
                message: 'Locations fetched successfully',
                data: locations,
            };
        }));
    }
    async getLocationById(location_id) {
        console.log('vk Searching location_id:', location_id);
        try {
            const mappingRecord = await this.locationBranchMappingRepo.findOne({
                where: {
                    location_mapping_id: location_id,
                    is_deleted: 0,
                },
                select: ['location_mapping_id', 'location_id'],
            });
            if (!mappingRecord) {
                throw new common_1.HttpException('Location mapping not found', common_1.HttpStatus.NOT_FOUND);
            }
            console.log('vk Mapping Found:', mappingRecord.location_mapping_id, '=> location_id:', mappingRecord.location_id);
            const actualLocationId = mappingRecord.location_id;
            const location = await this.locationRepository
                .createQueryBuilder('location')
                .leftJoinAndSelect('location.branch_mappings', 'mapping')
                .leftJoinAndSelect('mapping.branch', 'branch')
                .leftJoinAndSelect('mapping.type', 'type')
                .select([
                'location.location_id',
                'location.location_name',
                'location.location_floor',
                'location.location_room',
                'location.location_city',
                'location.location_state',
                'location.location_code',
                'location.location_street_address',
                'location.location_description',
                'location.location_google_map_pin',
                'location.parent_location_id',
                'location.is_locked',
                'location.is_active',
                'location.is_deleted',
                'location.created_at',
                'location.updated_at',
                'location.created_by',
                'location.updated_by',
                'location.location_type_code',
                'location.location_type_id',
                'location.path',
                'location.location_level',
                'location.country',
                'location.pincode',
                'location.location_landmark',
                'mapping.location_mapping_id',
                'mapping.branch_id',
                'mapping.type_id',
                'mapping.is_active',
                'branch.branch_id',
                'branch.branch_name',
                'branch.city',
                'branch.state',
                'type.type_id',
                'type.type_name',
                'type.type_code',
            ])
                .where('location.location_id = :id', {
                id: actualLocationId,
            })
                .andWhere('location.is_deleted = 0')
                .getOne();
            if (!location) {
                throw new common_1.HttpException('Location not found', common_1.HttpStatus.NOT_FOUND);
            }
            const ownType = await this.resolveTypeOfLocation(location);
            location.location_type_name =
                ownType?.type_name ??
                    location.branch_mappings?.[0]?.type?.type_name ??
                    null;
            location.type_level = ownType?.level ?? null;
            if (!location.location_type_id && ownType) {
                location.location_type_id = ownType.type_id;
            }
            let parent_name = null;
            let parent_type_name = null;
            if (location.parent_location_id) {
                const parent = await this.locationRepository.findOne({
                    where: { location_id: location.parent_location_id },
                    select: [
                        'location_id',
                        'location_name',
                        'location_type_id',
                        'location_type_code',
                    ],
                });
                parent_name = parent?.location_name ?? null;
                parent_type_name = parent
                    ? (await this.resolveTypeOfLocation(parent))?.type_name ?? null
                    : null;
            }
            let hierarchy = [];
            if (location.path) {
                const ids = location.path.split('/').filter(Boolean).map(Number);
                if (ids.length > 0) {
                    hierarchy = await this.locationRepository
                        .createQueryBuilder('loc')
                        .leftJoin('location_types', 'lt', `(lt.type_id = loc.location_type_id
                OR (loc.location_type_id IS NULL
                    AND lt.type_code = loc.location_type_code))`)
                        .select([
                        'loc.location_id AS location_id',
                        'loc.location_name AS location_name',
                        'loc.location_type_code AS location_type_code',
                        'loc.location_type_id AS location_type_id',
                        'lt.type_name AS location_type_name',
                        'lt.level AS type_level',
                        'loc.location_code AS location_code',
                    ])
                        .where('loc.location_id IN (:...ids)', { ids })
                        .orderBy(`array_position(ARRAY[${ids.join(',')}], loc.location_id)`)
                        .getRawMany();
                }
            }
            const displayData = {};
            hierarchy.forEach((node) => {
                if (node?.location_type_code) {
                    displayData[`${node.location_type_code}_name`] = node.location_name;
                }
            });
            if (location.location_type_code) {
                displayData[`${location.location_type_code}_name`] =
                    location.location_name;
            }
            displayData.location_name = location.location_name;
            displayData.location_code = location.location_code || '--';
            return {
                status: common_1.HttpStatus.OK,
                message: 'Location fetched successfully',
                data: {
                    ...location,
                    branch_mappings: location.branch_mappings.filter((m) => m.location_mapping_id === mappingRecord.location_mapping_id),
                    hierarchy,
                    displayData,
                    parent_name,
                    parent_type_name,
                },
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Internal server error', error.status || common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async toggleFavoriteLocation(location_mapping_id, userId) {
        const mapping = await this.locationBranchMappingRepo.findOne({
            where: { location_mapping_id, is_deleted: 0 },
        });
        if (!mapping) {
            throw new common_1.HttpException('Location not found', common_1.HttpStatus.NOT_FOUND);
        }
        const existing = await this.userLocationFavoriteRepo.findOne({
            where: { user_id: userId, location_mapping_id },
        });
        let is_favourite;
        if (existing) {
            await this.userLocationFavoriteRepo.remove(existing);
            is_favourite = false;
        }
        else {
            await this.userLocationFavoriteRepo.save(this.userLocationFavoriteRepo.create({ user_id: userId, location_mapping_id }));
            is_favourite = true;
        }
        await this.redisService.delByPattern('asset-locations-v2:*');
        await this.redisService.delByPattern('asset-locations:*');
        await this.dropdownCache.invalidate(dropdown_entities_1.DROPDOWN.LOCATION);
        return {
            status: 200,
            success: true,
            is_favourite,
        };
    }
    async getAllLocationTypes(dto) {
        console.time('TOTAL-LOCATION-TYPES-SERVICE');
        try {
            const d = dto;
            const limit = Math.min(Math.max(Number(dto.pagination?.limit || 10), 1), 100);
            const cursorToken = typeof d.cursor === 'string' ? d.cursor : null;
            const direction = d.direction === 'prev' ? 'prev' : 'next';
            const jumpToLast = d.jumpToLast === true || dto.isLastPageMode === true;
            const jumpPage = d.page != null
                ? Number(d.page)
                : dto.pagination?.page != null
                    ? Number(dto.pagination.page)
                    : undefined;
            const usingOffset = !!jumpPage &&
                jumpPage > 1 &&
                !jumpToLast;
            const knownTotalRaw = d.knownTotal ?? d.known_total;
            const knownTotalVal = knownTotalRaw != null &&
                !Number.isNaN(Number(knownTotalRaw))
                ? Number(knownTotalRaw)
                : null;
            if (jumpToLast) {
                dto.isLastPageMode = true;
            }
            const searchArray = dto.search || [];
            const filters = dto.filters || [];
            const sortArray = dto.sort || [];
            const cacheKey = (0, cache_service_helper_1.buildListCacheKey)({
                prefix: 'location-types',
                dto,
                schema: dto.schema,
                login_user_id: dto.login_user_id,
            });
            const cached = await this.redisService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const qb = this.locationTypeRepository
                .createQueryBuilder('location_type')
                .leftJoin('asset_locations', 'asset_locations', `
          asset_locations.location_type_id = location_type.type_id
          AND asset_locations.is_deleted = 0
        `)
                .where('location_type.is_deleted = :deleted', { deleted: 0 })
                .select([
                'location_type.type_id AS type_id',
                'location_type.type_name AS type_name',
                'location_type.type_code AS type_code',
                'location_type.type_icon AS type_icon',
                'location_type.description AS description',
                'location_type.level AS level',
                'location_type.sort_order AS sort_order',
                'location_type.is_active AS is_active',
                'location_type.is_required AS is_required',
                'location_type.is_location AS is_location',
                'location_type.is_occupancy_type AS is_occupancy_type',
                'location_type.created_at AS created_at',
                'location_type.updated_at AS updated_at',
            ])
                .addSelect('COUNT(DISTINCT asset_locations.location_id)', 'usage_count');
            searchArray.forEach((s, i) => {
                if (!s.values?.length)
                    return;
                const value = s.values.join(' ');
                qb.andWhere(`
          (
            location_type.type_name ILIKE :s${i}
            OR location_type.type_code ILIKE :s${i}
          )
        `, {
                    [`s${i}`]: `%${value}%`,
                });
            });
            for (const f of filters) {
                if (!f.values?.length)
                    continue;
                const columnMap = {
                    type_id: 'location_type.type_id',
                    type_name: 'location_type.type_name',
                    type_code: 'location_type.type_code',
                    level: 'location_type.level',
                    sort_order: 'location_type.sort_order',
                    is_active: 'location_type.is_active',
                    is_required: 'location_type.is_required',
                    is_location: 'location_type.is_location',
                    is_occupancy_type: 'location_type.is_occupancy_type',
                };
                const column = columnMap[f.column] ||
                    `location_type.${f.column}`;
                qb.andWhere(`${column} IN (:...values)`, {
                    values: f.values,
                });
            }
            const countKey = 'location-types:count:' +
                JSON.stringify({
                    search: searchArray,
                    filters,
                });
            const total = await (0, keyset_pagination_1.getCachedCount)(this.redisService, countKey, async () => {
                const countQb = qb.clone();
                const totalResult = await countQb
                    .select('COUNT(DISTINCT location_type.type_id)', 'total')
                    .getRawOne();
                return Number(totalResult?.total || 0);
            }, 5, knownTotalVal);
            const sortableMap = {
                type_id: 'location_type.type_id',
                type_name: 'location_type.type_name',
                type_code: 'location_type.type_code',
                level: 'location_type.level',
                sort_order: 'location_type.sort_order',
                is_active: 'location_type.is_active',
                usage_count: 'usage_count',
            };
            const idColumn = 'type_id';
            const idDbColumn = 'location_type.type_id';
            const defaultSort = {
                column: 'sort_order',
                order: 'ASC',
            };
            let plan;
            if (jumpToLast) {
                plan = (0, keyset_pagination_1.buildKeyset)({
                    qb,
                    columnMap: sortableMap,
                    sort: sortArray,
                    defaultSort,
                    idColumn,
                    idDbColumn,
                    cursor: null,
                    direction: 'prev',
                });
            }
            else if (usingOffset) {
                plan = (0, keyset_pagination_1.buildKeyset)({
                    qb,
                    columnMap: sortableMap,
                    sort: sortArray,
                    defaultSort,
                    idColumn,
                    idDbColumn,
                    cursor: null,
                    direction: 'next',
                });
                (0, keyset_pagination_1.applyOffsetRaw)(qb, jumpPage, limit);
            }
            else {
                plan = (0, keyset_pagination_1.buildKeyset)({
                    qb,
                    columnMap: sortableMap,
                    sort: sortArray,
                    defaultSort,
                    idColumn,
                    idDbColumn,
                    cursor: cursorToken,
                    direction,
                });
            }
            qb.groupBy('location_type.type_id');
            if (!usingOffset) {
                qb.limit(limit + 1);
            }
            const rows = await qb.getRawMany();
            const totalPages = total > 0
                ? Math.max(1, Math.ceil(total / limit))
                : 1;
            let pagedRows;
            let meta;
            if (usingOffset) {
                pagedRows = rows;
                const first = pagedRows[0];
                const last = pagedRows[pagedRows.length - 1];
                meta = (0, keyset_pagination_1.buildListMeta)({
                    page: {
                        data: pagedRows,
                        startCursor: first
                            ? (0, keyset_pagination_1.encodeCursor)({
                                v: first[plan.sortColumn] ??
                                    null,
                                id: first[idColumn],
                            })
                            : null,
                        endCursor: last
                            ? (0, keyset_pagination_1.encodeCursor)({
                                v: last[plan.sortColumn] ??
                                    null,
                                id: last[idColumn],
                            })
                            : null,
                        hasNextPage: jumpPage < totalPages,
                        hasPrevPage: jumpPage > 1,
                    },
                    limit,
                    total,
                    currentPage: jumpPage,
                });
            }
            else {
                const pageResult = (0, keyset_pagination_1.finalizePage)({
                    rows,
                    limit,
                    plan,
                    idColumn,
                    hadCursor: !!cursorToken,
                });
                pagedRows = pageResult.data;
                if (jumpToLast) {
                    pageResult.hasNextPage = false;
                    pageResult.hasPrevPage =
                        total > pagedRows.length;
                }
                meta = (0, keyset_pagination_1.buildListMeta)({
                    page: pageResult,
                    limit,
                    total,
                    currentPage: jumpToLast
                        ? totalPages
                        : jumpPage || 1,
                });
            }
            const data = pagedRows.map((r) => ({
                type_id: r.type_id,
                type_name: r.type_name,
                type_code: r.type_code,
                type_icon: r.type_icon,
                description: r.description,
                level: r.level,
                sort_order: r.sort_order,
                is_active: r.is_active,
                is_required: r.is_required,
                is_location: r.is_location,
                is_occupancy_type: r.is_occupancy_type,
                created_at: r.created_at,
                updated_at: r.updated_at,
                usage_count: Number(r.usage_count) || 0,
            }));
            const response = {
                success: true,
                message: data.length
                    ? 'Location types fetched successfully'
                    : 'No location types found',
                data,
                meta,
            };
            await this.redisService.set(cacheKey, response, 3);
            console.timeEnd('TOTAL-LOCATION-TYPES-SERVICE');
            return response;
        }
        catch (error) {
            console.error('getAllLocationTypes error:', error);
            console.timeEnd('TOTAL-LOCATION-TYPES-SERVICE');
            throw error;
        }
    }
    async createLocationType(payload, userId) {
        const { type_name, level, type_icon, description, is_occupancy_type, is_active, is_required } = payload;
        if (!type_name?.trim()) {
            throw new common_1.BadRequestException('Type name is required');
        }
        if (level == null || !Number.isInteger(Number(level)) || Number(level) < 1) {
            throw new common_1.BadRequestException('Level is required and must be a whole number of 1 or more');
        }
        const baseSlug = type_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        let type_code = baseSlug;
        let suffix = 1;
        while (await this.locationTypeRepository.findOne({ where: { type_code, is_deleted: 0 } })) {
            type_code = `${baseSlug}_${suffix++}`;
        }
        const maxSort = await this.locationTypeRepository
            .createQueryBuilder('lt')
            .select('COALESCE(MAX(lt.sort_order), 0)', 'max')
            .where('lt.is_deleted = 0')
            .getRawOne();
        const newType = this.locationTypeRepository.create({
            type_name: type_name.trim(),
            type_code,
            type_icon: type_icon || null,
            description: description || null,
            level: Number(level),
            sort_order: Number(maxSort?.max ?? 0) + 1,
            is_active: is_active !== undefined ? (is_active ? 1 : 0) : 1,
            is_required: !!is_required,
            is_deleted: 0,
            is_location: true,
            is_occupancy_type: !!is_occupancy_type,
        });
        const saved = await this.locationTypeRepository.save(newType);
        await this.redisService.delByPattern('asset-locations:*');
        await this.redisService.delByPattern('location-types*');
        await this.dropdownCache.invalidate(dropdown_entities_1.DROPDOWN.LOCATION_TYPE);
        await this.dropdownCache.invalidate(dropdown_entities_1.DROPDOWN.LOCATION);
        return { status: 201, success: true, message: 'Location type created successfully', data: saved };
    }
    async updateLocationType(payload, userId) {
        const { type_id, type_name, level, type_icon, description, is_active, is_required, is_occupancy_type } = payload;
        const type = await this.locationTypeRepository.findOne({
            where: { type_id, is_deleted: 0 },
        });
        if (!type) {
            throw new common_1.HttpException('Location type not found', common_1.HttpStatus.NOT_FOUND);
        }
        if (level != null &&
            (!Number.isInteger(Number(level)) || Number(level) < 1)) {
            throw new common_1.BadRequestException('Level must be a whole number of 1 or more');
        }
        const updated = this.locationTypeRepository.merge(type, {
            type_name: type_name?.trim() || type.type_name,
            level: level != null ? Number(level) : type.level,
            type_icon: type_icon !== undefined ? type_icon : type.type_icon,
            description: description !== undefined ? description : type.description,
            is_active: is_active !== undefined ? (is_active ? 1 : 0) : type.is_active,
            is_required: is_required !== undefined ? !!is_required : type.is_required,
            is_occupancy_type: is_occupancy_type !== undefined ? !!is_occupancy_type : type.is_occupancy_type,
            updated_at: new Date(),
            updated_by: userId,
        });
        const saved = await this.locationTypeRepository.save(updated);
        await this.redisService.delByPattern('asset-locations:*');
        await this.redisService.delByPattern('location-types*');
        await this.dropdownCache.invalidate(dropdown_entities_1.DROPDOWN.LOCATION_TYPE);
        await this.dropdownCache.invalidate(dropdown_entities_1.DROPDOWN.LOCATION);
        return { status: 200, success: true, message: 'Location type updated successfully', data: saved };
    }
    async deleteLocationType(type_id, userId) {
        const type = await this.locationTypeRepository.findOne({
            where: { type_id, is_deleted: 0 },
        });
        if (!type) {
            throw new common_1.HttpException('Location type not found', common_1.HttpStatus.NOT_FOUND);
        }
        const usageCount = await this.locationRepository.count({
            where: { location_type_id: type_id, is_deleted: 0 },
        });
        if (usageCount > 0) {
            return {
                status: 409,
                success: false,
                message: `Cannot delete: ${usageCount} location(s) currently use this type.`,
                usage_count: usageCount,
            };
        }
        type.is_deleted = 1;
        type.is_active = 0;
        type.updated_at = new Date();
        type.updated_by = userId;
        await this.locationTypeRepository.save(type);
        await this.redisService.delByPattern('asset-locations:*');
        await this.redisService.delByPattern('location-types*');
        await this.dropdownCache.invalidate(dropdown_entities_1.DROPDOWN.LOCATION_TYPE);
        await this.dropdownCache.invalidate(dropdown_entities_1.DROPDOWN.LOCATION);
        return { status: 200, success: true, message: 'Location type deleted successfully' };
    }
    async validateHierarchy(schema, opts = {}) {
        const tenantSchema = this.safeSchema(schema);
        const t = (name) => tenantSchema ? `"${tenantSchema}".${name}` : name;
        const limit = Math.min(Math.max(Number(opts?.limit) || 500, 1), 5000);
        const typeJoin = (alias, locAlias) => `
    LEFT JOIN ${t('location_types')} ${alias}
      ON (${alias}.type_id = ${locAlias}.location_type_id
          OR (${locAlias}.location_type_id IS NULL
              AND ${alias}.type_code = ${locAlias}.location_type_code))`;
        const levelViolations = await this.dataSource.query(`
    SELECT c.location_id,
           c.location_name,
           ct.type_name  AS location_type_name,
           ct.level      AS location_type_level,
           p.location_id AS parent_location_id,
           p.location_name AS parent_name,
           pt.type_name  AS parent_type_name,
           pt.level      AS parent_type_level
      FROM ${t('asset_locations')} c
      JOIN ${t('asset_locations')} p ON p.location_id = c.parent_location_id
      ${typeJoin('ct', 'c')}
      ${typeJoin('pt', 'p')}
     WHERE c.is_deleted = 0
       AND p.is_deleted = 0
       AND ct.level IS NOT NULL
       AND pt.level IS NOT NULL
       AND pt.level >= ct.level
     ORDER BY c.location_id
     LIMIT $1
    `, [limit]);
        const untypedLocations = await this.dataSource.query(`
    SELECT c.location_id, c.location_name,
           c.location_type_id, c.location_type_code
      FROM ${t('asset_locations')} c
      ${typeJoin('ct', 'c')}
     WHERE c.is_deleted = 0
       AND ct.type_id IS NULL
     ORDER BY c.location_id
     LIMIT $1
    `, [limit]);
        const typesWithoutLevel = await this.dataSource.query(`
    SELECT type_id, type_name, type_code
      FROM ${t('location_types')}
     WHERE is_deleted = 0
       AND is_active = 1
       AND level IS NULL
     ORDER BY sort_order, type_id
    `);
        const orphans = await this.dataSource.query(`
    SELECT c.location_id, c.location_name, c.parent_location_id,
           p.location_name AS parent_name,
           CASE WHEN p.location_id IS NULL THEN 'parent missing'
                ELSE 'parent deleted' END AS reason
      FROM ${t('asset_locations')} c
      LEFT JOIN ${t('asset_locations')} p ON p.location_id = c.parent_location_id
     WHERE c.is_deleted = 0
       AND c.parent_location_id IS NOT NULL
       AND (p.location_id IS NULL OR p.is_deleted = 1)
     ORDER BY c.location_id
     LIMIT $1
    `, [limit]);
        const depthMismatches = await this.dataSource.query(`
    SELECT c.location_id, c.location_name,
           c.location_level AS stored_level,
           COALESCE(p.location_level, 0) + 1 AS expected_level
      FROM ${t('asset_locations')} c
      JOIN ${t('asset_locations')} p ON p.location_id = c.parent_location_id
     WHERE c.is_deleted = 0
       AND p.is_deleted = 0
       AND COALESCE(c.location_level, -1) <> COALESCE(p.location_level, 0) + 1
     ORDER BY c.location_id
     LIMIT $1
    `, [limit]);
        const summary = {
            level_violations: levelViolations.length,
            untyped_locations: untypedLocations.length,
            types_without_level: typesWithoutLevel.length,
            orphans: orphans.length,
            depth_mismatches: depthMismatches.length,
        };
        const clean = Object.values(summary).every((n) => n === 0);
        return {
            status: 200,
            success: true,
            message: clean
                ? 'Location hierarchy is consistent with the current type levels.'
                : 'Location hierarchy has records that break the current rules.',
            data: {
                clean,
                limit,
                summary,
                level_violations: levelViolations,
                untyped_locations: untypedLocations,
                types_without_level: typesWithoutLevel,
                orphans,
                depth_mismatches: depthMismatches,
            },
        };
    }
    async getLocationTypeById(type_id) {
        if (!this.toPositiveIntOrNull(type_id)) {
            throw new common_1.HttpException('type_id is required', common_1.HttpStatus.BAD_REQUEST);
        }
        const type = await this.locationTypeRepository.findOne({
            where: { type_id: Number(type_id), is_deleted: 0 },
        });
        if (!type) {
            throw new common_1.HttpException('Location type not found', common_1.HttpStatus.NOT_FOUND);
        }
        const usage_count = await this.locationRepository.count({
            where: { location_type_id: type.type_id, is_deleted: 0 },
        });
        const sameLevelTypes = type.level != null
            ? (await this.locationTypeRepository.find({
                where: { level: type.level, is_deleted: 0 },
                select: ['type_id', 'type_name'],
            })).filter((t) => t.type_id !== type.type_id)
            : [];
        return {
            status: 200,
            success: true,
            message: 'Location type fetched successfully',
            data: {
                ...type,
                usage_count,
                same_level_types: sameLevelTypes.map((t) => ({
                    type_id: t.type_id,
                    type_name: t.type_name,
                })),
            },
        };
    }
    async reorderLocationTypes(payload, userId, schema) {
        let items = [];
        if (Array.isArray(payload?.items)) {
            items = payload.items.map((it) => ({
                type_id: Number(it?.type_id),
                sort_order: Number(it?.sort_order),
            }));
        }
        else if (Array.isArray(payload?.type_ids)) {
            items = payload.type_ids.map((id, idx) => ({
                type_id: Number(id),
                sort_order: idx + 1,
            }));
        }
        if (!items.length) {
            throw new common_1.HttpException('Nothing to reorder — send items[] or type_ids[]', common_1.HttpStatus.BAD_REQUEST);
        }
        const invalid = items.find((it) => !Number.isInteger(it.type_id) ||
            it.type_id <= 0 ||
            !Number.isInteger(it.sort_order) ||
            it.sort_order < 0);
        if (invalid) {
            throw new common_1.HttpException('Each item needs a valid type_id and a non-negative whole sort_order', common_1.HttpStatus.BAD_REQUEST);
        }
        const ids = [...new Set(items.map((it) => it.type_id))];
        if (ids.length !== items.length) {
            throw new common_1.HttpException('Duplicate type_id in reorder payload', common_1.HttpStatus.BAD_REQUEST);
        }
        const existing = await this.locationTypeRepository.find({
            where: { type_id: (0, typeorm_2.In)(ids), is_deleted: 0 },
            select: ['type_id'],
        });
        if (existing.length !== ids.length) {
            throw new common_1.HttpException('One or more location types do not exist or are deleted', common_1.HttpStatus.BAD_REQUEST);
        }
        const tenantSchema = this.safeSchema(schema);
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        try {
            if (tenantSchema) {
                await queryRunner.query(`SET search_path TO "${tenantSchema}", public`);
            }
            await queryRunner.startTransaction();
            const repo = queryRunner.manager.getRepository(location_types_entity_1.LocationType);
            const now = new Date();
            for (const it of items) {
                await repo.update({ type_id: it.type_id }, { sort_order: it.sort_order, updated_at: now, updated_by: userId });
            }
            await queryRunner.commitTransaction();
        }
        catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }
            throw error;
        }
        finally {
            await queryRunner.release();
        }
        await this.redisService.delByPattern('asset-locations:*');
        await this.redisService.delByPattern('location-types*');
        await this.dropdownCache.invalidate(dropdown_entities_1.DROPDOWN.LOCATION_TYPE);
        await this.dropdownCache.invalidate(dropdown_entities_1.DROPDOWN.LOCATION);
        return {
            status: 200,
            success: true,
            message: 'Location type order saved',
            data: items,
        };
    }
    async getLocationsHierarchyTree(payload, branchIds = [], userId) {
        return this.dropdownCache.getOrSet(dropdown_entities_1.DROPDOWN.LOCATION, {
            variant: 'org-locations-tree',
            search: payload?.search,
            branch_id: payload?.branch_id,
            branchIds,
            group_by_branch: !!payload?.group_by_branch,
            userId,
        }, async () => {
            try {
                const { search, branch_id, group_by_branch } = payload;
                const qb = this.locationBranchMappingRepo
                    .createQueryBuilder('mapping')
                    .innerJoin('mapping.location', 'location')
                    .innerJoin('mapping.branch', 'branch')
                    .leftJoin('location_types', 'location_type', `(location_type.type_id = location.location_type_id
              OR (location.location_type_id IS NULL
                  AND location_type.type_code = location.location_type_code))`)
                    .leftJoin('v_location_hierarchy_precomputed', 'lh', 'lh.location_id = location.location_id')
                    .leftJoin('user_location_favorites', 'fav', 'fav.location_mapping_id = mapping.location_mapping_id AND fav.user_id = :userId', { userId })
                    .select([
                    'mapping.location_mapping_id AS location_mapping_id',
                    'CASE WHEN fav.id IS NOT NULL THEN true ELSE false END AS is_favourite',
                    'location.location_id AS location_id',
                    'location.location_name AS location_name',
                    'location.location_type_code AS location_type_code',
                    'location.parent_location_id AS parent_location_id',
                    'location_type.level AS level',
                    'location_type.type_id AS location_type_id',
                    'location_type.type_name AS location_type_name',
                    'lh.path_names AS hierarchy_text',
                    'branch.branch_id AS branch_id',
                    'branch.branch_name AS branch_name',
                ])
                    .where('mapping.is_deleted = 0')
                    .andWhere('location.is_deleted = 0')
                    .andWhere('location.is_active = 1');
                if (branchIds?.length) {
                    qb.andWhere('mapping.branch_id IN (:...branchIds)', {
                        branchIds: branchIds.map(Number),
                    });
                }
                if (branch_id) {
                    qb.andWhere('mapping.branch_id = :branch_id', { branch_id });
                }
                qb.distinct(true);
                const rows = await qb
                    .orderBy('location_type.level', 'ASC')
                    .addOrderBy('location.location_name', 'ASC')
                    .getRawMany();
                const buildTree = (subset) => {
                    const nodeMap = new Map();
                    subset.forEach((r) => {
                        const id = Number(r.location_id);
                        if (nodeMap.has(id))
                            return;
                        nodeMap.set(id, {
                            location_id: id,
                            location_mapping_id: r.location_mapping_id,
                            location_name: r.location_name,
                            location_type_code: r.location_type_code,
                            location_type_id: r.location_type_id != null ? Number(r.location_type_id) : null,
                            location_type_name: r.location_type_name ?? null,
                            level: r.level,
                            is_favourite: !!r.is_favourite,
                            parent_location_id: r.parent_location_id != null ? Number(r.parent_location_id) : null,
                            full_path: r.hierarchy_text || r.location_name,
                            branch_id: r.branch_id,
                            branch_name: r.branch_name,
                            children: [],
                        });
                    });
                    const roots = [];
                    nodeMap.forEach((node) => {
                        const parent = node.parent_location_id != null
                            ? nodeMap.get(node.parent_location_id)
                            : undefined;
                        if (parent && parent.location_id !== node.location_id) {
                            parent.children.push(node);
                        }
                        else {
                            roots.push(node);
                        }
                    });
                    roots.sort((a, b) => (b.is_favourite ? 1 : 0) - (a.is_favourite ? 1 : 0));
                    return roots;
                };
                const term = search?.trim().toLowerCase();
                const prune = (node) => {
                    const selfMatch = node.location_name.toLowerCase().includes(term);
                    const children = node.children.map(prune).filter((c) => c !== null);
                    if (selfMatch || children.length > 0) {
                        return { ...node, children };
                    }
                    return null;
                };
                const pruneRoots = (roots) => term ? roots.map(prune).filter((r) => r !== null) : roots;
                if (!group_by_branch) {
                    return pruneRoots(buildTree(rows));
                }
                const rowsByBranch = new Map();
                rows.forEach((r) => {
                    const key = r.branch_id != null ? `id:${r.branch_id}` : `name:${r.branch_name || 'unassigned'}`;
                    if (!rowsByBranch.has(key))
                        rowsByBranch.set(key, []);
                    rowsByBranch.get(key).push(r);
                });
                const branchGroups = new Map();
                rowsByBranch.forEach((branchRows, key) => {
                    const roots = pruneRoots(buildTree(branchRows));
                    if (!roots.length)
                        return;
                    const first = branchRows[0];
                    branchGroups.set(key, {
                        location_id: null,
                        location_mapping_id: null,
                        location_name: first.branch_name || 'Unassigned',
                        location_type_code: 'branch',
                        location_type_id: null,
                        location_type_name: 'Branch',
                        level: 0,
                        is_favourite: false,
                        is_synthetic: true,
                        parent_location_id: null,
                        full_path: first.branch_name || 'Unassigned',
                        branch_id: first.branch_id,
                        branch_name: first.branch_name,
                        children: roots,
                    });
                });
                return Array.from(branchGroups.values()).sort((a, b) => (a.branch_name || '').localeCompare(b.branch_name || ''));
            }
            catch (error) {
                throw new common_1.BadRequestException(`Error fetching locations tree: ${error.message}`);
            }
        });
    }
};
exports.LocationsService = LocationsService;
LocationsService.TENANT_SCHEMA_RE = /^org_[A-Za-z0-9_]+$/;
exports.LocationsService = LocationsService = LocationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(5, (0, common_1.Inject)((0, common_1.forwardRef)(() => auth_service_1.AuthService))),
    __param(7, (0, typeorm_1.InjectRepository)(locations_entity_1.Locations)),
    __param(8, (0, typeorm_1.InjectRepository)(location_types_entity_1.LocationType)),
    __param(9, (0, typeorm_1.InjectRepository)(stocks_entity_1.Stock)),
    __param(10, (0, typeorm_1.InjectRepository)(orgnization_stats_entity_1.OrgStat)),
    __param(11, (0, typeorm_1.InjectRepository)(branches_entity_1.Branch)),
    __param(12, (0, typeorm_1.InjectRepository)(location_hierarchy_precomputed_view_entity_1.LocationHierarchyPrecomputedView)),
    __param(13, (0, typeorm_1.InjectRepository)(location_child_count_view_entity_1.LocationChildCountView)),
    __param(14, (0, typeorm_1.InjectRepository)(organizational_user_entity_1.User)),
    __param(15, (0, typeorm_1.InjectRepository)(location_branch_mapping_entity_1.LocationBranchMapping)),
    __param(16, (0, typeorm_1.InjectRepository)(user_location_fav_1.UserLocationFavorite)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        database_service_1.DatabaseService,
        mail_service_1.MailService,
        mail_config_service_1.MailConfigService,
        redis_service_1.RedisService,
        auth_service_1.AuthService,
        notifications_helper_1.NotificationHelper,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        dropdown_cache_service_1.DropdownCacheService,
        request_context_service_1.RequestContextService])
], LocationsService);
