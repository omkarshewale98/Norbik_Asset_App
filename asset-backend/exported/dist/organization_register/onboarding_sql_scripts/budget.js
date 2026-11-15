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
exports.BudgetTablesScript = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
let BudgetTablesScript = class BudgetTablesScript {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async createBudgetTables(schemaName) {
        await this.dataSource.query(`
-- ---------------------------------------------------------------------------
-- 1. budget_categories  (Asset Setup → "Budget Category" tab; same pattern as
--    asset_status_types / asset_ownership_status_types)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ${schemaName}.budget_categories (
    budget_category_id      SERIAL PRIMARY KEY,
    budget_category_name    text        NOT NULL,
    budget_category_code    varchar(40) NOT NULL,
    budget_category_description text,
    budget_category_color   varchar(10),
    is_default              boolean  NOT NULL DEFAULT false,
    is_active               smallint NOT NULL DEFAULT 1,
    is_deleted              smallint NOT NULL DEFAULT 0,
    created_by              integer,
    updated_by              integer,
    created_at              timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at              timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT budget_categories_created_by_fkey FOREIGN KEY (created_by)
        REFERENCES ${schemaName}.users (user_id) ON UPDATE NO ACTION ON DELETE NO ACTION NOT VALID,
    CONSTRAINT budget_categories_updated_by_fkey FOREIGN KEY (updated_by)
        REFERENCES ${schemaName}.users (user_id) ON UPDATE NO ACTION ON DELETE NO ACTION NOT VALID
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_budget_categories_name
    ON ${schemaName}.budget_categories (lower(budget_category_name)) WHERE is_deleted = 0;
CREATE UNIQUE INDEX IF NOT EXISTS uq_budget_categories_code
    ON ${schemaName}.budget_categories (budget_category_code) WHERE is_deleted = 0;

INSERT INTO ${schemaName}.budget_categories
    (budget_category_name, budget_category_code, budget_category_description, budget_category_color, is_default)
SELECT v.name, v.code, v.descr, v.color, true
FROM (VALUES
    ('Hardware & Equipment',                'HARDWARE',     'Laptops, desktops, servers, peripherals',            '#2563EB'),
    ('Software & Licensing',                'SOFTWARE',     'Perpetual and term software licences',               '#7C3AED'),
    ('Cloud & Hosting',                     'CLOUD',        'IaaS / PaaS, hosting, storage',                      '#0891B2'),
    ('SaaS Subscriptions',                  'SAAS',         'Subscription software (per user / per year)',        '#0D9488'),
    ('Network & Telecom',                   'NETWORK',      'Network equipment, internet, telecom',               '#4F46E5'),
    ('Security & Compliance',               'SECURITY',     'Security tools, audits, compliance',                 '#DC2626'),
    ('Support & Maintenance Contracts',     'SUPPORT',      'AMC, support contracts, repairs',                    '#D97706'),
    ('Professional & Consulting Services',  'PROFESSIONAL', 'Consulting, implementation, outsourced services',    '#DB2777'),
    ('Training & Development',              'TRAINING',     'Training and certification',                         '#16A34A'),
    ('Other',                               'OTHER',        'Anything not covered above',                         '#64748B')
) AS v(name, code, descr, color)
WHERE NOT EXISTS (
    SELECT 1 FROM ${schemaName}.budget_categories bc
    WHERE bc.budget_category_code = v.code AND bc.is_deleted = 0
);

-- ---------------------------------------------------------------------------
-- 2. budget_plan_statuses  (status master with fixed codes)
--      10 DRAFT      saved, not published, no version yet
--      20 SCHEDULED  published, FY not started / not set current
--      30 CURRENT    the running financial year
--      40 CLOSED     closed and LOCKED — read-only for ever
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ${schemaName}.budget_plan_statuses (
    status_code   smallint PRIMARY KEY,
    status_key    varchar(20) NOT NULL UNIQUE,
    status_name   varchar(40) NOT NULL,
    status_color  varchar(10),
    sort_order    smallint NOT NULL DEFAULT 0
);
INSERT INTO ${schemaName}.budget_plan_statuses (status_code, status_key, status_name, status_color, sort_order) VALUES
    (10, 'DRAFT',     'Draft',     '#64748B', 1),
    (20, 'SCHEDULED', 'Scheduled', '#2563EB', 2),
    (30, 'CURRENT',   'Current',   '#16A34A', 3),
    (40, 'CLOSED',    'Closed',    '#334155', 4)
ON CONFLICT (status_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. budget_plans  (one plan per financial year, organisation level)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ${schemaName}.budget_plans (
    plan_id            BIGSERIAL PRIMARY KEY,
    fy_code            varchar(9)  NOT NULL,          -- '2026-27' or '2026'
    fy_label           varchar(20) NOT NULL,          -- 'FY 2026-27'
    fy_start_date      date        NOT NULL,
    fy_end_date        date        NOT NULL,
    fy_pattern         varchar(20) NOT NULL,          -- org setting at creation, e.g. 'April-March'
    plan_name          text,
    owner_user_id      integer     NOT NULL,
    status_code        smallint    NOT NULL DEFAULT 10,
    current_version    integer     NOT NULL DEFAULT 0, -- 0 = never published
    phasing_mode       varchar(12) NOT NULL DEFAULT 'YEARLY',
    phasing_method     varchar(8),                    -- EQUAL / MANUAL ; NULL when YEARLY
    total_amount       numeric(14,2) NOT NULL DEFAULT 0,
    capex_amount       numeric(14,2) NOT NULL DEFAULT 0,
    opex_amount        numeric(14,2) NOT NULL DEFAULT 0,
    remarks            text,
    is_locked          boolean  NOT NULL DEFAULT false,
    published_by       integer,
    published_at       timestamp without time zone,
    set_current_by     integer,
    set_current_at     timestamp without time zone,
    closed_by          integer,
    closed_at          timestamp without time zone,
    lock_version       integer  NOT NULL DEFAULT 0,   -- optimistic locking
    is_deleted         smallint NOT NULL DEFAULT 0,
    created_by         integer,
    updated_by         integer,
    created_at         timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at         timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT budget_plans_status_fkey FOREIGN KEY (status_code)
        REFERENCES ${schemaName}.budget_plan_statuses (status_code),
    CONSTRAINT budget_plans_owner_fkey FOREIGN KEY (owner_user_id)
        REFERENCES ${schemaName}.users (user_id) ON UPDATE NO ACTION ON DELETE NO ACTION NOT VALID,
    CONSTRAINT budget_plans_created_by_fkey FOREIGN KEY (created_by)
        REFERENCES ${schemaName}.users (user_id) ON UPDATE NO ACTION ON DELETE NO ACTION NOT VALID,
    CONSTRAINT budget_plans_updated_by_fkey FOREIGN KEY (updated_by)
        REFERENCES ${schemaName}.users (user_id) ON UPDATE NO ACTION ON DELETE NO ACTION NOT VALID,
    CONSTRAINT ck_budget_plans_dates   CHECK (fy_end_date > fy_start_date),
    CONSTRAINT ck_budget_plans_phasing CHECK (phasing_mode IN ('YEARLY','HALF_YEARLY','QUARTERLY','MONTHLY')),
    CONSTRAINT ck_budget_plans_method  CHECK (
        (phasing_mode = 'YEARLY' AND phasing_method IS NULL)
        OR (phasing_mode <> 'YEARLY' AND phasing_method IS NOT NULL AND phasing_method IN ('EQUAL','MANUAL'))),
    CONSTRAINT ck_budget_plans_amounts CHECK (total_amount >= 0 AND capex_amount >= 0 AND opex_amount >= 0),
    CONSTRAINT ck_budget_plans_closed_locked CHECK (status_code <> 40 OR is_locked)
);
-- one live plan per financial year
CREATE UNIQUE INDEX IF NOT EXISTS uq_budget_plans_fy
    ON ${schemaName}.budget_plans (fy_code) WHERE is_deleted = 0;
-- at most one CURRENT plan
CREATE UNIQUE INDEX IF NOT EXISTS uq_budget_plans_one_current
    ON ${schemaName}.budget_plans ((status_code)) WHERE status_code = 30 AND is_deleted = 0;
CREATE INDEX IF NOT EXISTS ix_budget_plans_status ON ${schemaName}.budget_plans (status_code);
CREATE INDEX IF NOT EXISTS ix_budget_plans_dates  ON ${schemaName}.budget_plans (fy_start_date, fy_end_date);

-- ---------------------------------------------------------------------------
-- 4. budget_lines  (ITEM line = asset item from item master;
--                   SERVICE line = free-text service, consumed by manual entries)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ${schemaName}.budget_lines (
    line_id                   BIGSERIAL PRIMARY KEY,
    plan_id                   bigint      NOT NULL,
    line_type                 varchar(10) NOT NULL,              -- ITEM / SERVICE
    asset_item_id             integer,
    service_name              text,
    budget_category_id        integer     NOT NULL,
    ownership_status_type_id  integer     NOT NULL,              -- from Asset Setup → Ownership types
    expense_nature            varchar(5)  NOT NULL,              -- snapshot: capex / opex / NA (read-only flag)
    annual_amount             numeric(14,2) NOT NULL,            -- GST inclusive
    quantity                  integer,
    unit_estimate             numeric(14,2),                     -- GST inclusive, per unit
    justification             text,
    sort_order                integer  NOT NULL DEFAULT 0,
    is_active                 smallint NOT NULL DEFAULT 1,       -- 0 = removed by a revision (kept for history)
    added_in_version          integer,
    removed_in_version        integer,
    created_by                integer,
    updated_by                integer,
    created_at                timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at                timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT budget_lines_plan_fkey FOREIGN KEY (plan_id)
        REFERENCES ${schemaName}.budget_plans (plan_id) ON DELETE CASCADE,
    CONSTRAINT budget_lines_item_fkey FOREIGN KEY (asset_item_id)
        REFERENCES ${schemaName}.asset_items (asset_item_id) ON UPDATE NO ACTION ON DELETE NO ACTION NOT VALID,
    CONSTRAINT budget_lines_category_fkey FOREIGN KEY (budget_category_id)
        REFERENCES ${schemaName}.budget_categories (budget_category_id),
    CONSTRAINT budget_lines_ownership_fkey FOREIGN KEY (ownership_status_type_id)
        REFERENCES ${schemaName}.asset_ownership_status_types (ownership_status_type_id) NOT VALID,
    CONSTRAINT ck_budget_lines_type   CHECK (line_type IN ('ITEM','SERVICE')),
    CONSTRAINT ck_budget_lines_target CHECK (
        (line_type = 'ITEM'    AND asset_item_id IS NOT NULL AND service_name IS NULL)
     OR (line_type = 'SERVICE' AND asset_item_id IS NULL AND service_name IS NOT NULL AND length(btrim(service_name)) >= 2)),
    CONSTRAINT ck_budget_lines_nature CHECK (expense_nature IN ('capex','opex','NA')),
    CONSTRAINT ck_budget_lines_amount CHECK (annual_amount > 0),
    CONSTRAINT ck_budget_lines_qty    CHECK (quantity IS NULL OR quantity >= 1),
    CONSTRAINT ck_budget_lines_unit   CHECK (unit_estimate IS NULL OR unit_estimate >= 0)
);
-- same item + same ownership type only once per plan (laptops-owned and laptops-leased may coexist)
CREATE UNIQUE INDEX IF NOT EXISTS uq_budget_lines_item
    ON ${schemaName}.budget_lines (plan_id, asset_item_id, ownership_status_type_id)
    WHERE line_type = 'ITEM' AND is_active = 1;
CREATE UNIQUE INDEX IF NOT EXISTS uq_budget_lines_service
    ON ${schemaName}.budget_lines (plan_id, lower(btrim(service_name)), ownership_status_type_id)
    WHERE line_type = 'SERVICE' AND is_active = 1;
CREATE INDEX IF NOT EXISTS ix_budget_lines_plan     ON ${schemaName}.budget_lines (plan_id);
CREATE INDEX IF NOT EXISTS ix_budget_lines_item     ON ${schemaName}.budget_lines (asset_item_id);
CREATE INDEX IF NOT EXISTS ix_budget_lines_category ON ${schemaName}.budget_lines (budget_category_id);

-- ---------------------------------------------------------------------------
-- 5. budget_line_phasing  (always stored as FY months 1..12, whatever the
--    input granularity: YEARLY → no rows, HALF_YEARLY → 6+6 months, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ${schemaName}.budget_line_phasing (
    phasing_id     BIGSERIAL PRIMARY KEY,
    line_id        bigint   NOT NULL,
    fy_month_index smallint NOT NULL,           -- 1 = first month of the FY
    period_start   date     NOT NULL,
    amount         numeric(14,2) NOT NULL DEFAULT 0,
    created_at     timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at     timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT budget_line_phasing_line_fkey FOREIGN KEY (line_id)
        REFERENCES ${schemaName}.budget_lines (line_id) ON DELETE CASCADE,
    CONSTRAINT ck_budget_line_phasing_month  CHECK (fy_month_index BETWEEN 1 AND 12),
    CONSTRAINT ck_budget_line_phasing_amount CHECK (amount >= 0),
    CONSTRAINT uq_budget_line_phasing UNIQUE (line_id, fy_month_index)
);

-- ---------------------------------------------------------------------------
-- 6. budget_plan_versions  (v1 on publish; +1 on every saved revision)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ${schemaName}.budget_plan_versions (
    version_id      BIGSERIAL PRIMARY KEY,
    plan_id         bigint      NOT NULL,
    version_no      integer     NOT NULL,                 -- 1, 2, 3 … (UI shows v1.0, v2.0 …)
    revision_type   varchar(14) NOT NULL,                 -- INITIAL / REALLOCATION / INCREASED / REDUCED
    reason          text,
    total_before    numeric(14,2) NOT NULL DEFAULT 0,
    total_after     numeric(14,2) NOT NULL DEFAULT 0,
    net_change      numeric(14,2) NOT NULL DEFAULT 0,
    snapshot        jsonb       NOT NULL,                 -- header + lines + phasing at this version
    created_by      integer,
    created_at      timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT budget_plan_versions_plan_fkey FOREIGN KEY (plan_id)
        REFERENCES ${schemaName}.budget_plans (plan_id) ON DELETE CASCADE,
    CONSTRAINT budget_plan_versions_created_by_fkey FOREIGN KEY (created_by)
        REFERENCES ${schemaName}.users (user_id) ON UPDATE NO ACTION ON DELETE NO ACTION NOT VALID,
    CONSTRAINT uq_budget_plan_versions UNIQUE (plan_id, version_no),
    CONSTRAINT ck_budget_plan_versions_no   CHECK (version_no >= 1),
    CONSTRAINT ck_budget_plan_versions_type CHECK (revision_type IN ('INITIAL','REALLOCATION','INCREASED','REDUCED')),
    CONSTRAINT ck_budget_plan_versions_reason CHECK (revision_type = 'INITIAL' OR length(btrim(coalesce(reason,''))) >= 5)
);

-- ---------------------------------------------------------------------------
-- 7. budget_revision_items  (what changed per line in a version — drives the
--    "Budget Changes Log": Added / Removed / Increased / Reduced / Reallocated …)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ${schemaName}.budget_revision_items (
    revision_item_id     BIGSERIAL PRIMARY KEY,
    version_id           bigint      NOT NULL,
    plan_id              bigint      NOT NULL,
    line_id              bigint,
    change_type          varchar(18) NOT NULL,
    counterpart_line_id  bigint,                         -- for REALLOCATED pairs
    amount_before        numeric(14,2),
    amount_after         numeric(14,2),
    before_json          jsonb,
    after_json           jsonb,
    created_at           timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT budget_revision_items_version_fkey FOREIGN KEY (version_id)
        REFERENCES ${schemaName}.budget_plan_versions (version_id) ON DELETE CASCADE,
    CONSTRAINT budget_revision_items_line_fkey FOREIGN KEY (line_id)
        REFERENCES ${schemaName}.budget_lines (line_id) ON DELETE SET NULL,
    CONSTRAINT ck_budget_revision_items_type CHECK (change_type IN
        ('ADDED','REMOVED','INCREASED','REDUCED','REALLOCATED','PHASING_CHANGED','ATTRIBUTE_CHANGED'))
);
CREATE INDEX IF NOT EXISTS ix_budget_revision_items_version ON ${schemaName}.budget_revision_items (version_id);
CREATE INDEX IF NOT EXISTS ix_budget_revision_items_plan    ON ${schemaName}.budget_revision_items (plan_id);

-- ---------------------------------------------------------------------------
-- 8. budget_manual_entries  (manual consumption — services, maintenance,
--    anything not captured through asset purchase).  GST inclusive.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ${schemaName}.budget_manual_entries (
    entry_id        BIGSERIAL PRIMARY KEY,
    plan_id         bigint   NOT NULL,
    line_id         bigint   NOT NULL,
    entry_date      date     NOT NULL,
    amount          numeric(14,2) NOT NULL,          -- GST inclusive
    gst_amount      numeric(14,2),                   -- optional, informational
    description     text     NOT NULL,
    vendor_id       integer,
    reference_no    varchar(100),                    -- invoice / bill / reference
    attachment_path text,
    is_deleted      smallint NOT NULL DEFAULT 0,
    created_by      integer,
    updated_by      integer,
    created_at      timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at      timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT budget_manual_entries_plan_fkey FOREIGN KEY (plan_id)
        REFERENCES ${schemaName}.budget_plans (plan_id) ON DELETE CASCADE,
    CONSTRAINT budget_manual_entries_line_fkey FOREIGN KEY (line_id)
        REFERENCES ${schemaName}.budget_lines (line_id),
    CONSTRAINT budget_manual_entries_created_by_fkey FOREIGN KEY (created_by)
        REFERENCES ${schemaName}.users (user_id) ON UPDATE NO ACTION ON DELETE NO ACTION NOT VALID,
    CONSTRAINT ck_budget_manual_entries_amount CHECK (amount > 0),
    CONSTRAINT ck_budget_manual_entries_gst    CHECK (gst_amount IS NULL OR (gst_amount >= 0 AND gst_amount <= amount)),
    CONSTRAINT ck_budget_manual_entries_desc   CHECK (length(btrim(description)) >= 3)
);
CREATE INDEX IF NOT EXISTS ix_budget_manual_entries_plan_line ON ${schemaName}.budget_manual_entries (plan_id, line_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS ix_budget_manual_entries_date      ON ${schemaName}.budget_manual_entries (entry_date);

-- ---------------------------------------------------------------------------
-- 9. budget_activity_log  (create, publish, set current, close, manual entry,
--    category changes, exports … — budget amount changes are in versions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ${schemaName}.budget_activity_log (
    log_id        BIGSERIAL PRIMARY KEY,
    plan_id       bigint,
    entity_type   varchar(30) NOT NULL,       -- PLAN / LINE / MANUAL_ENTRY / CATEGORY / EXPORT
    entity_id     bigint,
    action        varchar(40) NOT NULL,       -- CREATED / UPDATED / PUBLISHED / SET_CURRENT / CLOSED / DELETED / EXPORTED …
    description   text,
    before_json   jsonb,
    after_json    jsonb,
    performed_by  integer,
    performed_at  timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address    varchar(64)
);
CREATE INDEX IF NOT EXISTS ix_budget_activity_log_plan   ON ${schemaName}.budget_activity_log (plan_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS ix_budget_activity_log_entity ON ${schemaName}.budget_activity_log (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- 10. Lock protection — a CLOSED (locked) year can never be changed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ${schemaName}.fn_budget_block_locked_plan()
RETURNS trigger LANGUAGE plpgsql AS $FN$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.is_locked THEN
            RAISE EXCEPTION 'BUD_FY_LOCKED: budget plan % (%) is closed and locked', OLD.plan_id, OLD.fy_label;
        END IF;
        RETURN OLD;
    END IF;
    IF OLD.is_locked THEN
        RAISE EXCEPTION 'BUD_FY_LOCKED: budget plan % (%) is closed and locked', OLD.plan_id, OLD.fy_label;
    END IF;
    RETURN NEW;
END;
$FN$;

CREATE OR REPLACE FUNCTION ${schemaName}.fn_budget_block_locked_child()
RETURNS trigger LANGUAGE plpgsql AS $FN$
DECLARE
    v_plan_id bigint;
    v_locked  boolean;
BEGIN
    IF TG_TABLE_NAME = 'budget_line_phasing' THEN
        IF TG_OP = 'DELETE' THEN
            SELECT l.plan_id INTO v_plan_id FROM ${schemaName}.budget_lines l WHERE l.line_id = OLD.line_id;
        ELSE
            SELECT l.plan_id INTO v_plan_id FROM ${schemaName}.budget_lines l WHERE l.line_id = NEW.line_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        v_plan_id := OLD.plan_id;
    ELSE
        v_plan_id := NEW.plan_id;
    END IF;

    SELECT p.is_locked INTO v_locked FROM ${schemaName}.budget_plans p WHERE p.plan_id = v_plan_id;
    IF COALESCE(v_locked, false) THEN
        RAISE EXCEPTION 'BUD_FY_LOCKED: budget plan % is closed and locked (%)', v_plan_id, TG_TABLE_NAME;
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$FN$;

DROP TRIGGER IF EXISTS trg_budget_plans_lock ON ${schemaName}.budget_plans;
CREATE TRIGGER trg_budget_plans_lock
    BEFORE UPDATE OR DELETE ON ${schemaName}.budget_plans
    FOR EACH ROW EXECUTE FUNCTION ${schemaName}.fn_budget_block_locked_plan();

DROP TRIGGER IF EXISTS trg_budget_lines_lock ON ${schemaName}.budget_lines;
CREATE TRIGGER trg_budget_lines_lock
    BEFORE INSERT OR UPDATE OR DELETE ON ${schemaName}.budget_lines
    FOR EACH ROW EXECUTE FUNCTION ${schemaName}.fn_budget_block_locked_child();

DROP TRIGGER IF EXISTS trg_budget_line_phasing_lock ON ${schemaName}.budget_line_phasing;
CREATE TRIGGER trg_budget_line_phasing_lock
    BEFORE INSERT OR UPDATE OR DELETE ON ${schemaName}.budget_line_phasing
    FOR EACH ROW EXECUTE FUNCTION ${schemaName}.fn_budget_block_locked_child();

DROP TRIGGER IF EXISTS trg_budget_manual_entries_lock ON ${schemaName}.budget_manual_entries;
CREATE TRIGGER trg_budget_manual_entries_lock
    BEFORE INSERT OR UPDATE OR DELETE ON ${schemaName}.budget_manual_entries
    FOR EACH ROW EXECUTE FUNCTION ${schemaName}.fn_budget_block_locked_child();

DROP TRIGGER IF EXISTS trg_budget_plan_versions_lock ON ${schemaName}.budget_plan_versions;
CREATE TRIGGER trg_budget_plan_versions_lock
    BEFORE INSERT OR UPDATE OR DELETE ON ${schemaName}.budget_plan_versions
    FOR EACH ROW EXECUTE FUNCTION ${schemaName}.fn_budget_block_locked_child();

-- ---------------------------------------------------------------------------
-- 11. Helpful index on the consumption source (exists in most schemas already)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_procurements_purchase_date
    ON ${schemaName}.asset_procurements (purchase_date);

            
    `);
    }
};
exports.BudgetTablesScript = BudgetTablesScript;
exports.BudgetTablesScript = BudgetTablesScript = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], BudgetTablesScript);
