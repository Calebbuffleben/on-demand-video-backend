import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreateVideoDto } from './dto/create-video.dto';
import { R2Service } from '../storage/r2.service';
import { UpdateVideoDto } from './dto/update-video.dto';
import { Video } from '@prisma/client';
import { GetUploadUrlDto } from './dto/get-upload-url.dto';
import { VideoStatusResponseDto } from './dto/video-status-response.dto';
import { VideoDto, VideoListResponseDto, SingleVideoResponseDto } from './dto/video-response.dto';
import { UpdateOrgCloudflareDto, CloudflareSettingsResponseDto } from './dto/update-org-cloudflare.dto';
import { EmbedVideoResponseDto } from './dto/embed-video-response.dto';
import { MuxService } from '../providers/mux/mux.service';
import { GetUploadUrlResponseDto } from './dto/get-upload-url-response.dto';
import { MultipartInitDto, MultipartPartUrlDto, MultipartCompleteDto, MultipartAbortDto } from './dto/multipart.dto';
import { TranscodeQueue } from '../queue/transcode.queue';
import { JwtPlaybackService } from './jwt-playback.service';
import { VideoProviderFactory } from './providers/video-provider.factory';
interface CloudflareWebhookPayload {
    uid: string;
    status?: string;
    duration?: number;
    thumbnail?: string;
    preview?: string;
    [key: string]: any;
}
export declare class VideosService {
    private prisma;
    private configService;
    private muxService;
    private r2;
    private transcodeQueue;
    private jwtPlayback;
    private providerFactory;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ConfigService, muxService: MuxService, r2: R2Service, transcodeQueue: TranscodeQueue, jwtPlayback: JwtPlaybackService, providerFactory: VideoProviderFactory);
    testCloudflareConnection(organizationId?: string): Promise<any>;
    getAvailableProviders(organizationId: string): Promise<{
        default: import("./providers/video-provider.factory").ProviderType;
        available: Array<{
            type: import("./providers/video-provider.factory").ProviderType;
            name: string;
            enabled: boolean;
            supportsDirectUpload: boolean;
            supportsSignedPlayback: boolean;
        }>;
    }>;
    testAllProviders(organizationId: string): Promise<{
        INTERNAL?: {
            success: boolean;
            message?: string;
        } | undefined;
        MUX?: {
            success: boolean;
            message?: string;
        } | undefined;
    }>;
    findAll(organizationId: string): Promise<Video[]>;
    findOne(id: string, organizationId: string): Promise<Video>;
    createDirectUploadUrl(createVideoDto: CreateVideoDto, organizationId: string): Promise<{
        uploadUrl: string;
        videoId: string;
    }>;
    update(id: string, updateVideoDto: UpdateVideoDto, organizationId: string): Promise<Video>;
    remove(id: string, organizationId: string): Promise<void>;
    syncVideoStatus(id: string, organizationId: string): Promise<Video>;
    handleCloudflareWebhook(payload: CloudflareWebhookPayload): Promise<void>;
    handleMuxWebhook(payload: any, signature: string): Promise<void>;
    private mapVideoStatus;
    private isVideo;
    private generatePlaybackUrls;
    getVideoForEmbed(videoId: string, organizationId?: string): Promise<EmbedVideoResponseDto>;
    private handleMuxAssetReady;
    private handleMuxAssetDeleted;
    private handleMuxAssetError;
    getUploadUrl(dto: GetUploadUrlDto): Promise<GetUploadUrlResponseDto>;
    multipartInit(dto: MultipartInitDto): Promise<{
        success: boolean;
        data: {
            uid: `${string}-${string}-${string}-${string}-${string}`;
            key: string;
            uploadId: string;
        };
    }>;
    multipartPartUrl(dto: MultipartPartUrlDto): Promise<{
        success: boolean;
        data: {
            url: string;
        };
    }>;
    multipartComplete(dto: MultipartCompleteDto): Promise<{
        success: boolean;
    }>;
    multipartAbort(dto: MultipartAbortDto): Promise<{
        success: boolean;
    }>;
    handleTranscodeCallback(dto: any): Promise<{
        success: boolean;
        videoId: string;
    }>;
    serveHlsFile(videoId: string, filename: string, res: any): Promise<void>;
    serveThumbnail(videoId: string, res: any): Promise<void>;
    serveThumbFile(videoId: string, filename: string, res: any): Promise<void>;
    generatePlaybackToken(videoId: string, organizationId: string, expiryMinutes?: number): Promise<{
        success: boolean;
        token: string;
        expiresIn: number;
        videoId: string;
    }>;
    getVideoStatus(videoId: string): Promise<VideoStatusResponseDto>;
    getAllVideos(): Promise<VideoListResponseDto>;
    getVideoByUid(uid: string): Promise<SingleVideoResponseDto>;
    updateOrgCloudflareSettings(updateOrgCloudflareDto: UpdateOrgCloudflareDto, organizationId: string): Promise<CloudflareSettingsResponseDto>;
    getOrgCloudflareSettings(organizationId: string): Promise<CloudflareSettingsResponseDto>;
    private maskString;
    mapVideoToDto(video: Video): VideoDto;
    serveSignedMasterPlaylist(videoId: string, token: string, res: any, req: any): Promise<void>;
    serveSignedSegment(videoId: string, filename: string, token: string, res: any, req: any): Promise<void>;
    serveSignedThumbnail(videoId: string, filename: string, token: string, res: any, req: any): Promise<void>;
}
export {};
