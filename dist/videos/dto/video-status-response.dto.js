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
exports.VideoStatusResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const video_response_dto_1 = require("./video-response.dto");
class VideoStatusResponseDto {
    success;
    readyToStream;
    status;
    video;
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
    (0, swagger_1.ApiProperty)({ description: 'Video details', type: video_response_dto_1.VideoDto }),
    __metadata("design:type", video_response_dto_1.VideoDto)
], VideoStatusResponseDto.prototype, "video", void 0);
//# sourceMappingURL=video-status-response.dto.js.map