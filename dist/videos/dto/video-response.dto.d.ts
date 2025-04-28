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
}
export declare class VideoInputDto {
    width?: number;
    height?: number;
}
export declare class VideoDto {
    uid: string;
    thumbnail?: string;
    preview?: string;
    readyToStream: boolean;
    readyToStreamAt?: string;
    status: VideoStatusDto;
    meta?: VideoMetaDto;
    duration?: number;
    created: string;
    modified?: string;
    size?: number;
    input?: VideoInputDto;
    playback: PlaybackDto;
}
export declare class VideoListResponseDto {
    success: boolean;
    status: number;
    message: string;
    data: {
        result: VideoDto[];
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
