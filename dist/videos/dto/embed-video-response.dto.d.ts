export declare class EmbedVideoDto {
    uid: string;
    thumbnail?: string;
    preview?: string;
    readyToStream: boolean;
    status: {
        state: string;
    };
    meta?: {
        name: string;
        [key: string]: any;
    };
    duration?: number;
    playback: {
        hls: string;
        dash: string;
    };
}
export declare class EmbedVideoResponseDto {
    success: boolean;
    status: number;
    message: string;
    data: {
        result: EmbedVideoDto[];
    };
}
