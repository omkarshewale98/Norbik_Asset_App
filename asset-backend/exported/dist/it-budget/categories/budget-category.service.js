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
exports.BudgetCategoryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const budget_context_1 = require("../common/budget-context");
const budget_activity_util_1 = require("../common/budget-activity.util");
const budget_list_util_1 = require("../common/budget-list.util");
const budget_export_util_1 = require("../common/budget-export.util");
const COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
let BudgetCategoryService = class BudgetCategoryService {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    baseSelect(schema) {
        return `
      SELECT bc.budget_category_id,
             bc.budget_category_name,
             bc.budget_category_code,
             bc.budget_category_description,
             bc.budget_category_color,
             bc.is_default,
             bc.is_active,
             bc.created_at,
             bc.updated_at,
             TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS created_user,
             (SELECT COUNT(*) FROM ${(0, budget_context_1.T)(schema, 'budget_lines')} bl
               WHERE bl.budget_category_id = bc.budget_category_id)::int AS usagecount
        FROM ${(0, budget_context_1.T)(schema, 'budget_categories')} bc
        LEFT JOIN ${(0, budget_context_1.T)(schema, 'users')} u ON u.user_id = bc.created_by
       WHERE bc.is_deleted = 0`;
    }
    async list(ctx, input) {
        let rows = await this.dataSource.query(this.baseSelect(ctx.schema));
        rows = rows.map((r) => ({ ...r, usagecount: Number(r.usagecount || 0) }));
        const q = (0, budget_list_util_1.searchText)(input);
        if (q) {
            rows = rows.filter((r) => [r.budget_category_name, r.budget_category_description]
                .some((v) => String(v || '').toLowerCase().includes(q)));
        }
        const active = (0, budget_list_util_1.filterValues)(input, 'is_active');
        if (active.length === 1) {
            const want = active[0] === '1' || active[0].toLowerCase() === 'active' ? 1 : 0;
            rows = rows.filter((r) => Number(r.is_active) === want);
        }
        const def = (0, budget_list_util_1.filterValues)(input, 'is_default');
        if (def.length === 1) {
            const want = def[0] === '1' || ['system', 'default', 'true'].includes(def[0].toLowerCase());
            rows = rows.filter((r) => !!r.is_default === want);
        }
        const { data, meta } = (0, budget_list_util_1.paginate)(rows, input, { column: 'budget_category_name', order: 'ASC' }, [
            'budget_category_id', 'budget_category_name', 'budget_category_code', 'budget_category_description',
            'is_active', 'is_default', 'created_at', 'created_user', 'usagecount',
        ]);
        return {
            success: true,
            message: data.length ? 'Budget categories fetched successfully' : 'No budget categories found',
            data,
            meta,
        };
    }
    async dropdown(ctx) {
        const rows = await this.dataSource.query(`SELECT budget_category_id AS value, budget_category_name AS label, budget_category_color AS color
         FROM ${(0, budget_context_1.T)(ctx.schema, 'budget_categories')}
        WHERE is_deleted = 0 AND is_active = 1
        ORDER BY budget_category_name`);
        return { status: common_1.HttpStatus.OK, message: 'OK', data: rows };
    }
    async fetchOne(ctx, id) {
        const rows = await this.dataSource.query(`${this.baseSelect(ctx.schema)} AND bc.budget_category_id = $1`, [id]);
        if (!rows.length)
            throw new budget_context_1.BudgetError('BUD_CATEGORY_NOT_FOUND', 'Budget category not found');
        return { status: common_1.HttpStatus.OK, message: 'OK', data: rows[0] };
    }
    normalise(input) {
        const name = String(input.budget_category_name || '').trim().replace(/\s+/g, ' ');
        const code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 34) || 'CATEGORY';
        const description = String(input.budget_category_description || '').trim();
        const color = String(input.budget_category_color || '').trim().toUpperCase() || null;
        return { name, code, description, color };
    }
    async validate(ctx, v, selfId) {
        if (v.name.length < 2 || v.name.length > 60) {
            throw new budget_context_1.BudgetError('BUD_CATEGORY_NAME', 'Category name must be 2 to 60 characters.');
        }
        if (v.description.length > 250) {
            throw new budget_context_1.BudgetError('BUD_CATEGORY_DESC', 'Description can be at most 250 characters.');
        }
        if (v.color && !COLOR_RE.test(v.color)) {
            throw new budget_context_1.BudgetError('BUD_CATEGORY_COLOR', 'Colour must be a hex value like #2563EB.');
        }
        const dup = await this.dataSource.query(`SELECT budget_category_name, budget_category_code
         FROM ${(0, budget_context_1.T)(ctx.schema, 'budget_categories')}
        WHERE is_deleted = 0
          AND lower(budget_category_name) = lower($1)
          AND ($2::int IS NULL OR budget_category_id <> $2::int)
        LIMIT 1`, [v.name, selfId ?? null]);
        if (dup.length)
            throw new budget_context_1.BudgetError('BUD_CATEGORY_DUPLICATE', 'This entry already exists.');
    }
    async uniqueCode(ctx, base, selfId) {
        const rows = await this.dataSource.query(`SELECT budget_category_code FROM ${(0, budget_context_1.T)(ctx.schema, 'budget_categories')}
        WHERE budget_category_code LIKE $1 AND ($2::int IS NULL OR budget_category_id <> $2::int)`, [`${base}%`, selfId ?? null]);
        const used = new Set(rows.map((r) => r.budget_category_code));
        if (!used.has(base))
            return base;
        for (let i = 2; i < 1000; i++)
            if (!used.has(`${base}_${i}`))
                return `${base}_${i}`;
        return `${base}_${Date.now() % 100000}`;
    }
    async create(ctx, input) {
        const v = this.normalise(input);
        await this.validate(ctx, v);
        v.code = await this.uniqueCode(ctx, v.code);
        const rows = await this.dataSource.query(`INSERT INTO ${(0, budget_context_1.T)(ctx.schema, 'budget_categories')}
         (budget_category_name, budget_category_code, budget_category_description, budget_category_color,
          is_default, is_active, is_deleted, created_by, updated_by)
       VALUES ($1, $2, $3, $4, false, 1, 0, $5, $5)
       RETURNING *`, [v.name, v.code, v.description || null, v.color, ctx.userId]);
        await (0, budget_activity_util_1.logBudgetActivity)(this.dataSource, ctx, {
            entity_type: 'CATEGORY', entity_id: rows[0].budget_category_id, action: 'CREATED',
            description: `Budget category '${v.name}' created`, after: rows[0],
        });
        return { status: common_1.HttpStatus.CREATED, message: 'Budget category created successfully.', data: rows[0] };
    }
    async update(ctx, input) {
        const id = Number(input.budget_category_id);
        const before = (await this.fetchOne(ctx, id)).data;
        const v = this.normalise(input);
        await this.validate(ctx, v, id);
        const rows = await this.dataSource.query(`UPDATE ${(0, budget_context_1.T)(ctx.schema, 'budget_categories')}
          SET budget_category_name = $1, budget_category_description = $2,
              budget_category_color = $3, updated_by = $4, updated_at = now()
        WHERE budget_category_id = $5 AND is_deleted = 0
        RETURNING *`, [v.name, v.description || null, v.color, ctx.userId, id]);
        await (0, budget_activity_util_1.logBudgetActivity)(this.dataSource, ctx, {
            entity_type: 'CATEGORY', entity_id: id, action: 'UPDATED',
            description: `Budget category '${v.name}' updated`, before, after: rows[0],
        });
        return { status: common_1.HttpStatus.OK, message: 'Budget category updated successfully.', data: rows[0] };
    }
    ids(input) {
        const ids = (input?.ids || []).map(Number).filter((n) => Number.isInteger(n) && n > 0);
        if (!ids.length)
            throw new budget_context_1.BudgetError('BUD_NO_SELECTION', 'Select at least one budget category.');
        return ids;
    }
    async setActive(ctx, input, active) {
        const ids = this.ids(input);
        if (!active) {
            const left = await this.dataSource.query(`SELECT COUNT(*)::int AS n FROM ${(0, budget_context_1.T)(ctx.schema, 'budget_categories')}
          WHERE is_deleted = 0 AND is_active = 1 AND NOT (budget_category_id = ANY($1::int[]))`, [ids]);
            if (!left[0].n) {
                throw new budget_context_1.BudgetError('BUD_CATEGORY_LAST_ACTIVE', 'At least one budget category must stay active.');
            }
        }
        await this.dataSource.query(`UPDATE ${(0, budget_context_1.T)(ctx.schema, 'budget_categories')}
          SET is_active = $1, updated_by = $2, updated_at = now()
        WHERE budget_category_id = ANY($3::int[]) AND is_deleted = 0`, [active ? 1 : 0, ctx.userId, ids]);
        await (0, budget_activity_util_1.logBudgetActivity)(this.dataSource, ctx, {
            entity_type: 'CATEGORY', action: active ? 'ENABLED' : 'DISABLED',
            description: `${ids.length} budget categor${ids.length === 1 ? 'y' : 'ies'} ${active ? 'activated' : 'deactivated'}`,
            after: { ids },
        });
        return {
            status: common_1.HttpStatus.OK,
            message: active ? 'Budget category activated successfully.' : 'Budget category deactivated successfully.',
        };
    }
    async remove(ctx, input) {
        const ids = this.ids(input);
        const rows = await this.dataSource.query(`SELECT bc.budget_category_id, bc.budget_category_name, bc.is_default,
              (SELECT COUNT(*) FROM ${(0, budget_context_1.T)(ctx.schema, 'budget_lines')} bl
                WHERE bl.budget_category_id = bc.budget_category_id)::int AS usagecount
         FROM ${(0, budget_context_1.T)(ctx.schema, 'budget_categories')} bc
        WHERE bc.budget_category_id = ANY($1::int[]) AND bc.is_deleted = 0`, [ids]);
        const blocked = rows.filter((r) => r.is_default || r.usagecount > 0);
        const deletable = rows.filter((r) => !r.is_default && !r.usagecount).map((r) => r.budget_category_id);
        if (deletable.length) {
            await this.dataSource.query(`UPDATE ${(0, budget_context_1.T)(ctx.schema, 'budget_categories')}
            SET is_deleted = 1, is_active = 0, updated_by = $1, updated_at = now()
          WHERE budget_category_id = ANY($2::int[])`, [ctx.userId, deletable]);
            await (0, budget_activity_util_1.logBudgetActivity)(this.dataSource, ctx, {
                entity_type: 'CATEGORY', action: 'DELETED',
                description: `${deletable.length} budget categor${deletable.length === 1 ? 'y' : 'ies'} deleted`,
                after: { ids: deletable },
            });
        }
        return {
            status: common_1.HttpStatus.OK,
            message: blocked.length
                ? `${deletable.length} deleted. ${blocked.length} could not be deleted (system default or used in a budget).`
                : 'Budget category deleted successfully.',
            data: {
                deleted: deletable,
                blocked: blocked.map((b) => ({
                    budget_category_id: b.budget_category_id,
                    budget_category_name: b.budget_category_name,
                    reason: b.is_default ? 'System default category' : `Used in ${b.usagecount} budget line(s)`,
                    usagecount: b.usagecount,
                })),
            },
        };
    }
    async exportExcel(ctx, input) {
        const all = await this.list(ctx, { ...input, page: 1, all: true });
        const rows = (0, budget_export_util_1.applySelection)(all.data, input, 'budget_category_id').map((r) => ({
            ...r,
            is_default_s: r.is_default ? 'Default' : 'Custom',
            is_active_s: Number(r.is_active) === 1 ? 'Active' : 'Inactive',
            created_user_s: r.created_user?.trim() ? r.created_user : 'System',
        }));
        const columns = [
            { key: 'budget_category_name', label: 'Category Name' },
            { key: 'budget_category_description', label: 'Description' },
            { key: 'budget_category_color', label: 'Color' },
            { key: 'is_default_s', label: 'Type' },
            { key: 'is_active_s', label: 'Status' },
            { key: 'created_user_s', label: 'Created By' },
        ];
        const picked = (0, budget_export_util_1.pickColumns)(columns, input?.visible_columns, input?.column_order, ['budget_category_name'], {
            is_default: 'is_default_s', is_active: 'is_active_s', created_user: 'created_user_s',
        });
        await (0, budget_activity_util_1.logBudgetActivity)(this.dataSource, ctx, {
            entity_type: 'EXPORT', action: 'EXPORTED', description: `Budget categories exported (${rows.length} rows)`,
        });
        return (0, budget_export_util_1.buildXlsx)({ title: 'Budget Categories', sections: [{ columns: picked, rows }] }, 'Budget Categories');
    }
};
exports.BudgetCategoryService = BudgetCategoryService;
exports.BudgetCategoryService = BudgetCategoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], BudgetCategoryService);
