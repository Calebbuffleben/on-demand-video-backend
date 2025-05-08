export declare class VideoPlaybackDto {
    hls: string;
    dash: string;
}
export declare class VideoMetaDto {
    name: string;
}
export declare class VideoStatusResponseDto {
    success: boolean;
    readyToStream: boolean;
    status: string;
    thumbnail: string;
    preview: string;
    playback: VideoPlaybackDto;
    meta: VideoMetaDto;
    uid: string;
    duration: number;
}
