"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pct = exports.num = void 0;
exports.searchText = searchText;
exports.filterValues = filterValues;
exports.paginate = paginate;
function searchText(input) {
    return (input?.search || [])
        .flatMap((s) => s?.values || [])
        .map((v) => String(v || '').trim())
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
}
function filterValues(input, column) {
    const f = (input?.filters || []).find((x) => x?.column === column);
    return (f?.values || [])
        .map((v) => String(v))
        .filter((v) => v !== '' && v.toLowerCase() !== 'all' && v !== 'NaN');
}
function paginate(rows, input, defaultSort, sortable) {
    const s = (input?.sort || []).find((x) => x?.column && sortable.includes(x.column));
    const column = s?.column || defaultSort.column;
    const dir = String(s?.order || defaultSort.order).toUpperCase() === 'DESC' ? -1 : 1;
    const sorted = [...rows].sort((a, b) => {
        const av = a[column];
        const bv = b[column];
        if (av === bv)
            return 0;
        if (av === null || av === undefined)
            return 1;
        if (bv === null || bv === undefined)
            return -1;
        if (typeof av === 'number' && typeof bv === 'number')
            return (av - bv) * dir;
        return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
    const limit = input?.all
        ? Math.max(rows.length, 1)
        : Math.min(Math.max(Number(input?.pagination?.limit || input?.limit || 10), 1), 500);
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    let page = 1;
    if (input?.jumpToLast)
        page = totalPages;
    else if (input?.page && Number(input.page) > 0)
        page = Number(input.page);
    else if (typeof input?.cursor === 'string' && /^p:\d+$/.test(input.cursor)) {
        const cur = Number(input.cursor.slice(2));
        page = input.direction === 'prev' ? cur - 1 : cur + 1;
    }
    page = Math.min(Math.max(page, 1), totalPages);
    const data = sorted.slice((page - 1) * limit, page * limit);
    const token = `p:${page}`;
    const meta = {
        total,
        totalPages,
        currentPage: page,
        limit,
        count: data.length,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        startCursor: token,
        endCursor: token,
        nextCursor: page < totalPages ? token : null,
        prevCursor: page > 1 ? token : null,
    };
    return { data, meta };
}
const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};
exports.num = num;
const pct = (part, whole) => whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;
exports.pct = pct;
