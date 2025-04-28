"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateVideoDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_video_dto_1 = require("./create-video.dto");
class UpdateVideoDto extends (0, swagger_1.PartialType)(create_video_dto_1.CreateVideoDto) {
}
exports.UpdateVideoDto = UpdateVideoDto;
//# sourceMappingURL=update-video.dto.js.map