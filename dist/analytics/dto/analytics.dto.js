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
exports.PopularVideosResponseDto = exports.RecentUploadsResponseDto = exports.PlatformStatsResponseDto = exports.DashboardResponseDto = exports.ViewerAnalyticsDto = exports.ConnectionBreakdownDto = exports.OSBreakdownDto = exports.LocationBreakdownDto = exports.BrowserBreakdownDto = exports.DeviceBreakdownDto = exports.PopularVideoDto = exports.RecentUploadDto = exports.PlatformStatsDto = exports.GetVideosLimitDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class GetVideosLimitDto {
    limit = 5;
}
exports.GetVideosLimitDto = GetVideosLimitDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Maximum number of videos to return',
        example: 5,
        required: false,
        minimum: 1,
        maximum: 50,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    (0, class_validator_1.Max)(50),
    __metadata("design:type", Number)
], GetVideosLimitDto.prototype, "limit", void 0);
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
        example: 156,
    }),
    __metadata("design:type", Number)
], PlatformStatsDto.prototype, "totalVideos", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total views across all videos',
        example: 1247,
    }),
    __metadata("design:type", Number)
], PlatformStatsDto.prototype, "totalViews", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total storage used in human readable format',
        example: '2.4 GB',
    }),
    __metadata("design:type", String)
], PlatformStatsDto.prototype, "totalStorage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total bandwidth used in human readable format',
        example: '15.7 GB',
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
        description: 'Video ID',
        example: 'abc123',
    }),
    __metadata("design:type", String)
], RecentUploadDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Video title',
        example: 'My Awesome Video',
    }),
    __metadata("design:type", String)
], RecentUploadDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Thumbnail URL',
        example: 'https://image.mux.com/abc123/thumbnail.jpg',
    }),
    __metadata("design:type", String)
], RecentUploadDto.prototype, "thumbnailUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Upload date',
        example: '2023-12-01',
    }),
    __metadata("design:type", String)
], RecentUploadDto.prototype, "uploadDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'File size in human readable format',
        example: '24.5 MB',
    }),
    __metadata("design:type", String)
], RecentUploadDto.prototype, "size", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Video duration in MM:SS format',
        example: '05:32',
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
        description: 'Video ID',
        example: 'abc123',
    }),
    __metadata("design:type", String)
], PopularVideoDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Video title',
        example: 'Popular Video Title',
    }),
    __metadata("design:type", String)
], PopularVideoDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Thumbnail URL',
        example: 'https://image.mux.com/abc123/thumbnail.jpg',
    }),
    __metadata("design:type", String)
], PopularVideoDto.prototype, "thumbnailUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Number of views',
        example: 1523,
    }),
    __metadata("design:type", Number)
], PopularVideoDto.prototype, "views", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Video duration in MM:SS format',
        example: '10:45',
    }),
    __metadata("design:type", String)
], PopularVideoDto.prototype, "duration", void 0);
class DeviceBreakdownDto {
    device;
    category;
    manufacturer;
    views;
    percentage;
}
exports.DeviceBreakdownDto = DeviceBreakdownDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Device name',
        example: 'iPhone 12',
    }),
    __metadata("design:type", String)
], DeviceBreakdownDto.prototype, "device", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Device category',
        example: 'phone',
    }),
    __metadata("design:type", String)
], DeviceBreakdownDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Device manufacturer',
        example: 'Apple',
    }),
    __metadata("design:type", String)
], DeviceBreakdownDto.prototype, "manufacturer", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Number of views from this device',
        example: 245,
    }),
    __metadata("design:type", Number)
], DeviceBreakdownDto.prototype, "views", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Percentage of total views',
        example: 23.5,
    }),
    __metadata("design:type", Number)
], DeviceBreakdownDto.prototype, "percentage", void 0);
class BrowserBreakdownDto {
    browser;
    version;
    views;
    percentage;
}
exports.BrowserBreakdownDto = BrowserBreakdownDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Browser name',
        example: 'Chrome',
    }),
    __metadata("design:type", String)
], BrowserBreakdownDto.prototype, "browser", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Browser version',
        example: '91.0.4472.124',
    }),
    __metadata("design:type", String)
], BrowserBreakdownDto.prototype, "version", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Number of views from this browser',
        example: 356,
    }),
    __metadata("design:type", Number)
], BrowserBreakdownDto.prototype, "views", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Percentage of total views',
        example: 34.2,
    }),
    __metadata("design:type", Number)
], BrowserBreakdownDto.prototype, "percentage", void 0);
class LocationBreakdownDto {
    country;
    countryCode;
    region;
    city;
    views;
    percentage;
}
exports.LocationBreakdownDto = LocationBreakdownDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Country name',
        example: 'United States',
    }),
    __metadata("design:type", String)
], LocationBreakdownDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Country code',
        example: 'US',
    }),
    __metadata("design:type", String)
], LocationBreakdownDto.prototype, "countryCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'State or region',
        example: 'California',
        required: false,
    }),
    __metadata("design:type", String)
], LocationBreakdownDto.prototype, "region", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'City name',
        example: 'San Francisco',
        required: false,
    }),
    __metadata("design:type", String)
], LocationBreakdownDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Number of views from this location',
        example: 127,
    }),
    __metadata("design:type", Number)
], LocationBreakdownDto.prototype, "views", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Percentage of total views',
        example: 12.2,
    }),
    __metadata("design:type", Number)
], LocationBreakdownDto.prototype, "percentage", void 0);
class OSBreakdownDto {
    os;
    version;
    views;
    percentage;
}
exports.OSBreakdownDto = OSBreakdownDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Operating system name',
        example: 'iOS',
    }),
    __metadata("design:type", String)
], OSBreakdownDto.prototype, "os", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'OS version',
        example: '14.6',
    }),
    __metadata("design:type", String)
], OSBreakdownDto.prototype, "version", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Number of views from this OS',
        example: 198,
    }),
    __metadata("design:type", Number)
], OSBreakdownDto.prototype, "views", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Percentage of total views',
        example: 19.0,
    }),
    __metadata("design:type", Number)
], OSBreakdownDto.prototype, "percentage", void 0);
class ConnectionBreakdownDto {
    connectionType;
    views;
    percentage;
}
exports.ConnectionBreakdownDto = ConnectionBreakdownDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Connection type',
        example: 'wifi',
    }),
    __metadata("design:type", String)
], ConnectionBreakdownDto.prototype, "connectionType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Number of views from this connection type',
        example: 423,
    }),
    __metadata("design:type", Number)
], ConnectionBreakdownDto.prototype, "views", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Percentage of total views',
        example: 40.6,
    }),
    __metadata("design:type", Number)
], ConnectionBreakdownDto.prototype, "percentage", void 0);
class ViewerAnalyticsDto {
    devices;
    browsers;
    locations;
    operatingSystems;
    connections;
    totalViews;
}
exports.ViewerAnalyticsDto = ViewerAnalyticsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Device breakdown analytics',
        type: [DeviceBreakdownDto],
    }),
    __metadata("design:type", Array)
], ViewerAnalyticsDto.prototype, "devices", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Browser breakdown analytics',
        type: [BrowserBreakdownDto],
    }),
    __metadata("design:type", Array)
], ViewerAnalyticsDto.prototype, "browsers", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Location breakdown analytics',
        type: [LocationBreakdownDto],
    }),
    __metadata("design:type", Array)
], ViewerAnalyticsDto.prototype, "locations", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Operating system breakdown analytics',
        type: [OSBreakdownDto],
    }),
    __metadata("design:type", Array)
], ViewerAnalyticsDto.prototype, "operatingSystems", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Connection type breakdown analytics',
        type: [ConnectionBreakdownDto],
    }),
    __metadata("design:type", Array)
], ViewerAnalyticsDto.prototype, "connections", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total number of views',
        example: 1042,
    }),
    __metadata("design:type", Number)
], ViewerAnalyticsDto.prototype, "totalViews", void 0);
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