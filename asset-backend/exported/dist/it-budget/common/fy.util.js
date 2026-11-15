"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PHASING_BUCKETS = exports.ymd = exports.FY_WINDOW_YEARS = void 0;
exports.fyStartMonth = fyStartMonth;
exports.todayYmd = todayYmd;
exports.fyForStartYear = fyForStartYear;
exports.fyContaining = fyContaining;
exports.fyFromCode = fyFromCode;
exports.fyOptions = fyOptions;
exports.fyMonths = fyMonths;
exports.fyMonthIndexOf = fyMonthIndexOf;
exports.bucketLabels = bucketLabels;
exports.equalSplit = equalSplit;
exports.bucketsToMonths = bucketsToMonths;
exports.monthsToBuckets = monthsToBuckets;
exports.sumMoney = sumMoney;
exports.roundMoney = roundMoney;
exports.resolvePeriod = resolvePeriod;
const MONTHS = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
exports.FY_WINDOW_YEARS = 10;
function fyStartMonth(pattern) {
    const first = String(pattern || 'April-March').split('-')[0].trim().toLowerCase();
    const i = MONTHS.indexOf(first);
    return i >= 0 ? i + 1 : 4;
}
const pad = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
exports.ymd = ymd;
function lastDayOfMonth(y, m) {
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
function todayYmd() {
    const now = new Date();
    const ist = new Date(now.getTime() + 330 * 60 * 1000);
    return ist.toISOString().slice(0, 10);
}
function fyForStartYear(startYear, startMonth) {
    const code = startMonth === 1
        ? `${startYear}`
        : `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
    const startDate = (0, exports.ymd)(startYear, startMonth, 1);
    const endMonth = startMonth === 1 ? 12 : startMonth - 1;
    const endYear = startMonth === 1 ? startYear : startYear + 1;
    const endDate = (0, exports.ymd)(endYear, endMonth, lastDayOfMonth(endYear, endMonth));
    return { code, label: `FY ${code}`, startYear, startMonth, startDate, endDate };
}
function fyContaining(dateYmd, startMonth) {
    const y = Number(dateYmd.slice(0, 4));
    const m = Number(dateYmd.slice(5, 7));
    const startYear = m >= startMonth ? y : y - 1;
    return fyForStartYear(startYear, startMonth);
}
function fyFromCode(code, startMonth) {
    const m = /^(\d{4})(?:-(\d{2}))?$/.exec(String(code || '').trim());
    if (!m)
        return null;
    const fy = fyForStartYear(Number(m[1]), startMonth);
    return fy.code === code.trim() ? fy : null;
}
function fyOptions(startMonth, today = todayYmd()) {
    const current = fyContaining(today, startMonth);
    const out = [];
    for (let i = -exports.FY_WINDOW_YEARS; i <= exports.FY_WINDOW_YEARS; i++) {
        out.push(fyForStartYear(current.startYear + i, startMonth));
    }
    return out;
}
function fyMonths(fy) {
    const out = [];
    for (let i = 0; i < 12; i++) {
        const mIdx0 = (fy.startMonth - 1 + i) % 12;
        const year = fy.startYear + Math.floor((fy.startMonth - 1 + i) / 12);
        const month = mIdx0 + 1;
        out.push({
            index: i + 1,
            start: (0, exports.ymd)(year, month, 1),
            end: (0, exports.ymd)(year, month, lastDayOfMonth(year, month)),
            label: `${MONTH_SHORT[mIdx0]} ${year}`,
            short: MONTH_SHORT[mIdx0],
        });
    }
    return out;
}
function fyMonthIndexOf(dateYmd, fy) {
    const y = Number(dateYmd.slice(0, 4));
    const m = Number(dateYmd.slice(5, 7));
    return (y - fy.startYear) * 12 + (m - fy.startMonth) + 1;
}
exports.PHASING_BUCKETS = {
    YEARLY: 1,
    HALF_YEARLY: 2,
    QUARTERLY: 4,
    MONTHLY: 12,
};
function bucketLabels(mode, fy) {
    const months = fyMonths(fy);
    const n = exports.PHASING_BUCKETS[mode];
    const per = 12 / n;
    const labels = [];
    for (let b = 0; b < n; b++) {
        const first = months[b * per];
        const last = months[b * per + per - 1];
        if (mode === 'MONTHLY')
            labels.push(first.label);
        else if (mode === 'QUARTERLY')
            labels.push(`Q${b + 1} (${first.short}–${last.short})`);
        else if (mode === 'HALF_YEARLY')
            labels.push(`H${b + 1} (${first.short}–${last.short})`);
        else
            labels.push(`${fy.label}`);
    }
    return labels;
}
const toPaise = (v) => Math.round(Number(v) * 100);
const fromPaise = (p) => Math.round(p) / 100;
function equalSplit(amount, n) {
    const total = toPaise(amount);
    const base = Math.floor(total / n);
    const parts = Array.from({ length: n }, () => base);
    parts[n - 1] = total - base * (n - 1);
    return parts.map(fromPaise);
}
function bucketsToMonths(buckets, mode) {
    const n = exports.PHASING_BUCKETS[mode];
    if (mode === 'YEARLY')
        return [];
    const per = 12 / n;
    const out = [];
    for (let b = 0; b < n; b++)
        out.push(...equalSplit(Number(buckets[b] || 0), per));
    return out;
}
function monthsToBuckets(months, mode) {
    const n = exports.PHASING_BUCKETS[mode];
    if (!months?.length || mode === 'YEARLY')
        return [];
    const per = 12 / n;
    const out = [];
    for (let b = 0; b < n; b++) {
        let p = 0;
        for (let i = 0; i < per; i++)
            p += toPaise(months[b * per + i] || 0);
        out.push(fromPaise(p));
    }
    return out;
}
function sumMoney(values) {
    return fromPaise(values.reduce((s, v) => s + toPaise(v || 0), 0));
}
function roundMoney(v) {
    return fromPaise(toPaise(v));
}
const daysBetween = (a, b) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) -
    Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86400000) + 1;
function resolvePeriod(fy, input, today = todayYmd()) {
    const months = fyMonths(fy);
    const type = (input?.type || 'YEAR');
    let from = fy.startDate;
    let to = fy.endDate;
    let label = fy.label;
    let index;
    switch (type) {
        case 'HALF': {
            index = Math.min(Math.max(Number(input?.index || 1), 1), 2);
            from = months[(index - 1) * 6].start;
            to = months[(index - 1) * 6 + 5].end;
            label = `H${index} (${months[(index - 1) * 6].short}–${months[(index - 1) * 6 + 5].short}) ${fy.label}`;
            break;
        }
        case 'QUARTER': {
            index = Math.min(Math.max(Number(input?.index || 1), 1), 4);
            from = months[(index - 1) * 3].start;
            to = months[(index - 1) * 3 + 2].end;
            label = `Q${index} (${months[(index - 1) * 3].short}–${months[(index - 1) * 3 + 2].short}) ${fy.label}`;
            break;
        }
        case 'MONTH': {
            index = Math.min(Math.max(Number(input?.index || 1), 1), 12);
            from = months[index - 1].start;
            to = months[index - 1].end;
            label = months[index - 1].label;
            break;
        }
        case 'YTD': {
            to = today < fy.startDate ? fy.startDate : today > fy.endDate ? fy.endDate : today;
            label = `Year to date (${fy.label})`;
            break;
        }
        case 'CUSTOM': {
            const f = /^\d{4}-\d{2}-\d{2}$/.test(String(input?.from)) ? String(input.from) : fy.startDate;
            const t = /^\d{4}-\d{2}-\d{2}$/.test(String(input?.to)) ? String(input.to) : fy.endDate;
            from = f < fy.startDate ? fy.startDate : f > fy.endDate ? fy.endDate : f;
            to = t > fy.endDate ? fy.endDate : t < fy.startDate ? fy.startDate : t;
            if (from > to)
                [from, to] = [to, from];
            label = `${from} to ${to}`;
            break;
        }
        default:
            break;
    }
    const monthWeights = months.map((m) => {
        const s = m.start > from ? m.start : from;
        const e = m.end < to ? m.end : to;
        if (s > e)
            return 0;
        return daysBetween(s, e) / daysBetween(m.start, m.end);
    });
    return { type, index, from, to, label, monthWeights };
}
