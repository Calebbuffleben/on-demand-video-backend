import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { GetUploadUrlDto } from './dto/get-upload-url.dto';
import { VideoStatusResponseDto } from './dto/video-status-response.dto';
import { VideoListResponseDto, SingleVideoResponseDto } from './dto/video-response.dto';
import { UpdateOrgCloudflareDto } from './dto/update-org-cloudflare.dto';
import { EmbedVideoResponseDto } from './dto/embed-video-response.dto';
import { GetUploadUrlResponseDto } from './dto/get-upload-url-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MuxWebhookController } from '../providers/mux/mux-webhook.controller';
import { UploadService } from './upload.service';
import { TranscodeCallbackDto } from './dto/transcode-callback.dto';
import { MultipartInitDto, MultipartPartUrlDto, MultipartCompleteDto, MultipartAbortDto } from './dto/multipart.dto';
import { Response } from 'express';
declare global {
    namespace Express {
        namespace Multer {
            interface File {
                fieldname: string;
                originalname: string;
                encoding: string;
                mimetype: string;
                size: number;
                destination: string;
                filename: string;
                path: string;
                buffer: Buffer;
            }
        }
    }
}
interface AuthenticatedRequest extends Request {
    organization: any;
    user: any;
}
export declare class VideosController {
    private readonly videosService;
    private readonly prismaService;
    private readonly muxWebhookController;
    private readonly uploadService;
    private readonly logger;
    constructor(videosService: VideosService, prismaService: PrismaService, muxWebhookController: MuxWebhookController, uploadService: UploadService);
    generateTestPlaybackToken(videoId: string, body: {
        expiryMinutes?: number;
    }): Promise<{
        success: boolean;
        token: string;
        expiresIn: number;
        videoId: string;
    }>;
    serveHls(videoId: string, filename: string, res: Response): Promise<void>;
    serveSignedMasterPlaylist(videoId: string, token: string, res: Response, req: any): Promise<void>;
    serveSignedSegment(videoId: string, filename: string, token: string, res: Response, req: any): Promise<void>;
    serveSignedThumbnail(videoId: string, filename: string, token: string, res: Response, req: any): Promise<void>;
    serveThumbnail(videoId: string, res: Response): Promise<void>;
    serveThumbFile(videoId: string, filename: string, res: Response): Promise<void>;
    generatePlaybackToken(videoId: string, body: {
        expiryMinutes?: number;
    }, req: any): Promise<{
        success: boolean;
        token: string;
        expiresIn: number;
        videoId: string;
    }>;
    findAllOrganizationVideos(req: AuthenticatedRequest): Promise<{
        success: boolean;
        status: number;
        message: string;
        data: {
            result: import("./dto/video-response.dto").VideoDto[];
            result_info: {
                count: number;
                page: number;
                per_page: number;
                total_count: number;
            };
        };
    }>;
    testCloudflareConnection(): Promise<any>;
    getAvailableProviders(req: AuthenticatedRequest): Promise<{
        default: import("./providers/video-provider.factory").ProviderType;
        available: Array<{
            type: import("./providers/video-provider.factory").ProviderType;
            name: string;
            enabled: boolean;
            supportsDirectUpload: boolean;
            supportsSignedPlayback: boolean;
        }>;
    }>;
    testAllProviders(req: AuthenticatedRequest): Promise<{
        INTERNAL?: {
            success: boolean;
            message?: string;
        } | undefined;
        MUX?: {
            success: boolean;
            message?: string;
        } | undefined;
    }>;
    findOrgVideo(id: string, req: AuthenticatedRequest): Promise<{
        tags: string[];
        description: string | null;
        name: string;
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        visibility: import(".prisma/client").$Enums.Visibility;
        ctaText: string | null;
        ctaButtonText: string | null;
        ctaLink: string | null;
        ctaStartTime: number | null;
        ctaEndTime: number | null;
        showProgressBar: boolean | null;
        showTitle: boolean | null;
        showPlaybackControls: boolean | null;
        autoPlay: boolean | null;
        muted: boolean | null;
        loop: boolean | null;
        useOriginalProgressBar: boolean | null;
        progressBarColor: string | null;
        progressEasing: number | null;
        playButtonColor: string | null;
        playButtonSize: number | null;
        playButtonBgColor: string | null;
        soundControlText: string | null;
        soundControlColor: string | null;
        soundControlOpacity: number | null;
        soundControlSize: number | null;
        showSoundControl: boolean | null;
        showVideoTitle: boolean | null;
        showUploadDate: boolean | null;
        showMetadata: boolean | null;
        allowFullscreen: boolean | null;
        responsive: boolean | null;
        showBranding: boolean | null;
        showTechnicalInfo: boolean | null;
        status: import(".prisma/client").$Enums.VideoStatus;
        duration: number | null;
        muxUploadId: string | null;
        muxAssetId: string | null;
        thumbnailUrl: string | null;
        playbackUrl: string | null;
        provider: import(".prisma/client").$Enums.VideoProvider;
        assetKey: string | null;
        jobId: string | null;
        playbackHlsPath: string | null;
        thumbnailPath: string | null;
        isLive: boolean;
        price: number | null;
        currency: string | null;
        muxPlaybackId: string | null;
    }>;
    createOrgUploadUrl(createVideoDto: CreateVideoDto, req: AuthenticatedRequest): Promise<{
        uploadUrl: string;
        videoId: string;
    }>;
    removeOrgVideo(id: string, req: AuthenticatedRequest): Promise<void>;
    updateOrgVideo(id: string, updateVideoDto: UpdateVideoDto, req: AuthenticatedRequest): Promise<{
        tags: string[];
        description: string | null;
        name: string;
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        visibility: import(".prisma/client").$Enums.Visibility;
        ctaText: string | null;
        ctaButtonText: string | null;
        ctaLink: string | null;
        ctaStartTime: number | null;
        ctaEndTime: number | null;
        showProgressBar: boolean | null;
        showTitle: boolean | null;
        showPlaybackControls: boolean | null;
        autoPlay: boolean | null;
        muted: boolean | null;
        loop: boolean | null;
        useOriginalProgressBar: boolean | null;
        progressBarColor: string | null;
        progressEasing: number | null;
        playButtonColor: string | null;
        playButtonSize: number | null;
        playButtonBgColor: string | null;
        soundControlText: string | null;
        soundControlColor: string | null;
        soundControlOpacity: number | null;
        soundControlSize: number | null;
        showSoundControl: boolean | null;
        showVideoTitle: boolean | null;
        showUploadDate: boolean | null;
        showMetadata: boolean | null;
        allowFullscreen: boolean | null;
        responsive: boolean | null;
        showBranding: boolean | null;
        showTechnicalInfo: boolean | null;
        status: import(".prisma/client").$Enums.VideoStatus;
        duration: number | null;
        muxUploadId: string | null;
        muxAssetId: string | null;
        thumbnailUrl: string | null;
        playbackUrl: string | null;
        provider: import(".prisma/client").$Enums.VideoProvider;
        assetKey: string | null;
        jobId: string | null;
        playbackHlsPath: string | null;
        thumbnailPath: string | null;
        isLive: boolean;
        price: number | null;
        currency: string | null;
        muxPlaybackId: string | null;
    }>;
    syncOrgVideoStatus(id: string, req: AuthenticatedRequest): Promise<{
        tags: string[];
        description: string | null;
        name: string;
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        visibility: import(".prisma/client").$Enums.Visibility;
        ctaText: string | null;
        ctaButtonText: string | null;
        ctaLink: string | null;
        ctaStartTime: number | null;
        ctaEndTime: number | null;
        showProgressBar: boolean | null;
        showTitle: boolean | null;
        showPlaybackControls: boolean | null;
        autoPlay: boolean | null;
        muted: boolean | null;
        loop: boolean | null;
        useOriginalProgressBar: boolean | null;
        progressBarColor: string | null;
        progressEasing: number | null;
        playButtonColor: string | null;
        playButtonSize: number | null;
        playButtonBgColor: string | null;
        soundControlText: string | null;
        soundControlColor: string | null;
        soundControlOpacity: number | null;
        soundControlSize: number | null;
        showSoundControl: boolean | null;
        showVideoTitle: boolean | null;
        showUploadDate: boolean | null;
        showMetadata: boolean | null;
        allowFullscreen: boolean | null;
        responsive: boolean | null;
        showBranding: boolean | null;
        showTechnicalInfo: boolean | null;
        status: import(".prisma/client").$Enums.VideoStatus;
        duration: number | null;
        muxUploadId: string | null;
        muxAssetId: string | null;
        thumbnailUrl: string | null;
        playbackUrl: string | null;
        provider: import(".prisma/client").$Enums.VideoProvider;
        assetKey: string | null;
        jobId: string | null;
        playbackHlsPath: string | null;
        thumbnailPath: string | null;
        isLive: boolean;
        price: number | null;
        currency: string | null;
        muxPlaybackId: string | null;
    }>;
    webhook(payload: any, signature: string): Promise<{
        success: boolean;
    }>;
    transcodeCallback(dto: TranscodeCallbackDto): Promise<{
        success: boolean;
        videoId: string;
    }>;
    getCloudflareUploadUrl(dto: GetUploadUrlDto, req: AuthenticatedRequest): Promise<GetUploadUrlResponseDto>;
    multipartInit(dto: MultipartInitDto, req: AuthenticatedRequest): Promise<{
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
    multipartComplete(dto: MultipartCompleteDto, req: AuthenticatedRequest): Promise<{
        success: boolean;
    }>;
    multipartAbort(dto: MultipartAbortDto): Promise<{
        success: boolean;
    }>;
    getVideoStatus(uid: string): Promise<VideoStatusResponseDto>;
    getVideoStatusAlias(id: string): Promise<VideoStatusResponseDto>;
    getAllCloudflareVideos(): Promise<VideoListResponseDto>;
    getVideoForEmbed(uid: string, req: Request, res: any): Promise<EmbedVideoResponseDto>;
    testEmbedCors(req: Request, res: any): Promise<any>;
    getVideoByUid(uid: string): Promise<SingleVideoResponseDto>;
    testOrgCloudflare(req: AuthenticatedRequest): Promise<any>;
    updateOrgCloudflareSettings(updateOrgCloudflareDto: UpdateOrgCloudflareDto, req: AuthenticatedRequest): Promise<import("./dto/update-org-cloudflare.dto").CloudflareSettingsResponseDto>;
    getOrgCloudflareSettings(req: AuthenticatedRequest): Promise<import("./dto/update-org-cloudflare.dto").CloudflareSettingsResponseDto>;
    testUpload(dto: GetUploadUrlDto): Promise<{
        success: boolean;
        pendingVideoId: string;
        uploadUrl: string;
        message: string;
    }>;
    testPendingVideo(body: any): Promise<{
        success: boolean;
        pendingVideoId: string;
        message: string;
    }>;
    testCreateVideo(body: any): Promise<{
        success: boolean;
        message: string;
        video: {
            tags: string[];
            description: string | null;
            name: string;
            id: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            visibility: import(".prisma/client").$Enums.Visibility;
            ctaText: string | null;
            ctaButtonText: string | null;
            ctaLink: string | null;
            ctaStartTime: number | null;
            ctaEndTime: number | null;
            showProgressBar: boolean | null;
            showTitle: boolean | null;
            showPlaybackControls: boolean | null;
            autoPlay: boolean | null;
            muted: boolean | null;
            loop: boolean | null;
            useOriginalProgressBar: boolean | null;
            progressBarColor: string | null;
            progressEasing: number | null;
            playButtonColor: string | null;
            playButtonSize: number | null;
            playButtonBgColor: string | null;
            soundControlText: string | null;
            soundControlColor: string | null;
            soundControlOpacity: number | null;
            soundControlSize: number | null;
            showSoundControl: boolean | null;
            showVideoTitle: boolean | null;
            showUploadDate: boolean | null;
            showMetadata: boolean | null;
            allowFullscreen: boolean | null;
            responsive: boolean | null;
            showBranding: boolean | null;
            showTechnicalInfo: boolean | null;
            status: import(".prisma/client").$Enums.VideoStatus;
            duration: number | null;
            muxUploadId: string | null;
            muxAssetId: string | null;
            thumbnailUrl: string | null;
            playbackUrl: string | null;
            provider: import(".prisma/client").$Enums.VideoProvider;
            assetKey: string | null;
            jobId: string | null;
            playbackHlsPath: string | null;
            thumbnailPath: string | null;
            isLive: boolean;
            price: number | null;
            currency: string | null;
            muxPlaybackId: string | null;
        };
    }>;
    uploadCoverImage(videoId: string, files: Express.Multer.File[], req: AuthenticatedRequest): Promise<{
        success: boolean;
        message: string;
        data: {
            result: {
                tags: string[];
                description: string | null;
                name: string;
                id: string;
                organizationId: string;
                createdAt: Date;
                updatedAt: Date;
                visibility: import(".prisma/client").$Enums.Visibility;
                ctaText: string | null;
                ctaButtonText: string | null;
                ctaLink: string | null;
                ctaStartTime: number | null;
                ctaEndTime: number | null;
                showProgressBar: boolean | null;
                showTitle: boolean | null;
                showPlaybackControls: boolean | null;
                autoPlay: boolean | null;
                muted: boolean | null;
                loop: boolean | null;
                useOriginalProgressBar: boolean | null;
                progressBarColor: string | null;
                progressEasing: number | null;
                playButtonColor: string | null;
                playButtonSize: number | null;
                playButtonBgColor: string | null;
                soundControlText: string | null;
                soundControlColor: string | null;
                soundControlOpacity: number | null;
                soundControlSize: number | null;
                showSoundControl: boolean | null;
                showVideoTitle: boolean | null;
                showUploadDate: boolean | null;
                showMetadata: boolean | null;
                allowFullscreen: boolean | null;
                responsive: boolean | null;
                showBranding: boolean | null;
                showTechnicalInfo: boolean | null;
                status: import(".prisma/client").$Enums.VideoStatus;
                duration: number | null;
                muxUploadId: string | null;
                muxAssetId: string | null;
                thumbnailUrl: string | null;
                playbackUrl: string | null;
                provider: import(".prisma/client").$Enums.VideoProvider;
                assetKey: string | null;
                jobId: string | null;
                playbackHlsPath: string | null;
                thumbnailPath: string | null;
                isLive: boolean;
                price: number | null;
                currency: string | null;
                muxPlaybackId: string | null;
            }[];
        };
    }>;
    removeCoverImage(videoId: string, req: AuthenticatedRequest): Promise<{
        success: boolean;
        message: string;
    }>;
}
export {};
