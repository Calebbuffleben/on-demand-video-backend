import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { GetUploadUrlDto } from './dto/get-upload-url.dto';
import { VideoStatusResponseDto } from './dto/video-status-response.dto';
import { VideoListResponseDto, SingleVideoResponseDto } from './dto/video-response.dto';
import { UpdateOrgCloudflareDto } from './dto/update-org-cloudflare.dto';
import { EmbedVideoResponseDto } from './dto/embed-video-response.dto';
import { GetUploadUrlResponseDto } from './dto/get-upload-url-response.dto';
interface AuthenticatedRequest extends Request {
    organization: any;
    user: any;
}
export declare class VideosController {
    private readonly videosService;
    constructor(videosService: VideosService);
    findAllOrganizationVideos(req: AuthenticatedRequest): Promise<{
        tags: string[];
        description: string | null;
        organizationId: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        visibility: import(".prisma/client").$Enums.Visibility;
        status: import(".prisma/client").$Enums.VideoStatus;
        duration: number | null;
        muxAssetId: string | null;
        muxPlaybackId: string | null;
        muxUploadId: string | null;
        thumbnailUrl: string | null;
        playbackUrl: string | null;
        isLive: boolean;
        price: number | null;
        currency: string | null;
    }[]>;
    testCloudflareConnection(): Promise<any>;
    findOrgVideo(id: string, req: AuthenticatedRequest): Promise<{
        tags: string[];
        description: string | null;
        organizationId: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        visibility: import(".prisma/client").$Enums.Visibility;
        status: import(".prisma/client").$Enums.VideoStatus;
        duration: number | null;
        muxAssetId: string | null;
        muxPlaybackId: string | null;
        muxUploadId: string | null;
        thumbnailUrl: string | null;
        playbackUrl: string | null;
        isLive: boolean;
        price: number | null;
        currency: string | null;
    }>;
    createOrgUploadUrl(createVideoDto: CreateVideoDto, req: AuthenticatedRequest): Promise<{
        uploadUrl: string;
        videoId: string;
    }>;
    updateOrgVideo(id: string, updateVideoDto: UpdateVideoDto, req: AuthenticatedRequest): Promise<{
        tags: string[];
        description: string | null;
        organizationId: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        visibility: import(".prisma/client").$Enums.Visibility;
        status: import(".prisma/client").$Enums.VideoStatus;
        duration: number | null;
        muxAssetId: string | null;
        muxPlaybackId: string | null;
        muxUploadId: string | null;
        thumbnailUrl: string | null;
        playbackUrl: string | null;
        isLive: boolean;
        price: number | null;
        currency: string | null;
    }>;
    removeOrgVideo(id: string, req: AuthenticatedRequest): Promise<void>;
    syncOrgVideoStatus(id: string, req: AuthenticatedRequest): Promise<{
        tags: string[];
        description: string | null;
        organizationId: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        visibility: import(".prisma/client").$Enums.Visibility;
        status: import(".prisma/client").$Enums.VideoStatus;
        duration: number | null;
        muxAssetId: string | null;
        muxPlaybackId: string | null;
        muxUploadId: string | null;
        thumbnailUrl: string | null;
        playbackUrl: string | null;
        isLive: boolean;
        price: number | null;
        currency: string | null;
    }>;
    webhook(payload: any): Promise<{
        success: boolean;
    }>;
    muxWebhook(payload: any, signature: string): Promise<{
        success: boolean;
    }>;
    getCloudflareUploadUrl(dto: GetUploadUrlDto, req: AuthenticatedRequest): Promise<GetUploadUrlResponseDto>;
    getVideoStatus(uid: string): Promise<VideoStatusResponseDto>;
    getAllCloudflareVideos(): Promise<VideoListResponseDto>;
    getVideoByUid(uid: string): Promise<SingleVideoResponseDto>;
    testOrgCloudflare(req: AuthenticatedRequest): Promise<any>;
    updateOrgCloudflareSettings(updateOrgCloudflareDto: UpdateOrgCloudflareDto, req: AuthenticatedRequest): Promise<import("./dto/update-org-cloudflare.dto").CloudflareSettingsResponseDto>;
    getOrgCloudflareSettings(req: AuthenticatedRequest): Promise<import("./dto/update-org-cloudflare.dto").CloudflareSettingsResponseDto>;
    getVideoForEmbed(uid: string, req: Request): Promise<EmbedVideoResponseDto>;
}
export {};
