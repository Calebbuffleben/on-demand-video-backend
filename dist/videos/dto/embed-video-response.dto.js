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
exports.EmbedVideoResponseDto = exports.EmbedVideoDto = exports.EmbedVideoMetaDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const video_display_options_dto_1 = require("./video-display-options.dto");
const video_embed_options_dto_1 = require("./video-embed-options.dto");
const class_transformer_1 = require("class-transformer");
class EmbedVideoMetaDto {
    name;
    displayOptions;
    embedOptions;
}
exports.EmbedVideoMetaDto = EmbedVideoMetaDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video name' }),
    __metadata("design:type", String)
], EmbedVideoMetaDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Display options for the video player',
        type: () => video_display_options_dto_1.VideoDisplayOptionsDto,
        required: false
    }),
    (0, class_transformer_1.Type)(() => video_display_options_dto_1.VideoDisplayOptionsDto),
    __metadata("design:type", video_display_options_dto_1.VideoDisplayOptionsDto)
], EmbedVideoMetaDto.prototype, "displayOptions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Embed options for the video',
        type: () => video_embed_options_dto_1.VideoEmbedOptionsDto,
        required: false
    }),
    (0, class_transformer_1.Type)(() => video_embed_options_dto_1.VideoEmbedOptionsDto),
    __metadata("design:type", video_embed_options_dto_1.VideoEmbedOptionsDto)
], EmbedVideoMetaDto.prototype, "embedOptions", void 0);
class EmbedVideoDto {
    uid;
    thumbnail;
    preview;
    readyToStream;
    status;
    meta;
    duration;
    playback;
}
exports.EmbedVideoDto = EmbedVideoDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Unique identifier of the video' }),
    __metadata("design:type", String)
], EmbedVideoDto.prototype, "uid", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Thumbnail URL', required: false, nullable: true }),
    __metadata("design:type", Object)
], EmbedVideoDto.prototype, "thumbnail", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Preview URL', required: false, nullable: true }),
    __metadata("design:type", Object)
], EmbedVideoDto.prototype, "preview", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether the video is ready to stream' }),
    __metadata("design:type", Boolean)
], EmbedVideoDto.prototype, "readyToStream", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video status information' }),
    __metadata("design:type", Object)
], EmbedVideoDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video metadata', type: () => EmbedVideoMetaDto }),
    __metadata("design:type", EmbedVideoMetaDto)
], EmbedVideoDto.prototype, "meta", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video duration in seconds', required: false, nullable: true }),
    __metadata("design:type", Object)
], EmbedVideoDto.prototype, "duration", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Playback URLs for different streaming formats' }),
    __metadata("design:type", Object)
], EmbedVideoDto.prototype, "playback", void 0);
class EmbedVideoResponseDto {
    success;
    result;
}
exports.EmbedVideoResponseDto = EmbedVideoResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether the operation was successful' }),
    __metadata("design:type", Boolean)
], EmbedVideoResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video details', type: () => EmbedVideoDto }),
    __metadata("design:type", EmbedVideoDto)
], EmbedVideoResponseDto.prototype, "result", void 0);
//# sourceMappingURL=embed-video-response.dto.js.map