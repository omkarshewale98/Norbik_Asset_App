export declare const TechnicianDefaultPermission: ({
    module: number;
    submodule: number;
    actions: {
        VIEW: boolean;
        ADD?: undefined;
        EDIT?: undefined;
        IMPORT?: undefined;
        ASSIGN?: undefined;
        PRINT?: undefined;
    };
} | {
    module: number;
    submodule: number;
    actions: {
        ADD: boolean;
        VIEW: boolean;
        EDIT: boolean;
        IMPORT: boolean;
        ASSIGN?: undefined;
        PRINT?: undefined;
    };
} | {
    module: number;
    submodule: number;
    actions: {
        VIEW: boolean;
        ASSIGN: boolean;
        ADD?: undefined;
        EDIT?: undefined;
        IMPORT?: undefined;
        PRINT?: undefined;
    };
} | {
    module: number;
    submodule: number;
    actions: {
        ADD: boolean;
        VIEW: boolean;
        EDIT?: undefined;
        IMPORT?: undefined;
        ASSIGN?: undefined;
        PRINT?: undefined;
    };
} | {
    module: number;
    submodule: number;
    actions: {
        VIEW: boolean;
        EDIT: boolean;
        ADD?: undefined;
        IMPORT?: undefined;
        ASSIGN?: undefined;
        PRINT?: undefined;
    };
} | {
    module: number;
    submodule: number;
    actions: {
        PRINT: boolean;
        VIEW?: undefined;
        ADD?: undefined;
        EDIT?: undefined;
        IMPORT?: undefined;
        ASSIGN?: undefined;
    };
} | {
    module: number;
    submodule: number;
    actions: {
        ADD: boolean;
        VIEW: boolean;
        EDIT: boolean;
        IMPORT?: undefined;
        ASSIGN?: undefined;
        PRINT?: undefined;
    };
} | {
    module: number;
    submodule: number;
    actions: {
        EDIT: boolean;
        VIEW?: undefined;
        ADD?: undefined;
        IMPORT?: undefined;
        ASSIGN?: undefined;
        PRINT?: undefined;
    };
})[];
