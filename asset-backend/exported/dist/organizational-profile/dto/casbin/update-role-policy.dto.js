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
exports.UpsertMultiplePoliciesNestedDto = exports.RoleDataDto = exports.ModuleDto = exports.SubModuleDto = exports.ActionDto = exports.PolicyAttrDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class PolicyAttrDto {
}
exports.PolicyAttrDto = PolicyAttrDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PolicyAttrDto.prototype, "moduleId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PolicyAttrDto.prototype, "submoduleId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PolicyAttrDto.prototype, "attrKey", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PolicyAttrDto.prototype, "attrValue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PolicyAttrDto.prototype, "attrType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PolicyAttrDto.prototype, "isRequired", void 0);
class ActionDto {
}
exports.ActionDto = ActionDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ActionDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ActionDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ActionDto.prototype, "isAllowed", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [PolicyAttrDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PolicyAttrDto),
    __metadata("design:type", Array)
], ActionDto.prototype, "attrs", void 0);
class SubModuleDto {
}
exports.SubModuleDto = SubModuleDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SubModuleDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubModuleDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Actions', type: [ActionDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ActionDto),
    __metadata("design:type", Array)
], SubModuleDto.prototype, "actions", void 0);
class ModuleDto {
}
exports.ModuleDto = ModuleDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ModuleDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ModuleDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Submodules', type: [SubModuleDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SubModuleDto),
    __metadata("design:type", Array)
], ModuleDto.prototype, "submodules", void 0);
class RoleDataDto {
}
exports.RoleDataDto = RoleDataDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], RoleDataDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RoleDataDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RoleDataDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], RoleDataDto.prototype, "isExternal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], RoleDataDto.prototype, "is2FA", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RoleDataDto.prototype, "type", void 0);
class UpsertMultiplePoliciesNestedDto {
}
exports.UpsertMultiplePoliciesNestedDto = UpsertMultiplePoliciesNestedDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpsertMultiplePoliciesNestedDto.prototype, "roleId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [ModuleDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ModuleDto),
    __metadata("design:type", Array)
], UpsertMultiplePoliciesNestedDto.prototype, "modules", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [PolicyAttrDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PolicyAttrDto),
    __metadata("design:type", Array)
], UpsertMultiplePoliciesNestedDto.prototype, "attrs", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: RoleDataDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => RoleDataDto),
    __metadata("design:type", RoleDataDto)
], UpsertMultiplePoliciesNestedDto.prototype, "roleData", void 0);
