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
exports.MuxSettingsResponseDto = exports.UpdateOrgMuxDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UpdateOrgMuxDto {
    muxTokenId;
    muxTokenSecret;
}
exports.UpdateOrgMuxDto = UpdateOrgMuxDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'MUX Token ID',
        example: 'your-mux-token-id',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateOrgMuxDto.prototype, "muxTokenId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'MUX Token Secret',
        example: 'your-mux-token-secret',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateOrgMuxDto.prototype, "muxTokenSecret", void 0);
class MuxSettingsResponseDto {
    success;
    muxTokenId;
    muxTokenSecret;
}
exports.MuxSettingsResponseDto = MuxSettingsResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Success status',
        example: true,
    }),
    __metadata("design:type", Boolean)
], MuxSettingsResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'MUX Token ID (masked)',
        example: 'ab***cd',
    }),
    __metadata("design:type", String)
], MuxSettingsResponseDto.prototype, "muxTokenId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'MUX Token Secret (masked)',
        example: 'xy***z',
    }),
    __metadata("design:type", String)
], MuxSettingsResponseDto.prototype, "muxTokenSecret", void 0);
//# sourceMappingURL=update-org-mux.dto.js.map