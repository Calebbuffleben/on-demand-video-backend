import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { Video } from '@prisma/client';
import { GetUploadUrlDto } from './dto/get-upload-url.dto';
import { VideoStatusResponseDto } from './dto/video-status-response.dto';
import { VideoListResponseDto, SingleVideoResponseDto } from './dto/video-response.dto';
import { UpdateOrgCloudflareDto, CloudflareSettingsResponseDto } from './dto/update-org-cloudflare.dto';
import { EmbedVideoResponseDto } from './dto/embed-video-response.dto';
import { MuxService } from '../providers/mux/mux.service';
import { GetUploadUrlResponseDto } from './dto/get-upload-url-response.dto';
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
    private readonly logger;
    constructor(prisma: PrismaService, configService: ConfigService, muxService: MuxService);
    testCloudflareConnection(organizationId?: string): Promise<any>;
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
    getVideoForEmbed(videoId: string, organizationId?: string): Promise<EmbedVideoResponseDto>;
    private handleMuxAssetReady;
    private handleMuxAssetDeleted;
    private handleMuxAssetError;
    getUploadUrl(dto: GetUploadUrlDto): Promise<GetUploadUrlResponseDto>;
    getVideoStatus(videoId: string): Promise<VideoStatusResponseDto>;
    getAllVideos(): Promise<VideoListResponseDto>;
    getVideoByUid(uid: string): Promise<SingleVideoResponseDto>;
    updateOrgCloudflareSettings(updateOrgCloudflareDto: UpdateOrgCloudflareDto, organizationId: string): Promise<CloudflareSettingsResponseDto>;
    getOrgCloudflareSettings(organizationId: string): Promise<CloudflareSettingsResponseDto>;
    private maskString;
    private mapVideoToDto;
}
export {};
