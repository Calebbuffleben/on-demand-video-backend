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
exports.PopularVideosResponseDto = exports.RecentUploadsResponseDto = exports.PlatformStatsResponseDto = exports.DashboardResponseDto = exports.PopularVideoDto = exports.RecentUploadDto = exports.PlatformStatsDto = exports.QueryLimitDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class QueryLimitDto {
    limit = 5;
}
exports.QueryLimitDto = QueryLimitDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Number of items to return',
        required: false,
        default: 5,
        example: 5,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], QueryLimitDto.prototype, "limit", void 0);
class PlatformStatsDto {
    totalVideos;
    totalViews;
    totalStorage;
    totalBandwidth;
}
exports.PlatformStatsDto = PlatformStatsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total number of videos',
        example: 125,
    }),
    __metadata("design:type", Number)
], PlatformStatsDto.prototype, "totalVideos", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total views across all videos',
        example: 5437,
    }),
    __metadata("design:type", Number)
], PlatformStatsDto.prototype, "totalViews", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Formatted storage used',
        example: '2.4 GB',
    }),
    __metadata("design:type", String)
], PlatformStatsDto.prototype, "totalStorage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Formatted bandwidth used',
        example: '5.7 GB',
    }),
    __metadata("design:type", String)
], PlatformStatsDto.prototype, "totalBandwidth", void 0);
class RecentUploadDto {
    id;
    title;
    thumbnailUrl;
    uploadDate;
    size;
    duration;
}
exports.RecentUploadDto = RecentUploadDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Video ID (Cloudflare UID)',
        example: 'a1b2c3d4e5f6',
    }),
    __metadata("design:type", String)
], RecentUploadDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Video title',
        example: 'Introduction to NestJS',
    }),
    __metadata("design:type", String)
], RecentUploadDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Thumbnail URL from Cloudflare',
        example: 'https://cloudflarestream.com/a1b2c3d4e5f6/thumbnails/thumbnail.jpg',
    }),
    __metadata("design:type", String)
], RecentUploadDto.prototype, "thumbnailUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Formatted upload date',
        example: 'Jul 15, 2023',
    }),
    __metadata("design:type", String)
], RecentUploadDto.prototype, "uploadDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Formatted video size',
        example: '256 MB',
    }),
    __metadata("design:type", String)
], RecentUploadDto.prototype, "size", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Formatted duration (MM:SS)',
        example: '12:34',
    }),
    __metadata("design:type", String)
], RecentUploadDto.prototype, "duration", void 0);
class PopularVideoDto {
    id;
    title;
    thumbnailUrl;
    views;
    duration;
}
exports.PopularVideoDto = PopularVideoDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Video ID (Cloudflare UID)',
        example: 'a1b2c3d4e5f6',
    }),
    __metadata("design:type", String)
], PopularVideoDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Video title',
        example: 'Advanced TypeScript Tips',
    }),
    __metadata("design:type", String)
], PopularVideoDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Thumbnail URL from Cloudflare',
        example: 'https://cloudflarestream.com/a1b2c3d4e5f6/thumbnails/thumbnail.jpg',
    }),
    __metadata("design:type", String)
], PopularVideoDto.prototype, "thumbnailUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'View count',
        example: 1245,
    }),
    __metadata("design:type", Number)
], PopularVideoDto.prototype, "views", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Formatted duration (MM:SS)',
        example: '05:27',
    }),
    __metadata("design:type", String)
], PopularVideoDto.prototype, "duration", void 0);
class DashboardResponseDto {
    platformStats;
    recentUploads;
    popularVideos;
}
exports.DashboardResponseDto = DashboardResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: PlatformStatsDto }),
    __metadata("design:type", PlatformStatsDto)
], DashboardResponseDto.prototype, "platformStats", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [RecentUploadDto] }),
    __metadata("design:type", Array)
], DashboardResponseDto.prototype, "recentUploads", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [PopularVideoDto] }),
    __metadata("design:type", Array)
], DashboardResponseDto.prototype, "popularVideos", void 0);
class PlatformStatsResponseDto {
    data;
}
exports.PlatformStatsResponseDto = PlatformStatsResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: PlatformStatsDto }),
    __metadata("design:type", PlatformStatsDto)
], PlatformStatsResponseDto.prototype, "data", void 0);
class RecentUploadsResponseDto {
    data;
}
exports.RecentUploadsResponseDto = RecentUploadsResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [RecentUploadDto] }),
    __metadata("design:type", Array)
], RecentUploadsResponseDto.prototype, "data", void 0);
class PopularVideosResponseDto {
    data;
}
exports.PopularVideosResponseDto = PopularVideosResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [PopularVideoDto] }),
    __metadata("design:type", Array)
], PopularVideosResponseDto.prototype, "data", void 0);
//# sourceMappingURL=analytics.dto.js.map