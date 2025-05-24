import { VideoDisplayOptionsDto } from './video-display-options.dto';
import { VideoEmbedOptionsDto } from './video-embed-options.dto';
export declare class PlaybackDto {
    hls: string;
    dash: string;
}
export declare class VideoStatusDto {
    state: string;
    pctComplete?: string;
    errorReasonCode?: string;
    errorReasonText?: string;
}
export declare class VideoMetaDto {
    filename?: string;
    filetype?: string;
    name?: string;
    relativePath?: string;
    type?: string;
    displayOptions?: VideoDisplayOptionsDto;
    embedOptions?: VideoEmbedOptionsDto;
}
export declare class VideoInputDto {
    width?: number;
    height?: number;
}
export declare class VideoDto {
    uid: string;
    thumbnail: string;
    readyToStream: boolean;
    status: {
        state: string;
    };
    meta: {
        name: string;
        displayOptions?: VideoDisplayOptionsDto;
        embedOptions?: VideoEmbedOptionsDto;
    };
    created: string;
    modified: string;
    duration: number;
    size: number;
    preview: string;
    playback: {
        hls: string;
        dash: string;
    };
    ctaText?: string;
    ctaButtonText?: string;
    ctaLink?: string;
    ctaStartTime?: number;
    ctaEndTime?: number;
}
export declare class ResultInfoDto {
    total_count: number;
    per_page: number;
    page: number;
    count: number;
}
export declare class VideoListResponseDto {
    success: boolean;
    status: number;
    message: string;
    data: {
        result: VideoDto[];
        result_info: {
            count: number;
            page: number;
            per_page: number;
            total_count: number;
        };
    };
}
export declare class SingleVideoResponseDto {
    success: boolean;
    status: number;
    message: string;
    data: {
        result: VideoDto;
    };
}
