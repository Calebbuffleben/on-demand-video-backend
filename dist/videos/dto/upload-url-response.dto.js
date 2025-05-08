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
exports.GetUploadUrlResponseDto = exports.UploadUrlResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class UploadUrlResponseDto {
    success;
    uploadUrl;
    videoId;
}
exports.UploadUrlResponseDto = UploadUrlResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether the operation was successful' }),
    __metadata("design:type", Boolean)
], UploadUrlResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'One-time upload URL' }),
    __metadata("design:type", String)
], UploadUrlResponseDto.prototype, "uploadUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Unique identifier for the video in our system' }),
    __metadata("design:type", String)
], UploadUrlResponseDto.prototype, "videoId", void 0);
class GetUploadUrlResponseDto {
    success;
    status;
    message;
    data;
}
exports.GetUploadUrlResponseDto = GetUploadUrlResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether the operation was successful' }),
    __metadata("design:type", Boolean)
], GetUploadUrlResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'HTTP status code' }),
    __metadata("design:type", Number)
], GetUploadUrlResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Response message' }),
    __metadata("design:type", String)
], GetUploadUrlResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Response data', type: UploadUrlResponseDto }),
    __metadata("design:type", UploadUrlResponseDto)
], GetUploadUrlResponseDto.prototype, "data", void 0);
//# sourceMappingURL=upload-url-response.dto.js.map