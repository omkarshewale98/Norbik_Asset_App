"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetRelationshipGovernance = void 0;
const swagger_1 = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const asset_mapping_entity_1 = require("./asset-mapping.entity");
const asset_relationship_type_entity_1 = require("./asset_relationship_type.entity");
let AssetRelationshipGovernance = class AssetRelationshipGovernance {
};
exports.AssetRelationshipGovernance = AssetRelationshipGovernance;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], AssetRelationshipGovernance.prototype, "governance_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 150 }),
    __metadata("design:type", String)
], AssetRelationshipGovernance.prototype, "rule_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], AssetRelationshipGovernance.prototype, "relation_type", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => asset_relationship_type_entity_1.AssetRelationType, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'relation_type', referencedColumnName: 'code' }),
    __metadata("design:type", asset_relationship_type_entity_1.AssetRelationType)
], AssetRelationshipGovernance.prototype, "relationTypeMeta", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], AssetRelationshipGovernance.prototype, "source_main_category_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], AssetRelationshipGovernance.prototype, "source_sub_category_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true }),
    __metadata("design:type", Number)
], AssetRelationshipGovernance.prototype, "source_item_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: asset_mapping_entity_1.AssignTargetType
    }),
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: asset_mapping_entity_1.AssignTargetType,
    }),
    __metadata("design:type", String)
], AssetRelationshipGovernance.prototype, "target_entity_type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], AssetRelationshipGovernance.prototype, "target_main_category_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], AssetRelationshipGovernance.prototype, "target_sub_category_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true }),
    __metadata("design:type", Number)
], AssetRelationshipGovernance.prototype, "target_item_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], AssetRelationshipGovernance.prototype, "is_allowed", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], AssetRelationshipGovernance.prototype, "validation_message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], AssetRelationshipGovernance.prototype, "is_active", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], AssetRelationshipGovernance.prototype, "created_at", void 0);
exports.AssetRelationshipGovernance = AssetRelationshipGovernance = __decorate([
    (0, typeorm_1.Entity)('asset_relationship_governance')
], AssetRelationshipGovernance);
