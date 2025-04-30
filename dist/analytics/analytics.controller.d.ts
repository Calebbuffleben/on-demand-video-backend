import { AnalyticsService } from './analytics.service';
import { QueryLimitDto } from './dto/analytics.dto';
interface AuthenticatedRequest extends Request {
    user: {
        organizationId: string;
    };
}
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getDashboard(req: AuthenticatedRequest): Promise<import("./interfaces/analytics.interfaces").DashboardResponse>;
    getPlatformStats(req: AuthenticatedRequest): Promise<import("./interfaces/analytics.interfaces").PlatformStats>;
    getRecentUploads(query: QueryLimitDto, req: AuthenticatedRequest): Promise<import("./interfaces/analytics.interfaces").RecentUpload[]>;
    getPopularVideos(query: QueryLimitDto, req: AuthenticatedRequest): Promise<import("./interfaces/analytics.interfaces").PopularVideo[]>;
}
export {};
