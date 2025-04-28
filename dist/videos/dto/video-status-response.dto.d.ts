import { VideoDto } from './video-response.dto';
export declare class VideoStatusResponseDto {
    success: boolean;
    readyToStream: boolean;
    status: string;
    video: VideoDto;
}
