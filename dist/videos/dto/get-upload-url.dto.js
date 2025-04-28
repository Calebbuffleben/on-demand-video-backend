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
exports.GetUploadUrlDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class GetUploadUrlDto {
    maxDurationSeconds = 3600;
}
exports.GetUploadUrlDto = GetUploadUrlDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Maximum duration of the video in seconds',
        default: 3600,
        required: false,
        minimum: 1,
        maximum: 21600,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Max)(21600),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], GetUploadUrlDto.prototype, "maxDurationSeconds", void 0);
//# sourceMappingURL=get-upload-url.dto.js.map