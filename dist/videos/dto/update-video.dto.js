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
exports.UpdateVideoDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_video_dto_1 = require("./create-video.dto");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const video_display_options_dto_1 = require("./video-display-options.dto");
const video_embed_options_dto_1 = require("./video-embed-options.dto");
class UpdateVideoDto extends (0, swagger_1.PartialType)(create_video_dto_1.CreateVideoDto) {
    displayOptions;
    embedOptions;
}
exports.UpdateVideoDto = UpdateVideoDto;
__decorate([
    (0, swagger_2.ApiPropertyOptional)({
        description: 'Display options for the video player',
        type: () => video_display_options_dto_1.VideoDisplayOptionsDto
    }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => video_display_options_dto_1.VideoDisplayOptionsDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", video_display_options_dto_1.VideoDisplayOptionsDto)
], UpdateVideoDto.prototype, "displayOptions", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({
        description: 'Embed options for the video',
        type: () => video_embed_options_dto_1.VideoEmbedOptionsDto
    }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => video_embed_options_dto_1.VideoEmbedOptionsDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", video_embed_options_dto_1.VideoEmbedOptionsDto)
], UpdateVideoDto.prototype, "embedOptions", void 0);
//# sourceMappingURL=update-video.dto.js.map