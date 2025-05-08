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
exports.VideoStatusResponseDto = exports.VideoMetaDto = exports.VideoPlaybackDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class VideoPlaybackDto {
    hls;
    dash;
}
exports.VideoPlaybackDto = VideoPlaybackDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'HLS playback URL' }),
    __metadata("design:type", String)
], VideoPlaybackDto.prototype, "hls", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'DASH playback URL' }),
    __metadata("design:type", String)
], VideoPlaybackDto.prototype, "dash", void 0);
class VideoMetaDto {
    name;
}
exports.VideoMetaDto = VideoMetaDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video name' }),
    __metadata("design:type", String)
], VideoMetaDto.prototype, "name", void 0);
class VideoStatusResponseDto {
    success;
    readyToStream;
    status;
    thumbnail;
    preview;
    playback;
    meta;
    uid;
    duration;
}
exports.VideoStatusResponseDto = VideoStatusResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether the operation was successful' }),
    __metadata("design:type", Boolean)
], VideoStatusResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether the video is ready to stream' }),
    __metadata("design:type", Boolean)
], VideoStatusResponseDto.prototype, "readyToStream", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current status of the video' }),
    __metadata("design:type", String)
], VideoStatusResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video thumbnail URL' }),
    __metadata("design:type", String)
], VideoStatusResponseDto.prototype, "thumbnail", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video preview URL' }),
    __metadata("design:type", String)
], VideoStatusResponseDto.prototype, "preview", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video playback URLs', type: VideoPlaybackDto }),
    __metadata("design:type", VideoPlaybackDto)
], VideoStatusResponseDto.prototype, "playback", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video metadata', type: VideoMetaDto }),
    __metadata("design:type", VideoMetaDto)
], VideoStatusResponseDto.prototype, "meta", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video unique identifier' }),
    __metadata("design:type", String)
], VideoStatusResponseDto.prototype, "uid", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video duration in seconds' }),
    __metadata("design:type", Number)
], VideoStatusResponseDto.prototype, "duration", void 0);
//# sourceMappingURL=video-status-response.dto.js.map