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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingEngineService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const setup_task_entity_1 = require("./entities/setup-task.entity");
const setup_task_step_entity_1 = require("./entities/setup-task-step.entity");
const organization_setup_progress_entity_1 = require("./entities/organization-setup-progress.entity");
const user_setup_progress_entity_1 = require("./entities/user-setup-progress.entity");
const setup_task_mappings_entity_1 = require("./entities/setup-task-mappings.entity");
let OnboardingEngineService = class OnboardingEngineService {
    constructor(dataSource, taskRepo, stepRepo, orgProgressRepo, userProgressRepo, taskMappingRepo) {
        this.dataSource = dataSource;
        this.taskRepo = taskRepo;
        this.stepRepo = stepRepo;
        this.orgProgressRepo = orgProgressRepo;
        this.userProgressRepo = userProgressRepo;
        this.taskMappingRepo = taskMappingRepo;
    }
    async getCategories() {
        return this.dataSource.query(`SELECT * 
        FROM onboarding_engine.setup_categories
        WHERE is_active=true
        ORDER BY display_order`);
    }
    async getTasksByCategory(categoryId) {
        return this.dataSource.query(`SELECT *
        FROM onboarding_engine.setup_tasks
        WHERE category_id=$1
        AND is_active=true
        ORDER BY display_order`, [categoryId]);
    }
    async getAllTasks(organizationId, userId, roleId, page = 1, limit = 10, search, role, sortColumn = 'displayOrder', sortOrder = 'ASC') {
        const orgId = Number(organizationId) || 0;
        const uid = Number(userId) || 0;
        const isAdmin = Number(roleId) === 1;
        const pageNo = Math.max(1, Number(page) || 1);
        const pageSize = Math.min(Math.max(1, Number(limit) || 10), 500);
        const sortMap = {
            displayOrder: 'r.display_order',
            display_order: 'r.display_order',
            title: 'r.title',
            id: 'r.id',
            category: 'cat.name',
        };
        const orderBy = sortMap[sortColumn] ?? 'r.display_order';
        const orderDir = String(sortOrder).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        const params = [orgId, uid];
        const where = [
            't.is_active = true',
            isAdmin
                ? `t.task_scope::text IN ('COMMON','INDIVIDUAL','ONE_TIME')`
                : `t.task_scope::text = 'INDIVIDUAL'`,
        ];
        if (search) {
            params.push(`%${search}%`);
            where.push(`t.title ILIKE $${params.length}`);
        }
        if (role && role.length > 0) {
            params.push(role);
            where.push(`t.required_role::text = ANY($${params.length}::text[])`);
        }
        const resolvedCte = `
    WITH scoped AS (
      SELECT
        t.id, t.title, t.description, t.navigation_path, t.icon,
        t.required_role, t.display_order, t.task_scope, t.category_id,
        EXISTS (
          SELECT 1 FROM onboarding_engine.user_setup_progress up
          WHERE up.organization_id = $1
            AND up.user_id = $2
            AND up.task_id = t.id
            AND up.status::text IN ('COMPLETED','AUTO_COMPLETED')
        ) AS user_done,
        (op.task_id IS NOT NULL) AS org_done,
        op.completed_by AS org_completed_by
      FROM onboarding_engine.setup_tasks t
      LEFT JOIN onboarding_engine.organization_setup_progress op
        ON op.organization_id = $1
       AND op.task_id = t.id
       AND op.status::text IN ('COMPLETED','AUTO_COMPLETED')
      WHERE ${where.join(' AND ')}
    ),
    resolved AS (
      SELECT s.*,
        CASE
          WHEN s.task_scope::text = 'INDIVIDUAL'
            -- legacy rows: INDIVIDUAL completions once written to org progress
            THEN (s.user_done OR (s.org_done AND s.org_completed_by = $2))
          ELSE s.org_done
        END AS is_completed
      FROM scoped s
    )`;
        const countRes = await this.dataSource.query(`${resolvedCte}
     SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE is_completed)::int AS completed
     FROM resolved`, params);
        const totalTasks = Number(countRes?.[0]?.total ?? 0);
        const totalCompletedTasks = Number(countRes?.[0]?.completed ?? 0);
        const pageParams = [...params, pageSize, (pageNo - 1) * pageSize];
        const rows = await this.dataSource.query(`${resolvedCte}
     SELECT
       r.id,
       r.title,
       r.description,
       r.navigation_path,
       r.icon,
       r.required_role AS role,
       r.display_order,
       r.task_scope,
       cat.name AS category,
       CASE WHEN r.is_completed THEN 'COMPLETED' ELSE 'PENDING' END AS status,
       CASE
         WHEN NOT r.is_completed THEN NULL
         WHEN r.task_scope::text = 'INDIVIDUAL' THEN $2::bigint
         ELSE r.org_completed_by
       END AS completed_by,
       COALESCE((
         SELECT json_agg(
                  json_build_object(
                    'stepOrder', st.step_order,
                    'title', st.title,
                    'description', st.description
                  ) ORDER BY st.step_order
                )
         FROM onboarding_engine.setup_task_steps st
         WHERE st.task_id = r.id
       ), '[]'::json) AS steps,
       COALESCE((
         SELECT json_agg(DISTINCT jsonb_build_object(
                  'module', m.module_name,
                  'submodule', sm.submodule_name,
                  'action', a.action_name
                ))
         FROM onboarding_engine.setup_task_mappings tm
         LEFT JOIN public.modules m ON m.id = tm.module
         LEFT JOIN public.submodules sm ON sm.id = tm.sub_module
         LEFT JOIN public.actions a ON a.id = tm.action
         WHERE tm.task_id = r.id
       ), '[]'::json) AS mappings
     FROM resolved r
     LEFT JOIN onboarding_engine.setup_categories cat ON cat.id = r.category_id
     ORDER BY ${orderBy} ${orderDir}, r.id ASC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, pageParams);
        const completionPercentage = totalTasks > 0 ? Math.round((totalCompletedTasks / totalTasks) * 100) : 0;
        return {
            data: rows,
            totalCompletedTasks,
            completionPercentage,
            totalTasks,
            meta: {
                total: totalTasks,
                page: pageNo,
                limit: pageSize,
                totalPages: Math.ceil(totalTasks / pageSize),
                hasNextPage: pageNo * pageSize < totalTasks,
            },
        };
    }
    async createTask(dto) {
        const task = this.taskRepo.create(dto);
        await this.taskRepo.save(task);
        return {
            success: true,
            message: 'Task created successfully',
            data: task
        };
    }
    async addStep(dto) {
        const step = this.stepRepo.create(dto);
        await this.stepRepo.save(step);
        return {
            success: true,
            message: 'Step added successfully',
            data: step
        };
    }
    async markTaskComplete(dto) {
        await this.dataSource.query(`CALL onboarding_engine.mark_setup_complete($1,$2,$3)`, [
            dto.organizationId,
            dto.taskId,
            dto.user_id
        ]);
        await this.userProgressRepo.update({
            organizationId: dto.organizationId,
            userId: dto.user_id,
            taskId: dto.taskId
        }, {
            status: 'COMPLETED'
        });
        return {
            success: true,
            message: 'Task completed successfully'
        };
    }
    async getOrganizationProgress(orgId, planId) {
        const result = await this.dataSource.query(`SELECT *
       FROM onboarding_engine.get_org_setup_progress($1,$2)`, [orgId, planId]);
        return {
            success: true,
            message: 'Organization progress fetched',
            data: result
        };
    }
    async getUserProgress(orgId, userId) {
        const progress = await this.userProgressRepo
            .createQueryBuilder('p')
            .leftJoin('onboarding_engine.setup_tasks', 'task', 'task.id = p.task_id')
            .select([
            'p.task_id as task_id',
            'task.title as task_title',
            'p.status as status'
        ])
            .where('p.organization_id = :orgId', { orgId })
            .andWhere('p.user_id = :userId', { userId })
            .getRawMany();
        return {
            success: true,
            message: 'User progress fetched',
            data: progress
        };
    }
    async getSetupDashboard(orgId, userId, planId) {
        const orgProgress = await this.getOrganizationProgress(orgId, planId);
        const userProgress = await this.getUserProgress(orgId, userId);
        return {
            success: true,
            data: {
                organization_progress: orgProgress.data,
                user_progress: userProgress.data
            }
        };
    }
    async initializeOrgSetup(orgId, planId) {
        await this.dataSource.query(`CALL onboarding_engine.initialize_org_setup($1,$2)`, [orgId, planId]);
        return {
            success: true,
            message: 'Organization setup initialized successfully'
        };
    }
    async getTaskSteps(taskId) {
        return this.stepRepo.find({
            where: { taskId },
            order: { stepOrder: "ASC" }
        });
    }
    async getSetupCompletionsForAllOrgs(page = 1, limit = 10, search) {
        const pageNo = Math.max(1, Number(page) || 1);
        const pageSize = Math.min(Math.max(1, Number(limit) || 10), 500);
        const offset = (pageNo - 1) * pageSize;
        const params = [];
        let searchSql = '';
        if (search && search.trim()) {
            params.push(`%${search.trim()}%`);
            searchSql = `WHERE o.organization_name ILIKE $1`;
        }
        const rows = await this.dataSource.query(`
    WITH applicable AS (
      SELECT t.id
      FROM onboarding_engine.setup_tasks t
      WHERE t.is_active = true
        AND t.task_scope::text IN ('COMMON','ONE_TIME')
    ),
    totals AS (
      SELECT COUNT(*)::int AS total_tasks FROM applicable
    ),
    org_done AS (
      SELECT p.organization_id, COUNT(DISTINCT p.task_id)::int AS completed_tasks
      FROM onboarding_engine.organization_setup_progress p
      JOIN applicable a ON a.id = p.task_id
      WHERE p.status::text IN ('COMPLETED','AUTO_COMPLETED')
      GROUP BY p.organization_id
    )
    SELECT
      o.organization_id,
      o.organization_name,
      tt.total_tasks,
      COALESCE(d.completed_tasks, 0) AS completed_tasks,
      tt.total_tasks - COALESCE(d.completed_tasks, 0) AS pending_tasks,
      CASE
        WHEN tt.total_tasks > 0
          THEN ROUND(COALESCE(d.completed_tasks, 0)::numeric * 100 / tt.total_tasks, 2)
        ELSE 0
      END AS completion_percentage
    FROM public.register_organization o
    CROSS JOIN totals tt
    LEFT JOIN org_done d ON d.organization_id = o.organization_id
    ${searchSql}
    ORDER BY o.organization_name ASC, o.organization_id ASC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, pageSize, offset]);
        const countRes = await this.dataSource.query(`SELECT COUNT(*)::int AS total FROM public.register_organization o ${searchSql}`, params);
        const total = Number(countRes?.[0]?.total ?? 0);
        const data = rows.map((org) => ({
            id: Number(org.organization_id),
            organization_id: Number(org.organization_id),
            organization_name: org.organization_name,
            total_tasks: Number(org.total_tasks),
            completed_tasks: Number(org.completed_tasks),
            pending_tasks: Number(org.pending_tasks),
            completion_percentage: Number(org.completion_percentage),
        }));
        return { data, total };
    }
    async markUserTaskComplete(dto) {
        const orgId = Number(dto?.organizationId) || 0;
        const taskId = Number(dto?.taskId) || 0;
        const userId = Number(dto?.userId) || 0;
        if (!orgId || !taskId || !userId) {
            return { success: false, message: 'organizationId, taskId and userId are required' };
        }
        const res = await this.dataSource.query(`
    WITH upd AS (
      UPDATE onboarding_engine.user_setup_progress
         SET status = 'COMPLETED'
       WHERE organization_id = $1 AND user_id = $2 AND task_id = $3
         AND status::text NOT IN ('COMPLETED','AUTO_COMPLETED')
      RETURNING id
    ),
    ins AS (
      INSERT INTO onboarding_engine.user_setup_progress (organization_id, user_id, task_id, status)
      SELECT $1, $2, $3, 'COMPLETED'::onboarding_engine.setup_task_status
      WHERE NOT EXISTS (
        SELECT 1 FROM onboarding_engine.user_setup_progress
        WHERE organization_id = $1 AND user_id = $2 AND task_id = $3
      )
      RETURNING id
    )
    SELECT (SELECT COUNT(*) FROM upd) + (SELECT COUNT(*) FROM ins) AS changed
    `, [orgId, userId, taskId]);
        if (Number(res?.[0]?.changed ?? 0) === 0) {
            return { success: false, message: 'Task already completed' };
        }
        return { success: true, message: 'User task completed successfully' };
    }
    async getSupportTasks(body) {
        const { page = 1, limit = 10, search = '', } = body;
        const skip = (page - 1) * limit;
        const query = this.dataSource
            .getRepository(setup_task_entity_1.SetupTask)
            .createQueryBuilder('task')
            .leftJoinAndSelect('task.category', 'category');
        if (search) {
            query.andWhere(`(task.title ILIKE :search OR category.name ILIKE :search)`, { search: `%${search}%` });
        }
        const [data, total] = await query
            .orderBy('task.displayOrder', 'ASC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();
        const formatted = data.map((task) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            category_name: task.category?.name,
            navigation_path: task.navigationPath,
            icon: task.icon,
            required_role: task.requiredRole,
            estimated_time: task.estimatedTime,
            is_active: task.isActive,
        }));
        return {
            data: formatted,
            total,
        };
    }
    async markOrgTaskComplete(dto) {
        try {
            console.log('[Billing Service] Inserting org progress', dto);
            const result = await this.dataSource.query(`
      INSERT INTO onboarding_engine.organization_setup_progress
        (organization_id, task_id, status, completed_by, completed_at)
      VALUES ($1,$2,'COMPLETED',$3,NOW())
      ON CONFLICT (organization_id, task_id)
      DO UPDATE SET
        status = 'COMPLETED',
        completed_by = $3,
        completed_at = NOW()
      WHERE onboarding_engine.organization_setup_progress.status IS DISTINCT FROM 'COMPLETED'
      `, [dto.organizationId, dto.taskId, dto.userId]);
            if (result.rowCount === 0) {
                return {
                    success: false,
                    message: 'Task already completed',
                };
            }
            return {
                success: true,
                message: 'Org task completed successfully',
            };
        }
        catch (error) {
            console.error('[Billing Service] Error inserting org progress', error);
            throw error;
        }
    }
    async getTask(taskId) {
        return this.taskRepo.find({
            where: { id: taskId },
        });
    }
};
exports.OnboardingEngineService = OnboardingEngineService;
exports.OnboardingEngineService = OnboardingEngineService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_2.InjectRepository)(setup_task_entity_1.SetupTask)),
    __param(2, (0, typeorm_2.InjectRepository)(setup_task_step_entity_1.SetupTaskStep)),
    __param(3, (0, typeorm_2.InjectRepository)(organization_setup_progress_entity_1.OrganizationSetupProgress)),
    __param(4, (0, typeorm_2.InjectRepository)(user_setup_progress_entity_1.UserSetupProgress)),
    __param(5, (0, typeorm_2.InjectRepository)(setup_task_mappings_entity_1.SetupTaskMapping)),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        typeorm_1.Repository,
        typeorm_1.Repository,
        typeorm_1.Repository,
        typeorm_1.Repository,
        typeorm_1.Repository])
], OnboardingEngineService);
