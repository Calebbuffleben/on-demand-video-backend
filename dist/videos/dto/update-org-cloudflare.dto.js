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
exports.CloudflareSettingsResponseDto = exports.UpdateOrgCloudflareDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UpdateOrgCloudflareDto {
    cloudflareAccountId;
    cloudflareApiToken;
}
exports.UpdateOrgCloudflareDto = UpdateOrgCloudflareDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Cloudflare Account ID',
        example: '1a2b3c4d5e6f7g8h9i0j',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateOrgCloudflareDto.prototype, "cloudflareAccountId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Cloudflare API Token with Stream permissions',
        example: 'api-token-from-cloudflare',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateOrgCloudflareDto.prototype, "cloudflareApiToken", void 0);
class CloudflareSettingsResponseDto {
    hasCredentials;
    cloudflareAccountId;
}
exports.CloudflareSettingsResponseDto = CloudflareSettingsResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Whether the organization has Cloudflare credentials configured',
        example: true,
    }),
    __metadata("design:type", Boolean)
], CloudflareSettingsResponseDto.prototype, "hasCredentials", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Cloudflare Account ID (masked for security)',
        example: '1a2b****9i0j',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CloudflareSettingsResponseDto.prototype, "cloudflareAccountId", void 0);
//# sourceMappingURL=update-org-cloudflare.dto.js.map