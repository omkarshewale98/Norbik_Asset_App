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
var BudgetConsumptionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetConsumptionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const budget_context_1 = require("../common/budget-context");
const budget_activity_util_1 = require("../common/budget-activity.util");
const budget_data_1 = require("../common/budget-data");
const fy_util_1 = require("../common/fy.util");
const budget_list_util_1 = require("../common/budget-list.util");
const budget_export_util_1 = require("../common/budget-export.util");
const r2 = (v) => Math.round(v * 100) / 100;
const versionLabel = (n) => (n > 0 ? `v${n}.0` : '—');
const inRange = (d, p) => d >= p.from && d <= p.to;
let BudgetConsumptionService = BudgetConsumptionService_1 = class BudgetConsumptionService {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async compute(ctx, planId, periodIn) {
        const s = ctx.schema;
        const plan = await (0, budget_data_1.loadPlan)(this.dataSource, s, planId);
        const fy = (0, budget_data_1.planFy)(plan);
        const period = (0, fy_util_1.resolvePeriod)(fy, periodIn);
        const [lines, purchases, manual] = await Promise.all([
            (0, budget_data_1.loadLines)(this.dataSource, s, plan.plan_id),
            (0, budget_data_1.loadPurchases)(this.dataSource, s, [plan.plan_id]),
            (0, budget_data_1.loadManual)(this.dataSource, s, [plan.plan_id]),
        ]);
        return { plan, fy, period, lines, purchases, manual };
    }
    lineFigures(c) {
        const consumedFy = new Map();
        const consumedPeriod = new Map();
        const entries = new Map();
        const add = (m, k, v) => m.set(k, (m.get(k) || 0) + v);
        for (const p of c.purchases) {
            if (!p.line_id)
                continue;
            add(consumedFy, p.line_id, p.amount);
            if (inRange(p.purchase_date, c.period)) {
                add(consumedPeriod, p.line_id, p.amount);
                add(entries, p.line_id, 1);
            }
        }
        for (const m of c.manual) {
            add(consumedFy, m.line_id, m.amount);
            if (inRange(m.entry_date, c.period)) {
                add(consumedPeriod, m.line_id, m.amount);
                add(entries, m.line_id, 1);
            }
        }
        let anyAssumed = false;
        const rows = c.lines.map((l) => {
            const { months, assumed } = (0, budget_data_1.plannedMonths)(l);
            if (assumed && c.period.type !== 'YEAR')
                anyAssumed = true;
            const planned = c.period.type === 'YEAR'
                ? l.annual_amount
                : r2(months.reduce((sum, v, i) => sum + v * c.period.monthWeights[i], 0));
            const cp = r2(consumedPeriod.get(l.line_id) || 0);
            const cf = r2(consumedFy.get(l.line_id) || 0);
            return {
                line_id: l.line_id,
                line_type: l.line_type,
                line_name: l.line_name,
                asset_item_id: l.asset_item_id,
                main_category_name: l.main_category_name,
                sub_category_name: l.sub_category_name,
                budget_category_id: l.budget_category_id,
                budget_category_name: l.budget_category_name,
                budget_category_color: l.budget_category_color,
                ownership_status_type_id: l.ownership_status_type_id,
                ownership_status_type_name: l.ownership_status_type_name,
                expense_nature: l.expense_nature,
                annual_amount: l.annual_amount,
                planned_period: planned,
                consumed_period: cp,
                consumed_fy: cf,
                available_period: r2(planned - cp),
                available_fy: r2(l.annual_amount - cf),
                excess_period: r2(Math.max(0, cp - planned)),
                utilisation_pct: (0, budget_list_util_1.pct)(cp, planned),
                entry_count: entries.get(l.line_id) || 0,
                phasing_assumed: assumed,
            };
        });
        return { rows, anyAssumed };
    }
    async summary(ctx, input) {
        const c = await this.compute(ctx, Number(input?.plan_id), input?.period);
        const { rows, anyAssumed } = this.lineFigures(c);
        const sum = (arr, k) => r2(arr.reduce((a, r) => a + Number(r[k] || 0), 0));
        const capex = rows.filter((r) => r.expense_nature === 'capex');
        const opex = rows.filter((r) => r.expense_nature === 'opex');
        const budget = sum(rows, 'planned_period');
        const consumed = sum(rows, 'consumed_period');
        const unb = c.purchases.filter((p) => !p.line_id && inRange(p.purchase_date, c.period));
        const annual = c.plan.total_amount;
        const consumedFy = sum(rows, 'consumed_fy');
        return {
            status: common_1.HttpStatus.OK,
            message: 'OK',
            data: {
                plan: {
                    plan_id: c.plan.plan_id,
                    fy_code: c.plan.fy_code,
                    fy_label: c.plan.fy_label,
                    fy_start_date: c.plan.fy_start_date,
                    fy_end_date: c.plan.fy_end_date,
                    plan_name: c.plan.plan_name,
                    status_code: c.plan.status_code,
                    status_name: c.plan.status_name,
                    status_color: c.plan.status_color,
                    version_label: versionLabel(c.plan.current_version),
                    owner_name: c.plan.owner_name,
                    phasing_mode: c.plan.phasing_mode,
                    is_locked: c.plan.is_locked,
                    closed_at: c.plan.closed_at,
                    closed_by_name: c.plan.closed_by_name,
                },
                period: { type: c.period.type, index: c.period.index, from: c.period.from, to: c.period.to, label: c.period.label },
                cards: {
                    budget,
                    consumed,
                    available: r2(budget - consumed),
                    excess: r2(Math.max(0, consumed - budget)),
                    utilisation_pct: (0, budget_list_util_1.pct)(consumed, budget),
                    unbudgeted_amount: r2(unb.reduce((a, p) => a + p.amount, 0)),
                    unbudgeted_count: unb.length,
                    capex: {
                        budget: sum(capex, 'planned_period'),
                        consumed: sum(capex, 'consumed_period'),
                        utilisation_pct: (0, budget_list_util_1.pct)(sum(capex, 'consumed_period'), sum(capex, 'planned_period')),
                        share_of_budget_pct: (0, budget_list_util_1.pct)(sum(capex, 'planned_period'), budget),
                    },
                    opex: {
                        budget: sum(opex, 'planned_period'),
                        consumed: sum(opex, 'consumed_period'),
                        utilisation_pct: (0, budget_list_util_1.pct)(sum(opex, 'consumed_period'), sum(opex, 'planned_period')),
                        share_of_budget_pct: (0, budget_list_util_1.pct)(sum(opex, 'planned_period'), budget),
                    },
                },
                annual: {
                    budget: annual,
                    consumed: consumedFy,
                    available: r2(annual - consumedFy),
                    utilisation_pct: (0, budget_list_util_1.pct)(consumedFy, annual),
                },
                phasing_assumed: anyAssumed,
                line_count: rows.length,
            },
        };
    }
    async trend(ctx, input) {
        const c = await this.compute(ctx, Number(input?.plan_id), { type: 'YEAR' });
        const months = (0, fy_util_1.fyMonths)(c.fy);
        const planned = Array(12).fill(0);
        const plannedCapex = Array(12).fill(0);
        const plannedOpex = Array(12).fill(0);
        const consumed = Array(12).fill(0);
        const consumedCapex = Array(12).fill(0);
        const consumedOpex = Array(12).fill(0);
        const unbudgeted = Array(12).fill(0);
        const lineNature = new Map(c.lines.map((l) => [l.line_id, l.expense_nature]));
        let assumed = false;
        for (const l of c.lines) {
            const pm = (0, budget_data_1.plannedMonths)(l);
            if (pm.assumed)
                assumed = true;
            pm.months.forEach((v, i) => {
                planned[i] += v;
                if (l.expense_nature === 'capex')
                    plannedCapex[i] += v;
                if (l.expense_nature === 'opex')
                    plannedOpex[i] += v;
            });
        }
        const addConsumed = (lineId, date, amt) => {
            const i = (0, budget_data_1.monthIndexSafe)(date, c.fy) - 1;
            if (i < 0)
                return;
            if (!lineId) {
                unbudgeted[i] += amt;
                return;
            }
            consumed[i] += amt;
            const n = lineNature.get(lineId);
            if (n === 'capex')
                consumedCapex[i] += amt;
            if (n === 'opex')
                consumedOpex[i] += amt;
        };
        c.purchases.forEach((p) => addConsumed(p.line_id, p.purchase_date, p.amount));
        c.manual.forEach((m) => addConsumed(m.line_id, m.entry_date, m.amount));
        const today = (0, fy_util_1.todayYmd)();
        let cp = 0;
        let cc = 0;
        const series = months.map((m, i) => {
            cp += planned[i];
            cc += consumed[i];
            const prev = i > 0 ? consumed[i - 1] : null;
            return {
                index: m.index,
                label: m.label,
                short: m.short,
                start: m.start,
                end: m.end,
                is_future: m.start > today,
                planned: r2(planned[i]),
                planned_capex: r2(plannedCapex[i]),
                planned_opex: r2(plannedOpex[i]),
                consumed: r2(consumed[i]),
                consumed_capex: r2(consumedCapex[i]),
                consumed_opex: r2(consumedOpex[i]),
                unbudgeted: r2(unbudgeted[i]),
                cumulative_planned: r2(cp),
                cumulative_consumed: r2(cc),
                change_vs_prev_pct: prev && prev > 0 ? Math.round(((consumed[i] - prev) / prev) * 1000) / 10 : null,
            };
        });
        return { status: common_1.HttpStatus.OK, message: 'OK', data: { fy_label: c.fy.label, phasing_assumed: assumed, months: series } };
    }
    async lines(ctx, input) {
        const c = await this.compute(ctx, Number(input?.plan_id), input?.period);
        let { rows } = this.lineFigures(c);
        const q = (0, budget_list_util_1.searchText)(input);
        if (q) {
            rows = rows.filter((r) => [r.line_name, r.budget_category_name, r.ownership_status_type_name, r.sub_category_name, r.main_category_name]
                .some((v) => String(v || '').toLowerCase().includes(q)));
        }
        const nature = (0, budget_list_util_1.filterValues)(input, 'expense_nature').map((v) => v.toLowerCase());
        if (nature.length)
            rows = rows.filter((r) => nature.includes(String(r.expense_nature).toLowerCase()));
        const cats = (0, budget_list_util_1.filterValues)(input, 'budget_category_id').map(Number);
        if (cats.length)
            rows = rows.filter((r) => cats.includes(r.budget_category_id));
        const own = (0, budget_list_util_1.filterValues)(input, 'ownership_status_type_id').map(Number);
        if (own.length)
            rows = rows.filter((r) => own.includes(r.ownership_status_type_id));
        const types = (0, budget_list_util_1.filterValues)(input, 'line_type').map((v) => v.toUpperCase());
        if (types.length)
            rows = rows.filter((r) => types.includes(r.line_type));
        const band = (0, budget_list_util_1.filterValues)(input, 'utilisation_band');
        if (band.length) {
            rows = rows.filter((r) => {
                const u = r.utilisation_pct ?? 0;
                return band.some((b) => (b === 'under80' && u < 80) || (b === '80to100' && u >= 80 && u <= 100) || (b === 'over100' && u > 100));
            });
        }
        const { data, meta } = (0, budget_list_util_1.paginate)(rows, input, { column: 'line_name', order: 'ASC' }, [
            'line_name', 'budget_category_name', 'ownership_status_type_name', 'expense_nature', 'annual_amount',
            'planned_period', 'consumed_period', 'consumed_fy', 'available_period', 'available_fy', 'utilisation_pct', 'entry_count',
        ]);
        return { success: true, message: 'OK', data, meta };
    }
    async lineDetails(ctx, input) {
        const s = ctx.schema;
        const c = await this.compute(ctx, Number(input?.plan_id), input?.period);
        const line = c.lines.find((l) => l.line_id === Number(input?.line_id));
        if (!line)
            throw new budget_context_1.BudgetError('BUD_LINE_NOT_FOUND', 'Budget line not found in this plan.');
        const fig = this.lineFigures(c).rows.find((r) => r.line_id === line.line_id);
        const purchases = c.purchases.filter((p) => p.line_id === line.line_id && inRange(p.purchase_date, c.period));
        const procIds = purchases.map((p) => p.procurement_id);
        const serials = procIds.length
            ? await this.dataSource.query(`SELECT pi.procurement_id, s.asset_stocks_unique_id, s.asset_id, s.stock_id, s.system_code, s.asset_serial_title,
                  s.stock_serials, s.cost_center_id, cc.cost_center_name, cc.cost_center_code,
                  s.project_id, pr.project_name, pr.project_code,
                  st.status_type_name, st.status_color_code
             FROM ${(0, budget_context_1.T)(s, 'asset_procurement_items')} pi
             JOIN ${(0, budget_context_1.T)(s, 'asset_stock_serials')} s
               ON s.procurement_item_id = pi.procurement_item_id AND COALESCE(s.is_deleted, 0) = 0
             LEFT JOIN ${(0, budget_context_1.T)(s, 'asset_cost_centers')} cc ON cc.cost_center_id = s.cost_center_id
             LEFT JOIN ${(0, budget_context_1.T)(s, 'asset_project')} pr ON pr.project_id = s.project_id
             LEFT JOIN ${(0, budget_context_1.T)(s, 'asset_status_types')} st ON st.status_type_id = s.current_status_id
            WHERE pi.procurement_id = ANY($1::bigint[])
            ORDER BY s.asset_stocks_unique_id`, [procIds])
            : [];
        const byProc = new Map();
        for (const sr of serials) {
            const k = Number(sr.procurement_id);
            if (!byProc.has(k))
                byProc.set(k, []);
            byProc.get(k).push(sr);
        }
        const assets = [];
        for (const p of purchases) {
            const units = byProc.get(p.procurement_id) || [];
            if (!units.length) {
                assets.push({
                    key: `p${p.procurement_id}`,
                    procurement_id: p.procurement_id,
                    asset_id: p.asset_id,
                    asset_stocks_unique_id: p.first_serial_id,
                    stock_id: p.stock_id,
                    system_code: null,
                    asset_title: p.asset_item_name,
                    purchase_date: p.purchase_date,
                    invoice_no: p.invoice_no || p.bill_no,
                    vendor_name: p.vendor_name,
                    ownership_status_type_name: p.ownership_status_type_name,
                    expense_nature: p.ownership_nature || 'NA',
                    cost_center_name: null,
                    project_name: null,
                    status_name: null,
                    status_color: null,
                    is_renewal: p.is_renewal,
                    date_assumed: p.date_assumed,
                    amount: p.amount,
                });
                continue;
            }
            const base = Math.floor((p.amount * 100) / units.length) / 100;
            units.forEach((u, i) => {
                assets.push({
                    key: `s${u.asset_stocks_unique_id}`,
                    procurement_id: p.procurement_id,
                    asset_id: Number(u.asset_id),
                    asset_stocks_unique_id: Number(u.asset_stocks_unique_id),
                    stock_id: u.stock_id !== null && u.stock_id !== undefined ? Number(u.stock_id) : p.stock_id,
                    system_code: u.system_code,
                    asset_title: u.asset_serial_title || p.asset_item_name,
                    serial_number: u.stock_serials,
                    purchase_date: p.purchase_date,
                    invoice_no: p.invoice_no || p.bill_no,
                    vendor_name: p.vendor_name,
                    ownership_status_type_name: p.ownership_status_type_name,
                    expense_nature: p.ownership_nature || 'NA',
                    cost_center_name: u.cost_center_name ? `${u.cost_center_name}${u.cost_center_code ? ` (${u.cost_center_code})` : ''}` : null,
                    project_name: u.project_name ? `${u.project_name}${u.project_code ? ` (${u.project_code})` : ''}` : null,
                    status_name: u.status_type_name,
                    status_color: u.status_color_code,
                    is_renewal: p.is_renewal,
                    date_assumed: p.date_assumed,
                    amount: i === units.length - 1 ? r2(p.amount - base * (units.length - 1)) : base,
                });
            });
        }
        const manual = c.manual.filter((m) => m.line_id === line.line_id && inRange(m.entry_date, c.period));
        const { months: pm, assumed } = (0, budget_data_1.plannedMonths)(line);
        const consumedMonths = Array(12).fill(0);
        purchases.forEach((p) => {
            const i = (0, budget_data_1.monthIndexSafe)(p.purchase_date, c.fy) - 1;
            if (i >= 0)
                consumedMonths[i] += p.amount;
        });
        c.manual.filter((m) => m.line_id === line.line_id).forEach((m) => {
            const i = (0, budget_data_1.monthIndexSafe)(m.entry_date, c.fy) - 1;
            if (i >= 0 && inRange(m.entry_date, c.period))
                consumedMonths[i] += m.amount;
        });
        const months = (0, fy_util_1.fyMonths)(c.fy).map((m, i) => ({
            index: m.index, label: m.label, short: m.short,
            in_period: c.period.monthWeights[i] > 0,
            planned: r2(pm[i]),
            consumed: r2(consumedMonths[i]),
        }));
        return {
            status: common_1.HttpStatus.OK,
            message: 'OK',
            data: {
                line: { ...fig, quantity: line.quantity, unit_estimate: line.unit_estimate, justification: line.justification },
                period: { type: c.period.type, from: c.period.from, to: c.period.to, label: c.period.label },
                phasing_assumed: assumed,
                months,
                assets,
                manual_entries: manual,
                plan_locked: c.plan.is_locked,
            },
        };
    }
    async unbudgetedRows(ctx, input) {
        const c = await this.compute(ctx, Number(input?.plan_id), input?.period);
        let rows = c.purchases
            .filter((p) => !p.line_id && inRange(p.purchase_date, c.period))
            .map((p) => ({
            procurement_id: p.procurement_id,
            asset_id: p.asset_id,
            stock_id: p.stock_id,
            asset_stocks_unique_id: p.first_serial_id,
            asset_item_id: p.asset_item_id,
            asset_item_name: p.asset_item_name,
            ownership_status_type_name: p.ownership_status_type_name,
            expense_nature: p.ownership_nature,
            purchase_date: p.purchase_date,
            invoice_no: p.invoice_no || p.bill_no,
            vendor_name: p.vendor_name,
            is_renewal: p.is_renewal,
            date_assumed: p.date_assumed,
            amount: p.amount,
            reason: c.lines.some((l) => l.asset_item_id === p.asset_item_id)
                ? 'Item is budgeted more than once with other ownership types'
                : 'Item is not in the budget',
        }));
        const q = (0, budget_list_util_1.searchText)(input);
        if (q) {
            rows = rows.filter((r) => [r.asset_item_name, r.vendor_name, r.invoice_no].some((v) => String(v || '').toLowerCase().includes(q)));
        }
        const nature = (0, budget_list_util_1.filterValues)(input, 'expense_nature').map((v) => v.toLowerCase());
        if (nature.length)
            rows = rows.filter((r) => nature.includes(String(r.expense_nature || 'na').toLowerCase()));
        return { c, rows };
    }
    async unbudgeted(ctx, input) {
        const { c, rows } = await this.unbudgetedRows(ctx, input);
        const { data, meta } = (0, budget_list_util_1.paginate)(rows, input, { column: 'purchase_date', order: 'DESC' }, BudgetConsumptionService_1.UNB_SORT);
        const sumBy = (n) => r2(rows.filter((r) => (n ? r.expense_nature === n : true)).reduce((a, r) => a + r.amount, 0));
        return {
            success: true,
            message: 'OK',
            data,
            meta,
            totals: {
                purchases: rows.length,
                items: new Set(rows.map((r) => r.asset_item_id)).size,
                amount: sumBy(null),
                capex_amount: sumBy('capex'),
                opex_amount: sumBy('opex'),
            },
            period: c.period,
            plan: { plan_id: c.plan.plan_id, fy_label: c.plan.fy_label, fy_start_date: c.plan.fy_start_date, fy_end_date: c.plan.fy_end_date },
        };
    }
    async exportUnbudgeted(ctx, input) {
        const format = (0, budget_export_util_1.exportFormat)(input?.format);
        const { c, rows } = await this.unbudgetedRows(ctx, input);
        const sorted = (0, budget_list_util_1.paginate)(rows, { ...input, page: 1, all: true }, { column: 'purchase_date', order: 'DESC' }, BudgetConsumptionService_1.UNB_SORT).data;
        const nature = (n) => (n === 'capex' ? 'CapEx' : n === 'opex' ? 'OpEx' : 'NA');
        const all = [
            { key: 'purchase_date', label: 'Purchase Date', width: 1 },
            { key: 'asset_item_name', label: 'Item', width: 1.8 },
            { key: 'ownership_status_type_name', label: 'Ownership Type', width: 1.1 },
            { key: 'nature', label: 'CapEx / OpEx', width: 0.8 },
            { key: 'vendor_name', label: 'Vendor', width: 1.4 },
            { key: 'invoice_no', label: 'Invoice / Bill', width: 1.1 },
            { key: 'reason', label: 'Why Unbudgeted', width: 2 },
            { key: 'amount', label: 'Amount (incl. GST)', width: 1.1, money: true },
        ];
        const total = r2(sorted.reduce((a, r) => a + r.amount, 0));
        const doc = {
            title: `Unbudgeted Spend Report (${c.plan.fy_label})`,
            orgName: await (0, budget_data_1.orgName)(this.dataSource, ctx.schema),
            meta: [{ label: 'Period', value: `${c.period.label} (${c.period.from} to ${c.period.to})` }],
            cards: [
                { label: 'Purchases', value: String(sorted.length) },
                { label: 'Unbudgeted spend', value: (0, budget_export_util_1.formatIndian)(total) },
            ],
            sections: [{
                    columns: (0, budget_export_util_1.pickColumns)(all, input?.visible_columns, input?.column_order, [], { expense_nature: 'nature' }),
                    rows: [...sorted.map((r) => ({ ...r, nature: nature(r.expense_nature) })), { asset_item_name: 'Total', amount: total, __bold: true }],
                }],
            generatedBy: ctx.userName,
        };
        await (0, budget_activity_util_1.logBudgetActivity)(this.dataSource, ctx, {
            plan_id: c.plan.plan_id, entity_type: 'EXPORT', action: 'EXPORTED',
            description: `Unbudgeted spend report exported (${format}, ${sorted.length} row(s))`,
        });
        return (0, budget_export_util_1.renderExport)(doc, format, 'Unbudgeted Spend');
    }
    async manualList(ctx, input) {
        const plan = await (0, budget_data_1.loadPlan)(this.dataSource, ctx.schema, Number(input?.plan_id));
        const period = (0, fy_util_1.resolvePeriod)((0, budget_data_1.planFy)(plan), input?.period);
        const lines = await (0, budget_data_1.loadLines)(this.dataSource, ctx.schema, plan.plan_id, true);
        const names = new Map(lines.map((l) => [l.line_id, l]));
        let rows = (await (0, budget_data_1.loadManual)(this.dataSource, ctx.schema, [plan.plan_id], period.from, period.to, input?.line_id ? Number(input.line_id) : null))
            .map((m) => ({
            ...m,
            line_name: names.get(m.line_id)?.line_name || '',
            budget_category_name: names.get(m.line_id)?.budget_category_name || '',
            expense_nature: names.get(m.line_id)?.expense_nature || '',
        }));
        const q = (0, budget_list_util_1.searchText)(input);
        if (q) {
            rows = rows.filter((r) => [r.line_name, r.description, r.reference_no, r.vendor_name].some((v) => String(v || '').toLowerCase().includes(q)));
        }
        const { data, meta } = (0, budget_list_util_1.paginate)(rows, input, { column: 'entry_date', order: 'DESC' }, [
            'entry_date', 'line_name', 'amount', 'vendor_name', 'created_by_name',
        ]);
        return { success: true, message: 'OK', data, meta };
    }
    async validateManual(ctx, input) {
        const plan = await (0, budget_data_1.loadPlan)(this.dataSource, ctx.schema, Number(input?.plan_id));
        if (plan.is_locked) {
            throw new budget_context_1.BudgetError('BUD_FY_LOCKED', `${plan.fy_label} is locked. Manual entries cannot be changed.`);
        }
        if (plan.status_code === budget_data_1.STATUS.DRAFT) {
            throw new budget_context_1.BudgetError('BUD_IS_DRAFT', 'Publish the budget before recording consumption against it.');
        }
        const line = (await (0, budget_data_1.loadLines)(this.dataSource, ctx.schema, plan.plan_id)).find((l) => l.line_id === Number(input.line_id));
        if (!line)
            throw new budget_context_1.BudgetError('BUD_LINE_NOT_FOUND', 'Select an active budget line of this plan.');
        const date = String(input.entry_date || '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < plan.fy_start_date || date > plan.fy_end_date) {
            throw new budget_context_1.BudgetError('BUD_ENTRY_DATE', `Entry date must be within ${plan.fy_label} (${plan.fy_start_date} to ${plan.fy_end_date}).`);
        }
        const amount = (0, fy_util_1.roundMoney)(Number(input.amount));
        if (!Number.isFinite(amount) || amount <= 0 || amount > 999999999999.99) {
            throw new budget_context_1.BudgetError('BUD_ENTRY_AMOUNT', 'Amount (GST inclusive) must be greater than 0.');
        }
        let gst = null;
        if (input.gst_amount !== null && input.gst_amount !== undefined && String(input.gst_amount) !== '') {
            gst = (0, fy_util_1.roundMoney)(Number(input.gst_amount));
            if (!Number.isFinite(gst) || gst < 0 || gst > amount) {
                throw new budget_context_1.BudgetError('BUD_ENTRY_GST', 'GST amount must be between 0 and the total amount.');
            }
        }
        const description = String(input.description || '').trim();
        if (description.length < 3 || description.length > 250) {
            throw new budget_context_1.BudgetError('BUD_ENTRY_DESC', 'Description must be 3 to 250 characters.');
        }
        const reference = input.reference_no ? String(input.reference_no).trim() : null;
        if (reference && reference.length > 100)
            throw new budget_context_1.BudgetError('BUD_ENTRY_REF', 'Reference can be at most 100 characters.');
        let vendor = null;
        if (input.vendor_id) {
            vendor = Number(input.vendor_id);
            const v = await this.dataSource.query(`SELECT 1 FROM ${(0, budget_context_1.T)(ctx.schema, 'vendors')} WHERE vendor_id = $1 AND COALESCE(is_deleted,0) = 0`, [vendor]);
            if (!v.length)
                throw new budget_context_1.BudgetError('BUD_ENTRY_VENDOR', 'Select a valid vendor.');
        }
        return { plan, line, date, amount, gst, description, reference, vendor };
    }
    async manualCreate(ctx, input) {
        const v = await this.validateManual(ctx, input);
        const rows = await this.dataSource.query(`INSERT INTO ${(0, budget_context_1.T)(ctx.schema, 'budget_manual_entries')}
         (plan_id, line_id, entry_date, amount, gst_amount, description, vendor_id, reference_no, created_by, updated_by)
       VALUES ($1,$2,$3::date,$4,$5,$6,$7,$8,$9,$9) RETURNING entry_id`, [v.plan.plan_id, v.line.line_id, v.date, v.amount, v.gst, v.description, v.vendor, v.reference, ctx.userId]);
        await (0, budget_activity_util_1.logBudgetActivity)(this.dataSource, ctx, {
            plan_id: v.plan.plan_id, entity_type: 'MANUAL_ENTRY', entity_id: Number(rows[0].entry_id), action: 'CREATED',
            description: `Manual entry ₹${(0, budget_export_util_1.formatIndian)(v.amount)} on ${v.date} for '${v.line.line_name}': ${v.description}`,
        });
        return { status: common_1.HttpStatus.CREATED, message: 'Manual entry added.', data: { entry_id: Number(rows[0].entry_id) } };
    }
    async manualUpdate(ctx, input) {
        const id = Number(input?.entry_id);
        const before = await this.dataSource.query(`SELECT * FROM ${(0, budget_context_1.T)(ctx.schema, 'budget_manual_entries')} WHERE entry_id = $1 AND is_deleted = 0`, [id]);
        if (!before.length)
            throw new budget_context_1.BudgetError('BUD_ENTRY_NOT_FOUND', 'Manual entry not found.');
        if (Number(before[0].plan_id) !== Number(input.plan_id)) {
            throw new budget_context_1.BudgetError('BUD_ENTRY_PLAN', 'A manual entry cannot be moved to another financial year.');
        }
        const v = await this.validateManual(ctx, input);
        await this.dataSource.query(`UPDATE ${(0, budget_context_1.T)(ctx.schema, 'budget_manual_entries')}
          SET line_id = $1, entry_date = $2::date, amount = $3, gst_amount = $4, description = $5,
              vendor_id = $6, reference_no = $7, updated_by = $8, updated_at = now()
        WHERE entry_id = $9`, [v.line.line_id, v.date, v.amount, v.gst, v.description, v.vendor, v.reference, ctx.userId, id]);
        await (0, budget_activity_util_1.logBudgetActivity)(this.dataSource, ctx, {
            plan_id: v.plan.plan_id, entity_type: 'MANUAL_ENTRY', entity_id: id, action: 'UPDATED',
            description: `Manual entry updated: ₹${(0, budget_export_util_1.formatIndian)(v.amount)} on ${v.date} for '${v.line.line_name}'`,
            before: before[0],
        });
        return { status: common_1.HttpStatus.OK, message: 'Manual entry updated.' };
    }
    async manualDelete(ctx, input) {
        const id = Number(input?.entry_id);
        const rows = await this.dataSource.query(`SELECT me.*, p.is_locked, p.fy_label FROM ${(0, budget_context_1.T)(ctx.schema, 'budget_manual_entries')} me
         JOIN ${(0, budget_context_1.T)(ctx.schema, 'budget_plans')} p ON p.plan_id = me.plan_id
        WHERE me.entry_id = $1 AND me.is_deleted = 0`, [id]);
        if (!rows.length)
            throw new budget_context_1.BudgetError('BUD_ENTRY_NOT_FOUND', 'Manual entry not found.');
        if (rows[0].is_locked)
            throw new budget_context_1.BudgetError('BUD_FY_LOCKED', `${rows[0].fy_label} is locked.`);
        await this.dataSource.query(`UPDATE ${(0, budget_context_1.T)(ctx.schema, 'budget_manual_entries')} SET is_deleted = 1, updated_by = $1, updated_at = now()
        WHERE entry_id = $2`, [ctx.userId, id]);
        await (0, budget_activity_util_1.logBudgetActivity)(this.dataSource, ctx, {
            plan_id: Number(rows[0].plan_id), entity_type: 'MANUAL_ENTRY', entity_id: id, action: 'DELETED',
            description: `Manual entry of ₹${(0, budget_export_util_1.formatIndian)(Number(rows[0].amount))} deleted`, before: rows[0],
        });
        return { status: common_1.HttpStatus.OK, message: 'Manual entry deleted.' };
    }
    async export(ctx, input) {
        const format = (0, budget_export_util_1.exportFormat)(input?.format);
        const summary = (await this.summary(ctx, input)).data;
        const lines = (0, budget_export_util_1.applySelection)((await this.lines(ctx, { ...input, page: 1, all: true })).data, input, 'line_id');
        const k = summary.cards;
        const all = [
            { key: 'line_name', label: 'Budget Item', width: 2 },
            { key: 'budget_category_name', label: 'Budget Category', width: 1.5 },
            { key: 'ownership_status_type_name', label: 'Ownership', width: 1 },
            { key: 'annual_amount', label: 'Annual Budget', width: 1.1, money: true },
            { key: 'planned_period', label: 'Budget (Period)', width: 1.1, money: true },
            { key: 'consumed_period', label: 'Consumed (Period)', width: 1.1, money: true },
            { key: 'available_period', label: 'Available (Period)', width: 1.1, money: true },
            { key: 'consumed_fy', label: 'Consumed (FY)', width: 1.1, money: true },
            { key: 'utilisation_pct', label: 'Utilisation', width: 0.8, percent: true },
        ];
        const columns = (0, budget_export_util_1.pickColumns)(all, input?.visible_columns, input?.column_order, ['line_name']);
        const nature = (n) => (n === 'capex' ? 'CapEx' : n === 'opex' ? 'OpEx' : 'NA');
        const doc = {
            title: `IT Budget — Consumption & Trend (${summary.plan.fy_label})`,
            subtitle: summary.plan.plan_name,
            orgName: await (0, budget_data_1.orgName)(this.dataSource, ctx.schema),
            meta: [
                { label: 'Period', value: `${summary.period.label} (${summary.period.from} to ${summary.period.to})` },
                { label: 'Status', value: summary.plan.status_name },
                { label: 'Version', value: summary.plan.version_label },
            ],
            cards: [
                { label: 'Budget', value: (0, budget_export_util_1.formatIndian)(k.budget), sub: summary.phasing_assumed ? 'Unphased lines spread equally' : undefined },
                { label: 'Consumed', value: (0, budget_export_util_1.formatIndian)(k.consumed), sub: `${k.utilisation_pct ?? 0}% of budget` },
                { label: 'Available', value: (0, budget_export_util_1.formatIndian)(k.available) },
                { label: 'Excess', value: (0, budget_export_util_1.formatIndian)(k.excess) },
                { label: 'CapEx', value: (0, budget_export_util_1.formatIndian)(k.capex.consumed), sub: `of ${(0, budget_export_util_1.formatIndian)(k.capex.budget)} (${k.capex.utilisation_pct ?? 0}%)` },
                { label: 'OpEx', value: (0, budget_export_util_1.formatIndian)(k.opex.consumed), sub: `of ${(0, budget_export_util_1.formatIndian)(k.opex.budget)} (${k.opex.utilisation_pct ?? 0}%)` },
            ],
            sections: [
                {
                    title: 'Budget lines',
                    columns,
                    rows: [
                        ...lines.map((l) => ({ ...l, nature: nature(l.expense_nature) })),
                        {
                            line_name: 'Total', __bold: true,
                            annual_amount: r2(lines.reduce((a, l) => a + l.annual_amount, 0)),
                            planned_period: r2(lines.reduce((a, l) => a + l.planned_period, 0)),
                            consumed_period: r2(lines.reduce((a, l) => a + l.consumed_period, 0)),
                            available_period: r2(lines.reduce((a, l) => a + l.available_period, 0)),
                            consumed_fy: r2(lines.reduce((a, l) => a + l.consumed_fy, 0)),
                        },
                    ],
                },
            ],
            generatedBy: ctx.userName,
        };
        await (0, budget_activity_util_1.logBudgetActivity)(this.dataSource, ctx, {
            plan_id: summary.plan.plan_id, entity_type: 'EXPORT', action: 'EXPORTED',
            description: `Consumption & Trend exported (${format}, ${summary.period.label}, ${lines.length} line(s))`,
        });
        return (0, budget_export_util_1.renderExport)(doc, format, 'Budget Lines');
    }
};
exports.BudgetConsumptionService = BudgetConsumptionService;
BudgetConsumptionService.UNB_SORT = ['asset_item_name', 'purchase_date', 'amount', 'vendor_name', 'ownership_status_type_name', 'invoice_no', 'reason'];
exports.BudgetConsumptionService = BudgetConsumptionService = BudgetConsumptionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], BudgetConsumptionService);
