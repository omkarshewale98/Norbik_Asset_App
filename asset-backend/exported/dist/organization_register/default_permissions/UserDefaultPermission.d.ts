export declare const userDefaultPermission: ({
    module: number;
    submodule: number;
    actions: {
        VIEW: boolean;
        EDIT?: undefined;
    };
} | {
    module: number;
    submodule: number;
    actions: {
        EDIT: boolean;
        VIEW?: undefined;
    };
} | {
    module: number;
    submodule: number;
    actions: {
        VIEW: boolean;
        EDIT: boolean;
    };
})[];
