import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHello(): {
        message: string;
    };
    testAuth(req: any): {
        message: string;
        user: any;
        organization: any;
        timestamp: string;
    };
}
