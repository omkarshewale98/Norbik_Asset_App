import { NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { RequestContextService } from '../common/context/request-context.service';
import { DatabaseService } from './database.service';
export declare class SetSchemaMiddleware implements NestMiddleware {
    private readonly databaseService;
    private readonly context;
    constructor(databaseService: DatabaseService, context: RequestContextService);
    use(req: Request, res: Response, next: NextFunction): Promise<void>;
}
