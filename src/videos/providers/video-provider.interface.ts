import { VideoStatus, Visibility } from '@prisma/client';

export interface CreateUploadUrlRequest {
  organizationId: string;
  name: string;
  description?: string;
  visibility?: Visibility;
  tags?: string[];
  requireSignedURLs?: boolean;
  maxDurationSeconds?: number;
}

export interface CreateUploadUrlResponse {
  success: boolean;
  uploadURL: string;
  uid: string;
  expiresAt?: Date;
}

export interface VideoStatusRequest {
  videoId: string;
  organizationId: string;
}

export interface VideoStatusResponse {
  success: boolean;
  video: {
    uid: string;
    readyToStream: boolean;
    status: {
      state: string;
      pctComplete?: string;
      errorReasonCode?: string;
      errorReasonText?: string;
    };
    thumbnail?: string;
    preview?: string;
    playback?: {
      hls?: string;
      dash?: string;
    };
    meta: {
      name: string;
    };
    duration?: number;
  };
}

export interface StartTranscodeRequest {
  videoId: string;
  organizationId: string;
  assetKey: string;
  sourcePath: string;
}

export interface StartTranscodeResponse {
  success: boolean;
  jobId?: string;
  message?: string;
}

export interface GeneratePlaybackTokenRequest {
  videoId: string;
  organizationId: string;
  expiryMinutes?: number;
}

export interface GeneratePlaybackTokenResponse {
  success: boolean;
  token: string;
  expiresIn: number;
  videoId: string;
}

/**
 * Abstract interface for video providers
 * Implementations: InternalProvider (R2 + FFmpeg), MuxProvider
 */
export abstract class VideoProvider {
  abstract readonly name: string;
  abstract readonly supportsDirectUpload: boolean;
  abstract readonly supportsSignedPlayback: boolean;

  /**
   * Create a direct upload URL for video upload
   */
  abstract createUploadUrl(request: CreateUploadUrlRequest): Promise<CreateUploadUrlResponse>;

  /**
   * Get video processing status and playback information
   */
  abstract getVideoStatus(request: VideoStatusRequest): Promise<VideoStatusResponse>;

  /**
   * Start transcoding process (if applicable)
   */
  abstract startTranscode(request: StartTranscodeRequest): Promise<StartTranscodeResponse>;

  /**
   * Generate signed playback token (if supported)
   */
  abstract generatePlaybackToken(request: GeneratePlaybackTokenRequest): Promise<GeneratePlaybackTokenResponse>;

  /**
   * Test provider connection/configuration
   */
  abstract testConnection(organizationId: string): Promise<{ success: boolean; message?: string }>;

  /**
   * Cleanup resources when video is deleted
   */
  abstract deleteVideo?(videoId: string, organizationId: string): Promise<{ success: boolean }>;
}
