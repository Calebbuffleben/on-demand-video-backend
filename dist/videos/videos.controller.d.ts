import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { GetUploadUrlDto } from './dto/get-upload-url.dto';
import { UploadUrlResponseDto } from './dto/upload-url-response.dto';
import { VideoStatusResponseDto } from './dto/video-status-response.dto';
import { VideoListResponseDto, SingleVideoResponseDto } from './dto/video-response.dto';
import { UpdateOrgCloudflareDto } from './dto/update-org-cloudflare.dto';
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
        cloudflareId: string;
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
        cloudflareId: string;
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
        cloudflareId: string;
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
        cloudflareId: string;
        thumbnailUrl: string | null;
        playbackUrl: string | null;
        isLive: boolean;
        price: number | null;
        currency: string | null;
    }>;
    webhook(payload: any): Promise<{
        success: boolean;
    }>;
    getCloudflareUploadUrl(dto: GetUploadUrlDto): Promise<UploadUrlResponseDto>;
    getVideoStatus(videoId: string): Promise<VideoStatusResponseDto>;
    getAllCloudflareVideos(): Promise<VideoListResponseDto>;
    getVideoByUid(uid: string): Promise<SingleVideoResponseDto>;
    testOrgCloudflare(req: AuthenticatedRequest): Promise<any>;
    updateOrgCloudflareSettings(updateOrgCloudflareDto: UpdateOrgCloudflareDto, req: AuthenticatedRequest): Promise<import("./dto/update-org-cloudflare.dto").CloudflareSettingsResponseDto>;
    getOrgCloudflareSettings(req: AuthenticatedRequest): Promise<import("./dto/update-org-cloudflare.dto").CloudflareSettingsResponseDto>;
}
export {};
