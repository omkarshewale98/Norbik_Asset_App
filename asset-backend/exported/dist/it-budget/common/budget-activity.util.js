"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logBudgetActivity = logBudgetActivity;
const budget_context_1 = require("./budget-context");
async function logBudgetActivity(runner, ctx, e) {
    try {
        await runner.query(`INSERT INTO ${(0, budget_context_1.T)(ctx.schema, 'budget_activity_log')}
         (plan_id, entity_type, entity_id, action, description, before_json, after_json, performed_by, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
            e.plan_id ?? null,
            e.entity_type,
            e.entity_id ?? null,
            e.action,
            e.description ?? null,
            e.before === undefined ? null : JSON.stringify(e.before),
            e.after === undefined ? null : JSON.stringify(e.after),
            ctx.userId,
            (ctx.ip || '').slice(0, 64) || null,
        ]);
    }
    catch (err) {
        console.warn('[it-budget] activity log failed:', err?.message);
    }
}
