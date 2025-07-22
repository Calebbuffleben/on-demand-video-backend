import { VideoDisplayOptionsDto } from './video-display-options.dto';
import { VideoEmbedOptionsDto } from './video-embed-options.dto';
export declare class EmbedVideoMetaDto {
    name: string;
    displayOptions?: VideoDisplayOptionsDto;
    embedOptions?: VideoEmbedOptionsDto;
}
export declare class EmbedVideoDto {
    uid: string;
    thumbnail: string | null;
    preview: string | null;
    readyToStream: boolean;
    status: {
        state: string;
    };
    meta: EmbedVideoMetaDto;
    duration: number | null;
    playback: {
        hls: string | null;
        dash: string | null;
    };
    ctaText?: string | null;
    ctaButtonText?: string | null;
    ctaLink?: string | null;
    ctaStartTime?: number | null;
    ctaEndTime?: number | null;
}
export declare class EmbedVideoResponseDto {
    success: boolean;
    result: EmbedVideoDto;
}
