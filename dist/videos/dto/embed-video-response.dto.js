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
exports.EmbedVideoResponseDto = exports.EmbedVideoDto = void 0;
const swagger_1 = require("@nestjs/swagger");
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
    (0, swagger_1.ApiProperty)({ description: 'Thumbnail URL', required: false }),
    __metadata("design:type", String)
], EmbedVideoDto.prototype, "thumbnail", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Preview URL', required: false }),
    __metadata("design:type", String)
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
    (0, swagger_1.ApiProperty)({ description: 'Video metadata', required: false }),
    __metadata("design:type", Object)
], EmbedVideoDto.prototype, "meta", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video duration in seconds', required: false }),
    __metadata("design:type", Number)
], EmbedVideoDto.prototype, "duration", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Playback URLs for different streaming formats' }),
    __metadata("design:type", Object)
], EmbedVideoDto.prototype, "playback", void 0);
class EmbedVideoResponseDto {
    success;
    status;
    message;
    data;
}
exports.EmbedVideoResponseDto = EmbedVideoResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Operation success status' }),
    __metadata("design:type", Boolean)
], EmbedVideoResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'HTTP status code' }),
    __metadata("design:type", Number)
], EmbedVideoResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Response message' }),
    __metadata("design:type", String)
], EmbedVideoResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Response data' }),
    __metadata("design:type", Object)
], EmbedVideoResponseDto.prototype, "data", void 0);
//# sourceMappingURL=embed-video-response.dto.js.map