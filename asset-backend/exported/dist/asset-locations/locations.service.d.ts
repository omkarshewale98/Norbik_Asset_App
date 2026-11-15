import { HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { Stock } from 'src/assets-data/stocks/entities/stocks.entity';
import { AuthService } from 'src/auth/auth.service';
import { ListViewDtoForExcleExport } from 'src/common/listviewDTO/list-view-export-excle.dto copy';
import { ListViewDto } from 'src/common/listviewDTO/list-view.dto';
import { MailConfigService } from 'src/common/mail/mail-config.service';
import { MailService } from 'src/common/mail/mail.service';
import { NotificationHelper } from 'src/common/notifications/notifications.helper';
import { DropdownCacheService } from 'src/common/redis/dropdown-cache.service';
import { RequestContextService } from 'src/common/context/request-context.service';
import { RedisService } from 'src/common/redis/redis.service';
import { DatabaseService } from 'src/dynamic-schema/database.service';
import { Branch } from 'src/organizational-profile/entity/branches.entity';
import { LocationBranchMapping } from 'src/organizational-profile/entity/location-branch-mapping.entity';
import { LocationType } from 'src/organizational-profile/entity/location-types.entity';
import { Locations } from 'src/organizational-profile/entity/locations.entity';
import { User } from 'src/organizational-profile/entity/organizational-user.entity';
import { OrgStat } from 'src/organizational-profile/entity/orgnization-stats.entity';
import { LocationChildCountView } from 'src/organizational-profile/viewentity/location-child-count.view.entity';
import { LocationHierarchyPrecomputedView } from 'src/organizational-profile/viewentity/location-hierarchy-precomputed.view.entity';
import { DataSource, Repository } from 'typeorm';
import { GetGroupedLocationsDto } from './dto/get-grouped-location.dto';
import { UserLocationFavorite } from './entities/user-location-fav';
export declare class LocationsService {
    private readonly dataSource;
    private readonly databaseService;
    private readonly mailService;
    private readonly mailConfigService;
    private readonly redisService;
    private readonly authService;
    private readonly notificationHelper;
    private readonly locationRepository;
    private readonly locationTypeRepository;
    private readonly stockRepository;
    private readonly orgStatRepository;
    private readonly branchRepository;
    private readonly locationHierarchyPrecomputedView;
    private readonly locationChildCountView;
    private readonly userRepository;
    private readonly locationBranchMappingRepo;
    private readonly userLocationFavoriteRepo;
    private readonly dropdownCache;
    private readonly requestContext;
    constructor(dataSource: DataSource, databaseService: DatabaseService, mailService: MailService, mailConfigService: MailConfigService, redisService: RedisService, authService: AuthService, notificationHelper: NotificationHelper, locationRepository: Repository<Locations>, locationTypeRepository: Repository<LocationType>, stockRepository: Repository<Stock>, orgStatRepository: Repository<OrgStat>, branchRepository: Repository<Branch>, locationHierarchyPrecomputedView: Repository<LocationHierarchyPrecomputedView>, locationChildCountView: Repository<LocationChildCountView>, userRepository: Repository<User>, locationBranchMappingRepo: Repository<LocationBranchMapping>, userLocationFavoriteRepo: Repository<UserLocationFavorite>, dropdownCache: DropdownCacheService, requestContext: RequestContextService);
    private withOrgSchema;
    getUserByPublicID(public_user_id: number): Promise<number>;
    private static readonly TENANT_SCHEMA_RE;
    private safeSchema;
    private toPositiveIntOrNull;
    private extractLocationRows;
    private resolveTypeOfLocation;
    private checkParentLevelRule;
    private resolveBranchRootLocation;
    addNewLocation(payload: any, createdBy: number, organizationId: number, req: Request): Promise<{
        status: number;
        success: boolean;
        message: string;
        data: any;
        created?: undefined;
        linked?: undefined;
        branchMappingsAdded?: undefined;
        linkedToNewBranch?: undefined;
    } | {
        status: number;
        success: boolean;
        message: string;
        data: any[];
        created: number;
        linked: number;
        branchMappingsAdded: number;
        linkedToNewBranch?: undefined;
    } | {
        status: number;
        success: boolean;
        message: string;
        data: any[];
        created: number;
        linked: number;
        linkedToNewBranch: number;
        branchMappingsAdded: number;
    }>;
    getAllAssetsLocations(dto: ListViewDto, branchIds: number[], userId: number): Promise<unknown>;
    private resolveInternalUserId;
    private resolveLocationIds;
    deleteLocationsById(ids: number[] | number, userId: number): Promise<{
        message: string;
        deletedIds: any[];
        failed: any[];
    }>;
    optionsLocationTypes(): Promise<{
        value: number;
        label: string;
        type_code: string;
        level: number;
        sort_order: number;
        is_required: boolean;
        is_occupancy_type: boolean;
        is_location: boolean;
        type_icon: string;
        description: string;
    }[]>;
    getOrganizationLocationsDropdown(payload: {
        search?: string;
        branch_id?: number;
    }, branchIds: number[], userId: number): Promise<{
        location_mapping_id: any;
        is_favourite: boolean;
        location_id: any;
        location_name: any;
        location_floor: any;
        location_room: any;
        location_type_code: any;
        location_type_id: number;
        location_type_name: any;
        type_level: number;
        parent_location_id: any;
        hierarchy_text: any;
        hierarchy_types: any;
        hierarchy_level: any;
        full_path: any;
        branch_id: any;
        branch_name: any;
    }[]>;
    exportLocationsExcel(dto: ListViewDtoForExcleExport, branchIds?: number[]): Promise<Buffer>;
    recordMetric(metric: string, value: number): Promise<{
        metric: string;
        value: number;
    } & OrgStat>;
    getTypeChain(typeRef: any): Promise<{
        selected: LocationType | null;
        chain: LocationType[];
    }>;
    private buildChainHeaders;
    getLocationTemplateHeaders(locationType?: any): Promise<{
        headers: {
            label: string;
            required: boolean;
            type: string;
        }[];
        hierarchyHeaders: string[];
        hierarchyTypes: {
            header: string;
            type_id: number;
            type_code: string;
            type_name: string;
            level: number;
        }[];
    }>;
    bulkImportLocations(dto: any, userId: number, organizationId: number, schema?: string): Promise<{
        status: HttpStatus;
        message: string;
        data: {
            created_count: number;
            created_records: any[];
            error_records: any[];
        };
    }>;
    private resolveOrCreateLocationNode;
    updateLocation(payloadWithId: any, userId: number, schema?: string): Promise<{
        status: HttpStatus;
        message: string;
        data: Locations;
    }>;
    private isDescendantOf;
    activateLocations(locationIds: number[], systemUserId: number): Promise<{
        success: boolean;
        message: string;
        details: {
            id: number;
            status: "success" | "failed";
            message?: string;
            name?: string;
        }[];
    }>;
    deactivateLocations(locationIds: number[], systemUserId: number): Promise<{
        success: boolean;
        message: string;
        details: {
            id: number;
            status: "success" | "failed";
            message?: string;
            name?: string;
        }[];
    }>;
    getLocationsWithTypeByLabel(dto: any): Promise<{
        success: boolean;
        message: string;
        data: any[];
    }>;
    private toColumnLetter;
    generateLocationTemplate(locationType?: any, branchIds?: number[]): Promise<any>;
    getAllOrganizationBranches(branchIds?: number[]): Promise<any>;
    getLocationOptions(types: string[], branchId?: number): Promise<any>;
    getLocationsWithType(dto: any): Promise<{
        success: boolean;
        message: string;
        data: any[];
    }>;
    getGroupedLocations(dto: GetGroupedLocationsDto, branchIds?: number[]): Promise<{
        success: boolean;
        message: string;
        data: any[];
    }>;
    getLocationsByParent(parentLocationId: number, locationTypeCode?: string): Promise<{
        success: boolean;
        message: string;
        data: Locations[];
    }>;
    getLocationById(location_id: number): Promise<{
        status: HttpStatus;
        message: string;
        data: {
            branch_mappings: LocationBranchMapping[];
            hierarchy: any[];
            displayData: Record<string, any>;
            parent_name: string;
            parent_type_name: string;
            location_id: number;
            location_name?: string;
            location_floor?: string;
            location_room?: string;
            location_code?: string;
            location_city?: string;
            location_state?: string;
            country?: string;
            pincode?: number;
            location_landmark?: string;
            location_street_address?: string;
            location_description?: string;
            location_google_map_pin?: string;
            parent_location_id?: number;
            location_level?: number;
            is_locked: boolean;
            is_active: number;
            location_type_code: string;
            location_type_id?: number;
            location_type_entity_id: number;
            path: string;
            is_deleted: number;
            created_at: Date;
            updated_at: Date;
            created_by?: number;
            updated_by?: number;
            stocks: Stock[];
        };
    }>;
    toggleFavoriteLocation(location_mapping_id: number, userId: number): Promise<{
        status: number;
        success: boolean;
        is_favourite: boolean;
    }>;
    getAllLocationTypes(dto: ListViewDto): Promise<unknown>;
    createLocationType(payload: any, userId: number): Promise<{
        status: number;
        success: boolean;
        message: string;
        data: LocationType;
    }>;
    updateLocationType(payload: any, userId: number): Promise<{
        status: number;
        success: boolean;
        message: string;
        data: LocationType;
    }>;
    deleteLocationType(type_id: number, userId: number): Promise<{
        status: number;
        success: boolean;
        message: string;
        usage_count: number;
    } | {
        status: number;
        success: boolean;
        message: string;
        usage_count?: undefined;
    }>;
    validateHierarchy(schema?: string, opts?: {
        limit?: number;
    }): Promise<{
        status: number;
        success: boolean;
        message: string;
        data: {
            clean: boolean;
            limit: number;
            summary: {
                level_violations: any;
                untyped_locations: any;
                types_without_level: any;
                orphans: any;
                depth_mismatches: any;
            };
            level_violations: any;
            untyped_locations: any;
            types_without_level: any;
            orphans: any;
            depth_mismatches: any;
        };
    }>;
    getLocationTypeById(type_id: number): Promise<{
        status: number;
        success: boolean;
        message: string;
        data: {
            usage_count: number;
            same_level_types: {
                type_id: number;
                type_name: string;
            }[];
            type_id: number;
            type_name: string;
            type_code: string;
            type_icon: string;
            description: string;
            sort_order: number;
            is_active: number;
            is_deleted: number;
            is_location: boolean;
            is_occupancy_type: boolean;
            created_at: Date;
            level: number;
            updated_at: Date;
            updated_by: number;
            is_required: boolean;
        };
    }>;
    reorderLocationTypes(payload: any, userId: number, schema?: string): Promise<{
        status: number;
        success: boolean;
        message: string;
        data: {
            type_id: number;
            sort_order: number;
        }[];
    }>;
    getLocationsHierarchyTree(payload: {
        search?: string;
        branch_id?: number;
        group_by_branch?: boolean;
    }, branchIds: number[], userId: number): Promise<any[]>;
}
