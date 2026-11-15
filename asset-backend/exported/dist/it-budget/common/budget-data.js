"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATUS = void 0;
exports.orgFyStartMonth = orgFyStartMonth;
exports.orgName = orgName;
exports.planSelect = planSelect;
exports.normalisePlan = normalisePlan;
exports.loadPlan = loadPlan;
exports.planFy = planFy;
exports.loadLines = loadLines;
exports.plannedMonths = plannedMonths;
exports.loadPurchases = loadPurchases;
exports.loadManual = loadManual;
exports.consumedByPlan = consumedByPlan;
exports.consumedByLine = consumedByLine;
exports.monthIndexSafe = monthIndexSafe;
const budget_context_1 = require("./budget-context");
const fy_util_1 = require("./fy.util");
const budget_list_util_1 = require("./budget-list.util");
exports.STATUS = { DRAFT: 10, SCHEDULED: 20, CURRENT: 30, CLOSED: 40 };
async function orgFyStartMonth(runner, schema) {
    const rows = await runner.query(`SELECT financial_year FROM ${(0, budget_context_1.T)(schema, 'organizational_profile')} ORDER BY 1 NULLS LAST LIMIT 1`);
    const pattern = rows[0]?.financial_year || 'April-March';
    return { startMonth: (0, fy_util_1.fyStartMonth)(pattern), pattern };
}
async function orgName(runner, schema) {
    try {
        const rows = await runner.query(`SELECT org_name FROM ${(0, budget_context_1.T)(schema, 'organizational_profile')} LIMIT 1`);
        return rows[0]?.org_name || '';
    }
    catch {
        return '';
    }
}
function planSelect(schema) {
    return `
    SELECT p.plan_id, p.fy_code, p.fy_label, p.fy_start_date::text AS fy_start_date,
           p.fy_end_date::text AS fy_end_date, p.fy_pattern, p.plan_name, p.owner_user_id,
           TRIM(CONCAT(COALESCE(ow.first_name,''), ' ', COALESCE(ow.last_name,''))) AS owner_name,
           p.status_code, st.status_key, st.status_name, st.status_color,
           p.current_version, p.phasing_mode, p.phasing_method,
           p.total_amount, p.capex_amount, p.opex_amount, p.remarks, p.is_locked,
           p.published_at, TRIM(CONCAT(COALESCE(pb.first_name,''), ' ', COALESCE(pb.last_name,''))) AS published_by_name,
           p.set_current_at, p.closed_at,
           TRIM(CONCAT(COALESCE(cb.first_name,''), ' ', COALESCE(cb.last_name,''))) AS closed_by_name,
           p.lock_version, p.created_at,
           TRIM(CONCAT(COALESCE(cr.first_name,''), ' ', COALESCE(cr.last_name,''))) AS created_by_name,
           p.updated_at,
           TRIM(CONCAT(COALESCE(ub.first_name,''), ' ', COALESCE(ub.last_name,''))) AS updated_by_name
      FROM ${(0, budget_context_1.T)(schema, 'budget_plans')} p
      JOIN ${(0, budget_context_1.T)(schema, 'budget_plan_statuses')} st ON st.status_code = p.status_code
      LEFT JOIN ${(0, budget_context_1.T)(schema, 'users')} ow ON ow.user_id = p.owner_user_id
      LEFT JOIN ${(0, budget_context_1.T)(schema, 'users')} pb ON pb.user_id = p.published_by
      LEFT JOIN ${(0, budget_context_1.T)(schema, 'users')} cb ON cb.user_id = p.closed_by
      LEFT JOIN ${(0, budget_context_1.T)(schema, 'users')} cr ON cr.user_id = p.created_by
      LEFT JOIN ${(0, budget_context_1.T)(schema, 'users')} ub ON ub.user_id = p.updated_by
     WHERE p.is_deleted = 0`;
}
function normalisePlan(r) {
    return {
        ...r,
        plan_id: Number(r.plan_id),
        owner_user_id: Number(r.owner_user_id),
        status_code: Number(r.status_code),
        current_version: Number(r.current_version),
        total_amount: (0, budget_list_util_1.num)(r.total_amount),
        capex_amount: (0, budget_list_util_1.num)(r.capex_amount),
        opex_amount: (0, budget_list_util_1.num)(r.opex_amount),
        lock_version: Number(r.lock_version),
    };
}
async function loadPlan(runner, schema, planId) {
    if (!Number.isInteger(Number(planId)) || Number(planId) <= 0) {
        throw new budget_context_1.BudgetError('BUD_PLAN_NOT_FOUND', 'Budget plan not found');
    }
    const rows = await runner.query(`${planSelect(schema)} AND p.plan_id = $1`, [Number(planId)]);
    if (!rows.length)
        throw new budget_context_1.BudgetError('BUD_PLAN_NOT_FOUND', 'Budget plan not found');
    return normalisePlan(rows[0]);
}
function planFy(plan) {
    const y = Number(plan.fy_start_date.slice(0, 4));
    const m = Number(plan.fy_start_date.slice(5, 7));
    return (0, fy_util_1.fyForStartYear)(y, m);
}
async function loadLines(runner, schema, planId, includeInactive = false) {
    const rows = await runner.query(`SELECT l.line_id, l.plan_id, l.line_type, l.asset_item_id, l.service_name,
            COALESCE(ai.asset_item_name, l.service_name) AS line_name,
            mc.main_category_name, sc.sub_category_name,
            l.budget_category_id, bc.budget_category_name, bc.budget_category_color,
            l.ownership_status_type_id, ost.ownership_status_type_name,
            ost.asset_ownership_status_color AS ownership_color,
            l.expense_nature, l.annual_amount, l.quantity, l.unit_estimate, l.justification,
            l.sort_order, l.is_active, l.added_in_version, l.removed_in_version
       FROM ${(0, budget_context_1.T)(schema, 'budget_lines')} l
       LEFT JOIN ${(0, budget_context_1.T)(schema, 'asset_items')} ai ON ai.asset_item_id = l.asset_item_id
       LEFT JOIN ${(0, budget_context_1.T)(schema, 'asset_main_category')} mc ON mc.main_category_id = ai.main_category_id
       LEFT JOIN ${(0, budget_context_1.T)(schema, 'asset_sub_category')} sc ON sc.sub_category_id = ai.sub_category_id
       LEFT JOIN ${(0, budget_context_1.T)(schema, 'budget_categories')} bc ON bc.budget_category_id = l.budget_category_id
       LEFT JOIN ${(0, budget_context_1.T)(schema, 'asset_ownership_status_types')} ost
              ON ost.ownership_status_type_id = l.ownership_status_type_id
      WHERE l.plan_id = $1 ${includeInactive ? '' : 'AND l.is_active = 1'}
      ORDER BY l.sort_order, l.line_id`, [planId]);
    const ids = rows.map((r) => Number(r.line_id));
    const phasing = ids.length
        ? await runner.query(`SELECT line_id, fy_month_index, amount FROM ${(0, budget_context_1.T)(schema, 'budget_line_phasing')}
          WHERE line_id = ANY($1::bigint[]) ORDER BY line_id, fy_month_index`, [ids])
        : [];
    const byLine = new Map();
    for (const p of phasing) {
        const id = Number(p.line_id);
        if (!byLine.has(id))
            byLine.set(id, Array(12).fill(0));
        byLine.get(id)[Number(p.fy_month_index) - 1] = (0, budget_list_util_1.num)(p.amount);
    }
    return rows.map((r) => ({
        ...r,
        line_id: Number(r.line_id),
        plan_id: Number(r.plan_id),
        asset_item_id: r.asset_item_id === null ? null : Number(r.asset_item_id),
        budget_category_id: Number(r.budget_category_id),
        ownership_status_type_id: Number(r.ownership_status_type_id),
        annual_amount: (0, budget_list_util_1.num)(r.annual_amount),
        quantity: r.quantity === null ? null : Number(r.quantity),
        unit_estimate: r.unit_estimate === null ? null : (0, budget_list_util_1.num)(r.unit_estimate),
        sort_order: Number(r.sort_order),
        is_active: Number(r.is_active),
        added_in_version: r.added_in_version === null ? null : Number(r.added_in_version),
        removed_in_version: r.removed_in_version === null ? null : Number(r.removed_in_version),
        phasing_months: byLine.get(Number(r.line_id)) || [],
    }));
}
function plannedMonths(line) {
    if (line.phasing_months?.length === 12)
        return { months: line.phasing_months, assumed: false };
    return { months: (0, fy_util_1.equalSplit)(line.annual_amount, 12), assumed: true };
}
async function loadPurchases(runner, schema, planIds, from, to) {
    if (!planIds.length)
        return [];
    const rows = await runner.query(`WITH pl AS (
        SELECT plan_id,
               GREATEST(fy_start_date, COALESCE($2::date, fy_start_date)) AS d_from,
               LEAST(fy_end_date, COALESCE($3::date, fy_end_date))       AS d_to
          FROM ${(0, budget_context_1.T)(schema, 'budget_plans')}
         WHERE plan_id = ANY($1::bigint[])
     ),
     ln AS (
        SELECT line_id, plan_id, asset_item_id, ownership_status_type_id
          FROM ${(0, budget_context_1.T)(schema, 'budget_lines')}
         WHERE plan_id = ANY($1::bigint[]) AND is_active = 1 AND line_type = 'ITEM'
     ),
     lc AS (
        SELECT plan_id, asset_item_id, COUNT(*) AS c, MIN(line_id) AS only_line
          FROM ln GROUP BY plan_id, asset_item_id
     ),
     pur AS (
        SELECT pl.plan_id, p.procurement_id, p.asset_id, a.asset_item_id, p.ownership_status_id,
               -- purchase date; assets saved without one fall back to the date they were added
               COALESCE(p.purchase_date, p.created_at::date)::text AS purchase_date,
               (p.purchase_date IS NULL) AS date_assumed,
               ROUND(COALESCE(p.total_amount,
                              COALESCE(p.total_without_gst, 0) + COALESCE(p.gst_amount, 0),
                              0)::numeric, 2) AS amount,
               p.invoice_no, p.bill_no, p.vendor_id, p.stock_id,
               (SELECT MIN(ss.asset_stocks_unique_id)
                  FROM ${(0, budget_context_1.T)(schema, 'asset_procurement_items')} pi2
                  JOIN ${(0, budget_context_1.T)(schema, 'asset_stock_serials')} ss
                    ON ss.procurement_item_id = pi2.procurement_item_id AND COALESCE(ss.is_deleted, 0) = 0
                 WHERE pi2.procurement_id = p.procurement_id) AS first_serial_id,
               (p.previous_procurement_id IS NOT NULL) AS is_renewal
          FROM pl
          JOIN ${(0, budget_context_1.T)(schema, 'asset_procurements')} p
            ON COALESCE(p.purchase_date, p.created_at::date) BETWEEN pl.d_from AND pl.d_to
          JOIN ${(0, budget_context_1.T)(schema, 'assets')} a
            ON a.asset_id = p.asset_id AND COALESCE(a.asset_is_deleted, 0) = 0
     )
     SELECT pur.*,
            COALESCE(ex.line_id, CASE WHEN lc.c = 1 THEN lc.only_line END) AS line_id,
            ai.asset_item_name, v.vendor_name,
            ost.ownership_status_type_name, ost.ownership_status_type::text AS ownership_nature
       FROM pur
       LEFT JOIN ln ex ON ex.plan_id = pur.plan_id
                      AND ex.asset_item_id = pur.asset_item_id
                      AND ex.ownership_status_type_id = pur.ownership_status_id
       LEFT JOIN lc ON lc.plan_id = pur.plan_id AND lc.asset_item_id = pur.asset_item_id
       LEFT JOIN ${(0, budget_context_1.T)(schema, 'asset_items')} ai ON ai.asset_item_id = pur.asset_item_id
       LEFT JOIN ${(0, budget_context_1.T)(schema, 'vendors')} v ON v.vendor_id = pur.vendor_id
       LEFT JOIN ${(0, budget_context_1.T)(schema, 'asset_ownership_status_types')} ost
              ON ost.ownership_status_type_id = pur.ownership_status_id
      ORDER BY pur.purchase_date, pur.procurement_id`, [planIds, from || null, to || null]);
    return rows.map((r) => ({
        ...r,
        plan_id: Number(r.plan_id),
        procurement_id: Number(r.procurement_id),
        asset_id: Number(r.asset_id),
        asset_item_id: Number(r.asset_item_id),
        ownership_status_id: r.ownership_status_id === null ? null : Number(r.ownership_status_id),
        vendor_id: r.vendor_id === null ? null : Number(r.vendor_id),
        amount: (0, budget_list_util_1.num)(r.amount),
        stock_id: r.stock_id === null || r.stock_id === undefined ? null : Number(r.stock_id),
        first_serial_id: r.first_serial_id === null || r.first_serial_id === undefined ? null : Number(r.first_serial_id),
        line_id: r.line_id === null ? null : Number(r.line_id),
    }));
}
async function loadManual(runner, schema, planIds, from, to, lineId) {
    if (!planIds.length)
        return [];
    const rows = await runner.query(`SELECT me.entry_id, me.plan_id, me.line_id, me.entry_date::text AS entry_date, me.amount, me.gst_amount,
            me.description, me.vendor_id, v.vendor_name, me.reference_no, me.created_at, me.updated_at,
            TRIM(CONCAT(COALESCE(cu.first_name,''), ' ', COALESCE(cu.last_name,''))) AS created_by_name,
            TRIM(CONCAT(COALESCE(uu.first_name,''), ' ', COALESCE(uu.last_name,''))) AS updated_by_name
       FROM ${(0, budget_context_1.T)(schema, 'budget_manual_entries')} me
       LEFT JOIN ${(0, budget_context_1.T)(schema, 'vendors')} v ON v.vendor_id = me.vendor_id
       LEFT JOIN ${(0, budget_context_1.T)(schema, 'users')} cu ON cu.user_id = me.created_by
       LEFT JOIN ${(0, budget_context_1.T)(schema, 'users')} uu ON uu.user_id = me.updated_by
      WHERE me.plan_id = ANY($1::bigint[]) AND me.is_deleted = 0
        AND ($2::date IS NULL OR me.entry_date >= $2::date)
        AND ($3::date IS NULL OR me.entry_date <= $3::date)
        AND ($4::bigint IS NULL OR me.line_id = $4::bigint)
      ORDER BY me.entry_date, me.entry_id`, [planIds, from || null, to || null, lineId ?? null]);
    return rows.map((r) => ({
        ...r,
        entry_id: Number(r.entry_id),
        plan_id: Number(r.plan_id),
        line_id: Number(r.line_id),
        amount: (0, budget_list_util_1.num)(r.amount),
        gst_amount: r.gst_amount === null ? null : (0, budget_list_util_1.num)(r.gst_amount),
        vendor_id: r.vendor_id === null ? null : Number(r.vendor_id),
    }));
}
async function consumedByPlan(runner, schema, planIds) {
    const out = new Map();
    planIds.forEach((id) => out.set(id, { consumed: 0, unbudgeted: 0, unbudgetedCount: 0 }));
    if (!planIds.length)
        return out;
    const [purchases, manual] = await Promise.all([
        loadPurchases(runner, schema, planIds),
        loadManual(runner, schema, planIds),
    ]);
    for (const p of purchases) {
        const o = out.get(p.plan_id);
        if (!o)
            continue;
        if (p.line_id)
            o.consumed += p.amount;
        else {
            o.unbudgeted += p.amount;
            o.unbudgetedCount += 1;
        }
    }
    for (const m of manual) {
        const o = out.get(m.plan_id);
        if (o)
            o.consumed += m.amount;
    }
    for (const o of out.values()) {
        o.consumed = Math.round(o.consumed * 100) / 100;
        o.unbudgeted = Math.round(o.unbudgeted * 100) / 100;
    }
    return out;
}
async function consumedByLine(runner, schema, planId) {
    const [purchases, manual] = await Promise.all([
        loadPurchases(runner, schema, [planId]),
        loadManual(runner, schema, [planId]),
    ]);
    const map = new Map();
    for (const p of purchases)
        if (p.line_id)
            map.set(p.line_id, (map.get(p.line_id) || 0) + p.amount);
    for (const m of manual)
        map.set(m.line_id, (map.get(m.line_id) || 0) + m.amount);
    for (const [k, v] of map)
        map.set(k, Math.round(v * 100) / 100);
    return map;
}
function monthIndexSafe(dateYmd, fy) {
    const i = (0, fy_util_1.fyMonthIndexOf)(dateYmd, fy);
    return i >= 1 && i <= 12 ? i : 0;
}
