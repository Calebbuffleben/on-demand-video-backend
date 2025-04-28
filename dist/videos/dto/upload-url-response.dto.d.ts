export declare class UploadUrlResponseDto {
    uploadURL: string;
    uid: string;
}
export declare class GetUploadUrlResponseDto {
    success: boolean;
    status: number;
    message: string;
    data: UploadUrlResponseDto;
}
