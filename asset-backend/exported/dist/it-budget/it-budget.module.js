"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItBudgetModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("../auth/auth.module");
const register_user_login_entity_1 = require("../organization_register/entities/register-user-login.entity");
const sessions_entity_1 = require("../organizational-profile/public_schema_entity/sessions.entity");
const organizational_user_entity_1 = require("../organizational-profile/entity/organizational-user.entity");
const user_repository_1 = require("../user/user.repository");
const redis_module_1 = require("../common/redis/redis.module");
const database_module_1 = require("../dynamic-schema/database.module");
const budget_category_controller_1 = require("./categories/budget-category.controller");
const budget_category_service_1 = require("./categories/budget-category.service");
const budget_permission_guard_1 = require("./common/budget-permission.guard");
const budget_consumption_controller_1 = require("./consumption/budget-consumption.controller");
const budget_consumption_service_1 = require("./consumption/budget-consumption.service");
const budget_plan_controller_1 = require("./plans/budget-plan.controller");
const budget_plan_service_1 = require("./plans/budget-plan.service");
let ItBudgetModule = class ItBudgetModule {
};
exports.ItBudgetModule = ItBudgetModule;
exports.ItBudgetModule = ItBudgetModule = __decorate([
    (0, common_1.Module)({
        imports: [
            jwt_1.JwtModule.register({
                secret: process.env.JWT_SECRET,
                signOptions: { expiresIn: process.env.JWT_EXPIRATION },
            }),
            typeorm_1.TypeOrmModule.forFeature([organizational_user_entity_1.User, user_repository_1.UserRepository, register_user_login_entity_1.RegisterUserLogin, sessions_entity_1.Session]),
            database_module_1.DatabaseModule,
            (0, common_1.forwardRef)(() => auth_module_1.AuthModule),
            redis_module_1.RedisModule,
        ],
        controllers: [budget_category_controller_1.BudgetCategoryController, budget_plan_controller_1.BudgetPlanController, budget_consumption_controller_1.BudgetConsumptionController],
        providers: [budget_category_service_1.BudgetCategoryService, budget_plan_service_1.BudgetPlanService, budget_consumption_service_1.BudgetConsumptionService, budget_permission_guard_1.BudgetPermissionGuard],
    })
], ItBudgetModule);
