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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MuxController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const mux_service_1 = require("./mux.service");
const update_org_mux_dto_1 = require("./dto/update-org-mux.dto");
const prisma_service_1 = require("../../prisma/prisma.service");
let MuxController = class MuxController {
    muxService;
    prismaService;
    constructor(muxService, prismaService) {
        this.muxService = muxService;
        this.prismaService = prismaService;
    }
    async testConnection() {
        try {
            return await this.muxService.testMuxConnection();
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to connect to MUX API: ${error.message}`);
        }
    }
    async updateOrgMuxSettings(updateOrgMuxDto, req) {
        const organizationId = req['organization'].id;
        try {
            await this.prismaService.organization.update({
                where: { id: organizationId },
                data: {
                    muxTokenId: updateOrgMuxDto.muxTokenId,
                    muxTokenSecret: updateOrgMuxDto.muxTokenSecret,
                },
            });
            await this.muxService.testMuxConnection(organizationId);
            return {
                success: true,
                muxTokenId: this.maskString(updateOrgMuxDto.muxTokenId),
                muxTokenSecret: this.maskString(updateOrgMuxDto.muxTokenSecret),
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to update MUX settings: ${error.message}`);
        }
    }
    async getOrgMuxSettings(req) {
        const organizationId = req['organization'].id;
        try {
            const organization = await this.prismaService.organization.findUnique({
                where: { id: organizationId },
                select: {
                    muxTokenId: true,
                    muxTokenSecret: true,
                },
            });
            if (!organization || !organization.muxTokenId || !organization.muxTokenSecret) {
                return {
                    success: false,
                    muxTokenId: '',
                    muxTokenSecret: '',
                };
            }
            return {
                success: true,
                muxTokenId: this.maskString(organization.muxTokenId),
                muxTokenSecret: this.maskString(organization.muxTokenSecret),
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to get MUX settings: ${error.message}`);
        }
    }
    async testOrgConnection(req) {
        const organizationId = req['organization'].id;
        return this.muxService.testMuxConnection(organizationId);
    }
    maskString(input) {
        if (!input || input.length < 4) {
            return input;
        }
        const visiblePrefixLength = 2;
        const visibleSuffixLength = 2;
        return (input.substring(0, visiblePrefixLength) +
            '***' +
            input.substring(input.length - visibleSuffixLength));
    }
};
exports.MuxController = MuxController;
__decorate([
    (0, common_1.Get)('test-connection'),
    (0, swagger_1.ApiOperation)({ summary: 'Test the connection to MUX API' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the MUX API response.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MuxController.prototype, "testConnection", null);
__decorate([
    (0, common_1.Post)('organization/settings'),
    (0, swagger_1.ApiOperation)({ summary: 'Update MUX settings for the organization' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Settings updated.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_org_mux_dto_1.UpdateOrgMuxDto, Object]),
    __metadata("design:returntype", Promise)
], MuxController.prototype, "updateOrgMuxSettings", null);
__decorate([
    (0, common_1.Get)('organization/settings'),
    (0, swagger_1.ApiOperation)({ summary: 'Get MUX settings for the organization' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Settings retrieved.' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MuxController.prototype, "getOrgMuxSettings", null);
__decorate([
    (0, common_1.Post)('organization/test-connection'),
    (0, swagger_1.ApiOperation)({ summary: 'Test MUX API connection for the organization' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Connection successful.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Connection failed.' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MuxController.prototype, "testOrgConnection", null);
exports.MuxController = MuxController = __decorate([
    (0, swagger_1.ApiTags)('mux'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('api/mux'),
    __metadata("design:paramtypes", [mux_service_1.MuxService,
        prisma_service_1.PrismaService])
], MuxController);
//# sourceMappingURL=mux.controller.js.map