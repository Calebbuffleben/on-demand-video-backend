import { CreateVideoDto } from './create-video.dto';
import { VideoDisplayOptionsDto } from './video-display-options.dto';
import { VideoEmbedOptionsDto } from './video-embed-options.dto';
declare const UpdateVideoDto_base: import("@nestjs/common").Type<Partial<CreateVideoDto>>;
export declare class UpdateVideoDto extends UpdateVideoDto_base {
    displayOptions?: VideoDisplayOptionsDto;
    embedOptions?: VideoEmbedOptionsDto;
}
export {};
