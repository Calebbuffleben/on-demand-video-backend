"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SingleVideoResponseDto = exports.VideoListResponseDto = exports.ResultInfoDto = exports.VideoDto = exports.VideoInputDto = exports.VideoMetaDto = exports.VideoStatusDto = exports.PlaybackDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const video_display_options_dto_1 = require("./video-display-options.dto");
const video_embed_options_dto_1 = require("./video-embed-options.dto");
const class_transformer_1 = require("class-transformer");
class PlaybackDto {
    hls;
    dash;
}
exports.PlaybackDto = PlaybackDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'HLS manifest URL' }),
    __metadata("design:type", String)
], PlaybackDto.prototype, "hls", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'DASH manifest URL' }),
    __metadata("design:type", String)
], PlaybackDto.prototype, "dash", void 0);
class VideoStatusDto {
    state;
    pctComplete;
    errorReasonCode;
    errorReasonText;
}
exports.VideoStatusDto = VideoStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current state of the video' }),
    __metadata("design:type", String)
], VideoStatusDto.prototype, "state", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Percentage of processing complete', required: false }),
    __metadata("design:type", String)
], VideoStatusDto.prototype, "pctComplete", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Error reason code if any', required: false }),
    __metadata("design:type", String)
], VideoStatusDto.prototype, "errorReasonCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Error reason text if any', required: false }),
    __metadata("design:type", String)
], VideoStatusDto.prototype, "errorReasonText", void 0);
class VideoMetaDto {
    filename;
    filetype;
    name;
    relativePath;
    type;
    displayOptions;
    embedOptions;
}
exports.VideoMetaDto = VideoMetaDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Original filename', required: false }),
    __metadata("design:type", String)
], VideoMetaDto.prototype, "filename", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'File type', required: false }),
    __metadata("design:type", String)
], VideoMetaDto.prototype, "filetype", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Custom name', required: false }),
    __metadata("design:type", String)
], VideoMetaDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Relative path', required: false }),
    __metadata("design:type", String)
], VideoMetaDto.prototype, "relativePath", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Content type', required: false }),
    __metadata("design:type", String)
], VideoMetaDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Display options for the video player',
        required: false,
        type: () => video_display_options_dto_1.VideoDisplayOptionsDto
    }),
    (0, class_transformer_1.Type)(() => video_display_options_dto_1.VideoDisplayOptionsDto),
    __metadata("design:type", video_display_options_dto_1.VideoDisplayOptionsDto)
], VideoMetaDto.prototype, "displayOptions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Embed options for the video',
        required: false,
        type: () => video_embed_options_dto_1.VideoEmbedOptionsDto
    }),
    (0, class_transformer_1.Type)(() => video_embed_options_dto_1.VideoEmbedOptionsDto),
    __metadata("design:type", video_embed_options_dto_1.VideoEmbedOptionsDto)
], VideoMetaDto.prototype, "embedOptions", void 0);
class VideoInputDto {
    width;
    height;
}
exports.VideoInputDto = VideoInputDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Input width', required: false }),
    __metadata("design:type", Number)
], VideoInputDto.prototype, "width", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Input height', required: false }),
    __metadata("design:type", Number)
], VideoInputDto.prototype, "height", void 0);
class VideoDto {
    uid;
    thumbnail;
    readyToStream;
    status;
    meta;
    created;
    modified;
    duration;
    size;
    preview;
    playback;
    ctaText;
    ctaButtonText;
    ctaLink;
    ctaStartTime;
    ctaEndTime;
}
exports.VideoDto = VideoDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video UID' }),
    __metadata("design:type", String)
], VideoDto.prototype, "uid", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video thumbnail URL' }),
    __metadata("design:type", String)
], VideoDto.prototype, "thumbnail", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether the video is ready to stream' }),
    __metadata("design:type", Boolean)
], VideoDto.prototype, "readyToStream", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video status' }),
    __metadata("design:type", Object)
], VideoDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video metadata' }),
    __metadata("design:type", Object)
], VideoDto.prototype, "meta", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Creation timestamp' }),
    __metadata("design:type", String)
], VideoDto.prototype, "created", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Last modification timestamp' }),
    __metadata("design:type", String)
], VideoDto.prototype, "modified", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video duration in seconds' }),
    __metadata("design:type", Number)
], VideoDto.prototype, "duration", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video size in bytes' }),
    __metadata("design:type", Number)
], VideoDto.prototype, "size", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video preview URL' }),
    __metadata("design:type", String)
], VideoDto.prototype, "preview", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video playback URLs' }),
    __metadata("design:type", Object)
], VideoDto.prototype, "playback", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'CTA text to display as a message', required: false, nullable: true }),
    __metadata("design:type", Object)
], VideoDto.prototype, "ctaText", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'CTA button text', required: false, nullable: true }),
    __metadata("design:type", Object)
], VideoDto.prototype, "ctaButtonText", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'CTA link URL', required: false, nullable: true }),
    __metadata("design:type", Object)
], VideoDto.prototype, "ctaLink", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'CTA start time in seconds', required: false, nullable: true }),
    __metadata("design:type", Object)
], VideoDto.prototype, "ctaStartTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'CTA end time in seconds', required: false, nullable: true }),
    __metadata("design:type", Object)
], VideoDto.prototype, "ctaEndTime", void 0);
class ResultInfoDto {
    total_count;
    per_page;
    page;
    count;
}
exports.ResultInfoDto = ResultInfoDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total number of results' }),
    __metadata("design:type", Number)
], ResultInfoDto.prototype, "total_count", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of results per page' }),
    __metadata("design:type", Number)
], ResultInfoDto.prototype, "per_page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current page number' }),
    __metadata("design:type", Number)
], ResultInfoDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of results in the current page' }),
    __metadata("design:type", Number)
], ResultInfoDto.prototype, "count", void 0);
class VideoListResponseDto {
    success;
    status;
    message;
    data;
}
exports.VideoListResponseDto = VideoListResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether the operation was successful' }),
    __metadata("design:type", Boolean)
], VideoListResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'HTTP status code' }),
    __metadata("design:type", Number)
], VideoListResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Response message' }),
    __metadata("design:type", String)
], VideoListResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Response data',
        type: 'object',
        properties: {
            result: { type: 'array', items: { $ref: '#/components/schemas/VideoDto' } },
            result_info: {
                type: 'object',
                properties: {
                    count: { type: 'number' },
                    page: { type: 'number' },
                    per_page: { type: 'number' },
                    total_count: { type: 'number' },
                },
            },
        },
    }),
    __metadata("design:type", Object)
], VideoListResponseDto.prototype, "data", void 0);
class SingleVideoResponseDto {
    success;
    status;
    message;
    data;
}
exports.SingleVideoResponseDto = SingleVideoResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether the operation was successful' }),
    __metadata("design:type", Boolean)
], SingleVideoResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'HTTP status code' }),
    __metadata("design:type", Number)
], SingleVideoResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Response message' }),
    __metadata("design:type", String)
], SingleVideoResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Response data containing the video' }),
    __metadata("design:type", Object)
], SingleVideoResponseDto.prototype, "data", void 0);
//# sourceMappingURL=video-response.dto.js.map