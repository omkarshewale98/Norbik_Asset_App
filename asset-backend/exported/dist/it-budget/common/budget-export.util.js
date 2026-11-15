"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPORT_CONTENT_TYPE = void 0;
exports.formatIndian = formatIndian;
exports.exportFormat = exportFormat;
exports.visibleKeys = visibleKeys;
exports.pickColumns = pickColumns;
exports.applySelection = applySelection;
exports.buildCsv = buildCsv;
exports.buildXlsx = buildXlsx;
exports.buildPdf = buildPdf;
exports.exportFileName = exportFileName;
exports.renderExport = renderExport;
const XlsxPopulate = require('xlsx-populate');
function formatIndian(value, decimals = 2) {
    const n = Number(value);
    if (value === null || value === undefined || value === '' || !Number.isFinite(n))
        return '';
    const neg = n < 0;
    const fixed = Math.abs(n).toFixed(decimals);
    const [intPart, dec] = fixed.split('.');
    let head = intPart;
    let tail = '';
    if (intPart.length > 3) {
        tail = ',' + intPart.slice(-3);
        head = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    }
    else {
        head = intPart;
    }
    return `${neg ? '-' : ''}${head}${tail}${dec ? '.' + dec : ''}`;
}
const csvCell = (v) => {
    if (v === null || v === undefined)
        return '';
    const s = String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function exportFormat(v) {
    return v === 'pdf' ? 'pdf' : v === 'csv' ? 'csv' : 'xlsx';
}
exports.EXPORT_CONTENT_TYPE = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv; charset=utf-8',
    pdf: 'application/pdf',
};
function visibleKeys(vc, order) {
    let keys = null;
    if (Array.isArray(vc))
        keys = vc.map(String);
    else if (vc && typeof vc === 'object')
        keys = Object.keys(vc).filter((k) => vc[k] !== false);
    if (!keys || !keys.length)
        return null;
    if (Array.isArray(order) && order.length) {
        const pos = new Map(order.map((k, i) => [String(k), i]));
        keys = [...keys].sort((a, b) => (pos.get(a) ?? 999) - (pos.get(b) ?? 999));
    }
    return keys;
}
function pickColumns(all, vc, order, always = [], alias = {}) {
    const keys = visibleKeys(vc, order);
    if (!keys)
        return all;
    const byKey = new Map(all.map((c) => [c.key, c]));
    const out = [];
    for (const k of always)
        if (byKey.has(k))
            out.push(byKey.get(k));
    for (const k of keys) {
        const c = byKey.get(alias[k] || k);
        if (c && !out.includes(c))
            out.push(c);
    }
    return out.length ? out : all;
}
function applySelection(rows, input, idKey) {
    const ids = (v) => (Array.isArray(v) ? v : []).map(Number).filter((n) => Number.isFinite(n));
    if (input?.isSelectAll) {
        const ex = ids(input?.excludeIds);
        return ex.length ? rows.filter((r) => !ex.includes(Number(r[idKey]))) : rows;
    }
    const sel = ids(input?.selectedIds);
    return sel.length ? rows.filter((r) => sel.includes(Number(r[idKey]))) : rows;
}
const cellValue = (c, v) => {
    if (v === null || v === undefined || v === '')
        return '';
    if (c.money)
        return Math.round(Number(v) * 100) / 100;
    if (c.percent)
        return `${Number(v).toFixed(1)}%`;
    return v;
};
function buildCsv(doc) {
    const section = doc.sections[0];
    const lines = [];
    lines.push(['Sr. No.', ...section.columns.map((c) => c.label)].map(csvCell).join(','));
    let n = 0;
    for (const r of section.rows) {
        const sr = r.__bold ? '' : String(++n);
        lines.push([sr, ...section.columns.map((c) => {
                const v = cellValue(c, r[c.key]);
                return c.money && v !== '' ? Number(v).toFixed(2) : csvCell(v);
            })].join(','));
    }
    return Buffer.concat([Buffer.from('\uFEFF', 'utf8'), Buffer.from(lines.join('\r\n'), 'utf8')]);
}
async function buildXlsx(doc, sheetName = 'Data') {
    const wb = await XlsxPopulate.fromBlankAsync();
    const writeTable = (sheet, section) => {
        const headers = ['Sr. No.', ...section.columns.map((c) => c.label)];
        headers.forEach((h, i) => sheet.cell(1, i + 1).value(h).style({ bold: true }));
        let n = 0;
        section.rows.forEach((r, ri) => {
            const row = ri + 2;
            sheet.cell(row, 1).value(r.__bold ? '' : ++n);
            section.columns.forEach((c, ci) => {
                const cell = sheet.cell(row, ci + 2).value(cellValue(c, r[c.key]));
                if (c.money)
                    cell.style({ numberFormat: '#,##,##0.00' });
                if (r.__bold)
                    cell.style({ bold: true });
            });
        });
        headers.forEach((h, i) => sheet.column(i + 1).width(Math.max(h.length + 6, i === 0 ? 8 : 14)));
    };
    const clean = (s) => s.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
    doc.sections.forEach((section, i) => {
        const sheet = i === 0 ? wb.sheet(0) : wb.addSheet(clean(section.title || `Sheet ${i + 1}`));
        if (i === 0)
            sheet.name(clean(sheetName));
        writeTable(sheet, section);
    });
    if (doc.cards?.length || doc.meta?.length) {
        const s = wb.addSheet('Summary');
        let r = 1;
        s.cell(r++, 1).value(doc.title).style({ bold: true });
        if (doc.orgName)
            s.cell(r++, 1).value(doc.orgName);
        if (doc.subtitle)
            s.cell(r++, 1).value(doc.subtitle);
        for (const m of doc.meta || []) {
            s.cell(r, 1).value(m.label).style({ bold: true });
            s.cell(r++, 2).value(m.value);
        }
        s.cell(r++, 1).value('Amounts in INR, GST inclusive');
        r++;
        for (const c of doc.cards || []) {
            s.cell(r, 1).value(c.label).style({ bold: true });
            s.cell(r, 2).value(c.value);
            s.cell(r++, 3).value(c.sub || '');
        }
        s.column(1).width(28);
        s.column(2).width(22);
        s.column(3).width(40);
    }
    return wb.outputAsync();
}
function buildPdf(doc) {
    const PDFDocument = require('pdfkit');
    return new Promise((resolve, reject) => {
        try {
            const pdf = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36, bufferPages: true });
            const chunks = [];
            pdf.on('data', (c) => chunks.push(c));
            pdf.on('end', () => resolve(Buffer.concat(chunks)));
            pdf.on('error', reject);
            const left = pdf.page.margins.left;
            const usable = pdf.page.width - pdf.page.margins.left - pdf.page.margins.right;
            const bottom = () => pdf.page.height - pdf.page.margins.bottom - 20;
            const BLUE = '#0f3b82';
            const GREY = '#64748b';
            if (doc.orgName) {
                pdf.font('Helvetica-Bold').fontSize(10).fillColor(GREY).text(doc.orgName, left, pdf.y);
            }
            pdf.font('Helvetica-Bold').fontSize(16).fillColor(BLUE).text(doc.title);
            if (doc.subtitle)
                pdf.font('Helvetica').fontSize(10).fillColor('#334155').text(doc.subtitle);
            const metaLine = [
                ...(doc.meta || []).map((m) => `${m.label}: ${m.value}`),
                'Amounts in INR, GST inclusive',
            ].join('   |   ');
            pdf.moveDown(0.2).font('Helvetica').fontSize(8.5).fillColor(GREY).text(metaLine, { width: usable });
            pdf.moveDown(0.6);
            if (doc.cards?.length) {
                const perRow = Math.min(doc.cards.length, 5);
                const gap = 8;
                const w = (usable - gap * (perRow - 1)) / perRow;
                const h = 46;
                let y = pdf.y;
                doc.cards.forEach((c, i) => {
                    const col = i % perRow;
                    if (col === 0 && i > 0)
                        y += h + gap;
                    const x = left + col * (w + gap);
                    pdf.roundedRect(x, y, w, h, 4).fillAndStroke('#f1f5fb', '#c7d2e0');
                    pdf.fillColor(GREY).font('Helvetica').fontSize(7.5).text(c.label.toUpperCase(), x + 8, y + 6, { width: w - 16 });
                    pdf.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text(c.value, x + 8, y + 17, { width: w - 16 });
                    if (c.sub)
                        pdf.fillColor(GREY).font('Helvetica').fontSize(7).text(c.sub, x + 8, y + 33, { width: w - 16 });
                });
                pdf.y = y + h + 14;
                pdf.x = left;
            }
            for (const section of doc.sections) {
                if (section.title) {
                    if (pdf.y > bottom() - 60)
                        pdf.addPage();
                    pdf.font('Helvetica-Bold').fontSize(11).fillColor(BLUE).text(section.title, left, pdf.y);
                    pdf.moveDown(0.3);
                }
                const weights = section.columns.map((c) => c.width || 1);
                const totalW = weights.reduce((a, b) => a + b, 0);
                const widths = weights.map((w) => (w / totalW) * usable);
                const pad = 4;
                const drawHeader = () => {
                    const y = pdf.y;
                    pdf.font('Helvetica-Bold').fontSize(8);
                    const heights = section.columns.map((c, i) => pdf.heightOfString(c.label, { width: widths[i] - pad * 2 }));
                    const h = Math.max(...heights) + pad * 2;
                    let x = left;
                    section.columns.forEach((c, i) => {
                        pdf.rect(x, y, widths[i], h).fillAndStroke('#e8eef8', '#c7d2e0');
                        pdf.fillColor(BLUE).text(c.label, x + pad, y + pad, {
                            width: widths[i] - pad * 2,
                            align: c.align || (c.money || c.percent ? 'right' : 'left'),
                        });
                        x += widths[i];
                    });
                    pdf.y = y + h;
                };
                drawHeader();
                pdf.font('Helvetica').fontSize(8);
                if (!section.rows.length) {
                    pdf.fillColor(GREY).text('No records', left + pad, pdf.y + pad);
                    pdf.moveDown(1);
                    continue;
                }
                section.rows.forEach((r, ri) => {
                    const cells = section.columns.map((c) => {
                        const v = r[c.key];
                        if (c.money)
                            return formatIndian(v);
                        if (c.percent)
                            return v === null || v === undefined ? '' : `${Number(v).toFixed(1)}%`;
                        return v === null || v === undefined ? '' : String(v);
                    });
                    pdf.font(r.__bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
                    const h = Math.max(...cells.map((t, i) => pdf.heightOfString(t || ' ', { width: widths[i] - pad * 2 }))) + pad * 2;
                    if (pdf.y + h > bottom()) {
                        pdf.addPage();
                        drawHeader();
                        pdf.font(r.__bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
                    }
                    const y = pdf.y;
                    let x = left;
                    cells.forEach((t, i) => {
                        const c = section.columns[i];
                        pdf.rect(x, y, widths[i], h).fillAndStroke(ri % 2 ? '#f7f9fc' : '#ffffff', '#d5dde8');
                        pdf.fillColor('#1f2937').text(t, x + pad, y + pad, {
                            width: widths[i] - pad * 2,
                            align: c.align || (c.money || c.percent ? 'right' : 'left'),
                        });
                        x += widths[i];
                    });
                    pdf.y = y + h;
                });
                pdf.moveDown(1);
                pdf.x = left;
            }
            const range = pdf.bufferedPageRange();
            const stamp = `Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC${doc.generatedBy ? ' by ' + doc.generatedBy : ''}`;
            for (let i = range.start; i < range.start + range.count; i++) {
                pdf.switchToPage(i);
                const origBottom = pdf.page.margins.bottom;
                pdf.page.margins.bottom = 0;
                const y = pdf.page.height - origBottom + 8;
                pdf.font('Helvetica').fontSize(7.5).fillColor(GREY);
                pdf.text(stamp, left, y, { width: usable / 2, lineBreak: false });
                pdf.text(`Page ${i - range.start + 1} of ${range.count}`, left + usable / 2, y, {
                    width: usable / 2, align: 'right', lineBreak: false,
                });
                pdf.page.margins.bottom = origBottom;
            }
            pdf.end();
        }
        catch (e) {
            reject(e);
        }
    });
}
function exportFileName(base, ext) {
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/^(\d{8})(\d{4})$/, '$1_$2');
    return `${base.replace(/[^A-Za-z0-9_-]+/g, '-')}_${stamp}.${ext}`;
}
function renderExport(doc, format, sheetName = 'Data') {
    if (format === 'pdf')
        return buildPdf(doc);
    if (format === 'csv')
        return Promise.resolve(buildCsv(doc));
    return buildXlsx(doc, sheetName);
}
