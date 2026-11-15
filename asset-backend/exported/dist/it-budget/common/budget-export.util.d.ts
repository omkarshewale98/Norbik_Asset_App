export interface ExportColumn {
    key: string;
    label: string;
    width?: number;
    align?: 'left' | 'right' | 'center';
    money?: boolean;
    percent?: boolean;
}
export interface ExportCard {
    label: string;
    value: string;
    sub?: string;
}
export interface ExportSection {
    title?: string;
    columns: ExportColumn[];
    rows: Record<string, any>[];
}
export interface ExportDocument {
    title: string;
    subtitle?: string;
    orgName?: string;
    meta?: {
        label: string;
        value: string;
    }[];
    cards?: ExportCard[];
    sections: ExportSection[];
    generatedBy?: string;
}
export declare function formatIndian(value: any, decimals?: number): string;
export type ExportFormat = 'xlsx' | 'csv' | 'pdf';
export declare function exportFormat(v: any): ExportFormat;
export declare const EXPORT_CONTENT_TYPE: Record<ExportFormat, string>;
export declare function visibleKeys(vc: any, order?: any): string[] | null;
export declare function pickColumns(all: ExportColumn[], vc: any, order?: any, always?: string[], alias?: Record<string, string>): ExportColumn[];
export declare function applySelection<T extends Record<string, any>>(rows: T[], input: any, idKey: string): T[];
export declare function buildCsv(doc: ExportDocument): Buffer;
export declare function buildXlsx(doc: ExportDocument, sheetName?: string): Promise<Buffer>;
export declare function buildPdf(doc: ExportDocument): Promise<Buffer>;
export declare function exportFileName(base: string, ext: ExportFormat): string;
export declare function renderExport(doc: ExportDocument, format: ExportFormat, sheetName?: string): Promise<Buffer>;
