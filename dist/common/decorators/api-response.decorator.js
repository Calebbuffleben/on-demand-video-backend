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
exports.ApiStandardResponse = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const ApiStandardResponse = (options) => {
    const { type, description = 'Successful operation', isArray = false } = options;
    class StandardResponseDto {
        success;
        status;
        message;
        data;
    }
    __decorate([
        (0, swagger_1.ApiProperty)({ type: Boolean, example: true }),
        __metadata("design:type", Boolean)
    ], StandardResponseDto.prototype, "success", void 0);
    __decorate([
        (0, swagger_1.ApiProperty)({ type: Number, example: 200 }),
        __metadata("design:type", Number)
    ], StandardResponseDto.prototype, "status", void 0);
    __decorate([
        (0, swagger_1.ApiProperty)({ type: String, example: 'Operation successful' }),
        __metadata("design:type", String)
    ], StandardResponseDto.prototype, "message", void 0);
    __decorate([
        (0, swagger_1.ApiProperty)({
            description: 'Response data',
            type: 'object',
            additionalProperties: {}
        }),
        __metadata("design:type", Object)
    ], StandardResponseDto.prototype, "data", void 0);
    return (0, common_1.applyDecorators)((0, swagger_1.ApiExtraModels)(type, StandardResponseDto), (0, swagger_1.ApiOkResponse)({
        description,
        schema: {
            allOf: [
                { $ref: (0, swagger_1.getSchemaPath)(StandardResponseDto) },
                {
                    properties: {
                        data: {
                            type: 'object',
                            properties: {
                                result: isArray
                                    ? {
                                        type: 'array',
                                        items: { $ref: (0, swagger_1.getSchemaPath)(type) }
                                    }
                                    : { $ref: (0, swagger_1.getSchemaPath)(type) }
                            }
                        }
                    }
                }
            ]
        },
    }));
};
exports.ApiStandardResponse = ApiStandardResponse;
//# sourceMappingURL=api-response.decorator.js.map