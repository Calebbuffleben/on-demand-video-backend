export declare class UploadUrlResponseDto {
    success: boolean;
    uploadUrl: string;
    videoId: string;
}
export declare class GetUploadUrlResponseDto {
    success: boolean;
    status: number;
    message: string;
    data: UploadUrlResponseDto;
}
