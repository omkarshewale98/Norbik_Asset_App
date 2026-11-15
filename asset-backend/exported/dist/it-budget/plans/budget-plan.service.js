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
exports.BudgetPlanService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const budget_context_1 = require("../common/budget-context");
const budget_activity_util_1 = require("../common/budget-activity.util");
const budget_data_1 = require("../common/budget-data");
const fy_util_1 = require("../common/fy.util");
const budget_list_util_1 = require("../common/budget-list.util");
const budget_export_util_1 = require("../common/budget-export.util");
const budget_plan_types_1 = require("./budget-plan.types");
const MODES = ['YEARLY', 'HALF_YEARLY', 'QUARTERLY', 'MONTHLY'];
const versionLabel = (n) => (n > 0 ? `v${n}.0` : '—');
let BudgetPlanService = class BudgetPlanService {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async lookups(ctx) {
        const s = ctx.schema;
        const { startMonth, pattern } = await (0, budget_data_1.orgFyStartMonth)(this.dataSource, s);
        const [plans, categories, ownership, items, users] = await Promise.all([
            this.dataSource.query(`SELECT p.plan_id, p.fy_code, p.status_code, st.status_name, st.status_color
           FROM ${(0, budget_context_1.T)(s, 'budget_plans')} p
           JOIN ${(0, budget_context_1.T)(s, 'budget_plan_statuses')} st ON st.status_code = p.status_code
          WHERE p.is_deleted = 0`),
            this.dataSource.query(`SELECT budget_category_id AS value, budget_category_name AS label, budget_category_color AS color
           FROM ${(0, budget_context_1.T)(s, 'budget_categories')} WHERE is_deleted = 0 AND is_active = 1
          ORDER BY budget_category_name`),
            this.dataSource.query(`SELECT ownership_status_type_id AS value, ownership_status_type_name AS label,
                ownership_status_type::text AS nature, asset_ownership_status_color AS color
           FROM ${(0, budget_context_1.T)(s, 'asset_ownership_status_types')}
          WHERE COALESCE(is_deleted, 0) = 0 AND COALESCE(is_active, 1) = 1
          ORDER BY ownership_status_type_name`),
            this.dataSource.query(`SELECT ai.asset_item_id AS value, ai.asset_item_name AS label,
                mc.main_category_name, sc.sub_category_name
           FROM ${(0, budget_context_1.T)(s, 'asset_items')} ai
           LEFT JOIN ${(0, budget_context_1.T)(s, 'asset_main_category')} mc ON mc.main_category_id = ai.main_category_id
           LEFT JOIN ${(0, budget_context_1.T)(s, 'asset_sub_category')} sc ON sc.sub_category_id = ai.sub_category_id
          WHERE COALESCE(ai.is_deleted, 0) = 0 AND COALESCE(ai.is_active, 1) = 1
          ORDER BY ai.asset_item_name`),
            this.dataSource.query(`SELECT user_id AS value,
                TRIM(CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,''))) AS label,
                users_business_email AS email
           FROM ${(0, budget_context_1.T)(s, 'users')}
          WHERE COALESCE(is_deleted, 0) = 0 AND COALESCE(is_active, 1) = 1
          ORDER BY 2`),
        ]);
        const byCode = new Map(plans.map((p) => [p.fy_code, p]));
        const today = (0, fy_util_1.todayYmd)();
        const fyList = (0, fy_util_1.fyOptions)(startMonth, today).map((fy) => {
            const p = byCode.get(fy.code);
            return {
                value: fy.code,
                label: fy.label,
                start_date: fy.startDate,
                end_date: fy.endDate,
                is_current_period: today >= fy.startDate && today <= fy.endDate,
                has_plan: !!p,
                plan_id: p ? Number(p.plan_id) : null,
                plan_status_code: p ? Number(p.status_code) : null,
                plan_status_name: p?.status_name || null,
            };
        });
        return {
            status: common_1.HttpStatus.OK,
            message: 'OK',
            data: {
                financial_year: { pattern, start_month: startMonth, window_years: fy_util_1.FY_WINDOW_YEARS, options: fyList },
                categories,
                ownership_types: ownership,
                items,
                users,
                current_user_id: ctx.userId,
                phasing_modes: MODES.map((m) => ({ value: m, buckets: fy_util_1.PHASING_BUCKETS[m] })),
                gst_note: 'All budget amounts are GST inclusive. Consumed = total invoice value including GST of assets ' +
                    'purchased in this financial year for the line item, plus manual entries recorded against the line.',
            },
        };
    }
    async allPlanRows(ctx) {
        const s = ctx.schema;
        const plans = (await this.dataSource.query(`${(0, budget_data_1.planSelect)(s)} ORDER BY p.fy_start_date DESC`)).map(budget_data_1.normalisePlan);
        const ids = plans.map((p) => p.plan_id);
        const [consumed, counts] = await Promise.all([
            (0, budget_data_1.consumedByPlan)(this.dataSource, s, ids),
            ids.length
                ? this.dataSource.query(`SELECT plan_id, COUNT(*)::int AS n FROM ${(0, budget_context_1.T)(s, 'budget_lines')}
              WHERE plan_id = ANY($1::bigint[]) AND is_active = 1 GROUP BY plan_id`, [ids])
                : [],
        ]);
        const countMap = new Map(counts.map((c) => [Number(c.plan_id), Number(c.n)]));
        return plans.map((p) => {
            const c = consumed.get(p.plan_id) || { consumed: 0, unbudgeted: 0, unbudgetedCount: 0 };
            return {
                plan_id: p.plan_id,
                fy_code: p.fy_code,
                fy_label: p.fy_label,
                fy_start_date: p.fy_start_date,
                fy_end_date: p.fy_end_date,
                plan_name: p.plan_name,
                status_code: p.status_code,
                status_key: p.status_key,
                status_name: p.status_name,
                status_color: p.status_color,
                is_locked: p.is_locked,
                current_version: p.current_version,
                version_label: versionLabel(p.current_version),
                owner_user_id: p.owner_user_id,
                owner_name: p.owner_name,
                total_amount: p.total_amount,
                capex_amount: p.capex_amount,
                opex_amount: p.opex_amount,
                consumed_amount: c.consumed,
                available_amount: (0, fy_util_1.roundMoney)(p.total_amount - c.consumed),
                variance_amount: (0, fy_util_1.roundMoney)(c.consumed - p.total_amount),
                utilisation_pct: (0, budget_list_util_1.pct)(c.consumed, p.total_amount),
                unbudgeted_amount: c.unbudgeted,
                unbudgeted_count: c.unbudgetedCount,
                line_count: countMap.get(p.plan_id) || 0,
                lock_version: p.lock_version,
                updated_at: p.updated_at,
                updated_by_name: p.updated_by_name,
                closed_at: p.closed_at,
                closed_by_name: p.closed_by_name,
            };
        });
    }
    async listPlans(ctx, input) {
        let rows = await this.allPlanRows(ctx);
        const q = (0, budget_list_util_1.searchText)(input);
        if (q) {
            rows = rows.filter((r) => [r.fy_label, r.fy_code, r.owner_name, r.plan_name, r.status_name]
                .some((v) => String(v || '').toLowerCase().includes(q)));
        }
        const st = (0, budget_list_util_1.filterValues)(input, 'status_code').map(Number).filter((n) => n > 0);
        if (st.length)
            rows = rows.filter((r) => st.includes(r.status_code));
        const owner = (0, budget_list_util_1.filterValues)(input, 'owner_user_id').map(Number).filter((n) => n > 0);
        if (owner.length)
            rows = rows.filter((r) => owner.includes(r.owner_user_id));
        const { data, meta } = (0, budget_list_util_1.paginate)(rows, input, { column: 'fy_start_date', order: 'DESC' }, [
            'fy_start_date', 'fy_label', 'status_code', 'current_version', 'owner_name', 'total_amount',
            'consumed_amount', 'variance_amount', 'utilisation_pct', 'line_count', 'updated_at',
        ]);
        return { success: true, message: data.length ? 'Budget plans fetched' : 'No budget plans found', data, meta };
    }
    async selector(ctx) {
        const s = ctx.schema;
        const rows = (await this.dataSource.query(`${(0, budget_data_1.planSelect)(s)} AND p.status_code IN (20, 30, 40) ORDER BY p.fy_start_date DESC`)).map(budget_data_1.normalisePlan);
        const today = (0, fy_util_1.todayYmd)();
        const current = rows.find((r) => r.status_code === budget_data_1.STATUS.CURRENT)
            || rows.find((r) => today >= r.fy_start_date && today <= r.fy_end_date)
            || rows[0];
        return {
            status: common_1.HttpStatus.OK,
            message: 'OK',
            data: {
                default_plan_id: current?.plan_id ?? null,
                plans: rows.map((r) => ({
                    plan_id: r.plan_id,
                    fy_code: r.fy_code,
                    fy_label: r.fy_label,
                    fy_start_date: r.fy_start_date,
                    fy_end_date: r.fy_end_date,
                    status_code: r.status_code,
                    status_name: r.status_name,
                    status_color: r.status_color,
                    version_label: versionLabel(r.current_version),
                    is_locked: r.is_locked,
                })),
            },
        };
    }
    async getPlan(ctx, planId) {
        const s = ctx.schema;
        const plan = await (0, budget_data_1.loadPlan)(this.dataSource, s, planId);
        const fy = (0, budget_data_1.planFy)(plan);
        const [lines, consumed] = await Promise.all([
            (0, budget_data_1.loadLines)(this.dataSource, s, plan.plan_id),
            (0, budget_data_1.consumedByLine)(this.dataSource, s, plan.plan_id),
        ]);
        const labels = plan.phasing_mode === 'YEARLY' ? [] : (0, fy_util_1.bucketLabels)(plan.phasing_mode, fy);
        return {
            status: common_1.HttpStatus.OK,
            message: 'OK',
            data: {
                plan: { ...plan, version_label: versionLabel(plan.current_version) },
                fy: { code: fy.code, label: fy.label, start_date: fy.startDate, end_date: fy.endDate },
                months: (0, fy_util_1.fyMonths)(fy).map((m) => ({ index: m.index, label: m.label, short: m.short })),
                bucket_labels: labels,
                lines: lines.map((l) => ({
                    ...l,
                    phasing: plan.phasing_mode === 'YEARLY' ? [] : (0, fy_util_1.monthsToBuckets)(l.phasing_months, plan.phasing_mode),
                    consumed_amount: consumed.get(l.line_id) || 0,
                })),
            },
        };
    }
    validateHeader(input) {
        const mode = (input.phasing_mode || 'YEARLY');
        if (!MODES.includes(mode))
            throw new budget_context_1.BudgetError('BUD_PHASING_MODE', 'Select a valid phasing: Yearly, Half-yearly, Quarterly or Monthly.');
        let method = (input.phasing_method || null);
        if (mode === 'YEARLY')
            method = null;
        else if (method !== 'EQUAL' && method !== 'MANUAL') {
            throw new budget_context_1.BudgetError('BUD_PHASING_METHOD', 'Select Equal split or Manual for the phasing.');
        }
        const planName = input.plan_name ? String(input.plan_name).trim() : '';
        if (planName.length > 150)
            throw new budget_context_1.BudgetError('BUD_PLAN_NAME', 'Plan name can be at most 150 characters.');
        const remarks = input.remarks ? String(input.remarks).trim() : '';
        if (remarks.length > 2000)
            throw new budget_context_1.BudgetError('BUD_REMARKS', 'Remarks can be at most 2000 characters.');
        const owner = Number(input.owner_user_id);
        if (!Number.isInteger(owner) || owner <= 0)
            throw new budget_context_1.BudgetError('BUD_OWNER', 'Select the plan owner.');
        return { mode, method, planName, remarks, owner };
    }
    async assertOwner(runner, ctx, owner, allowInactiveId) {
        const rows = await runner.query(`SELECT user_id, COALESCE(is_active,1) AS is_active FROM ${(0, budget_context_1.T)(ctx.schema, 'users')}
        WHERE user_id = $1 AND COALESCE(is_deleted,0) = 0`, [owner]);
        if (!rows.length || (Number(rows[0].is_active) !== 1 && owner !== allowInactiveId)) {
            throw new budget_context_1.BudgetError('BUD_OWNER', 'Plan owner must be an active user.');
        }
    }
    async buildLines(runner, ctx, raw, mode, method, existing) {
        const s = ctx.schema;
        const lines = Array.isArray(raw) ? raw : [];
        if (lines.length > budget_plan_types_1.MAX_LINES)
            throw new budget_context_1.BudgetError('BUD_TOO_MANY_LINES', `A plan can have at most ${budget_plan_types_1.MAX_LINES} lines.`);
        const itemIds = [...new Set(lines.map((l) => Number(l.asset_item_id)).filter((n) => n > 0))];
        const catIds = [...new Set(lines.map((l) => Number(l.budget_category_id)).filter((n) => n > 0))];
        const ownIds = [...new Set(lines.map((l) => Number(l.ownership_status_type_id)).filter((n) => n > 0))];
        const [items, cats, owns] = await Promise.all([
            itemIds.length
                ? runner.query(`SELECT asset_item_id, asset_item_name, COALESCE(is_active,1) AS is_active, COALESCE(is_deleted,0) AS is_deleted
               FROM ${(0, budget_context_1.T)(s, 'asset_items')} WHERE asset_item_id = ANY($1::int[])`, [itemIds])
                : [],
            catIds.length
                ? runner.query(`SELECT budget_category_id, budget_category_name, is_active, is_deleted
               FROM ${(0, budget_context_1.T)(s, 'budget_categories')} WHERE budget_category_id = ANY($1::int[])`, [catIds])
                : [],
            ownIds.length
                ? runner.query(`SELECT ownership_status_type_id, ownership_status_type_name, ownership_status_type::text AS nature,
                    COALESCE(is_active,1) AS is_active, COALESCE(is_deleted,0) AS is_deleted
               FROM ${(0, budget_context_1.T)(s, 'asset_ownership_status_types')} WHERE ownership_status_type_id = ANY($1::int[])`, [ownIds])
                : [],
        ]);
        const itemMap = new Map(items.map((r) => [Number(r.asset_item_id), r]));
        const catMap = new Map(cats.map((r) => [Number(r.budget_category_id), r]));
        const ownMap = new Map(owns.map((r) => [Number(r.ownership_status_type_id), r]));
        const buckets = fy_util_1.PHASING_BUCKETS[mode];
        const seen = new Map();
        const out = [];
        lines.forEach((l, idx) => {
            const rowNo = idx + 1;
            const lineId = l.line_id ? Number(l.line_id) : null;
            const prev = lineId ? existing?.get(lineId) : undefined;
            if (lineId && existing && !prev) {
                throw new budget_context_1.BudgetError('BUD_LINE_NOT_IN_PLAN', `Row ${rowNo}: this line does not belong to the plan any more. Reload and try again.`);
            }
            const type = l.line_type === 'SERVICE' ? 'SERVICE' : l.line_type === 'ITEM' ? 'ITEM' : null;
            if (!type)
                throw new budget_context_1.BudgetError('BUD_LINE_TYPE', `Row ${rowNo}: line type must be Item or Service.`);
            if (prev && prev.line_type !== type) {
                throw new budget_context_1.BudgetError('BUD_LINE_TYPE_CHANGE', `Row ${rowNo}: an existing line cannot change between Item and Service. Remove it and add a new line.`);
            }
            let assetItemId = null;
            let serviceName = null;
            let lineName = '';
            if (type === 'ITEM') {
                assetItemId = Number(l.asset_item_id);
                const it = itemMap.get(assetItemId);
                if (!assetItemId || !it || Number(it.is_deleted) === 1) {
                    throw new budget_context_1.BudgetError('BUD_LINE_ITEM', `Row ${rowNo}: select a valid item.`);
                }
                if (prev && prev.asset_item_id !== assetItemId) {
                    throw new budget_context_1.BudgetError('BUD_LINE_ITEM_CHANGE', `Row ${rowNo}: the item of an existing line cannot be changed. Remove the line and add a new one.`);
                }
                if (!prev && Number(it.is_active) !== 1) {
                    throw new budget_context_1.BudgetError('BUD_LINE_ITEM', `Row ${rowNo}: item '${it.asset_item_name}' is inactive.`);
                }
                lineName = it.asset_item_name;
            }
            else {
                serviceName = String(l.service_name || '').trim().replace(/\s+/g, ' ');
                if (serviceName.length < 2 || serviceName.length > 120) {
                    throw new budget_context_1.BudgetError('BUD_LINE_SERVICE', `Row ${rowNo}: service name must be 2 to 120 characters.`);
                }
                lineName = serviceName;
            }
            const catId = Number(l.budget_category_id);
            const cat = catMap.get(catId);
            if (!cat || Number(cat.is_deleted) === 1 || (Number(cat.is_active) !== 1 && prev?.budget_category_id !== catId)) {
                throw new budget_context_1.BudgetError('BUD_LINE_CATEGORY', `Row ${rowNo} (${lineName}): select an active budget category.`);
            }
            const ownId = Number(l.ownership_status_type_id);
            const own = ownMap.get(ownId);
            if (!own || Number(own.is_deleted) === 1 || (Number(own.is_active) !== 1 && prev?.ownership_status_type_id !== ownId)) {
                throw new budget_context_1.BudgetError('BUD_LINE_OWNERSHIP', `Row ${rowNo} (${lineName}): select an active ownership type.`);
            }
            const nature = (['capex', 'opex'].includes(String(own.nature)) ? own.nature : 'NA');
            const amount = (0, fy_util_1.roundMoney)(Number(l.annual_amount));
            if (!Number.isFinite(amount) || amount <= 0 || amount > budget_plan_types_1.MAX_AMOUNT) {
                throw new budget_context_1.BudgetError('BUD_LINE_AMOUNT', `Row ${rowNo} (${lineName}): annual amount must be greater than 0.`);
            }
            let quantity = null;
            if (l.quantity !== null && l.quantity !== undefined && String(l.quantity) !== '') {
                quantity = Number(l.quantity);
                if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000000) {
                    throw new budget_context_1.BudgetError('BUD_LINE_QTY', `Row ${rowNo} (${lineName}): quantity must be a whole number of at least 1.`);
                }
            }
            let unit = null;
            if (l.unit_estimate !== null && l.unit_estimate !== undefined && String(l.unit_estimate) !== '') {
                unit = (0, fy_util_1.roundMoney)(Number(l.unit_estimate));
                if (!Number.isFinite(unit) || unit < 0 || unit > budget_plan_types_1.MAX_AMOUNT) {
                    throw new budget_context_1.BudgetError('BUD_LINE_UNIT', `Row ${rowNo} (${lineName}): unit estimate must be 0 or more.`);
                }
            }
            const justification = l.justification ? String(l.justification).trim() : null;
            if (justification && justification.length > 500) {
                throw new budget_context_1.BudgetError('BUD_LINE_JUSTIFICATION', `Row ${rowNo} (${lineName}): justification can be at most 500 characters.`);
            }
            const key = type === 'ITEM' ? `I:${assetItemId}:${ownId}` : `S:${serviceName.toLowerCase()}:${ownId}`;
            if (seen.has(key)) {
                throw new budget_context_1.BudgetError('BUD_DUPLICATE_LINE', `Row ${rowNo} (${lineName} – ${own.ownership_status_type_name}) is already in this plan at row ${seen.get(key)}. Edit the existing line instead.`);
            }
            seen.set(key, rowNo);
            let months = [];
            if (mode !== 'YEARLY') {
                if (method === 'EQUAL') {
                    months = (0, fy_util_1.bucketsToMonths)((0, fy_util_1.equalSplit)(amount, buckets), mode);
                }
                else {
                    const ph = Array.isArray(l.phasing) ? l.phasing.map((v) => (0, fy_util_1.roundMoney)(Number(v || 0))) : [];
                    if (ph.length !== buckets) {
                        throw new budget_context_1.BudgetError('BUD_PHASING_SIZE', `Row ${rowNo} (${lineName}): enter ${buckets} phasing amounts.`);
                    }
                    if (ph.some((v) => !Number.isFinite(v) || v < 0)) {
                        throw new budget_context_1.BudgetError('BUD_PHASING_NEGATIVE', `Row ${rowNo} (${lineName}): phasing amounts cannot be negative.`);
                    }
                    const diff = (0, fy_util_1.roundMoney)(amount - (0, fy_util_1.sumMoney)(ph));
                    if (diff !== 0) {
                        throw new budget_context_1.BudgetError('BUD_PHASING_SUM_MISMATCH', diff > 0
                            ? `Row ${rowNo} (${lineName}): ₹${(0, budget_export_util_1.formatIndian)(diff)} remaining to allocate in phasing.`
                            : `Row ${rowNo} (${lineName}): phasing exceeds the annual amount by ₹${(0, budget_export_util_1.formatIndian)(-diff)}.`);
                    }
                    months = (0, fy_util_1.bucketsToMonths)(ph, mode);
                }
            }
            out.push({
                line_id: lineId,
                line_type: type,
                asset_item_id: assetItemId,
                service_name: serviceName,
                line_name: lineName,
                budget_category_id: catId,
                ownership_status_type_id: ownId,
                expense_nature: nature,
                annual_amount: amount,
                quantity,
                unit_estimate: unit,
                justification,
                months,
                sort_order: rowNo,
            });
        });
        return out;
    }
    totals(lines) {
        return {
            total: (0, fy_util_1.sumMoney)(lines.map((l) => l.annual_amount)),
            capex: (0, fy_util_1.sumMoney)(lines.filter((l) => l.expense_nature === 'capex').map((l) => l.annual_amount)),
            opex: (0, fy_util_1.sumMoney)(lines.filter((l) => l.expense_nature === 'opex').map((l) => l.annual_amount)),
        };
    }
    async insertLine(m, ctx, planId, l, version) {
        const r = await m.query(`INSERT INTO ${(0, budget_context_1.T)(ctx.schema, 'budget_lines')}
         (plan_id, line_type, asset_item_id, service_name, budget_category_id, ownership_status_type_id,
          expense_nature, annual_amount, quantity, unit_estimate, justification, sort_order, is_active,
          added_in_version, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,1,$13,$14,$14)
       RETURNING line_id`, [planId, l.line_type, l.asset_item_id, l.service_name, l.budget_category_id, l.ownership_status_type_id,
            l.expense_nature, l.annual_amount, l.quantity, l.unit_estimate, l.justification, l.sort_order,
            version, ctx.userId]);
        return Number(r[0].line_id);
    }
    async writePhasing(m, ctx, lineId, months, fy) {
        await m.query(`DELETE FROM ${(0, budget_context_1.T)(ctx.schema, 'budget_line_phasing')} WHERE line_id = $1`, [lineId]);
        if (months.length !== 12)
            return;
        const fm = (0, fy_util_1.fyMonths)(fy);
        const values = [];
        const ph = [];
        months.forEach((amt, i) => {
            values.push(lineId, i + 1, fm[i].start, amt);
            ph.push(`($${values.length - 3}, $${values.length - 2}, $${values.length - 1}::date, $${values.length})`);
        });
        await m.query(`INSERT INTO ${(0, budget_context_1.T)(ctx.schema, 'budget_line_phasing')} (line_id, fy_month_index, period_start, amount)
       VALUES ${ph.join(', ')}`, values);
    }
    async snapshot(m, ctx, planId) {
        const plan = await (0, budget_data_1.loadPlan)(m, ctx.schema, planId);
        const lines = await (0, budget_data_1.loadLines)(m, ctx.schema, planId);
        return {
            header: {
                plan_id: plan.plan_id,
                fy_code: plan.fy_code,
                fy_label: plan.fy_label,
                plan_name: plan.plan_name,
                owner_user_id: plan.owner_user_id,
                owner_name: plan.owner_name,
                phasing_mode: plan.phasing_mode,
                phasing_method: plan.phasing_method,
                remarks: plan.remarks,
            },
            totals: { total: plan.total_amount, capex: plan.capex_amount, opex: plan.opex_amount },
            lines: lines.map((l) => ({
                line_id: l.line_id,
                line_type: l.line_type,
                asset_item_id: l.asset_item_id,
                line_name: l.line_name,
                budget_category_id: l.budget_category_id,
                budget_category_name: l.budget_category_name,
                ownership_status_type_id: l.ownership_status_type_id,
                ownership_status_type_name: l.ownership_status_type_name,
                expense_nature: l.expense_nature,
                annual_amount: l.annual_amount,
                quantity: l.quantity,
                unit_estimate: l.unit_estimate,
                justification: l.justification,
                phasing_months: l.phasing_months,
            })),
        };
    }
    assertLockVersion(plan, lockVersion) {
        if (lockVersion !== undefined && lockVersion !== null && Number(lockVersion) !== plan.lock_version) {
            throw new budget_context_1.BudgetError('BUD_STALE_VERSION', `This plan was changed by ${plan.updated_by_name || 'another user'}. Reload the plan and try again.`);
        }
    }
    assertNotLocked(plan) {
        if (plan.is_locked) {
            throw new budget_context_1.BudgetError('BUD_FY_LOCKED', `${plan.fy_label} is locked. No budget change is allowed.`);
        }
        if (plan.status_code === budget_data_1.STATUS.CLOSED) {
            throw new budget_context_1.BudgetError('BUD_FY_CLOSED', `${plan.fy_label} is closed. Reopen it to change the budget.`);
        }
    }
    async create(ctx, input) {
        const s = ctx.schema;
        const h = this.validateHeader(input);
        const { startMonth, pattern } = await (0, budget_data_1.orgFyStartMonth)(this.dataSource, s);
        const fy = (0, fy_util_1.fyFromCode)(String(input.fy_code || ''), startMonth);
        if (!fy)
            throw new budget_context_1.BudgetError('BUD_FY_INVALID', 'Select a valid financial year.');
        const allowed = (0, fy_util_1.fyOptions)(startMonth).some((o) => o.code === fy.code);
        if (!allowed) {
            throw new budget_context_1.BudgetError('BUD_FY_OUT_OF_RANGE', `The financial year must be within ${fy_util_1.FY_WINDOW_YEARS} years of the current year.`);
        }
        const exists = await this.dataSource.query(`SELECT p.plan_id, st.status_name FROM ${(0, budget_context_1.T)(s, 'budget_plans')} p
         JOIN ${(0, budget_context_1.T)(s, 'budget_plan_statuses')} st ON st.status_code = p.status_code
        WHERE p.fy_code = $1 AND p.is_deleted = 0`, [fy.code]);
        if (exists.length) {
            throw new budget_context_1.BudgetError('BUD_PLAN_EXISTS_FOR_FY', `A budget plan for ${fy.label} already exists (status ${exists[0].status_name}). Open it to edit or revise.`, { plan_id: Number(exists[0].plan_id) });
        }
        await this.assertOwner(this.dataSource, ctx, h.owner);
        const lines = await this.buildLines(this.dataSource, ctx, input.lines || [], h.mode, h.method);
        const tot = this.totals(lines);
        const planId = await this.dataSource.transaction(async (m) => {
            const r = await m.query(`INSERT INTO ${(0, budget_context_1.T)(s, 'budget_plans')}
           (fy_code, fy_label, fy_start_date, fy_end_date, fy_pattern, plan_name, owner_user_id, status_code,
            current_version, phasing_mode, phasing_method, total_amount, capex_amount, opex_amount, remarks,
            created_by, updated_by)
         VALUES ($1,$2,$3::date,$4::date,$5,$6,$7,10,0,$8,$9,$10,$11,$12,$13,$14,$14)
         RETURNING plan_id`, [fy.code, fy.label, fy.startDate, fy.endDate, pattern, h.planName || `IT Budget ${fy.label}`, h.owner,
                h.mode, h.method, tot.total, tot.capex, tot.opex, h.remarks || null, ctx.userId]);
            const id = Number(r[0].plan_id);
            for (const l of lines) {
                const lineId = await this.insertLine(m, ctx, id, l, null);
                await this.writePhasing(m, ctx, lineId, l.months, fy);
            }
            await (0, budget_activity_util_1.logBudgetActivity)(m, ctx, {
                plan_id: id, entity_type: 'PLAN', entity_id: id, action: 'CREATED',
                description: `Draft budget plan created for ${fy.label} with ${lines.length} line(s), total ₹${(0, budget_export_util_1.formatIndian)(tot.total)}`,
            });
            return id;
        });
        return { status: common_1.HttpStatus.CREATED, message: 'Budget plan saved as draft.', data: (await this.getPlan(ctx, planId)).data };
    }
    async updateDraft(ctx, input) {
        const s = ctx.schema;
        const plan = await (0, budget_data_1.loadPlan)(this.dataSource, s, Number(input.plan_id));
        if (plan.status_code !== budget_data_1.STATUS.DRAFT) {
            throw new budget_context_1.BudgetError('BUD_NOT_DRAFT', 'Only a draft plan can be edited directly. Use Revise budget for a published plan.');
        }
        this.assertLockVersion(plan, input.lock_version);
        if (input.fy_code && input.fy_code !== plan.fy_code) {
            throw new budget_context_1.BudgetError('BUD_FY_CHANGE', 'The financial year of a plan cannot be changed. Delete the draft and create a new plan.');
        }
        const h = this.validateHeader(input);
        await this.assertOwner(this.dataSource, ctx, h.owner, plan.owner_user_id);
        const lines = await this.buildLines(this.dataSource, ctx, (input.lines || []).map((l) => ({ ...l, line_id: null })), h.mode, h.method);
        const tot = this.totals(lines);
        const fy = (0, budget_data_1.planFy)(plan);
        await this.dataSource.transaction(async (m) => {
            await m.query(`DELETE FROM ${(0, budget_context_1.T)(s, 'budget_lines')} WHERE plan_id = $1`, [plan.plan_id]);
            for (const l of lines) {
                const lineId = await this.insertLine(m, ctx, plan.plan_id, l, null);
                await this.writePhasing(m, ctx, lineId, l.months, fy);
            }
            await m.query(`UPDATE ${(0, budget_context_1.T)(s, 'budget_plans')}
            SET plan_name = $1, owner_user_id = $2, phasing_mode = $3, phasing_method = $4, remarks = $5,
                total_amount = $6, capex_amount = $7, opex_amount = $8,
                lock_version = lock_version + 1, updated_by = $9, updated_at = now()
          WHERE plan_id = $10`, [h.planName || plan.plan_name, h.owner, h.mode, h.method, h.remarks || null,
                tot.total, tot.capex, tot.opex, ctx.userId, plan.plan_id]);
            await (0, budget_activity_util_1.logBudgetActivity)(m, ctx, {
                plan_id: plan.plan_id, entity_type: 'PLAN', entity_id: plan.plan_id, action: 'UPDATED',
                description: `Draft updated: ${lines.length} line(s), total ₹${(0, budget_export_util_1.formatIndian)(tot.total)}`,
            });
        });
        return { status: common_1.HttpStatus.OK, message: 'Draft saved.', data: (await this.getPlan(ctx, plan.plan_id)).data };
    }
    async deleteDraft(ctx, planId) {
        const s = ctx.schema;
        const plan = await (0, budget_data_1.loadPlan)(this.dataSource, s, planId);
        if (plan.status_code !== budget_data_1.STATUS.DRAFT) {
            throw new budget_context_1.BudgetError('BUD_NOT_DRAFT', 'Only a draft plan can be deleted.');
        }
        await this.dataSource.transaction(async (m) => {
            await m.query(`UPDATE ${(0, budget_context_1.T)(s, 'budget_plans')} SET is_deleted = 1, updated_by = $1, updated_at = now() WHERE plan_id = $2`, [ctx.userId, plan.plan_id]);
            await (0, budget_activity_util_1.logBudgetActivity)(m, ctx, {
                plan_id: plan.plan_id, entity_type: 'PLAN', entity_id: plan.plan_id, action: 'DELETED',
                description: `Draft budget plan for ${plan.fy_label} deleted`,
            });
        });
        return { status: common_1.HttpStatus.OK, message: `Draft plan for ${plan.fy_label} deleted.` };
    }
    async publish(ctx, input) {
        const s = ctx.schema;
        const plan = await (0, budget_data_1.loadPlan)(this.dataSource, s, Number(input?.plan_id));
        if (plan.status_code !== budget_data_1.STATUS.DRAFT)
            throw new budget_context_1.BudgetError('BUD_NOT_DRAFT', 'Only a draft plan can be published.');
        this.assertLockVersion(plan, input?.lock_version);
        const lines = await (0, budget_data_1.loadLines)(this.dataSource, s, plan.plan_id);
        if (!lines.length)
            throw new budget_context_1.BudgetError('BUD_NO_LINES', 'Add at least one budget line before publishing.');
        if (plan.phasing_mode !== 'YEARLY') {
            const bad = lines.find((l) => l.phasing_months.length !== 12 || (0, fy_util_1.sumMoney)(l.phasing_months) !== l.annual_amount);
            if (bad)
                throw new budget_context_1.BudgetError('BUD_PHASING_SUM_MISMATCH', `Phasing of '${bad.line_name}' does not add up to its annual amount.`);
        }
        await this.assertOwner(this.dataSource, ctx, plan.owner_user_id, plan.owner_user_id);
        await this.dataSource.transaction(async (m) => {
            await m.query(`UPDATE ${(0, budget_context_1.T)(s, 'budget_plans')}
            SET status_code = 20, current_version = 1, published_by = $1, published_at = now(),
                lock_version = lock_version + 1, updated_by = $1, updated_at = now()
          WHERE plan_id = $2`, [ctx.userId, plan.plan_id]);
            await m.query(`UPDATE ${(0, budget_context_1.T)(s, 'budget_lines')} SET added_in_version = 1 WHERE plan_id = $1 AND is_active = 1`, [plan.plan_id]);
            const snap = await this.snapshot(m, ctx, plan.plan_id);
            const v = await m.query(`INSERT INTO ${(0, budget_context_1.T)(s, 'budget_plan_versions')}
           (plan_id, version_no, revision_type, reason, total_before, total_after, net_change, snapshot, created_by)
         VALUES ($1, 1, 'INITIAL', NULL, 0, $2, $2, $3::jsonb, $4) RETURNING version_id`, [plan.plan_id, snap.totals.total, JSON.stringify(snap), ctx.userId]);
            const versionId = Number(v[0].version_id);
            for (const l of snap.lines) {
                await m.query(`INSERT INTO ${(0, budget_context_1.T)(s, 'budget_revision_items')}
             (version_id, plan_id, line_id, change_type, amount_before, amount_after, after_json)
           VALUES ($1, $2, $3, 'ADDED', NULL, $4, $5::jsonb)`, [versionId, plan.plan_id, l.line_id, l.annual_amount, JSON.stringify(l)]);
            }
            await (0, budget_activity_util_1.logBudgetActivity)(m, ctx, {
                plan_id: plan.plan_id, entity_type: 'PLAN', entity_id: plan.plan_id, action: 'PUBLISHED',
                description: `${plan.fy_label} budget published as v1.0, total ₹${(0, budget_export_util_1.formatIndian)(snap.totals.total)}`,
            });
        });
        return { status: common_1.HttpStatus.OK, message: `${plan.fy_label} budget published (v1.0).`, data: (await this.getPlan(ctx, plan.plan_id)).data };
    }
    async revise(ctx, input) {
        const s = ctx.schema;
        const plan = await (0, budget_data_1.loadPlan)(this.dataSource, s, Number(input?.plan_id));
        if (plan.status_code === budget_data_1.STATUS.DRAFT) {
            throw new budget_context_1.BudgetError('BUD_IS_DRAFT', 'This plan is still a draft. Edit the draft instead of revising it.');
        }
        this.assertNotLocked(plan);
        this.assertLockVersion(plan, input.lock_version);
        const reason = String(input.reason || '').trim();
        if (reason.length < 5 || reason.length > 500) {
            throw new budget_context_1.BudgetError('BUD_REASON', 'Enter the reason for this change (5 to 500 characters).');
        }
        const h = this.validateHeader({
            ...input,
            owner_user_id: input.owner_user_id ?? plan.owner_user_id,
            phasing_mode: input.phasing_mode ?? plan.phasing_mode,
            phasing_method: input.phasing_mode ? input.phasing_method : plan.phasing_method,
            plan_name: input.plan_name ?? plan.plan_name,
            remarks: input.remarks ?? plan.remarks,
        });
        await this.assertOwner(this.dataSource, ctx, h.owner, plan.owner_user_id);
        const fy = (0, budget_data_1.planFy)(plan);
        const existingLines = await (0, budget_data_1.loadLines)(this.dataSource, s, plan.plan_id);
        const existing = new Map(existingLines.map((l) => [l.line_id, l]));
        const built = await this.buildLines(this.dataSource, ctx, input.lines || [], h.mode, h.method, existing);
        if (!built.length)
            throw new budget_context_1.BudgetError('BUD_NO_LINES', 'A published plan must keep at least one line.');
        const consumed = await (0, budget_data_1.consumedByLine)(this.dataSource, s, plan.plan_id);
        const items = [];
        const keep = new Set();
        const amountChanged = [];
        const lineJson = (l) => ({
            line_name: l.line_name, line_type: l.line_type, asset_item_id: l.asset_item_id,
            budget_category_id: l.budget_category_id, ownership_status_type_id: l.ownership_status_type_id,
            expense_nature: l.expense_nature, annual_amount: l.annual_amount, quantity: l.quantity,
            unit_estimate: l.unit_estimate, justification: l.justification,
            phasing_months: l.phasing_months ?? l.months,
        });
        for (const b of built) {
            if (!b.line_id) {
                items.push({ line_id: null, change_type: 'ADDED', amount_before: null, amount_after: b.annual_amount, before: null, after: lineJson(b), built: b });
                continue;
            }
            keep.add(b.line_id);
            const prev = existing.get(b.line_id);
            const used = consumed.get(b.line_id) || 0;
            if (b.annual_amount < used) {
                throw new budget_context_1.BudgetError('BUD_LINE_BELOW_CONSUMED', `'${b.line_name}' cannot be reduced to ₹${(0, budget_export_util_1.formatIndian)(b.annual_amount)} — ₹${(0, budget_export_util_1.formatIndian)(used)} is already consumed.`);
            }
            if (b.annual_amount !== prev.annual_amount) {
                const it = {
                    line_id: b.line_id,
                    change_type: b.annual_amount > prev.annual_amount ? 'INCREASED' : 'REDUCED',
                    amount_before: prev.annual_amount, amount_after: b.annual_amount,
                    before: lineJson(prev), after: lineJson(b), built: b,
                };
                items.push(it);
                amountChanged.push(it);
            }
            const attrChanged = prev.budget_category_id !== b.budget_category_id ||
                prev.ownership_status_type_id !== b.ownership_status_type_id ||
                (prev.quantity ?? null) !== (b.quantity ?? null) ||
                (prev.unit_estimate ?? null) !== (b.unit_estimate ?? null) ||
                (prev.justification ?? null) !== (b.justification ?? null) ||
                (prev.service_name ?? null) !== (b.service_name ?? null);
            if (attrChanged) {
                items.push({ line_id: b.line_id, change_type: 'ATTRIBUTE_CHANGED', amount_before: prev.annual_amount, amount_after: b.annual_amount, before: lineJson(prev), after: lineJson(b), built: b });
            }
            const prevMonths = prev.phasing_months || [];
            const phasingChanged = prevMonths.length !== b.months.length || prevMonths.some((v, i) => v !== b.months[i]);
            if (phasingChanged && b.annual_amount === prev.annual_amount) {
                items.push({ line_id: b.line_id, change_type: 'PHASING_CHANGED', amount_before: prev.annual_amount, amount_after: b.annual_amount, before: lineJson(prev), after: lineJson(b), built: b });
            }
        }
        for (const prev of existingLines) {
            if (keep.has(prev.line_id))
                continue;
            const used = consumed.get(prev.line_id) || 0;
            if (used > 0) {
                throw new budget_context_1.BudgetError('BUD_LINE_HAS_CONSUMPTION', `'${prev.line_name}' cannot be removed — ₹${(0, budget_export_util_1.formatIndian)(used)} is already consumed against it. Reduce it to the consumed amount instead.`);
            }
            items.push({ line_id: prev.line_id, change_type: 'REMOVED', amount_before: prev.annual_amount, amount_after: null, before: lineJson(prev), after: null });
        }
        const headerChanged = h.owner !== plan.owner_user_id ||
            (h.planName || plan.plan_name) !== plan.plan_name ||
            (h.remarks || null) !== (plan.remarks || null) ||
            h.mode !== plan.phasing_mode ||
            (h.method || null) !== (plan.phasing_method || null);
        if (!items.length && !headerChanged)
            throw new budget_context_1.BudgetError('BUD_NOTHING_CHANGED', 'Nothing changed — the plan is the same as the current version.');
        const totalBefore = plan.total_amount;
        const tot = this.totals(built);
        const net = (0, fy_util_1.roundMoney)(tot.total - totalBefore);
        const revisionType = net > 0 ? 'INCREASED' : net < 0 ? 'REDUCED' : 'REALLOCATION';
        if (revisionType === 'REALLOCATION')
            for (const it of amountChanged)
                it.change_type = 'REALLOCATED';
        const newVersion = plan.current_version + 1;
        await this.dataSource.transaction(async (m) => {
            for (const it of items.filter((x) => x.change_type === 'REMOVED')) {
                await m.query(`UPDATE ${(0, budget_context_1.T)(s, 'budget_lines')} SET is_active = 0, removed_in_version = $1, updated_by = $2, updated_at = now()
            WHERE line_id = $3`, [newVersion, ctx.userId, it.line_id]);
            }
            for (const b of built) {
                if (b.line_id) {
                    await m.query(`UPDATE ${(0, budget_context_1.T)(s, 'budget_lines')}
                SET budget_category_id = $1, ownership_status_type_id = $2, expense_nature = $3,
                    annual_amount = $4, quantity = $5, unit_estimate = $6, justification = $7,
                    service_name = $8, sort_order = $9, updated_by = $10, updated_at = now()
              WHERE line_id = $11`, [b.budget_category_id, b.ownership_status_type_id, b.expense_nature, b.annual_amount,
                        b.quantity, b.unit_estimate, b.justification, b.service_name, b.sort_order, ctx.userId, b.line_id]);
                    await this.writePhasing(m, ctx, b.line_id, b.months, fy);
                }
            }
            for (const it of items.filter((x) => x.change_type === 'ADDED')) {
                const id = await this.insertLine(m, ctx, plan.plan_id, it.built, newVersion);
                await this.writePhasing(m, ctx, id, it.built.months, fy);
                it.line_id = id;
            }
            await m.query(`UPDATE ${(0, budget_context_1.T)(s, 'budget_plans')}
            SET plan_name = $1, owner_user_id = $2, phasing_mode = $3, phasing_method = $4, remarks = $5,
                total_amount = $6, capex_amount = $7, opex_amount = $8, current_version = $9,
                lock_version = lock_version + 1, updated_by = $10, updated_at = now()
          WHERE plan_id = $11`, [h.planName || plan.plan_name, h.owner, h.mode, h.method, h.remarks || null,
                tot.total, tot.capex, tot.opex, newVersion, ctx.userId, plan.plan_id]);
            const snap = await this.snapshot(m, ctx, plan.plan_id);
            const v = await m.query(`INSERT INTO ${(0, budget_context_1.T)(s, 'budget_plan_versions')}
           (plan_id, version_no, revision_type, reason, total_before, total_after, net_change, snapshot, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) RETURNING version_id`, [plan.plan_id, newVersion, revisionType, reason, totalBefore, tot.total, net, JSON.stringify(snap), ctx.userId]);
            const versionId = Number(v[0].version_id);
            if (headerChanged) {
                items.push({
                    line_id: null, change_type: 'ATTRIBUTE_CHANGED', amount_before: null, amount_after: null,
                    before: { scope: 'PLAN', owner_user_id: plan.owner_user_id, owner_name: plan.owner_name, plan_name: plan.plan_name, remarks: plan.remarks, phasing_mode: plan.phasing_mode, phasing_method: plan.phasing_method },
                    after: { scope: 'PLAN', owner_user_id: h.owner, owner_name: snap.header.owner_name, plan_name: h.planName || plan.plan_name, remarks: h.remarks || null, phasing_mode: h.mode, phasing_method: h.method },
                });
            }
            for (const it of items) {
                await m.query(`INSERT INTO ${(0, budget_context_1.T)(s, 'budget_revision_items')}
             (version_id, plan_id, line_id, change_type, amount_before, amount_after, before_json, after_json)
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)`, [versionId, plan.plan_id, it.line_id, it.change_type, it.amount_before, it.amount_after,
                    it.before ? JSON.stringify(it.before) : null, it.after ? JSON.stringify(it.after) : null]);
            }
            await (0, budget_activity_util_1.logBudgetActivity)(m, ctx, {
                plan_id: plan.plan_id, entity_type: 'PLAN', entity_id: plan.plan_id, action: 'REVISED',
                description: `${plan.fy_label} revised to v${newVersion}.0 (${revisionType}, net ₹${(0, budget_export_util_1.formatIndian)(net)}): ${reason}`,
            });
        });
        const label = revisionType === 'REALLOCATION' ? 'Reallocation' : revisionType === 'INCREASED' ? 'Increased' : 'Reduced';
        return {
            status: common_1.HttpStatus.OK,
            message: `Budget revised to v${newVersion}.0 (${label}${net ? `, net ₹${(0, budget_export_util_1.formatIndian)(net)}` : ''}).`,
            data: (await this.getPlan(ctx, plan.plan_id)).data,
        };
    }
    async previewRevision(ctx, input) {
        const s = ctx.schema;
        const plan = await (0, budget_data_1.loadPlan)(this.dataSource, s, Number(input?.plan_id));
        this.assertNotLocked(plan);
        const h = this.validateHeader({
            ...input,
            owner_user_id: input.owner_user_id ?? plan.owner_user_id,
            phasing_mode: input.phasing_mode ?? plan.phasing_mode,
            phasing_method: input.phasing_mode ? input.phasing_method : plan.phasing_method,
        });
        const existingLines = await (0, budget_data_1.loadLines)(this.dataSource, s, plan.plan_id);
        const existing = new Map(existingLines.map((l) => [l.line_id, l]));
        const built = await this.buildLines(this.dataSource, ctx, input.lines || [], h.mode, h.method, existing);
        const consumed = await (0, budget_data_1.consumedByLine)(this.dataSource, s, plan.plan_id);
        const tot = this.totals(built);
        const net = (0, fy_util_1.roundMoney)(tot.total - plan.total_amount);
        const type = net > 0 ? 'INCREASED' : net < 0 ? 'REDUCED' : 'REALLOCATION';
        const keep = new Set(built.filter((b) => b.line_id).map((b) => b.line_id));
        const changes = [
            ...built.map((b) => {
                const prev = b.line_id ? existing.get(b.line_id) : null;
                const before = prev ? prev.annual_amount : null;
                let change = prev ? 'UNCHANGED' : 'ADDED';
                if (prev && b.annual_amount !== prev.annual_amount) {
                    change = type === 'REALLOCATION' ? 'REALLOCATED' : b.annual_amount > prev.annual_amount ? 'INCREASED' : 'REDUCED';
                }
                return {
                    line_id: b.line_id, line_name: b.line_name, change_type: change,
                    amount_before: before, amount_after: b.annual_amount,
                    consumed_amount: b.line_id ? consumed.get(b.line_id) || 0 : 0,
                };
            }),
            ...existingLines.filter((l) => !keep.has(l.line_id)).map((l) => ({
                line_id: l.line_id, line_name: l.line_name, change_type: 'REMOVED',
                amount_before: l.annual_amount, amount_after: null, consumed_amount: consumed.get(l.line_id) || 0,
            })),
        ];
        return {
            status: common_1.HttpStatus.OK,
            message: 'OK',
            data: {
                revision_type: type,
                next_version_label: versionLabel(plan.current_version + 1),
                total_before: plan.total_amount,
                total_after: tot.total,
                net_change: net,
                capex_after: tot.capex,
                opex_after: tot.opex,
                changes,
            },
        };
    }
    async setCurrent(ctx, input, canClose) {
        const s = ctx.schema;
        const plan = await (0, budget_data_1.loadPlan)(this.dataSource, s, Number(input?.plan_id));
        if (plan.status_code === budget_data_1.STATUS.CURRENT)
            throw new budget_context_1.BudgetError('BUD_ALREADY_CURRENT', `${plan.fy_label} is already the current financial year.`);
        if (plan.status_code !== budget_data_1.STATUS.SCHEDULED) {
            throw new budget_context_1.BudgetError('BUD_NOT_SCHEDULED', 'Only a published (scheduled) plan can be set as current.');
        }
        const today = (0, fy_util_1.todayYmd)();
        if (today < plan.fy_start_date) {
            throw new budget_context_1.BudgetError('BUD_FY_NOT_STARTED', `${plan.fy_label} starts on ${plan.fy_start_date}. It can be set as current from that date.`);
        }
        if (today > plan.fy_end_date) {
            throw new budget_context_1.BudgetError('BUD_FY_ENDED', `${plan.fy_label} has already ended. Close it instead of setting it as current.`);
        }
        const prevRows = (await this.dataSource.query(`${(0, budget_data_1.planSelect)(s)} AND p.status_code = 30`)).map(budget_data_1.normalisePlan);
        const prev = prevRows[0];
        if (prev && !input?.close_previous) {
            throw new budget_context_1.BudgetError('BUD_PREVIOUS_CURRENT', `${prev.fy_label} is the current financial year. It will be closed when ${plan.fy_label} becomes current.`, { previous_plan_id: prev.plan_id, previous_fy_label: prev.fy_label });
        }
        if (prev && !canClose) {
            throw new budget_context_1.BudgetError('BUD_FORBIDDEN_CLOSE', `You need the "Close & Lock Financial Year" permission to close ${prev.fy_label}.`);
        }
        await this.dataSource.transaction(async (m) => {
            if (prev) {
                await m.query(`UPDATE ${(0, budget_context_1.T)(s, 'budget_plans')}
              SET status_code = 40, closed_by = $1, closed_at = now(),
                  lock_version = lock_version + 1, updated_by = $1, updated_at = now()
            WHERE plan_id = $2`, [ctx.userId, prev.plan_id]);
                await (0, budget_activity_util_1.logBudgetActivity)(m, ctx, {
                    plan_id: prev.plan_id, entity_type: 'PLAN', entity_id: prev.plan_id, action: 'CLOSED',
                    description: `${prev.fy_label} closed while setting ${plan.fy_label} as current`,
                });
            }
            await m.query(`UPDATE ${(0, budget_context_1.T)(s, 'budget_plans')}
            SET status_code = 30, set_current_by = $1, set_current_at = now(),
                lock_version = lock_version + 1, updated_by = $1, updated_at = now()
          WHERE plan_id = $2`, [ctx.userId, plan.plan_id]);
            await (0, budget_activity_util_1.logBudgetActivity)(m, ctx, {
                plan_id: plan.plan_id, entity_type: 'PLAN', entity_id: plan.plan_id, action: 'SET_CURRENT',
                description: `${plan.fy_label} set as the current financial year`,
            });
        });
        return {
            status: common_1.HttpStatus.OK,
            message: prev
                ? `${plan.fy_label} is now current. ${prev.fy_label} has been closed.`
                : `${plan.fy_label} is now the current financial year.`,
        };
    }
    async close(ctx, input) {
        const s = ctx.schema;
        const plan = await (0, budget_data_1.loadPlan)(this.dataSource, s, Number(input?.plan_id));
        if (plan.status_code === budget_data_1.STATUS.DRAFT)
            throw new budget_context_1.BudgetError('BUD_IS_DRAFT', 'A draft plan cannot be closed. Publish or delete it.');
        if (plan.is_locked)
            throw new budget_context_1.BudgetError('BUD_FY_LOCKED', `${plan.fy_label} is locked.`);
        if (plan.status_code === budget_data_1.STATUS.CLOSED)
            throw new budget_context_1.BudgetError('BUD_ALREADY_CLOSED', `${plan.fy_label} is already closed.`);
        const today = (0, fy_util_1.todayYmd)();
        if (today < plan.fy_end_date && !input?.confirm_before_end) {
            throw new budget_context_1.BudgetError('BUD_CLOSE_BEFORE_END', `${plan.fy_label} ends on ${plan.fy_end_date}. Confirm to close it before the year ends.`, { fy_end_date: plan.fy_end_date });
        }
        await this.dataSource.transaction(async (m) => {
            await m.query(`UPDATE ${(0, budget_context_1.T)(s, 'budget_plans')}
            SET status_code = 40, closed_by = $1, closed_at = now(),
                lock_version = lock_version + 1, updated_by = $1, updated_at = now()
          WHERE plan_id = $2`, [ctx.userId, plan.plan_id]);
            await (0, budget_activity_util_1.logBudgetActivity)(m, ctx, {
                plan_id: plan.plan_id, entity_type: 'PLAN', entity_id: plan.plan_id, action: 'CLOSED',
                description: `${plan.fy_label} closed`,
            });
        });
        return { status: common_1.HttpStatus.OK, message: `${plan.fy_label} is closed. It can be reopened until it is locked.` };
    }
    async reopen(ctx, input) {
        const s = ctx.schema;
        const plan = await (0, budget_data_1.loadPlan)(this.dataSource, s, Number(input?.plan_id));
        if (plan.is_locked)
            throw new budget_context_1.BudgetError('BUD_FY_LOCKED', `${plan.fy_label} is locked and cannot be reopened.`);
        if (plan.status_code !== budget_data_1.STATUS.CLOSED)
            throw new budget_context_1.BudgetError('BUD_NOT_CLOSED', 'Only a closed year can be reopened.');
        const cur = await this.dataSource.query(`SELECT 1 FROM ${(0, budget_context_1.T)(s, 'budget_plans')} WHERE status_code = 30 AND is_deleted = 0 LIMIT 1`);
        const today = (0, fy_util_1.todayYmd)();
        const toCurrent = !cur.length && today >= plan.fy_start_date && today <= plan.fy_end_date;
        const next = toCurrent ? budget_data_1.STATUS.CURRENT : budget_data_1.STATUS.SCHEDULED;
        await this.dataSource.transaction(async (m) => {
            await m.query(`UPDATE ${(0, budget_context_1.T)(s, 'budget_plans')}
            SET status_code = $3, closed_by = NULL, closed_at = NULL,
                lock_version = lock_version + 1, updated_by = $1, updated_at = now()
          WHERE plan_id = $2`, [ctx.userId, plan.plan_id, next]);
            await (0, budget_activity_util_1.logBudgetActivity)(m, ctx, {
                plan_id: plan.plan_id, entity_type: 'PLAN', entity_id: plan.plan_id, action: 'REOPENED',
                description: `${plan.fy_label} reopened`,
            });
        });
        return { status: common_1.HttpStatus.OK, message: `${plan.fy_label} is reopened${toCurrent ? ' as the current year' : ''}.` };
    }
    async lock(ctx, input) {
        const s = ctx.schema;
        const plan = await (0, budget_data_1.loadPlan)(this.dataSource, s, Number(input?.plan_id));
        if (plan.is_locked)
            throw new budget_context_1.BudgetError('BUD_FY_LOCKED', `${plan.fy_label} is already locked.`);
        if (plan.status_code !== budget_data_1.STATUS.CLOSED)
            throw new budget_context_1.BudgetError('BUD_NOT_CLOSED', 'Close the financial year before locking it.');
        await this.dataSource.transaction(async (m) => {
            await m.query(`UPDATE ${(0, budget_context_1.T)(s, 'budget_plans')}
            SET is_locked = true, lock_version = lock_version + 1, updated_by = $1, updated_at = now()
          WHERE plan_id = $2`, [ctx.userId, plan.plan_id]);
            await (0, budget_activity_util_1.logBudgetActivity)(m, ctx, {
                plan_id: plan.plan_id, entity_type: 'PLAN', entity_id: plan.plan_id, action: 'LOCKED',
                description: `${plan.fy_label} locked permanently`,
            });
        });
        return { status: common_1.HttpStatus.OK, message: `${plan.fy_label} is locked. Its budget and manual entries can no longer be changed.` };
    }
    async versions(ctx, planId) {
        const s = ctx.schema;
        await (0, budget_data_1.loadPlan)(this.dataSource, s, planId);
        const rows = await this.dataSource.query(`SELECT v.version_id, v.version_no, v.revision_type, v.reason, v.total_before, v.total_after, v.net_change,
              v.created_at, TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS created_by_name,
              (SELECT COUNT(*) FROM ${(0, budget_context_1.T)(s, 'budget_revision_items')} ri WHERE ri.version_id = v.version_id)::int AS change_count
         FROM ${(0, budget_context_1.T)(s, 'budget_plan_versions')} v
         LEFT JOIN ${(0, budget_context_1.T)(s, 'users')} u ON u.user_id = v.created_by
        WHERE v.plan_id = $1
        ORDER BY v.version_no DESC`, [planId]);
        return {
            status: common_1.HttpStatus.OK,
            message: 'OK',
            data: rows.map((r) => ({
                ...r,
                version_no: Number(r.version_no),
                version_label: versionLabel(Number(r.version_no)),
                total_before: (0, budget_list_util_1.num)(r.total_before),
                total_after: (0, budget_list_util_1.num)(r.total_after),
                net_change: (0, budget_list_util_1.num)(r.net_change),
            })),
        };
    }
    async versionSnapshot(ctx, planId, versionNo) {
        const rows = await this.dataSource.query(`SELECT version_no, revision_type, reason, snapshot, created_at
         FROM ${(0, budget_context_1.T)(ctx.schema, 'budget_plan_versions')} WHERE plan_id = $1 AND version_no = $2`, [planId, versionNo]);
        if (!rows.length)
            throw new budget_context_1.BudgetError('BUD_VERSION_NOT_FOUND', 'Version not found');
        return { status: common_1.HttpStatus.OK, message: 'OK', data: { ...rows[0], version_label: versionLabel(Number(rows[0].version_no)) } };
    }
    async changesLog(ctx, planId) {
        const s = ctx.schema;
        const plan = await (0, budget_data_1.loadPlan)(this.dataSource, s, planId);
        const versions = (await this.versions(ctx, planId)).data;
        const items = await this.dataSource.query(`SELECT ri.revision_item_id, ri.version_id, ri.line_id, ri.change_type, ri.amount_before, ri.amount_after,
              ri.before_json, ri.after_json,
              COALESCE(ai.asset_item_name, l.service_name, ri.after_json->>'line_name', ri.before_json->>'line_name') AS line_name,
              ost.ownership_status_type_name
         FROM ${(0, budget_context_1.T)(s, 'budget_revision_items')} ri
         LEFT JOIN ${(0, budget_context_1.T)(s, 'budget_lines')} l ON l.line_id = ri.line_id
         LEFT JOIN ${(0, budget_context_1.T)(s, 'asset_items')} ai ON ai.asset_item_id = l.asset_item_id
         LEFT JOIN ${(0, budget_context_1.T)(s, 'asset_ownership_status_types')} ost ON ost.ownership_status_type_id = l.ownership_status_type_id
        WHERE ri.plan_id = $1
        ORDER BY ri.version_id DESC, ri.revision_item_id`, [planId]);
        const byVersion = new Map();
        for (const it of items) {
            const k = Number(it.version_id);
            if (!byVersion.has(k))
                byVersion.set(k, []);
            byVersion.get(k).push({
                ...it,
                line_name: it.line_name || (it.before_json?.scope === 'PLAN' ? 'Plan details' : ''),
                amount_before: it.amount_before === null ? null : (0, budget_list_util_1.num)(it.amount_before),
                amount_after: it.amount_after === null ? null : (0, budget_list_util_1.num)(it.amount_after),
            });
        }
        return {
            status: common_1.HttpStatus.OK,
            message: 'OK',
            data: {
                plan: { plan_id: plan.plan_id, fy_label: plan.fy_label, version_label: versionLabel(plan.current_version), status_name: plan.status_name },
                versions: versions.map((v) => ({ ...v, items: byVersion.get(Number(v.version_id)) || [] })),
            },
        };
    }
    async activity(ctx, planId) {
        const rows = await this.dataSource.query(`SELECT a.log_id, a.entity_type, a.entity_id, a.action, a.description, a.performed_at,
              TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS performed_by_name
         FROM ${(0, budget_context_1.T)(ctx.schema, 'budget_activity_log')} a
         LEFT JOIN ${(0, budget_context_1.T)(ctx.schema, 'users')} u ON u.user_id = a.performed_by
        WHERE a.plan_id = $1
        ORDER BY a.performed_at DESC LIMIT 300`, [planId]);
        return { status: common_1.HttpStatus.OK, message: 'OK', data: rows };
    }
    async exportList(ctx, input) {
        const format = (0, budget_export_util_1.exportFormat)(input?.format);
        const res = await this.listPlans(ctx, { ...input, page: 1, all: true });
        const rows = (0, budget_export_util_1.applySelection)(res.data, input, 'plan_id');
        const totals = rows.reduce((a, r) => ({ total: a.total + r.total_amount, consumed: a.consumed + r.consumed_amount }), { total: 0, consumed: 0 });
        const allColumns = [
            { key: 'fy_label', label: 'Financial Year', width: 1.1 },
            { key: 'period', label: 'Period', width: 1.6 },
            { key: 'status_name', label: 'Status', width: 0.9 },
            { key: 'version_label', label: 'Version', width: 0.7 },
            { key: 'owner_name', label: 'Plan Owner', width: 1.4 },
            { key: 'total_amount', label: 'Annual Budget', width: 1.2, money: true },
            { key: 'capex_amount', label: 'CapEx', width: 1.1, money: true },
            { key: 'opex_amount', label: 'OpEx', width: 1.1, money: true },
            { key: 'consumed_amount', label: 'Consumed', width: 1.2, money: true },
            { key: 'variance_amount', label: 'Variance', width: 1.1, money: true },
            { key: 'utilisation_pct', label: 'Utilisation', width: 0.9, percent: true },
            { key: 'updated_at_s', label: 'Last Updated', width: 1.1 },
        ];
        const columns = (0, budget_export_util_1.pickColumns)(allColumns, input?.visible_columns, input?.column_order, ['fy_label', 'period'], { updated_at: 'updated_at_s' });
        const doc = {
            title: 'IT Budget — Year-wise Budget',
            orgName: await (0, budget_data_1.orgName)(this.dataSource, ctx.schema),
            cards: [
                { label: 'Plans', value: String(rows.length) },
                { label: 'Total budget', value: (0, budget_export_util_1.formatIndian)(totals.total) },
                { label: 'Total consumed', value: (0, budget_export_util_1.formatIndian)(totals.consumed) },
            ],
            sections: [{
                    columns,
                    rows: rows.map((r) => ({ ...r, period: `${r.fy_start_date} to ${r.fy_end_date}`, updated_at_s: r.updated_at ? new Date(r.updated_at).toISOString().slice(0, 16).replace('T', ' ') : '' })),
                }],
            generatedBy: ctx.userName,
        };
        await (0, budget_activity_util_1.logBudgetActivity)(this.dataSource, ctx, { entity_type: 'EXPORT', action: 'EXPORTED', description: `Year-wise budget list exported (${format}, ${rows.length} row(s))` });
        return (0, budget_export_util_1.renderExport)(doc, format, 'Budget Plans');
    }
    async exportPlan(ctx, planId, format) {
        const s = ctx.schema;
        const detail = (await this.getPlan(ctx, planId)).data;
        const plan = detail.plan;
        const versions = (await this.versions(ctx, planId)).data;
        const consumedTotal = (0, fy_util_1.sumMoney)(detail.lines.map((l) => l.consumed_amount));
        const phased = plan.phasing_mode !== 'YEARLY';
        const lineCols = [
            { key: 'no', label: '#', width: 0.35, align: 'right' },
            { key: 'line_name', label: 'Item / Service', width: 2 },
            { key: 'type', label: 'Type', width: 0.6 },
            { key: 'budget_category_name', label: 'Budget Category', width: 1.5 },
            { key: 'ownership_status_type_name', label: 'Ownership', width: 1 },
            { key: 'nature', label: 'CapEx/OpEx', width: 0.8 },
            { key: 'annual_amount', label: 'Annual Budget', width: 1.2, money: true },
            { key: 'consumed_amount', label: 'Consumed', width: 1.1, money: true },
            { key: 'available', label: 'Available', width: 1.1, money: true },
        ];
        const lineRows = detail.lines.map((l, i) => ({
            no: i + 1,
            line_name: l.line_name,
            type: l.line_type === 'ITEM' ? 'Item' : 'Service',
            budget_category_name: l.budget_category_name,
            ownership_status_type_name: l.ownership_status_type_name,
            nature: l.expense_nature === 'capex' ? 'CapEx' : l.expense_nature === 'opex' ? 'OpEx' : 'NA',
            quantity: l.quantity ?? '',
            annual_amount: l.annual_amount,
            consumed_amount: l.consumed_amount,
            available: (0, fy_util_1.roundMoney)(l.annual_amount - l.consumed_amount),
        }));
        lineRows.push({
            no: '', line_name: 'Total', type: '', budget_category_name: '', ownership_status_type_name: '', nature: '',
            quantity: '', annual_amount: plan.total_amount, consumed_amount: consumedTotal,
            available: (0, fy_util_1.roundMoney)(plan.total_amount - consumedTotal), __bold: true,
        });
        const sections = [{ title: 'Budget lines', columns: format === 'pdf' ? lineCols : lineCols.filter((c) => c.key !== 'no'), rows: lineRows }];
        if (phased) {
            const labels = detail.bucket_labels;
            sections.push({
                title: `Phasing (${plan.phasing_mode.replace('_', '-').toLowerCase()}, ${String(plan.phasing_method || '').toLowerCase()})`,
                columns: [
                    { key: 'line_name', label: 'Item / Service', width: 2 },
                    ...labels.map((lb, i) => ({ key: `b${i}`, label: lb, width: 1, money: true })),
                    { key: 'annual_amount', label: 'Annual', width: 1.1, money: true },
                ],
                rows: detail.lines.map((l) => {
                    const r = { line_name: l.line_name, annual_amount: l.annual_amount };
                    (l.phasing || []).forEach((v, i) => (r[`b${i}`] = v));
                    return r;
                }),
            });
        }
        sections.push({
            title: 'Version history',
            columns: [
                { key: 'version_label', label: 'Version', width: 0.7 },
                { key: 'revision', label: 'Type', width: 1 },
                { key: 'created_at_s', label: 'Date', width: 1.1 },
                { key: 'created_by_name', label: 'Changed by', width: 1.3 },
                { key: 'total_before', label: 'Total before', width: 1.1, money: true },
                { key: 'total_after', label: 'Total after', width: 1.1, money: true },
                { key: 'net_change', label: 'Net change', width: 1, money: true },
                { key: 'reason', label: 'Reason', width: 2.6 },
            ],
            rows: versions.map((v) => ({
                ...v,
                revision: { INITIAL: 'Published', REALLOCATION: 'Reallocation', INCREASED: 'Increased', REDUCED: 'Reduced' }[v.revision_type] || v.revision_type,
                created_at_s: v.created_at ? new Date(v.created_at).toISOString().slice(0, 10) : '',
                reason: v.reason || (v.revision_type === 'INITIAL' ? 'Initial budget published' : ''),
            })),
        });
        const doc = {
            title: `IT Budget Plan — ${plan.fy_label}`,
            subtitle: plan.plan_name,
            orgName: await (0, budget_data_1.orgName)(this.dataSource, s),
            meta: [
                { label: 'Period', value: `${detail.fy.start_date} to ${detail.fy.end_date}` },
                { label: 'Status', value: plan.status_name },
                { label: 'Version', value: plan.version_label },
                { label: 'Owner', value: plan.owner_name },
            ],
            cards: [
                { label: 'Annual budget', value: (0, budget_export_util_1.formatIndian)(plan.total_amount) },
                { label: 'CapEx', value: (0, budget_export_util_1.formatIndian)(plan.capex_amount) },
                { label: 'OpEx', value: (0, budget_export_util_1.formatIndian)(plan.opex_amount) },
                { label: 'Consumed', value: (0, budget_export_util_1.formatIndian)(consumedTotal), sub: `${(0, budget_list_util_1.pct)(consumedTotal, plan.total_amount) ?? 0}% of budget` },
                { label: 'Available', value: (0, budget_export_util_1.formatIndian)((0, fy_util_1.roundMoney)(plan.total_amount - consumedTotal)) },
            ],
            sections,
            generatedBy: ctx.userName,
        };
        if (plan.remarks)
            doc.meta.push({ label: 'Remarks', value: plan.remarks });
        await (0, budget_activity_util_1.logBudgetActivity)(this.dataSource, ctx, {
            plan_id: plan.plan_id, entity_type: 'EXPORT', action: 'EXPORTED', description: `${plan.fy_label} plan exported (${format})`,
        });
        return (0, budget_export_util_1.renderExport)(doc, format, 'Budget Lines');
    }
};
exports.BudgetPlanService = BudgetPlanService;
exports.BudgetPlanService = BudgetPlanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], BudgetPlanService);
