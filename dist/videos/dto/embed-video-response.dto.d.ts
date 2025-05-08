export declare class EmbedVideoDto {
    uid: string;
    thumbnail: string | null;
    preview: string | null;
    readyToStream: boolean;
    status: {
        state: string;
    };
    meta: {
        name: string;
        [key: string]: any;
    };
    duration: number | null;
    playback: {
        hls: string | null;
        dash: string | null;
    };
}
export declare class EmbedVideoResponseDto {
    success: boolean;
    result: EmbedVideoDto;
}
