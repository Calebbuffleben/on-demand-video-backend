import { MuxService } from './mux.service';
import { UpdateOrgMuxDto, MuxSettingsResponseDto } from './dto/update-org-mux.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { Mux } from '@mux/mux-node';
interface AuthenticatedRequest extends Request {
    organization: any;
    user: any;
}
export declare class MuxController {
    private readonly muxService;
    private readonly prismaService;
    private readonly logger;
    constructor(muxService: MuxService, prismaService: PrismaService);
    testConnection(): Promise<any>;
    updateOrgMuxSettings(updateOrgMuxDto: UpdateOrgMuxDto, req: AuthenticatedRequest): Promise<MuxSettingsResponseDto>;
    getOrgMuxSettings(req: AuthenticatedRequest): Promise<MuxSettingsResponseDto>;
    testOrgConnection(req: AuthenticatedRequest): Promise<any>;
    simulateWebhook(payload: any): Promise<{
        success: boolean;
        message: string;
    }>;
    testAssetReady(data: any): Promise<{
        success: boolean;
        message: string;
        videoCreated: boolean;
        videoDetails: any;
    }>;
    private handleAssetReady;
    private maskString;
    checkPendingVideo(body: {
        pendingVideoId: string;
    }): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: Mux.Video.Assets.Asset;
    }>;
    listPendingVideos(): Promise<{
        success: boolean;
        count: number;
        pendingVideos: {
            id: string;
            name: string;
            muxUploadId: string | null;
            muxAssetId: string | null;
            status: import(".prisma/client").$Enums.VideoStatus;
            createdAt: Date;
        }[];
    }>;
    testCreatePendingVideo(body: {
        name?: string;
        organizationId: string;
        muxUploadId?: string;
    }): Promise<{
        success: boolean;
        message: string;
        pendingVideo: {
            tags: string[];
            description: string | null;
            name: string;
            id: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.VideoStatus;
            visibility: import(".prisma/client").$Enums.Visibility;
            muxUploadId: string | null;
            muxAssetId: string | null;
        };
    }>;
}
export {};
