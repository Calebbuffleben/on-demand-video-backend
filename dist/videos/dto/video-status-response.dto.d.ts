import { VideoDisplayOptionsDto } from './video-display-options.dto';
import { VideoEmbedOptionsDto } from './video-embed-options.dto';
export declare class VideoPlaybackDto {
    hls: string;
    dash: string;
}
export declare class VideoMetaDto {
    name: string;
    displayOptions?: VideoDisplayOptionsDto;
    embedOptions?: VideoEmbedOptionsDto;
}
export declare class VideoStatusDto {
    state: string;
}
export declare class VideoDetailsDto {
    uid: string;
    readyToStream: boolean;
    status: VideoStatusDto;
    thumbnail: string;
    preview: string;
    playback: VideoPlaybackDto;
    meta: VideoMetaDto;
    duration: number;
}
export declare class VideoStatusResponseDto {
    success: boolean;
    video: VideoDetailsDto;
}
